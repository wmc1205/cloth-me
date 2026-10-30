import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './database.types'
import { styleProfileSchema, type StyleProfile } from '@/lib/ai/style-profile'

type Client = SupabaseClient<Database>

export async function getStyleProfile(supabase: Client) {
  const { data, error } = await supabase.from('style_profiles').select().maybeSingle()
  if (error) throw error
  if (!data) return null
  // 스키마가 바뀌어 옛 데이터가 맞지 않으면 없는 것으로 보고 다시 만들게 한다.
  const parsed = styleProfileSchema.safeParse(data.profile)
  return parsed.success ? { profile: parsed.data, updatedAt: data.updated_at } : null
}

export async function saveStyleProfile(supabase: Client, userId: string, profile: StyleProfile) {
  const { error } = await supabase
    .from('style_profiles')
    .upsert({ user_id: userId, profile: profile as unknown as Json, updated_at: new Date().toISOString() })
  if (error) throw error
}
