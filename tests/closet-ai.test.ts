import { describe, expect, test } from 'vitest'
import { summarizeCloset } from '@/lib/closet/stats'
import { tagSchema } from '@/lib/ai/tag-item'
import { styleProfileSchema } from '@/lib/ai/style-profile'
import { findInvalidIds, type ClosetOption, type Outfit } from '@/lib/ai/recommend-outfit'
import { shoppingSearchLinks } from '@/lib/shopping/search-links'

describe('summarizeCloset', () => {
  const item = (over: object) => ({
    category: 'top', name: '셔츠', colors: ['white'], seasons: ['fall'], styles: ['casual'],
    tagged_at: '2026-10-30T00:00:00Z', confidence: 0.9, ...over,
  })

  test('색·스타일·카테고리를 많은 순으로 집계한다', () => {
    const summary = summarizeCloset([
      item({}), item({ colors: ['white', 'navy'] }), item({ category: 'bottom', colors: ['navy'], styles: ['office'] }),
    ])
    expect(summary.colors[0]).toEqual({ name: 'white', count: 2 })
    expect(summary.categories[0]).toEqual({ name: 'top', count: 2 })
    expect(summary.taggedCount).toBe(3)
  })

  test('이미 가진 옷 이름을 owned로 담는다', () => {
    const summary = summarizeCloset([item({ name: '화이트 셔츠' }), item({ tagged_at: null, name: '미분류' })])
    expect(summary.owned).toEqual([{ category: 'top', name: '화이트 셔츠' }])
  })

  test('태깅 전이거나 신뢰도가 낮은 옷은 집계에서 뺀다', () => {
    const summary = summarizeCloset([item({}), item({ tagged_at: null }), item({ confidence: 0.4 })])
    expect(summary.total).toBe(3)
    expect(summary.taggedCount).toBe(1)
  })
})

describe('tagSchema', () => {
  const valid = { isClothing: true, category: 'top', name: '화이트 셔츠', colors: ['white'], seasons: ['spring'], styles: ['casual'], confidence: 0.8 }

  test('올바른 태그는 통과한다', () => {
    expect(tagSchema.safeParse(valid).success).toBe(true)
  })

  test('isClothing이 없거나 brand가 40자를 넘으면 거부한다', () => {
    expect(tagSchema.safeParse({ ...valid, isClothing: undefined }).success).toBe(false)
    expect(tagSchema.safeParse({ ...valid, brand: 'A'.repeat(41) }).success).toBe(false)
    expect(tagSchema.safeParse({ ...valid, brand: 'NIKE' }).success).toBe(true)
  })

  test('색이 4개이거나 알 수 없는 스타일은 거부한다', () => {
    expect(tagSchema.safeParse({ ...valid, colors: ['a', 'b', 'c', 'd'] }).success).toBe(false)
    expect(tagSchema.safeParse({ ...valid, styles: ['gothic'] }).success).toBe(false)
  })
})

describe('styleProfileSchema', () => {
  test('아이템 추천 검색어가 40자를 넘으면 거부한다', () => {
    const profile = {
      summary: '깔끔해요.', styleKeywords: ['미니멀'], dominantStyles: ['minimal'],
      palette: { core: ['white'], accent: [], tone: 'neutral' }, strengths: [], gaps: [],
      itemSuggestions: [{ category: 'bottom', query: '가'.repeat(41), why: '필요해요.' }],
    }
    expect(styleProfileSchema.safeParse(profile).success).toBe(false)
    profile.itemSuggestions[0].query = '베이지 와이드 슬랙스'
    expect(styleProfileSchema.safeParse(profile).success).toBe(true)
  })
})

describe('findInvalidIds', () => {
  const closet: ClosetOption[] = [
    { id: 't1', category: 'top', name: '셔츠', colors: ['white'], seasons: [], styles: [], isNew: true },
    { id: 'b1', category: 'bottom', name: '슬랙스', colors: ['beige'], seasons: [], styles: [], isNew: false },
  ]
  const outfit = (items: Outfit['items']): Outfit => ({ items, reason: '좋아요.', shoppingHints: [] })

  test('옷장에 있는 id와 맞는 카테고리면 문제가 없다', () => {
    expect(findInvalidIds(outfit({ top: 't1', bottom: 'b1', etc: [] }), closet)).toEqual([])
  })

  test('없는 id와 자리가 맞지 않는 옷을 잡아낸다', () => {
    const problems = findInvalidIds(outfit({ top: 'b1', bottom: 'zzz', etc: ['nope'] }), closet)
    expect(problems).toHaveLength(3)
  })
})

describe('shoppingSearchLinks', () => {
  test('검색어를 URL 인코딩한 https 링크를 만든다', () => {
    const links = shoppingSearchLinks('베이지 와이드 슬랙스 & 벨트')
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.url.startsWith('https://')).toBe(true)
      expect(link.url).toContain(encodeURIComponent('베이지 와이드 슬랙스 & 벨트'))
    }
  })

  test('40자를 넘는 검색어는 자른다', () => {
    const [link] = shoppingSearchLinks('가'.repeat(60))
    expect(link.url).toContain(encodeURIComponent('가'.repeat(40)))
    expect(link.url).not.toContain(encodeURIComponent('가'.repeat(41)))
  })

  test('<script> 같은 입력도 인코딩되어 URL 구조를 깨지 못한다', () => {
    const [link] = shoppingSearchLinks('"><script>x</script>')
    expect(link.url).not.toContain('<')
    expect(new URL(link.url).hostname).toBe('search.shopping.naver.com')
  })
})
