import { beforeEach, describe, expect, test, vi } from 'vitest'

// 유료 AI 호출을 막는 조건(로그인, 재추천 간격, DB 오류 처리)만 확인한다.
const mock = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  getSettings: vi.fn(),
  getOutfitPlan: vi.fn(),
  listClosetItems: vi.fn(),
  recommendOutfit: vi.fn(),
}))

vi.mock('@/lib/db/supabase-server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: mock.user } }) } }),
}))
vi.mock('@/lib/db/outfits', () => ({
  getSettings: mock.getSettings,
  getOutfitPlan: mock.getOutfitPlan,
  saveOutfitPlan: vi.fn(),
}))
vi.mock('@/lib/db/closet', () => ({ listClosetItems: mock.listClosetItems }))
vi.mock('@/lib/db/style-profile', () => ({ getStyleProfile: async () => null }))
vi.mock('@/lib/ai/recommend-outfit', () => ({ recommendOutfit: mock.recommendOutfit }))

import { GET, POST } from '@/app/api/outfits/next/route'

const settings = { recommendTime: '21:00', recommendDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'Asia/Seoul' }

beforeEach(() => {
  mock.user = { id: 'u1' }
  for (const fn of [mock.getSettings, mock.getOutfitPlan, mock.listClosetItems, mock.recommendOutfit]) fn.mockReset()
  mock.getSettings.mockResolvedValue(settings)
})

describe('POST /api/outfits/next', () => {
  test('로그인하지 않으면 401', async () => {
    mock.user = null
    expect((await POST()).status).toBe(401)
  })

  test('방금 추천했다면 429이고 AI를 부르지 않는다', async () => {
    mock.getOutfitPlan.mockResolvedValue({ outfit: {}, createdAt: new Date().toISOString() })
    expect((await POST()).status).toBe(429)
    expect(mock.recommendOutfit).not.toHaveBeenCalled()
  })

  test('DB 오류도 JSON 에러(502)로 돌려준다', async () => {
    mock.getOutfitPlan.mockResolvedValue(null)
    mock.listClosetItems.mockRejectedValue(new Error('db down'))
    const res = await POST()
    expect(res.status).toBe(502)
    expect(await res.json()).toHaveProperty('error')
    expect(mock.recommendOutfit).not.toHaveBeenCalled()
  })
})

describe('GET /api/outfits/next', () => {
  test('DB 오류는 JSON 에러(500)', async () => {
    mock.getSettings.mockRejectedValue(new Error('db down'))
    const res = await GET()
    expect(res.status).toBe(500)
    expect(await res.json()).toHaveProperty('error')
  })
})
