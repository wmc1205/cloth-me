'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// 자동 생성이 실패해도 새로고침할 때마다 유료 AI 호출이 반복되지 않도록 날짜별로 한 번만 시도한다.
// 사용자가 직접 버튼을 누르는 것은 막지 않는다. 스토리지를 못 쓰면 자동 생성하지 않는다.
const triedKey = (date: string) => `auto-outfit:${date}`
function alreadyTried(date: string) {
  try {
    return sessionStorage.getItem(triedKey(date)) !== null
  } catch {
    return true
  }
}
function markTried(date: string) {
  try {
    sessionStorage.setItem(triedKey(date), '1')
  } catch {
    // 저장하지 못하면 alreadyTried가 다음 방문에서 true를 돌려 자동 생성이 일어나지 않는다.
  }
}

// 설정한 시간이 지났는데 추천이 없으면 화면을 열 때 한 번 자동으로 만든다.
export function NextOutfit({ targetDate, autoGenerate, hasOutfit }: { targetDate: string; autoGenerate: boolean; hasOutfit: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const started = useRef(false)

  async function generate() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/outfits/next', { method: 'POST' })
    if (res.ok) router.refresh()
    else setError((await res.json().catch(() => null))?.error ?? '추천에 실패했습니다.')
    setLoading(false)
  }

  useEffect(() => {
    if (autoGenerate && !started.current && !alreadyTried(targetDate)) {
      started.current = true
      markTried(targetDate)
      void generate()
    }
    // generate는 렌더마다 새로 만들어지지만 자동 실행은 한 번만 하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate])

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={generate} disabled={loading} className="h-11">
        {loading ? 'AI가 코디하는 중...' : hasOutfit ? '다시 추천받기' : '지금 추천받기'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
