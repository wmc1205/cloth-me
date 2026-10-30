import { Suspense } from 'react'
import { connection } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { getStyleProfile } from '@/lib/db/style-profile'
import { shoppingSearchLinks } from '@/lib/shopping/search-links'
import type { StyleProfile } from '@/lib/ai/style-profile'
import { CATEGORY_LABELS } from '@/lib/closet/schema'
import { GenerateProfileButton } from '@/components/generate-profile-button'
import { NavLinks } from '@/components/nav-links'

function Suggestion({ suggestion }: { suggestion: StyleProfile['itemSuggestions'][number] }) {
  return (
    <li className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">
          {CATEGORY_LABELS[suggestion.category]} · {suggestion.query}
        </p>
        <p className="text-xs text-muted-foreground">{suggestion.why}</p>
      </div>
      <div className="flex gap-2">
        {shoppingSearchLinks(suggestion.query).map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium"
          >
            {link.name}에서 찾기
          </a>
        ))}
      </div>
    </li>
  )
}

async function StyleContent() {
  await connection()
  const supabase = await createSupabaseServerClient()
  const saved = await getStyleProfile(supabase)

  if (!saved) {
    return (
      <>
        <p className="py-6 text-center text-muted-foreground">
          옷장의 옷이 분류되면 나만의 스타일을 분석해 드려요.
        </p>
        <GenerateProfileButton hasProfile={false} />
      </>
    )
  }

  const { profile } = saved
  return (
    <>
      <section className="flex flex-col gap-2">
        <p>{profile.summary}</p>
        <p className="text-sm text-muted-foreground">{profile.styleKeywords.map((k) => `#${k}`).join(' ')}</p>
        <p className="text-sm">
          대표 스타일: {profile.dominantStyles.join(', ')} · 기본 색: {profile.palette.core.join(', ')}
          {profile.palette.accent.length > 0 && ` · 포인트: ${profile.palette.accent.join(', ')}`}
        </p>
      </section>
      {profile.strengths.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">강점</h2>
          <ul className="list-disc pl-5 text-sm">{profile.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      )}
      {profile.gaps.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">채우면 좋은 부분</h2>
          <ul className="list-disc pl-5 text-sm">{profile.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </section>
      )}
      {profile.itemSuggestions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">내 스타일에 맞는 아이템</h2>
          <ul className="flex flex-col gap-5">
            {profile.itemSuggestions.map((suggestion) => (
              <Suggestion key={suggestion.query} suggestion={suggestion} />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">검색 결과와 가격·재고는 각 쇼핑몰에서 확인하세요.</p>
        </section>
      )}
      <GenerateProfileButton hasProfile />
    </>
  )
}

export default function StylePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-semibold">내 스타일</h1>
      <NavLinks />
      <Suspense fallback={<p className="py-10 text-center text-muted-foreground">불러오는 중...</p>}>
        <StyleContent />
      </Suspense>
    </main>
  )
}
