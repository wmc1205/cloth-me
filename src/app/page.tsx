import { Suspense } from 'react'
import { connection } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { listClosetItems } from '@/lib/db/closet'
import { ClosetUploadForm } from '@/components/closet-upload-form'
import { CategorySelect } from '@/components/category-select'
import { LogoutButton } from '@/components/logout-button'
import { NavLinks } from '@/components/nav-links'
import { CATEGORIES, CATEGORY_LABELS, LOW_CONFIDENCE } from '@/lib/closet/schema'

// cacheComponents: 쿠키를 읽는 부분은 Suspense 안에 둬야 나머지 화면을 먼저 보낼 수 있다.
async function ClosetList() {
  // Supabase가 세션 만료를 Date.now()로 확인하므로 미리 렌더링하지 않고 요청 때 렌더링한다.
  await connection()
  const supabase = await createSupabaseServerClient()
  const items = await listClosetItems(supabase)

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        아직 옷이 없어요. 옷 사진을 여러 장 올려보세요.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {CATEGORIES.map((category) => {
        const group = items.filter((item) => item.category === category)
        if (group.length === 0) return null
        return (
          <section key={category} className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">
              {CATEGORY_LABELS[category]} <span className="text-sm font-normal text-muted-foreground">{group.length}</span>
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {group.map((item) => {
                const untagged = item.tagged_at === null
                const needsCheck = !untagged && (item.confidence ?? 0) < LOW_CONFIDENCE
                return (
                  <li key={item.id} className="flex flex-col gap-1">
                    {/* 서명 URL은 만료되고 도메인이 고정되지 않아 next/image 대신 img를 쓴다. */}
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="aspect-square w-full rounded-lg object-cover" />
                    ) : (
                      <div className="aspect-square w-full rounded-lg bg-muted" />
                    )}
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    {item.brand && <span className="truncate text-xs">{item.brand}</span>}
                    <span className="truncate text-xs text-muted-foreground">
                      {[...item.colors, ...item.styles].join(' · ') || '태그 없음'}
                    </span>
                    {(untagged || needsCheck) && (
                      <span className="text-xs text-destructive">
                        {untagged ? '분류 전 · 직접 확인해주세요' : '확인해주세요'}
                      </span>
                    )}
                    <CategorySelect id={item.id} category={item.category} />
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">내 옷장</h1>
        <LogoutButton />
      </header>
      <NavLinks />

      <ClosetUploadForm />

      <Suspense fallback={<p className="py-10 text-center text-muted-foreground">불러오는 중...</p>}>
        <ClosetList />
      </Suspense>
    </main>
  )
}
