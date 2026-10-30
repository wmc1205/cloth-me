import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { listClosetItems } from '@/lib/db/closet'
import { getStyleProfile, saveStyleProfile } from '@/lib/db/style-profile'
import { summarizeCloset } from '@/lib/closet/stats'
import { analyzeStyleProfile } from '@/lib/ai/style-profile'

const MIN_TAGGED_ITEMS = 3
// 방금 만든 프로필이 있으면 다시 만들지 않는다. 버튼을 연타해 유료 AI 호출이 쌓이는 것을 막는다.
const COOLDOWN_MS = 60_000

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    return NextResponse.json({ profile: (await getStyleProfile(supabase))?.profile ?? null })
  } catch {
    return NextResponse.json({ error: '스타일 프로필을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const saved = await getStyleProfile(supabase)
    if (saved && Date.now() - new Date(saved.updatedAt).getTime() < COOLDOWN_MS) {
      return NextResponse.json({ error: '방금 분석했어요. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }

    const summary = summarizeCloset(await listClosetItems(supabase))
    if (summary.taggedCount < MIN_TAGGED_ITEMS) {
      return NextResponse.json(
        { error: `스타일을 분석하려면 분류된 옷이 ${MIN_TAGGED_ITEMS}벌 이상 필요해요. (현재 ${summary.taggedCount}벌)` },
        { status: 400 },
      )
    }

    const profile = await analyzeStyleProfile(summary)
    await saveStyleProfile(supabase, user.id, profile)
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ error: '스타일 분석에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 })
  }
}
