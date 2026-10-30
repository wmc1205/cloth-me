import { describe, expect, test, vi } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'

// 실제 Claude API 대신 AI SDK의 목 모델을 쓴다. 키 없이 호출 경로(구조화 출력 파싱, 재시도, 이미지 전달)를 검증한다.
const mock = vi.hoisted(() => ({ model: undefined as unknown }))
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: () => mock.model }))

import { generateJson, imageMessage } from '@/lib/ai/generate-json'
import { tagItem } from '@/lib/ai/tag-item'

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
}
const reply = (text: string) => async () => ({
  content: [{ type: 'text' as const, text }],
  finishReason: { unified: 'stop' as const, raw: undefined },
  usage,
  warnings: [],
})

const tag = { isClothing: true, category: 'top', name: '화이트 셔츠', colors: ['white'], seasons: ['spring'], styles: ['casual'], confidence: 0.9 }
const image = { bytes: Uint8Array.from([0xff, 0xd8, 0xff]), mediaType: 'image/jpeg' as const }

describe('tagItem (목 모델)', () => {
  test('모델의 JSON 응답을 스키마로 검증해 돌려준다', async () => {
    mock.model = new MockLanguageModelV4({ doGenerate: reply(JSON.stringify(tag)) })
    expect(await tagItem(image)).toMatchObject({ category: 'top', name: '화이트 셔츠' })
  })

  test('사진이 file 파트로 모델에 전달된다', async () => {
    const doGenerate = vi.fn((options: { prompt: unknown }) => {
      seen.push(JSON.stringify(options.prompt))
      return reply(JSON.stringify(tag))()
    })
    const seen: string[] = []
    mock.model = new MockLanguageModelV4({ doGenerate })
    await tagItem(image)
    const prompt = seen[0]
    expect(prompt).toContain('image/jpeg')
  })

  test('스키마에 맞지 않는 응답은 1회 재시도한다', async () => {
    const doGenerate = vi.fn()
      .mockImplementationOnce(reply(JSON.stringify({ ...tag, category: 'hat' })))
      .mockImplementationOnce(reply(JSON.stringify(tag)))
    mock.model = new MockLanguageModelV4({ doGenerate })
    expect((await tagItem(image)).category).toBe('top')
    expect(doGenerate).toHaveBeenCalledTimes(2)
  })

  test('두 번 연속 실패하면 에러를 던진다', async () => {
    const doGenerate = vi.fn(reply(JSON.stringify({ ...tag, confidence: 5 })))
    mock.model = new MockLanguageModelV4({ doGenerate })
    await expect(tagItem(image)).rejects.toThrow()
    expect(doGenerate).toHaveBeenCalledTimes(2)
  })
})

describe('tagItem 제외/브랜드 (목 모델)', () => {
  test('옷이 아닌 사진은 isClothing:false로 파싱된다', async () => {
    const notClothing = { isClothing: false, category: 'etc', name: '옷이 아닌 사진', colors: ['gray'], seasons: [], styles: [], confidence: 0 }
    mock.model = new MockLanguageModelV4({ doGenerate: reply(JSON.stringify(notClothing)) })
    expect((await tagItem(image)).isClothing).toBe(false)
  })

  test('읽힌 브랜드는 brand로 돌려준다', async () => {
    mock.model = new MockLanguageModelV4({ doGenerate: reply(JSON.stringify({ ...tag, brand: 'NIKE' })) })
    expect((await tagItem(image)).brand).toBe('NIKE')
  })
})

describe('generateJson', () => {
  test('imageMessage는 텍스트와 사진 파트를 함께 만든다', () => {
    const [message] = imageMessage('분석해줘', image)
    expect(message.role).toBe('user')
    expect(Array.isArray(message.content) && message.content.map((part) => part.type)).toEqual(['text', 'file'])
  })

  test('호출 한 번에 모델이 한 번만 불린다', async () => {
    const { z } = await import('zod')
    const doGenerate = vi.fn(reply('{"ok":true}'))
    mock.model = new MockLanguageModelV4({ doGenerate })
    const out = await generateJson({ system: 's', schema: z.object({ ok: z.boolean() }), messages: [{ role: 'user', content: 'hi' }] })
    expect(out).toEqual({ ok: true })
    expect(doGenerate).toHaveBeenCalledTimes(1)
  })
})
