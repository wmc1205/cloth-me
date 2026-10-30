'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function GenerateProfileButton({ hasProfile }: { hasProfile: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onClick() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/style-profile', { method: 'POST' })
    if (res.ok) router.refresh()
    else setError((await res.json().catch(() => null))?.error ?? '스타일 분석에 실패했습니다.')
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={loading} className="h-11">
        {loading ? '분석 중...' : hasProfile ? '스타일 다시 분석하기' : '내 스타일 분석하기'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
