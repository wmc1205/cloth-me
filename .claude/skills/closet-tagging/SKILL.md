---
name: closet-tagging
description: 옷 사진 AI 태깅 JSON 형식과 규칙. 자동 태깅 기능 작업 시.
---

# 옷 사진 자동 태깅

## 목적
사용자가 올린 옷 사진 1장에서 정보를 뽑아 DB에 저장한다. 사용자는 결과를 수정만 하면 된다.

## 카테고리 (5종, 고정)
`outer`(아우터) / `top`(상의) / `bottom`(하의) / `shoes`(신발) / `etc`(기타)

## 출력 JSON 형식 (Zod 스키마로 검증)
```json
{
  "isClothing": true,
  "category": "top",
  "name": "화이트 오버핏 셔츠",
  "colors": ["white"],
  "material": "cotton",
  "seasons": ["spring", "fall"],
  "styles": ["casual", "office"],
  "pattern": "solid",
  "brand": "adidas",
  "confidence": 0.86
}
```

- `isClothing`: 옷·신발·가방 등이 하나도 없는 사진(풍경, 음식 등)이면 `false`. 서버가 그 사진을 옷장에서 자동으로 삭제한다.
- `wornByPerson`: 사람이 입고 있는 착장 사진이면 `true`. 옷만 단독으로 놓였거나 걸려 있으면 `false`. 없으면 `false`로 본다. (아래 "착장 사진 추출" 참고)
- `category`: 위 5개 중 하나. 애매하면 `etc`
- `colors`: 영어 소문자 기본 색상명 배열(최대 3개). 가장 큰 면적 색이 첫 번째
- `seasons`: `spring | summer | fall | winter` 배열
- `styles`: `casual | office | formal | sporty | street | minimal` 중에서 선택
- `brand`: 사진에서 로고·라벨의 **글자가 읽힐 때만** 그대로 쓴다. 디자인만 보고 추측하지 않으며, 심볼(스우시 등)만 있으면 비운다.
- `confidence`: 0~1. **0.6 미만이면 화면에서 "확인해주세요" 표시**

## 착장 사진 추출
`wornByPerson: true`면 서버가 `detectOutfit()`(`src/lib/ai/detect-outfit.ts`)을 한 번 더 불러 아이템별 `box`(사진 너비·높이를 1000으로 본 정수 좌표 `x,y,w,h`)와 태그를 받는다.
- 서버(`src/lib/closet/crop.ts`)가 박스를 8% 넓혀 잘라 **흰 배경 1024x1024 JPEG**로 만들고, 아이템마다 옷장 행을 만든 뒤 **원본 사람 사진은 지운다.**
- 박스는 모델의 근사치다. 옷 윤곽을 따라 배경을 지우는 누끼는 하지 않는다(잘린 영역 안의 원래 배경은 남는다).
- 얼굴·머리·피부는 아이템이 아니므로 박스에 넣지 않고 외모를 평가하지 않는다. 모자·가방 같은 소품은 `etc`.
- 하나라도 실패하면 만든 행·파일을 모두 되돌리고 원본을 그대로 한 장으로 분류한다(원본은 지우지 않는다).
- 응답은 `{ extracted: n }`. 화면 문구 표시는 업로드 폼 쪽 작업.

## 규칙
1. 사진에 옷이 전혀 없으면 `isClothing: false`로 반환하고 서버가 자동 제외한다. 옷이 있는지 애매하거나 여러 벌이면 제외하지 않고 `isClothing: true`, `category: "etc"`, `confidence: 0.3` 이하로 반환한다.
2. 가격은 추측하지 않는다. 브랜드는 사진에서 읽힐 때만 쓰고, 보이지 않으면 필드를 만들지 않는다.
3. 응답은 **JSON만** 반환한다(설명 문장 금지).
4. Zod 검증에 실패하면 1회 재시도하고, 그래도 실패하면 사용자가 직접 입력하도록 폴백한다.

## 프롬프트 뼈대
```
너는 옷 사진을 분석하는 도우미다. 사진 속 옷 한 벌을 분석해서 아래 JSON 형식으로만 답해라.
카테고리는 outer/top/bottom/shoes/etc 중 하나다.
보이지 않는 정보는 추측하지 말고 생략해라.
(여기에 JSON 형식 예시)
```

## 테스트 (평가 세트)
- 대표 사진 10~20장과 정답 태그를 `tests/fixtures/closet/`에 모아두고, 프롬프트를 바꿀 때마다 정확도를 비교한다.
- 특히 하의/아우터 구분, 흰색/아이보리 구분이 흔한 실패 지점이다.
