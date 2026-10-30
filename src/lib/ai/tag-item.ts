import { z } from 'zod'
import { CATEGORIES, SEASONS, STYLES } from '@/lib/closet/schema'
import { generateJson, imageMessage, type ImageInput } from './generate-json'

export const tagSchema = z.object({
  // false면 옷이 아닌 사진이다. 서버가 옷장에서 자동으로 제외한다.
  isClothing: z.boolean(),
  category: z.enum(CATEGORIES),
  name: z.string().trim().min(1).max(50),
  colors: z.array(z.string().trim().min(1).max(30)).min(1).max(3),
  material: z.string().trim().min(1).max(30).optional(),
  seasons: z.array(z.enum(SEASONS)).max(4),
  styles: z.array(z.enum(STYLES)).max(3),
  pattern: z.string().trim().min(1).max(30).optional(),
  // 사진에서 로고/라벨 글자가 읽힐 때만 채운다. 추측하지 않는다.
  brand: z.string().trim().min(1).max(40).optional(),
  confidence: z.number().min(0).max(1),
})

export type Tag = z.infer<typeof tagSchema>

const SYSTEM = `너는 옷 사진을 분석하는 도우미다. 사진 속 옷 한 벌을 분석해서 JSON으로만 답해라. 설명 문장은 쓰지 마라.

- isClothing: 사진에 옷·신발·가방·모자 등 착용 아이템이 하나라도 있으면 true. 풍경, 음식, 동물, 문서, 사람 얼굴만 있는 사진처럼 착용 아이템이 전혀 없을 때만 false.
- category: outer(아우터) / top(상의) / bottom(하의) / shoes(신발) / etc(기타) 중 하나. 애매하면 etc.
- name: 한국어 옷 이름 50자 이내. 예) 화이트 오버핏 셔츠
- colors: 영어 소문자 기본 색상명 배열(최대 3개). 가장 큰 면적의 색이 첫 번째.
- material: 사진에서 확실할 때만. 예) cotton, denim, wool. 모르면 생략.
- seasons: spring | summer | fall | winter 배열.
- styles: casual | office | formal | sporty | street | minimal 중에서 고른다.
- pattern: solid, stripe, check, dot, print 등. 모르면 생략.
- brand: 사진에서 로고나 라벨의 글자가 실제로 읽힐 때만 그 글자 그대로 쓴다. 디자인이나 모양만 보고 브랜드를 짐작하지 않는다. 읽을 수 없으면 생략.
- confidence: 0~1. 확신이 낮을수록 낮게 쓴다.

규칙:
1. isClothing이 false면 category는 etc, name은 "옷이 아닌 사진", colors는 ["gray"], confidence는 0으로 쓴다. 나머지는 생략한다.
2. 옷이 있는지 애매하거나 옷이 여러 벌이면 isClothing은 true로 두고 category는 etc, confidence는 0.3 이하로 한다. 애매할 때 false로 하지 않는다.
3. 가격은 추측하지 않는다.`

export function tagItem(image: ImageInput): Promise<Tag> {
  return generateJson({
    system: SYSTEM,
    schema: tagSchema,
    messages: imageMessage('이 옷을 분석해줘.', image),
  })
}
