'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS } from '@/lib/closet/schema'

export function CategorySelect({ id, category }: { id: string; category: string }) {
  const router = useRouter()
  const [value, setValue] = useState(category)
  const [saving, setSaving] = useState(false)

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const previous = value
    setValue(e.target.value)
    setSaving(true)
    const res = await fetch(`/api/closet/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: e.target.value }),
    })
    setSaving(false)
    if (res.ok) router.refresh()
    else setValue(previous)
  }

  return (
    <select
      value={value}
      onChange={onChange}
      disabled={saving}
      aria-label="카테고리 변경"
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>
  )
}
