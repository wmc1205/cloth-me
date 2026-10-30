import { generateText, NoObjectGeneratedError, Output, type ModelMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { z } from 'zod'

// 모델 선택 기준이 아직 문서에 없다. 정해지면 docs/decisions.md에 기록한다.
const MODEL = 'claude-sonnet-5-5'

// 스키마 검증에 실패하면 1회 재시도하고, 그래도 실패하면 에러를 던진다(폴백은 호출 측 몫).
export async function generateJson<T extends z.ZodType>(options: {
  system: string
  schema: T
  messages: ModelMessage[]
}): Promise<z.infer<T>> {
  for (let attempt = 1; ; attempt++) {
    try {
      const { output } = await generateText({
        model: anthropic(MODEL),
        system: options.system,
        output: Output.object({ schema: options.schema }),
        messages: options.messages,
      })
      // Output.object가 스키마로 이미 검증했다. 제네릭이라 타입만 좁힌다.
      return output as z.infer<T>
    } catch (error) {
      if (attempt >= 2 || !NoObjectGeneratedError.isInstance(error)) throw error
    }
  }
}

export type ImageInput = {
  bytes: Uint8Array
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export function imageMessage(text: string, image: ImageInput): ModelMessage[] {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', text },
        { type: 'file', mediaType: image.mediaType, data: image.bytes },
      ],
    },
  ]
}

export function textMessage(text: string): ModelMessage[] {
  return [{ role: 'user', content: text }]
}
