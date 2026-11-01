import { describe, expect, test } from 'vitest'
import { detectOutfitSchema } from '@/lib/ai/detect-outfit'
import { tagSchema } from '@/lib/ai/tag-item'

const item = {
  box: { x: 310, y: 180, w: 380, h: 420 },
  category: 'top',
  name: '화이트 오버핏 셔츠',
  colors: ['white'],
  seasons: ['spring'],
  styles: ['casual'],
  confidence: 0.8,
}

describe('detectOutfitSchema', () => {
  test('정상 응답을 통과시킨다', () => {
    expect(detectOutfitSchema.safeParse({ items: [item] }).success).toBe(true)
  })

  test('아이템이 없는 응답(빈 배열)을 허용한다', () => {
    expect(detectOutfitSchema.safeParse({ items: [] }).success).toBe(true)
  })

  test('박스 좌표가 0~1000을 벗어나면 거부한다', () => {
    const bad = { items: [{ ...item, box: { ...item.box, x: 1200 } }] }
    expect(detectOutfitSchema.safeParse(bad).success).toBe(false)
  })

  test('박스가 없으면 거부한다', () => {
    expect(detectOutfitSchema.safeParse({ items: [{ ...item, box: undefined }] }).success).toBe(false)
  })

  test('허용되지 않은 category는 거부한다', () => {
    expect(detectOutfitSchema.safeParse({ items: [{ ...item, category: 'hat' }] }).success).toBe(false)
  })

  test('아이템이 8개를 넘으면 거부한다', () => {
    expect(detectOutfitSchema.safeParse({ items: Array(9).fill(item) }).success).toBe(false)
  })
})

describe('tagSchema.wornByPerson', () => {
  const tag = { isClothing: true, category: 'top', name: '셔츠', colors: ['white'], seasons: [], styles: [], confidence: 0.9 }

  test('없어도 통과한다(기존 응답과 호환)', () => {
    expect(tagSchema.safeParse(tag).success).toBe(true)
  })

  test('true/false 값을 받는다', () => {
    expect(tagSchema.parse({ ...tag, wornByPerson: true }).wornByPerson).toBe(true)
  })
})
