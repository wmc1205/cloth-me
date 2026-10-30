import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TablesUpdate } from './database.types'

type Client = SupabaseClient<Database>

const SIGNED_URL_SECONDS = 60 * 10

export async function insertClosetItem(
  supabase: Client,
  item: { userId: string; category: string; name: string; imagePath: string },
) {
  const { data, error } = await supabase
    .from('closet_items')
    .insert({
      user_id: item.userId,
      category: item.category,
      name: item.name,
      image_path: item.imagePath,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getClosetItem(supabase: Client, id: string) {
  const { data, error } = await supabase.from('closet_items').select().eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function updateClosetItem(
  supabase: Client,
  id: string,
  fields: TablesUpdate<'closet_items'>,
) {
  const { data, error } = await supabase
    .from('closet_items')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// 행을 지우고 스토리지 사진도 함께 지운다. 사진 삭제 실패는 행 삭제를 막지 않는다(고아 파일만 남는다).
export async function deleteClosetItem(supabase: Client, item: { id: string; image_path: string }) {
  const { error } = await supabase.from('closet_items').delete().eq('id', item.id)
  if (error) throw error
  await supabase.storage.from('closet').remove([item.image_path])
}

// RLS가 본인 행만 돌려준다. 서명 URL은 짧게 만료되므로 화면 렌더 때마다 새로 만든다.
export async function listClosetItems(supabase: Client) {
  const { data: items, error } = await supabase
    .from('closet_items')
    .select()
    .order('created_at', { ascending: false })
  if (error) throw error
  if (items.length === 0) return []

  const { data: signed, error: signError } = await supabase.storage
    .from('closet')
    .createSignedUrls(
      items.map((item) => item.image_path),
      SIGNED_URL_SECONDS,
    )
  if (signError) throw signError

  return items.map((item, i) => ({ ...item, imageUrl: signed[i].signedUrl }))
}
