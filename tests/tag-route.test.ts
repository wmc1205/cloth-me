import { beforeEach, describe, expect, test, vi } from 'vitest'

// 라우트의 접근 제어(로그인, 소유권, 중복 호출)만 확인한다. DB와 AI는 목으로 바꾼다.
const mock = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  item: null as unknown,
  download: { data: null as unknown, error: null as unknown },
  getClosetItem: vi.fn(),
  updateClosetItem: vi.fn(),
  deleteClosetItem: vi.fn(),
  tagItem: vi.fn(),
  extractOutfit: vi.fn(),
}))

vi.mock('@/lib/db/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mock.user } }) },
    storage: { from: () => ({ download: async () => mock.download }) },
  }),
}))
vi.mock('@/lib/db/closet', () => ({
  getClosetItem: mock.getClosetItem,
  updateClosetItem: mock.updateClosetItem,
  deleteClosetItem: mock.deleteClosetItem,
}))
vi.mock('@/lib/ai/tag-item', () => ({ tagItem: mock.tagItem }))
vi.mock('@/lib/closet/extract-outfit', () => ({ extractOutfit: mock.extractOutfit }))

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
  mock.updateClosetItem.mockReset()
  mock.deleteClosetItem.mockReset()
  mock.extractOutfit.mockReset()
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

  describe('사람이 입은 사진(wornByPerson)', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
    const tag = { isClothing: true, wornByPerson: true, category: 'etc', name: '착장', colors: ['gray'], seasons: [], styles: [], confidence: 0.3 }

    beforeEach(() => {
      mock.getClosetItem.mockResolvedValue(untagged)
      mock.download = { data: { size: jpeg.length, arrayBuffer: async () => jpeg.buffer }, error: null }
      mock.tagItem.mockResolvedValue(tag)
    })

    test('옷을 나눠 넣으면 원본을 지우고 extracted 개수를 돌려준다', async () => {
      mock.extractOutfit.mockResolvedValue(3)
      const res = await call()
      expect(await res.json()).toEqual({ extracted: 3 })
      expect(mock.deleteClosetItem).toHaveBeenCalledTimes(1)
      expect(mock.updateClosetItem).not.toHaveBeenCalled()
    })

    test('하나도 못 나누면 원본을 지우지 않고 그대로 분류한다', async () => {
      mock.extractOutfit.mockResolvedValue(0)
      mock.updateClosetItem.mockResolvedValue({ id: ID })
      const res = await call()
      expect(res.status).toBe(200)
      expect(mock.deleteClosetItem).not.toHaveBeenCalled()
      expect(mock.updateClosetItem).toHaveBeenCalledTimes(1)
    })

    test('wornByPerson이 아니면 추출을 시도하지 않는다', async () => {
      mock.tagItem.mockResolvedValue({ ...tag, wornByPerson: false })
      mock.updateClosetItem.mockResolvedValue({ id: ID })
      await call()
      expect(mock.extractOutfit).not.toHaveBeenCalled()
    })
  })
})
