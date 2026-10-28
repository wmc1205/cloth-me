import { Suspense } from 'react'
import { connection } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { listClosetItems } from '@/lib/db/closet'
import { ClosetUploadForm } from '@/components/closet-upload-form'
import { LogoutButton } from '@/components/logout-button'
import { CATEGORY_LABELS } from '@/lib/closet/schema'

// cacheComponents: 쿠키를 읽는 부분은 Suspense 안에 둬야 나머지 화면을 먼저 보낼 수 있다.
async function ClosetList() {
  // Supabase가 세션 만료를 Date.now()로 확인하므로 미리 렌더링하지 않고 요청 때 렌더링한다.
  await connection()
  const supabase = await createSupabaseServerClient()
  const items = await listClosetItems(supabase)

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        아직 옷이 없어요. 첫 옷 사진을 올려보세요.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1">
          {/* 서명 URL은 만료되고 도메인이 고정되지 않아 next/image 대신 img를 쓴다. */}
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
      ))}
    </ul>
  )
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">내 옷장</h1>
        <LogoutButton />
      </header>

      <ClosetUploadForm />

      <Suspense fallback={<p className="py-10 text-center text-muted-foreground">불러오는 중...</p>}>
        <ClosetList />
      </Suspense>
    </main>
  )
}
