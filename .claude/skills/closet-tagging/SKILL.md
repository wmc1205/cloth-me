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
  "category": "top",
  "name": "화이트 오버핏 셔츠",
  "colors": ["white"],
  "material": "cotton",
  "seasons": ["spring", "fall"],
  "styles": ["casual", "office"],
  "pattern": "solid",
  "confidence": 0.86
}
```

- `category`: 위 5개 중 하나. 애매하면 `etc`
- `colors`: 영어 소문자 기본 색상명 배열(최대 3개). 가장 큰 면적 색이 첫 번째
- `seasons`: `spring | summer | fall | winter` 배열
- `styles`: `casual | office | formal | sporty | street | minimal` 중에서 선택
- `confidence`: 0~1. **0.6 미만이면 화면에서 "확인해주세요" 표시**

## 규칙
1. 사진에 옷이 없거나 여러 벌이면 `category: "etc"`, `confidence: 0.3` 이하로 반환한다. (안내 문구는 서버가 `confidence` 값을 보고 처리한다)
2. 브랜드나 가격은 추측하지 않는다. 사진에서 보이지 않으면 필드를 만들지 않는다.
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
