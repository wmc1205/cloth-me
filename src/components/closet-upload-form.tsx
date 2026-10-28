'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS } from '@/lib/closet/schema'

const fieldClass = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-base'

export function ClosetUploadForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = e.currentTarget

    const res = await fetch('/api/closet', { method: 'POST', body: new FormData(form) })
    if (res.ok) {
      form.reset()
      router.refresh()
    } else {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? '업로드에 실패했습니다.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
      />
      <input name="name" type="text" placeholder="옷 이름 (예: 검정 후드집업)" required maxLength={50} className={fieldClass} />
      <select name="category" defaultValue="top" className={fieldClass}>
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="h-11">
        {loading ? '올리는 중...' : '옷 추가'}
      </Button>
    </form>
  )
}
