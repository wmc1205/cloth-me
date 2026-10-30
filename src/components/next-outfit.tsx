'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// 설정한 시간이 지났는데 추천이 없으면 화면을 열 때 한 번 자동으로 만든다.
export function NextOutfit({ autoGenerate, hasOutfit }: { autoGenerate: boolean; hasOutfit: boolean }) {
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
    if (autoGenerate && !started.current) {
      started.current = true
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
