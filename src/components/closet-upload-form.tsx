'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const MAX_FILES = 20
const CONCURRENCY = 3

type Progress = { name: string; status: 'uploading' | 'tagging' | 'done' | 'check' | 'excluded' | 'failed'; message?: string }

const STATUS_LABEL: Record<Progress['status'], string> = {
  uploading: '올리는 중...',
  tagging: 'AI가 분류하는 중...',
  done: '완료',
  check: '업로드됨 (자동 분류 실패, 직접 확인해주세요)',
  excluded: '옷 사진이 아니라서 제외했어요',
  failed: '실패',
}

async function errorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => null)
  return body?.error ?? fallback
}

export function ClosetUploadForm() {
  const router = useRouter()
  const [rows, setRows] = useState<Progress[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(index: number, patch: Partial<Progress>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  // 사진 1장 = 요청 1번. 요청 크기 제한을 피하고 장별 진행 상황을 보여주기 위해서다.
  async function uploadOne(file: File, index: number) {
    const body = new FormData()
    body.set('file', file)
    const res = await fetch('/api/closet', { method: 'POST', body })
    if (!res.ok) {
      update(index, { status: 'failed', message: await errorMessage(res, '업로드에 실패했습니다.') })
      return
    }
    const { item } = await res.json()

    update(index, { status: 'tagging' })
    const tagRes = await fetch(`/api/closet/${item.id}/tag`, { method: 'POST' })
    if (!tagRes.ok) {
      update(index, { status: 'check' })
      return
    }
    const tagBody = await tagRes.json().catch(() => null)
    update(index, { status: tagBody?.excluded ? 'excluded' : 'done' })
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const files = Array.from(input.files ?? [])
    if (files.length === 0) return
    if (files.length > MAX_FILES) {
      setError(`한 번에 ${MAX_FILES}장까지 올릴 수 있습니다.`)
      input.value = ''
      return
    }

    setError('')
    setBusy(true)
    setRows(files.map((file) => ({ name: file.name, status: 'uploading' })))

    let next = 0
    const worker = async () => {
      while (next < files.length) {
        const index = next++
        await uploadOne(files[index], index)
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker))

    input.value = ''
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">옷 사진 여러 장 올리기 (최대 {MAX_FILES}장)</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={onChange}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {rows.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {rows.map((row, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">{row.name}</span>
              <span className={row.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
                {row.message ?? STATUS_LABEL[row.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {busy && <Button disabled className="h-11">처리 중...</Button>}
    </div>
  )
}
