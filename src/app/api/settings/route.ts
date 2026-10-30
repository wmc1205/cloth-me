import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { getSettings, saveSettings } from '@/lib/db/outfits'
import { settingsSchema } from '@/lib/outfit/schedule'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  return NextResponse.json({ settings: await getSettings(supabase) })
}

export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const settings = settingsSchema.safeParse(await request.json().catch(() => null))
  if (!settings.success) {
    return NextResponse.json({ error: '시간(HH:MM)과 요일을 1개 이상 확인해주세요.' }, { status: 400 })
  }

  try {
    await saveSettings(supabase, user.id, settings.data)
    return NextResponse.json({ settings: settings.data })
  } catch {
    return NextResponse.json({ error: '설정을 저장하지 못했습니다.' }, { status: 500 })
  }
}
