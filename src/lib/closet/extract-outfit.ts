import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db/database.types'
import { insertClosetItem, updateClosetItem } from '@/lib/db/closet'
import { detectOutfit } from '@/lib/ai/detect-outfit'
import { cropOnWhite, normalizeImage } from './crop'

// 사람이 입은 사진에서 아이템을 한 벌씩 찾아 흰 배경 크롭으로 옷장에 넣고, 넣은 개수를 돌려준다.
// 중간에 하나라도 실패하면 만든 행과 파일을 모두 되돌리고 0을 돌려준다. 호출 측은 원본을 그대로 쓴다.
export async function extractOutfit(
  supabase: SupabaseClient<Database>,
  userId: string,
  bytes: Uint8Array,
) {
  const ids: string[] = []
  const paths: string[] = [] // 행 저장에 실패해도 올린 파일은 정리해야 해서 따로 모은다.
  try {
    const jpeg = await normalizeImage(bytes)
    const { items } = await detectOutfit({ bytes: jpeg, mediaType: 'image/jpeg' })

    for (const { box, ...tag } of items) {
      const cropped = await cropOnWhite(jpeg, box)
      if (!cropped) continue

      // 경로가 <user_id>/ 로 시작해야 스토리지 RLS 정책을 통과한다.
      const path = `${userId}/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage.from('closet').upload(path, cropped, { contentType: 'image/jpeg' })
      if (error) throw error
      paths.push(path)

      const row = await insertClosetItem(supabase, { userId, category: tag.category, name: tag.name, imagePath: path })
      ids.push(row.id)
      await updateClosetItem(supabase, row.id, {
        colors: tag.colors,
        material: tag.material ?? null,
        seasons: tag.seasons,
        styles: tag.styles,
        pattern: tag.pattern ?? null,
        brand: tag.brand ?? null,
        confidence: tag.confidence,
        tagged_at: new Date().toISOString(),
      })
    }
    return ids.length
  } catch {
    if (ids.length > 0) await supabase.from('closet_items').delete().in('id', ids)
    if (paths.length > 0) await supabase.storage.from('closet').remove(paths)
    return 0
  }
}
