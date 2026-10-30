import { Suspense } from 'react'
import { connection } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { listClosetItems } from '@/lib/db/closet'
import { getOutfitPlan, getSettings } from '@/lib/db/outfits'
import { isDue, nextTargetDay, WEEKDAY_LABELS } from '@/lib/outfit/schedule'
import { CATEGORY_LABELS } from '@/lib/closet/schema'
import { NavLinks } from '@/components/nav-links'
import { NextOutfit } from '@/components/next-outfit'
import { SettingsForm } from '@/components/settings-form'

const SLOTS = ['outer', 'top', 'bottom', 'shoes'] as const

async function PlanContent() {
  await connection()
  const supabase = await createSupabaseServerClient()
  const settings = await getSettings(supabase)
  const now = new Date()
  const target = nextTargetDay(now, settings)
  const plan = target ? await getOutfitPlan(supabase, target.date) : null
  const outfit = plan?.outfit ?? null
  const items = outfit ? await listClosetItems(supabase) : []
  const byId = new Map(items.map((item) => [item.id, item]))

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">
          {target ? `${target.date} (${WEEKDAY_LABELS[target.weekday]}) 추천 코디` : '추천받을 요일을 선택해주세요'}
        </h2>
        {outfit && (
          <>
            <ul className="grid grid-cols-2 gap-3">
              {[...SLOTS.map((slot) => outfit.items[slot]), ...outfit.items.etc].map((id) => {
                const item = id ? byId.get(id) : undefined
                if (!item) return null
                return (
                  <li key={id} className="flex flex-col gap-1">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="aspect-square w-full rounded-lg object-cover" />
                    ) : (
                      <div className="aspect-square w-full rounded-lg bg-muted" />
                    )}
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ?? item.category}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="text-sm">{outfit.reason}</p>
            {outfit.shoppingHints.length > 0 && (
              <p className="text-xs text-muted-foreground">
                이런 아이템이 있으면 더 좋아요: {outfit.shoppingHints.map((hint) => hint.query).join(', ')}
              </p>
            )}
          </>
        )}
        {target && (
          // key: 요일 설정을 바꿔 추천 대상 날짜가 달라지면 새로 마운트되어 자동 생성이 다시 동작한다.
          <NextOutfit key={target.date} targetDate={target.date} autoGenerate={isDue(now, settings) && !outfit} hasOutfit={outfit !== null} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">추천 시간 설정</h2>
        <SettingsForm initial={settings} />
      </section>
    </>
  )
}

export default function PlanPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-semibold">내일 코디</h1>
      <NavLinks />
      <Suspense fallback={<p className="py-10 text-center text-muted-foreground">불러오는 중...</p>}>
        <PlanContent />
      </Suspense>
    </main>
  )
}
