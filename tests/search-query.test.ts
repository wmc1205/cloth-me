import { describe, expect, test } from 'vitest'
import { searchQuerySchema } from '@/lib/shopping/search-links'

describe('searchQuerySchema', () => {
  test('일반 검색어는 통과한다', () => {
    expect(searchQuerySchema.safeParse('베이지 와이드 슬랙스').success).toBe(true)
  })

  test.each(['https://evil.example/x', 'http://a.b', 'www.example.com 슬랙스', 'HTTPS://A.B'])('링크가 든 검색어는 거부한다: %s', (query) => {
    expect(searchQuerySchema.safeParse(query).success).toBe(false)
  })

  test('빈 검색어와 40자 초과는 거부한다', () => {
    expect(searchQuerySchema.safeParse('  ').success).toBe(false)
    expect(searchQuerySchema.safeParse('가'.repeat(41)).success).toBe(false)
  })
})
