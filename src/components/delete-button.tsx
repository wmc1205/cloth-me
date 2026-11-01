'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function onClick() {
    if (!window.confirm(`"${name}"을(를) 삭제할까요? 되돌릴 수 없어요.`)) return
    setError('')
    setDeleting(true)
    try {
      const res = await fetch(`/api/closet/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else setError('삭제하지 못했어요.')
    } catch {
      setError('네트워크 오류로 삭제하지 못했어요.')
    }
    setDeleting(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={deleting}
        aria-label={`${name} 삭제`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:text-destructive disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </>
  )
}
