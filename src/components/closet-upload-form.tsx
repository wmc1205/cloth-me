'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const MAX_FILES = 20
const CONCURRENCY = 3
// Vercel 함수는 요청 본문이 4.5MB를 넘으면 거부한다. 이보다 큰 사진은 줄여서 보낸다.
const RESIZE_ABOVE_BYTES = 3 * 1024 * 1024
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // 4.5MB 제한에 여유를 둔 값
const MAX_EDGE = 1600

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

// 큰 사진(특히 폰 사진)을 긴 변 MAX_EDGE 이하 JPEG로 줄인다. 줄이지 못하면 원본을 돌려준다.
async function shrinkIfLarge(file: File) {
  if (file.size <= RESIZE_ABOVE_BYTES) return file
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#fff' // PNG 투명 배경이 JPEG에서 검게 나오지 않게
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
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
  // 네트워크 오류로 fetch가 throw돼도 그 장만 표시하고 나머지는 계속 올린다.
  async function uploadOne(original: File, index: number) {
    let itemId: string
    try {
      const file = await shrinkIfLarge(original)
      if (file.size > MAX_UPLOAD_BYTES) {
        update(index, { status: 'failed', message: '사진을 줄이지 못했어요. 더 작은 사진으로 올려주세요.' })
        return
      }
      const body = new FormData()
      body.set('file', file)
      const res = await fetch('/api/closet', { method: 'POST', body })
      if (!res.ok) {
        update(index, { status: 'failed', message: await errorMessage(res, '업로드에 실패했습니다.') })
        return
      }
      itemId = (await res.json()).item.id
    } catch {
      update(index, { status: 'failed', message: '네트워크 오류로 업로드하지 못했습니다.' })
      return
    }

    // 여기부터는 옷이 이미 저장된 상태다. 실패해도 "업로드 실패"가 아니라 "직접 확인"으로 보여 중복 업로드를 막는다.
    update(index, { status: 'tagging' })
    try {
      const tagRes = await fetch(`/api/closet/${itemId}/tag`, { method: 'POST' })
      if (!tagRes.ok) {
        update(index, { status: 'check' })
        return
      }
      const tagBody = await tagRes.json().catch(() => null)
      update(index, { status: tagBody?.excluded ? 'excluded' : 'done' })
    } catch {
      update(index, { status: 'check' })
    }
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
