import { z } from 'zod'
import { CATEGORIES, STYLES } from '@/lib/closet/schema'
import type { ClosetSummary } from '@/lib/closet/stats'
import { searchQuerySchema } from '@/lib/shopping/search-links'
import { generateJson, textMessage } from './generate-json'

const text = z.string().trim().min(1).max(200)
const color = z.string().trim().min(1).max(30)

export const styleProfileSchema = z.object({
  summary: text,
  styleKeywords: z.array(z.string().trim().min(1).max(20)).max(5),
  dominantStyles: z.array(z.enum(STYLES)).min(1).max(3),
  palette: z.object({
    core: z.array(color).min(1).max(4),
    accent: z.array(color).max(3),
    tone: z.enum(['warm', 'cool', 'neutral']),
  }),
  strengths: z.array(text).max(3),
  gaps: z.array(text).max(3),
  // 상품이 아니라 검색어만. 쇼핑 연결은 검색 바로가기 링크만 쓴다. (shopping-recommend)
  itemSuggestions: z.array(z.object({
    category: z.enum(CATEGORIES),
    query: searchQuerySchema,
    why: text,
  })).max(4),
})

export type StyleProfile = z.infer<typeof styleProfileSchema>

const SYSTEM = `너는 패션 스타일리스트다. 사용자의 옷장 태그 집계를 보고 이 사람의 스타일을 판별해서 JSON으로만 답해라. 설명 문장은 쓰지 마라.

- summary: 이 사용자의 스타일을 한두 문장으로. 친근한 존댓말.
- styleKeywords: 스타일을 나타내는 짧은 한국어 키워드 최대 5개.
- dominantStyles: casual | office | formal | sporty | street | minimal 중 가장 두드러지는 것 1~3개.
- palette: core(자주 입는 기본 색), accent(포인트가 될 색), tone(warm | cool | neutral). 색은 영어 소문자 기본 색상명.
- strengths: 옷장의 강점 최대 3개.
- gaps: 부족한 카테고리나 색, 스타일 최대 3개.
- itemSuggestions: gaps를 채워 스타일에 맞는 아이템을 사는 데 쓸 쇼핑 검색어 최대 4개. category는 outer/top/bottom/shoes/etc 중 하나.
  query는 40자 이내의 일반 상품 검색어(예: 베이지 와이드 슬랙스). 브랜드명, 가격, 링크, 상품명은 쓰지 않는다.

규칙:
1. 집계 데이터에 있는 것만 근거로 한다. 데이터에 없는 취향이나 체형을 추측하지 않는다.
2. 사용자의 외모나 체형을 평가하지 않는다.
3. owned는 사용자가 이미 가진 옷이다. itemSuggestions에는 owned와 같거나 거의 같은 옷(같은 종류와 색)을 넣지 않는다. 새로 사면 코디의 폭이 넓어지는 아이템만 제안한다.`

export function analyzeStyleProfile(summary: ClosetSummary): Promise<StyleProfile> {
  return generateJson({
    system: SYSTEM,
    schema: styleProfileSchema,
    messages: textMessage(`옷장 집계:\n${JSON.stringify(summary)}`),
  })
}
