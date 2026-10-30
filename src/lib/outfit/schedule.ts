import { z } from 'zod'

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export const settingsSchema = z.object({
  recommendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  // 입을 날의 요일. 0=일 ... 6=토
  recommendDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz })
      return true
    } catch {
      return false
    }
  }),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  recommendTime: '21:00',
  recommendDays: [0, 1, 2, 3, 4, 5, 6],
  timezone: 'Asia/Seoul',
}

// 지정한 시간대의 현재 날짜(YYYY-MM-DD)와 하루 중 분(0~1439).
export function localParts(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return { date: next.toISOString().slice(0, 10), weekday: next.getUTCDay() }
}

// 내일부터 7일 안에서 선택한 요일에 해당하는 가장 가까운 날. 선택한 요일이 없으면 null.
export function nextTargetDay(now: Date, settings: Settings) {
  const today = localParts(now, settings.timezone).date
  for (let offset = 1; offset <= 7; offset++) {
    const day = addDays(today, offset)
    if (settings.recommendDays.includes(day.weekday)) return day
  }
  return null
}

// 설정한 시간이 지났으면 추천을 만들 때가 된 것이다.
export function isDue(now: Date, settings: Settings) {
  const [hour, minute] = settings.recommendTime.split(':').map(Number)
  return localParts(now, settings.timezone).minutes >= hour * 60 + minute
}

// 추천 시점 기준 24시간 안에 올린 옷을 "새 옷"으로 본다.
export function isNewItem(createdAt: string, now: Date) {
  return now.getTime() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
}

export function seasonOf(date: string) {
  const month = Number(date.slice(5, 7))
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}
