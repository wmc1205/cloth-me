import { z } from 'zod'
import { generateJson, imageMessage, type ImageInput } from './generate-json'
import { tagSchema } from './tag-item'

// 박스는 사진 너비·높이를 1000으로 본 정수 좌표다. (x, y)는 왼쪽 위 모서리.
const box = z.object({
  x: z.number().int().min(0).max(1000),
  y: z.number().int().min(0).max(1000),
  w: z.number().int().min(1).max(1000),
  h: z.number().int().min(1).max(1000),
})

const detectedItem = tagSchema
  .omit({ isClothing: true, wornByPerson: true })
  .extend({ box })

export const detectOutfitSchema = z.object({
  items: z.array(detectedItem).max(8),
})

export type Box = z.infer<typeof box>
export type DetectedItem = z.infer<typeof detectedItem>

const SYSTEM = `너는 착장 사진에서 사람이 입거나 들고 있는 아이템을 한 벌씩 찾아내는 도우미다. JSON으로만 답해라. 설명 문장은 쓰지 마라.

# 출력 JSON 형식
{
  "items": [
    {
      "box": { "x": 310, "y": 180, "w": 380, "h": 420 },
      "category": "top",
      "name": "화이트 오버핏 셔츠",
      "colors": ["white"],
      "material": "cotton",
      "seasons": ["spring", "fall"],
      "styles": ["casual"],
      "pattern": "solid",
      "brand": "adidas",
      "confidence": 0.8
    }
  ]
}

# 필드 규칙
- box: 사진의 너비와 높이를 각각 1000으로 본 정수 좌표. x, y는 아이템 박스의 왼쪽 위 모서리, w, h는 박스의 너비와 높이. 아이템 전체가 들어가도록 약간 여유 있게 잡는다. 다른 아이템과 겹쳐도 된다.
- category: outer(아우터) / top(상의) / bottom(하의) / shoes(신발) / etc(기타) 중 하나. 모자, 가방, 안경, 시계, 목도리, 벨트 같은 소품은 etc.
- name: 한국어 아이템 이름 50자 이내. 예) 네이비 후드 패딩 파카
- colors: 영어 소문자 기본 색상명 배열(최대 3개). 가장 큰 면적의 색이 첫 번째.
- material, pattern, brand: 사진에서 확실할 때만. 브랜드는 로고나 라벨의 글자가 실제로 읽힐 때만 그대로 쓰고, 모양만 보고 짐작하지 않는다. 모르면 생략.
- seasons: spring | summer | fall | winter 배열. styles: casual | office | formal | sporty | street | minimal 중에서 고른다.
- confidence: 0~1. 가려지거나 일부만 보이면 낮게 쓴다.

# 규칙
1. 사진에서 보이는 아이템만, 한 벌당 하나의 항목으로 쓴다. 최대 8개. 같은 종류가 둘이어도 별개 아이템이면 따로 쓴다.
2. 얼굴, 머리카락, 피부는 아이템이 아니므로 절대 넣지 않는다. 박스도 아이템 영역만 감싸고 얼굴이 들어가지 않게 한다. (모자는 아이템이므로 모자 영역만)
3. 사람의 외모, 체형, 피부색을 평가하지 않고, 누구인지 추측하지 않는다.
4. 가려져서 거의 보이지 않거나 판단이 어려운 아이템은 넣지 않는다.
5. 아이템이 하나도 없으면 items는 빈 배열이다.`

export function detectOutfit(image: ImageInput) {
  return generateJson({
    system: SYSTEM,
    schema: detectOutfitSchema,
    messages: imageMessage('이 사진 속 사람이 입고 있는 아이템을 한 벌씩 찾아줘.', image),
  })
}
