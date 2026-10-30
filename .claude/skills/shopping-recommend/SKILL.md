---
name: shopping-recommend
description: 쇼핑 연결(AI는 검색어만, 링크는 코드가 생성). 쇼핑 추천 작업 시.
---

# 쇼핑 추천: 검색 바로가기 링크

## 배경
네이버 쇼핑 검색 API가 2026-07-31에 종료되어 상품 API 연동은 하지 않는다. (`docs/decisions.md` 2026-10-30)
상품명·이미지·가격을 앱에서 보여주지 않고, 쇼핑몰 검색 페이지로 보내는 링크만 제공한다.

## 핵심 원칙
**AI는 "무엇이 필요한지(검색어)"만 말하고, 링크는 코드가 만든다.**
AI가 상품명/가격/링크를 만들면 가짜 정보가 섞이므로 절대 금지.

## 흐름
1. 스타일 프로필의 `itemSuggestions[].query`, 코디 추천의 `shoppingHints[].query` (예: "베이지 와이드 슬랙스")를 받는다.
2. `shoppingSearchLinks(query)` (`src/lib/shopping/search-links.ts`)가 검색 페이지 URL 목록을 만든다.
3. 화면에서 새 탭(`target="_blank"`, `rel="noopener noreferrer"`)으로 연다.

## 규칙
1. 검색어는 AI가 만들되 길이(40자)는 Zod 스키마와 `shoppingSearchLinks`가 모두 제한한다. 브랜드·가격·링크는 검색어에 넣지 않는다.
2. 링크는 `https://`만 쓰고 검색어는 반드시 `encodeURIComponent`로 인코딩한다.
3. 지원하는 몰은 URL 형식이 확인된 곳만 넣는다(현재 네이버쇼핑, 구글 쇼핑). 새 몰은 검색 URL 형식을 확인한 뒤 추가한다.
4. 화면에 "검색 결과와 가격·재고는 각 쇼핑몰에서 확인하세요" 문구를 넣는다.
5. 서버에서 쇼핑몰 페이지를 요청하거나 스크래핑하지 않는다.
6. 제휴 링크(쿠팡 파트너스 등)를 쓰게 되면 해당 서비스가 요구하는 고지 문구를 반드시 표시한다. (현재는 제휴 미사용)

## 테스트
- `tests/closet-ai.test.ts`의 `shoppingSearchLinks`: 인코딩, https, 길이 제한, 특수문자 입력.

## 나중에 상품 카드가 필요해지면
공식 상품 검색 API(예: 쿠팡 파트너스)를 먼저 조사하고 승인·약관·고지 의무를 확인한다. 그때 이 스킬과 `decisions.md`를 갱신한다.
