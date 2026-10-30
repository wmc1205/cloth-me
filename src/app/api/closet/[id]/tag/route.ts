import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { deleteClosetItem, getClosetItem, updateClosetItem } from '@/lib/db/closet'
import { detectImageType, MAX_IMAGE_BYTES } from '@/lib/closet/schema'
import { tagItem } from '@/lib/ai/tag-item'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await params
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: '잘못된 옷 ID입니다.' }, { status: 400 })
  }

  try {
    // RLS가 본인 행만 돌려주므로 남의 옷이면 null이다.
    const item = await getClosetItem(supabase, id)
    if (!item) return NextResponse.json({ error: '옷을 찾을 수 없습니다.' }, { status: 404 })
    // 이미 분류된 옷은 AI(유료)를 다시 부르지 않는다. 같은 옷으로 호출을 반복해 비용을 쓰는 것을 막는다.
    if (item.tagged_at) return NextResponse.json({ error: '이미 분류된 옷입니다.' }, { status: 409 })

    const { data: file, error: downloadError } = await supabase.storage.from('closet').download(item.image_path)
    if (downloadError) return NextResponse.json({ error: '사진을 불러오지 못했습니다.' }, { status: 500 })
    // AI로 보내기 직전에 크기를 한 번 더 확인한다. (업로드 검사와 버킷 제한을 믿지 않는다)
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: '사진이 너무 큽니다.' }, { status: 413 })

    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = detectImageType(bytes)
    if (!type) return NextResponse.json({ error: '지원하지 않는 사진 형식입니다.' }, { status: 400 })

    const tag = await tagItem({ bytes, mediaType: type.mime as 'image/jpeg' | 'image/png' | 'image/webp' })
    // 옷이 아닌 사진은 옷장에 남기지 않는다.
    if (!tag.isClothing) {
      await deleteClosetItem(supabase, item)
      return NextResponse.json({ excluded: true })
    }

    const updated = await updateClosetItem(supabase, id, {
      category: tag.category,
      name: tag.name,
      colors: tag.colors,
      material: tag.material ?? null,
      seasons: tag.seasons,
      styles: tag.styles,
      pattern: tag.pattern ?? null,
      brand: tag.brand ?? null,
      confidence: tag.confidence,
      tagged_at: new Date().toISOString(),
    })
    return NextResponse.json({ item: updated })
  } catch {
    // DB·스토리지·AI 오류는 모두 같은 폴백으로 처리한다. 사진과 기본 정보는 이미 저장되어 있다.
    return NextResponse.json({ error: '자동 분류에 실패했습니다. 카테고리를 직접 확인해주세요.' }, { status: 502 })
  }
}
