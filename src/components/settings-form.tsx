'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { WEEKDAY_LABELS, type Settings } from '@/lib/outfit/schedule'

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter()
  const [time, setTime] = useState(initial.recommendTime)
  const [days, setDays] = useState(initial.recommendDays)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendTime: time, recommendDays: days, timezone: initial.timezone }),
    })
    if (res.ok) {
      setMessage('저장했어요.')
      router.refresh()
    } else {
      setMessage((await res.json().catch(() => null))?.error ?? '저장에 실패했습니다.')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>추천 받을 시간 ({initial.timezone})</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="h-10 rounded-lg border border-input bg-background px-3 text-base"
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">추천 받을 요일 (입을 날 기준)</legend>
        <div className="flex gap-1">
          {WEEKDAY_LABELS.map((label, day) => (
            <button
              key={label}
              type="button"
              aria-pressed={days.includes(day)}
              onClick={() => toggle(day)}
              className={`h-10 flex-1 rounded-md border text-sm ${days.includes(day) ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={saving || days.length === 0} className="h-11">
        {saving ? '저장 중...' : '설정 저장'}
      </Button>
    </form>
  )
}
