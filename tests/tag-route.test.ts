import { beforeEach, describe, expect, test, vi } from 'vitest'

// 라우트의 접근 제어(로그인, 소유권, 중복 호출)만 확인한다. DB와 AI는 목으로 바꾼다.
const mock = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  item: null as unknown,
  download: { data: null as unknown, error: null as unknown },
  getClosetItem: vi.fn(),
  tagItem: vi.fn(),
}))

vi.mock('@/lib/db/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mock.user } }) },
    storage: { from: () => ({ download: async () => mock.download }) },
  }),
}))
vi.mock('@/lib/db/closet', () => ({
  getClosetItem: mock.getClosetItem,
  updateClosetItem: vi.fn(),
  deleteClosetItem: vi.fn(),
}))
vi.mock('@/lib/ai/tag-item', () => ({ tagItem: mock.tagItem }))

import { POST } from '@/app/api/closet/[id]/tag/route'
import { MAX_IMAGE_BYTES } from '@/lib/closet/schema'

const ID = '3f0c6b6e-6f0e-4c1a-9a53-0d6b5b8e7a11'
const call = (id = ID) => POST(new Request('http://localhost'), { params: Promise.resolve({ id }) })
const untagged = { id: ID, image_path: 'u1/a.jpg', tagged_at: null }

beforeEach(() => {
  mock.user = { id: 'u1' }
  mock.download = { data: null, error: null }
  mock.getClosetItem.mockReset()
  mock.tagItem.mockReset()
})

describe('POST /api/closet/[id]/tag', () => {
  test('로그인하지 않으면 401', async () => {
    mock.user = null
    expect((await call()).status).toBe(401)
    expect(mock.getClosetItem).not.toHaveBeenCalled()
  })

  test('UUID가 아니면 400', async () => {
    expect((await call('not-a-uuid')).status).toBe(400)
    expect(mock.getClosetItem).not.toHaveBeenCalled()
  })

  test('남의 옷이거나 없는 옷(RLS가 null을 돌려줌)이면 404이고 AI를 부르지 않는다', async () => {
    mock.getClosetItem.mockResolvedValue(null)
    expect((await call()).status).toBe(404)
    expect(mock.tagItem).not.toHaveBeenCalled()
  })

  test('이미 분류된 옷이면 409이고 AI를 부르지 않는다', async () => {
    mock.getClosetItem.mockResolvedValue({ ...untagged, tagged_at: '2026-10-30T00:00:00Z' })
    expect((await call()).status).toBe(409)
    expect(mock.tagItem).not.toHaveBeenCalled()
  })

  test('사진이 크면 413이고 AI를 부르지 않는다', async () => {
    mock.getClosetItem.mockResolvedValue(untagged)
    mock.download = { data: { size: MAX_IMAGE_BYTES + 1 }, error: null }
    expect((await call()).status).toBe(413)
    expect(mock.tagItem).not.toHaveBeenCalled()
  })

  test('DB 오류도 JSON 에러(502)로 돌려준다', async () => {
    mock.getClosetItem.mockRejectedValue(new Error('db down'))
    const res = await call()
    expect(res.status).toBe(502)
    expect(await res.json()).toHaveProperty('error')
  })
})
