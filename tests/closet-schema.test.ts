import { describe, expect, test } from 'vitest'
import { detectImageType, uploadFieldsSchema } from '@/lib/closet/schema'

describe('detectImageType', () => {
  test('jpeg/png/webp를 매직바이트로 구분한다', () => {
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe('image/jpeg')
    expect(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe('image/png')
    const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]
    expect(detectImageType(Uint8Array.from(webp))?.mime).toBe('image/webp')
  })

  test('이미지가 아니면 null (확장자·Content-Type을 속인 HTML 등)', () => {
    expect(detectImageType(new TextEncoder().encode('<html><script>'))).toBeNull()
    expect(detectImageType(new Uint8Array(0))).toBeNull()
  })
})

describe('uploadFieldsSchema', () => {
  test('올바른 값은 통과하고 이름은 공백을 다듬는다', () => {
    expect(uploadFieldsSchema.parse({ category: 'top', name: '  후드  ' }).name).toBe('후드')
  })

  test('잘못된 category, 빈 이름, 긴 이름은 거부한다', () => {
    expect(uploadFieldsSchema.safeParse({ category: 'hat', name: 'a' }).success).toBe(false)
    expect(uploadFieldsSchema.safeParse({ category: 'top', name: '  ' }).success).toBe(false)
    expect(uploadFieldsSchema.safeParse({ category: 'top', name: 'a'.repeat(51) }).success).toBe(false)
  })
})
