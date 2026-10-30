import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { listClosetItems } from '@/lib/db/closet'
import { getStyleProfile } from '@/lib/db/style-profile'
import { getOutfitPlan, getSettings, saveOutfitPlan } from '@/lib/db/outfits'
import { recommendOutfit } from '@/lib/ai/recommend-outfit'
import { isNewItem, nextTargetDay, seasonOf, WEEKDAY_LABELS } from '@/lib/outfit/schedule'

// 방금 추천한 날이면 다시 만들지 않는다. 버튼 연타나 반복 호출로 유료 AI 호출이 쌓이는 것을 막는다.
const COOLDOWN_MS = 30_000

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const now = new Date()
    const settings = await getSettings(supabase)
    const target = nextTargetDay(now, settings)
    if (!target) return NextResponse.json({ error: '추천받을 요일을 1개 이상 선택해주세요.' }, { status: 400 })

    const saved = await getOutfitPlan(supabase, target.date)
    if (saved && now.getTime() - new Date(saved.createdAt).getTime() < COOLDOWN_MS) {
      return NextResponse.json({ error: '방금 추천했어요. 잠시 후 다시 시도해주세요.' }, { status: 429 })
    }

    const items = await listClosetItems(supabase)
    const closet = items.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      colors: item.colors,
      seasons: item.seasons,
      styles: item.styles,
      isNew: isNewItem(item.created_at, now),
    }))
    if (!closet.some((item) => item.category === 'top') || !closet.some((item) => item.category === 'bottom')) {
      return NextResponse.json({ error: '코디를 만들려면 상의와 하의가 각각 1벌 이상 필요해요.' }, { status: 400 })
    }

    const styleProfile = (await getStyleProfile(supabase))?.profile
    const outfit = await recommendOutfit({
      targetDate: target.date,
      weekday: WEEKDAY_LABELS[target.weekday],
      season: seasonOf(target.date),
      closet,
      styleSummary: styleProfile && `${styleProfile.summary} (대표 스타일: ${styleProfile.dominantStyles.join(', ')}, 기본 색: ${styleProfile.palette.core.join(', ')})`,
    })
    await saveOutfitPlan(supabase, user.id, target.date, outfit)
    return NextResponse.json({ targetDate: target.date, outfit }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '코디 추천에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 })
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const settings = await getSettings(supabase)
    const target = nextTargetDay(new Date(), settings)
    const plan = target ? await getOutfitPlan(supabase, target.date) : null
    return NextResponse.json({ settings, targetDate: target?.date ?? null, outfit: plan?.outfit ?? null })
  } catch {
    return NextResponse.json({ error: '추천을 불러오지 못했습니다.' }, { status: 500 })
  }
}
