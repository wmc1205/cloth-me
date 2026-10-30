import { deflateSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { tagItem } from '@/lib/ai/tag-item'
import { analyzeStyle } from '@/lib/ai/analyze-style'
import { analyzeStyleProfile } from '@/lib/ai/style-profile'
import { findInvalidIds, recommendOutfit, type ClosetOption } from '@/lib/ai/recommend-outfit'
import { summarizeCloset } from '@/lib/closet/stats'

// 실제 Claude API를 호출한다. 비용이 들고 키가 필요하므로 RUN_LIVE=1일 때만 실행한다.
//   node --env-file=.env.local node_modules/.bin/vitest run tests/live-ai.test.ts   (RUN_LIVE=1 필요)
const live = process.env.RUN_LIVE === '1'

function crc32(buf: Buffer) {
  let c, crc = ~0
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return ~crc >>> 0
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// 회색 배경에 네이비 반팔 티셔츠 모양을 그린 256x256 PNG.
function shirtPng() {
  const size = 256
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const body = x > 80 && x < 176 && y > 70 && y < 220
      const sleeves = y > 60 && y < 110 && x > 40 && x < 216
      const neck = x > 112 && x < 144 && y < 90
      const shirt = (body || sleeves) && !neck
      const [r, g, b] = shirt ? [25, 40, 90] : [200, 200, 200]
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]))
}

describe.skipIf(!live)('실제 Claude API', () => {
  const image = { bytes: shirtPng(), mediaType: 'image/png' as const }

  test('tagItem이 스키마에 맞는 태그를 돌려준다', async () => {
    const tag = await tagItem(image)
    console.log('tagItem 결과:', JSON.stringify(tag))
    expect(tag.colors.length).toBeGreaterThan(0)
  }, 60000)

  test('analyzeStyle이 스키마에 맞는 분석을 돌려준다', async () => {
    const result = await analyzeStyle({ image })
    console.log('analyzeStyle 요약:', result.summary, '| confidence', result.confidence)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
  }, 90000)

  const closet: ClosetOption[] = [
    { id: 't1', category: 'top', name: '네이비 반팔 티셔츠', colors: ['navy'], seasons: ['spring', 'summer'], styles: ['casual'], isNew: true },
    { id: 't2', category: 'top', name: '화이트 옥스포드 셔츠', colors: ['white'], seasons: ['spring', 'fall'], styles: ['office', 'minimal'], isNew: false },
    { id: 't3', category: 'top', name: '그레이 맨투맨', colors: ['gray'], seasons: ['fall', 'winter'], styles: ['casual'], isNew: false },
    { id: 'b1', category: 'bottom', name: '베이지 치노 팬츠', colors: ['beige'], seasons: ['spring', 'fall'], styles: ['casual', 'office'], isNew: false },
    { id: 'b2', category: 'bottom', name: '블랙 슬랙스', colors: ['black'], seasons: ['fall', 'winter'], styles: ['office', 'formal'], isNew: false },
    { id: 'o1', category: 'outer', name: '차콜 울 코트', colors: ['charcoal'], seasons: ['fall', 'winter'], styles: ['formal', 'minimal'], isNew: true },
    { id: 's1', category: 'shoes', name: '화이트 스니커즈', colors: ['white'], seasons: ['spring', 'summer', 'fall'], styles: ['casual', 'minimal'], isNew: false },
  ]

  test('analyzeStyleProfile이 스타일 프로필과 검색어를 만든다', async () => {
    const summary = summarizeCloset(closet.map((item) => ({
      ...item, tagged_at: '2026-10-30T00:00:00Z', confidence: 0.9,
    })))
    const profile = await analyzeStyleProfile(summary)
    console.log('프로필:', profile.summary, '| 스타일', profile.dominantStyles.join(','), '| 검색어', profile.itemSuggestions.map((i) => i.query).join(' / '))
    expect(profile.itemSuggestions.every((i) => i.query.length <= 40)).toBe(true)
    // 이미 가진 옷(차콜 울 코트, 화이트 스니커즈)을 다시 추천하지 않아야 한다.
    const queries = profile.itemSuggestions.map((i) => i.query).join(' ')
    expect(queries).not.toContain('차콜 울 코트')
    expect(queries).not.toContain('화이트 스니커즈')
  }, 90000)

  test('recommendOutfit이 옷장에 있는 옷으로만 코디를 만든다', async () => {
    const outfit = await recommendOutfit({
      targetDate: '2026-10-31', weekday: '토', season: 'fall', closet,
      styleSummary: '미니멀 캐주얼 (기본 색: navy, white, beige)',
    })
    console.log('코디:', JSON.stringify(outfit))
    expect(findInvalidIds(outfit, closet)).toEqual([])
  }, 90000)
})

// 실제 사진(CC BY-SA, 위키미디어)으로 분류·제외·브랜드를 확인한다. REAL_PHOTO_DIR에 사진이 있어야 한다.
const photoDir = process.env.REAL_PHOTO_DIR

describe.skipIf(!live || !photoDir)('실제 옷 사진 태깅', () => {
  async function tagPhoto(file: string) {
    const { readFileSync } = await import('node:fs')
    const bytes = new Uint8Array(readFileSync(`${photoDir}/${file}`))
    const tag = await tagItem({ bytes, mediaType: 'image/jpeg' })
    console.log(`[${file}]`, JSON.stringify(tag))
    return tag
  }

  test('풍경 사진은 옷이 아니라고 판정한다', async () => {
    expect((await tagPhoto('landscape.jpg')).isClothing).toBe(false)
  }, 60000)

  test('음식 사진은 옷이 아니라고 판정한다', async () => {
    expect((await tagPhoto('food.jpg')).isClothing).toBe(false)
  }, 60000)

  test('바지 사진은 하의로 분류한다', async () => {
    const tag = await tagPhoto('chino-pants.jpg')
    expect(tag.isClothing).toBe(true)
    expect(tag.category).toBe('bottom')
  }, 60000)

  test('신발과 청바지가 함께 찍힌 사진은 제외하지 않고 낮은 신뢰도로 남긴다', async () => {
    const tag = await tagPhoto('white-sneakers.jpg')
    expect(tag.isClothing).toBe(true)
    expect(tag.category === 'shoes' || tag.confidence <= 0.5).toBe(true)
  }, 60000)

  test('스웨터 사진은 옷으로 판정한다', async () => {
    expect((await tagPhoto('turtleneck-top.jpg')).isClothing).toBe(true)
  }, 60000)

  test('로고가 보이는 신발 사진에서 brand를 읽거나 비워 둔다', async () => {
    const tag = await tagPhoto('logo-sneakers.jpg')
    expect(tag.isClothing).toBe(true)
    expect(tag.brand === undefined || tag.brand.length > 0).toBe(true)
  }, 60000)
})
