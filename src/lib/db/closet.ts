import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

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
