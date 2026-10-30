import { z } from 'zod'
import { CATEGORIES } from '@/lib/closet/schema'
import { searchQuerySchema } from '@/lib/shopping/search-links'
import { generateJson, textMessage } from './generate-json'

export const outfitSchema = z.object({
  items: z.object({
    outer: z.string().optional(),
    top: z.string(),
    bottom: z.string(),
    shoes: z.string().optional(),
    etc: z.array(z.string()).max(3),
  }),
  reason: z.string().trim().min(1).max(300),
  shoppingHints: z.array(z.object({
    category: z.enum(CATEGORIES),
    query: searchQuerySchema,
    why: z.string().trim().min(1).max(200),
  })).max(2),
})

export type Outfit = z.infer<typeof outfitSchema>

export type ClosetOption = {
  id: string
  category: string
  name: string
  colors: string[]
  seasons: string[]
  styles: string[]
  isNew: boolean
}

const SLOT_CATEGORY = { outer: 'outer', top: 'top', bottom: 'bottom', shoes: 'shoes' } as const

// AI가 만든 id를 믿지 않는다. 옷장에 없거나 자리(카테고리)가 맞지 않으면 문제 목록에 담는다.
export function findInvalidIds(outfit: Outfit, closet: ClosetOption[]) {
  const byId = new Map(closet.map((item) => [item.id, item]))
  const problems: string[] = []

  for (const [slot, category] of Object.entries(SLOT_CATEGORY)) {
    const id = outfit.items[slot as keyof typeof SLOT_CATEGORY]
    if (id === undefined) continue
    const item = byId.get(id)
    if (!item) problems.push(`${slot}: 옷장에 없는 id ${id}`)
    else if (item.category !== category) problems.push(`${slot}: ${id}는 ${item.category} 카테고리`)
  }
  for (const id of outfit.items.etc) {
    if (!byId.has(id)) problems.push(`etc: 옷장에 없는 id ${id}`)
  }
  return problems
}

const SYSTEM = `너는 패션 스타일리스트다. 사용자의 옷장 목록에서 다음 날 입을 코디 한 벌을 골라 JSON으로만 답해라. 설명 문장은 쓰지 마라.

출력 형식:
{ "items": { "outer": "id", "top": "id", "bottom": "id", "shoes": "id", "etc": ["id"] }, "reason": "...", "shoppingHints": [{ "category": "bottom", "query": "베이지 와이드 슬랙스", "why": "..." }] }

규칙:
1. items의 값은 입력 옷장에 있는 id만 쓴다. 없는 id를 만들지 않는다.
2. top과 bottom은 필수. outer와 shoes는 옷장에 있고 어울릴 때만 넣는다. 자리와 카테고리를 맞춘다(top 자리에는 category가 top인 옷).
3. 입을 날의 계절(season)에 맞지 않는 옷은 피한다.
4. isNew가 true인 옷(최근에 올린 옷)을 가능하면 한 가지 이상 포함해 사용자가 새 옷을 입어 볼 수 있게 한다.
5. 스타일 프로필이 있으면 대표 스타일과 기본 색에 맞춘다.
6. reason은 한국어 친근한 존댓말 한두 문장.
7. shoppingHints는 코디를 완성하는 데 옷장에 없는 것이 있을 때만 최대 2개. 상품이 아니라 40자 이내 검색어만 쓰고 브랜드, 가격, 링크는 쓰지 않는다.`

export async function recommendOutfit(input: {
  targetDate: string
  weekday: string
  season: string
  closet: ClosetOption[]
  styleSummary?: string
}): Promise<Outfit> {
  const message = textMessage(JSON.stringify({
    targetDate: input.targetDate,
    weekday: input.weekday,
    season: input.season,
    styleProfile: input.styleSummary ?? null,
    closet: input.closet,
  }))

  // 검증 실패(없는 id 등)는 1회 다시 시도하고, 그래도 실패하면 에러를 던진다.
  for (let attempt = 1; ; attempt++) {
    const outfit = await generateJson({ system: SYSTEM, schema: outfitSchema, messages: message })
    const problems = findInvalidIds(outfit, input.closet)
    if (problems.length === 0) return outfit
    if (attempt >= 2) throw new Error(`추천 결과가 옷장과 맞지 않습니다: ${problems.join(', ')}`)
  }
}
