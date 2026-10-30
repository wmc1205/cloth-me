import { describe, expect, test } from 'vitest'
import { isDue, isNewItem, localParts, nextTargetDay, seasonOf, settingsSchema, type Settings } from '@/lib/outfit/schedule'

const base: Settings = { recommendTime: '21:00', recommendDays: [0, 1, 2, 3, 4, 5, 6], timezone: 'Asia/Seoul' }

describe('localParts', () => {
  test('UTC 시각을 서울 시간 기준 날짜로 바꾼다', () => {
    // 2026-10-30 16:30 UTC = 2026-10-31 01:30 KST
    expect(localParts(new Date('2026-10-30T16:30:00Z'), 'Asia/Seoul')).toEqual({ date: '2026-10-31', minutes: 90 })
  })
})

describe('nextTargetDay', () => {
  const now = new Date('2026-10-30T12:00:00Z') // 서울 10-30(금) 21:00

  test('모든 요일을 선택하면 내일이다', () => {
    expect(nextTargetDay(now, base)).toEqual({ date: '2026-10-31', weekday: 6 })
  })

  test('내일 요일이 빠져 있으면 선택한 다음 요일로 넘어간다', () => {
    // 토(6), 일(0)을 빼고 월~금만 선택 → 다음 월요일
    expect(nextTargetDay(now, { ...base, recommendDays: [1, 2, 3, 4, 5] })).toEqual({ date: '2026-11-02', weekday: 1 })
  })

  test('월 경계를 넘어가도 날짜가 맞다', () => {
    const endOfMonth = new Date('2026-12-31T12:00:00Z')
    expect(nextTargetDay(endOfMonth, base)).toEqual({ date: '2027-01-01', weekday: 5 })
  })

  test('오늘과 같은 요일만 선택하면 7일 뒤다', () => {
    expect(nextTargetDay(now, { ...base, recommendDays: [5] })).toEqual({ date: '2026-11-06', weekday: 5 })
  })
})

describe('isDue', () => {
  test('설정한 시간 전에는 false, 이후에는 true', () => {
    expect(isDue(new Date('2026-10-30T11:59:00Z'), base)).toBe(false) // 20:59 KST
    expect(isDue(new Date('2026-10-30T12:00:00Z'), base)).toBe(true) // 21:00 KST
  })
})

describe('isNewItem / seasonOf', () => {
  test('24시간 안에 올린 옷만 새 옷이다', () => {
    const now = new Date('2026-10-30T12:00:00Z')
    expect(isNewItem('2026-10-30T01:00:00Z', now)).toBe(true)
    expect(isNewItem('2026-10-29T11:00:00Z', now)).toBe(false)
  })

  test('월로 계절을 구한다', () => {
    expect(seasonOf('2026-12-01')).toBe('winter')
    expect(seasonOf('2026-04-10')).toBe('spring')
    expect(seasonOf('2026-07-10')).toBe('summer')
    expect(seasonOf('2026-10-31')).toBe('fall')
  })
})

describe('settingsSchema', () => {
  test('올바른 값은 통과한다', () => {
    expect(settingsSchema.safeParse(base).success).toBe(true)
  })

  test('잘못된 시간, 빈 요일, 없는 시간대는 거부한다', () => {
    expect(settingsSchema.safeParse({ ...base, recommendTime: '25:00' }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...base, recommendDays: [] }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...base, recommendDays: [7] }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...base, timezone: 'Mars/Base' }).success).toBe(false)
  })
})
