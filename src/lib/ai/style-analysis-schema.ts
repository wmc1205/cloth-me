import { z } from 'zod'
import { CATEGORIES, STYLES } from '@/lib/closet/schema'

const color = z.string().trim().min(1).max(30)
const text = z.string().trim().min(1).max(300)

const itemSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().trim().min(1).max(50),
  colors: z.array(color).min(1).max(3),
  pattern: z.string().trim().min(1).max(30).optional(),
  material: z.string().trim().min(1).max(30).optional(),
})

// 개수(정확히 3개 등)는 프롬프트가 지시하고 스키마는 상한만 둔다.
// "옷 없음" 응답은 추천 배열이 비어 있어야 하기 때문이다.
export const styleAnalysisSchema = z.object({
  items: z.array(itemSchema).max(10),
  styles: z.array(z.enum(STYLES)).max(3),
  palette: z.object({
    main: color,
    sub: color.optional(),
    accent: color.optional(),
    tone: z.enum(['warm', 'cool', 'neutral']),
  }).optional(),
  summary: text,
  colorCombos: z.array(z.object({
    colors: z.array(color).min(2).max(4),
    principle: z.enum(['tone_on_tone', 'tone_in_tone', 'complementary_accent', 'neutral_base_accent']),
    occasion: z.string().trim().min(1).max(50),
    why: text,
  })).max(3),
  styleCombos: z.array(z.object({
    title: z.string().trim().min(1).max(50),
    styles: z.array(z.enum(STYLES)).max(3),
    pieces: z.object({
      outer: z.string().max(80).optional(),
      top: z.string().max(80),
      bottom: z.string().max(80),
      shoes: z.string().max(80).optional(),
      etc: z.array(z.string().max(80)).max(5),
    }),
    point: text,
  })).max(3),
  avoid: z.array(z.object({ combo: text, why: text })).max(2),
  trendNotes: z.array(text).max(5),
  shoppingHints: z.array(z.object({
    category: z.enum(CATEGORIES),
    query: z.string().trim().min(1).max(40), // shopping-recommend 규칙: 검색어 40자 이내
    why: text,
  })).max(2),
  followUpQuestions: z.array(text).max(2),
  confidence: z.number().min(0).max(1),
})

export type StyleAnalysis = z.infer<typeof styleAnalysisSchema>
