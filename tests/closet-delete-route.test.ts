import { beforeEach, describe, expect, test, vi } from 'vitest'

// 라우트의 접근 제어와 오류 처리만 확인한다. DB는 목으로 바꾼다.
const mock = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  getClosetItem: vi.fn(),
  deleteClosetItem: vi.fn(),
}))

vi.mock('@/lib/db/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mock.user } }) },
  }),
}))
vi.mock('@/lib/db/closet', () => ({
  getClosetItem: mock.getClosetItem,
  deleteClosetItem: mock.deleteClosetItem,
  updateClosetItem: vi.fn(),
}))

import { DELETE } from '@/app/api/closet/[id]/route'

const ID = '3f0c6b6e-6f0e-4c1a-9a53-0d6b5b8e7a11'
const call = (id = ID) => DELETE(new Request('http://localhost', { method: 'DELETE' }), { params: Promise.resolve({ id }) })
const item = { id: ID, image_path: 'u1/a.jpg' }

beforeEach(() => {
  mock.user = { id: 'u1' }
  mock.getClosetItem.mockReset()
  mock.deleteClosetItem.mockReset()
})

describe('DELETE /api/closet/[id]', () => {
  test('로그인하지 않으면 401이고 아무것도 지우지 않는다', async () => {
    mock.user = null
    expect((await call()).status).toBe(401)
    expect(mock.deleteClosetItem).not.toHaveBeenCalled()
  })

  test('UUID가 아니면 400', async () => {
    expect((await call('not-a-uuid')).status).toBe(400)
    expect(mock.getClosetItem).not.toHaveBeenCalled()
  })

  test('남의 옷이거나 없는 옷(RLS가 null을 돌려줌)이면 404이고 지우지 않는다', async () => {
    mock.getClosetItem.mockResolvedValue(null)
    expect((await call()).status).toBe(404)
    expect(mock.deleteClosetItem).not.toHaveBeenCalled()
  })

  test('내 옷이면 행과 사진 경로로 삭제하고 ok를 돌려준다', async () => {
    mock.getClosetItem.mockResolvedValue(item)
    const res = await call()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mock.deleteClosetItem).toHaveBeenCalledWith(expect.anything(), item)
  })

  test('DB 오류는 JSON 에러(500)로 돌려준다', async () => {
    mock.getClosetItem.mockResolvedValue(item)
    mock.deleteClosetItem.mockRejectedValue(new Error('db down'))
    const res = await call()
    expect(res.status).toBe(500)
    expect(await res.json()).toHaveProperty('error')
  })
})
