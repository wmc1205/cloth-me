---
name: wishlist-link
description: 외부 쇼핑몰 링크 위시리스트 규칙(링크만 저장, 스크래핑 금지). 위시리스트 작업 시.
---

# 링크 붙여넣기 위시리스트

## 왜 이렇게 하나
지그재그/에이블리는 개발자용 공개 상품 API를 찾지 못했다. 스크래핑은 약관/차단/유지보수 문제가 커서 **링크만 저장**하는 방식으로 간다.

## 사용자 흐름
1. 사용자가 상품 URL을 붙여넣는다.
2. 서버가 URL 형식과 허용 도메인을 검사한다.
3. 사용자가 상품 이름, 카테고리, (선택) 색상/메모를 직접 입력한다.
   - 또는 상품 **스크린샷**을 올리면 `closet-tagging` 규칙으로 AI가 태그를 채워준다. 사용자는 확인/수정만 한다.
4. 저장된 위시리스트 항목은 코디 추천 화면에서 "내 옷장 + 위시리스트로 코디 보기"에 쓸 수 있다.

## 저장 데이터
```ts
{
  id, userId,
  url: string,          // 사용자가 붙여넣은 원본 링크
  platform: "zigzag" | "ably" | "other",
  name: string,         // 사용자 입력 또는 AI 태깅 결과
  category: "outer" | "top" | "bottom" | "shoes" | "etc",
  colors?: string[],
  imagePath?: string,   // 사용자가 올린 스크린샷 (Supabase Storage)
  memo?: string,
  createdAt
}
```

## 보안 규칙 (중요)
1. **서버에서 이 URL로 요청(fetch)을 보내지 않는다.** (SSRF 방지, 스크래핑 금지)
2. `https://`만 허용한다. `javascript:`, `data:`, IP 주소, `localhost`는 거부한다.
3. 허용 도메인은 코드의 상수 목록으로 관리하고, 목록 밖 URL은 `platform: "other"`로 저장할지 거부할지 사용자에게 확인 후 결정한다.
   - 지그재그: `zigzag.kr` 계열 / 에이블리: 실제 상품 링크 도메인을 **직접 확인한 뒤** 목록에 추가한다. (추측으로 넣지 않는다)
4. 링크를 화면에 표시할 때는 `rel="noopener noreferrer"` + 새 탭으로 연다.
5. 사용자 본인의 위시리스트만 조회/수정/삭제할 수 있게 한다(RLS).

## 테스트
- URL 검증 함수 단위 테스트: 정상 URL, http URL, `javascript:`, 허용 외 도메인, 비정상 문자열
- 다른 사용자의 위시리스트 접근이 거부되는지 확인
