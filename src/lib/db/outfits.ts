import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './database.types'
import { outfitSchema, type Outfit } from '@/lib/ai/recommend-outfit'
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from '@/lib/outfit/schedule'

type Client = SupabaseClient<Database>

export async function getSettings(supabase: Client): Promise<Settings> {
  const { data, error } = await supabase.from('user_settings').select().maybeSingle()
  if (error) throw error
  if (!data) return DEFAULT_SETTINGS
  // Postgres time은 HH:MM:SS로 돌아온다.
  const parsed = settingsSchema.safeParse({
    recommendTime: data.recommend_time.slice(0, 5),
    recommendDays: data.recommend_days,
    timezone: data.timezone,
  })
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export async function saveSettings(supabase: Client, userId: string, settings: Settings) {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    recommend_time: settings.recommendTime,
    recommend_days: settings.recommendDays,
    timezone: settings.timezone,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function getOutfitPlan(supabase: Client, targetDate: string) {
  const { data, error } = await supabase.from('outfit_plans').select().eq('target_date', targetDate).maybeSingle()
  if (error) throw error
  if (!data) return null
  const parsed = outfitSchema.safeParse(data.result)
  return parsed.success ? parsed.data : null
}

export async function saveOutfitPlan(supabase: Client, userId: string, targetDate: string, outfit: Outfit) {
  const { error } = await supabase
    .from('outfit_plans')
    .upsert({ user_id: userId, target_date: targetDate, result: outfit as unknown as Json }, { onConflict: 'user_id,target_date' })
  if (error) throw error
}
