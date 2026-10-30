import { describe, expect, test } from 'vitest'
import { styleAnalysisSchema } from '@/lib/ai/style-analysis-schema'
import { buildStyleAnalysisPrompt } from '@/lib/ai/prompts/style-analysis'

// 프롬프트의 JSON 예시를 그대로 꺼내 쓴다. 프롬프트와 스키마가 어긋나면 여기서 잡힌다.
function exampleFromPrompt() {
  const prompt = buildStyleAnalysisPrompt()
  const start = prompt.indexOf('# 출력 JSON 형식')
  const end = prompt.indexOf('# 필드 규칙')
  const json = prompt.slice(start, end).replace('# 출력 JSON 형식', '').trim()
  return JSON.parse(json)
}

describe('styleAnalysisSchema', () => {
  test('프롬프트의 JSON 예시가 스키마를 통과한다', () => {
    expect(styleAnalysisSchema.safeParse(exampleFromPrompt()).success).toBe(true)
  })

  test('옷이 없는 사진 응답(빈 배열 + 낮은 confidence)을 허용한다', () => {
    const empty = {
      items: [], styles: [], summary: '옷이 보이지 않아요.',
      colorCombos: [], styleCombos: [], avoid: [], trendNotes: [],
      shoppingHints: [], followUpQuestions: [], confidence: 0.2,
    }
    expect(styleAnalysisSchema.safeParse(empty).success).toBe(true)
  })

  test('허용되지 않은 category는 거부한다', () => {
    const example = exampleFromPrompt()
    example.items[0].category = 'hat'
    expect(styleAnalysisSchema.safeParse(example).success).toBe(false)
  })

  test('confidence가 0~1 범위를 벗어나면 거부한다', () => {
    const example = exampleFromPrompt()
    example.confidence = 1.5
    expect(styleAnalysisSchema.safeParse(example).success).toBe(false)
  })

  test('쇼핑 검색어가 40자를 넘으면 거부한다', () => {
    const example = exampleFromPrompt()
    example.shoppingHints[0].query = '가'.repeat(41)
    expect(styleAnalysisSchema.safeParse(example).success).toBe(false)
  })
})

describe('buildStyleAnalysisPrompt', () => {
  test('값이 없으면 "없음"으로 치환하고 플레이스홀더를 남기지 않는다', () => {
    expect(buildStyleAnalysisPrompt()).not.toContain('{{')
  })

  test('사용자 정보와 트렌드 자료를 치환한다', () => {
    const prompt = buildStyleAnalysisPrompt({ userProfile: '출근룩 선호', trendContext: '와이드 팬츠' })
    expect(prompt).toContain('출근룩 선호')
    expect(prompt).toContain('와이드 팬츠')
  })
})
