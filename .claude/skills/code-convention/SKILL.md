---
name: code-convention
description: 코드 작성·수정·리뷰 시 컨벤션 상세. 불필요한 데코레이터/주입/추상화/'use client' 최소화.
---

# 코드 컨벤션

**원칙: 필요한 것만, 가장 단순하게.** (Spring의 어노테이션·DI 습관을 Next.js/TypeScript에 맞게 옮긴 규칙)

## 1. 어노테이션(데코레이터/지시어) 최소화
- TS 데코레이터(`@Something`)는 쓰지 않는다. 클래스 기반 설계 대신 함수와 모듈을 쓴다.
- `'use client'`는 **상호작용(클릭, 입력, 브라우저 API)이 필요한 컴포넌트에만** 붙인다. 기본은 Server Component.
- 타입 표기는 추론이 안 되는 곳에만: 공개 함수의 인자/반환, Zod 스키마(`z.infer`로 타입 파생). `any` 금지.

## 2. 주입(DI) 최소화
- DI 컨테이너, 팩토리, 서비스 클래스를 만들지 않는다. `import`한 함수를 직접 호출한다.
- 구현체가 하나뿐인 `interface` + `class` 조합 금지.
- 함수는 필요한 값만 인자로 받는다. 객체 통째로, 또는 설정 덩어리를 넘기지 않는다.
- props는 필요한 것만 전달. 3단계 이상 내려갈 때만 Context를 쓴다. 전역 상태 라이브러리는 합의 후 도입.

```ts
// 나쁜 예: 구현체가 하나뿐인데 인터페이스 + 클래스 + 생성자 주입
interface ShoppingClient { search(q: string): Promise<Product[]> }
class NaverShoppingClient implements ShoppingClient { /* ... */ }

// 좋은 예: 함수 하나
export async function searchProducts(query: string): Promise<Product[]> { /* ... */ }
```

## 3. 불필요한 추상화/훅 금지
- 한 번만 쓰는 헬퍼/래퍼/유틸을 만들지 않는다. **같은 코드가 3번 반복될 때** 추출한다.
- `useEffect`, `useMemo`, `useCallback`은 실제 문제(무한 루프, 측정된 성능 이슈)가 있을 때만 쓴다.
- 데이터 조회는 가능하면 Server Component 또는 Route Handler에서 한다. 클라이언트 `useEffect + fetch`는 지양.

## 4. 기본 스타일
- 파일명 `kebab-case`, 컴포넌트/타입 `PascalCase`, 함수/변수 `camelCase`.
- 주석은 "무엇"이 아니라 **"왜"**만 쓴다.
- 에러는 삼키지 않는다. 처리하지 못하면 위로 던지거나 사용자에게 보이는 메시지로 바꾼다.
- 포맷은 Prettier 기본값을 따른다. 수동 정렬 금지.

## 5. 수정할 때 지킬 것
- 요청 범위 밖의 리팩터링은 하지 않는다. 컨벤션 위반을 발견하면 **수정하지 말고 보고만** 한다.
- 기존 파일의 스타일을 먼저 따른다. 새 스타일을 섞지 않는다.
- 폴더/패키지 전체를 훑거나 여러 파일을 고칠 때는 `codebase-analysis` 스킬 절차(plan mode)를 먼저 따른다.

## 6. 확신 없는 API/라이브러리는 추측하지 않는다
- 함수명, 옵션, 응답 필드, 버전별 차이에 **확신이 없으면 추측해서 코드를 쓰지 않는다.**
- 먼저 확인 가능한지 본다: 설치된 패키지의 타입 정의(`node_modules/<패키지>/**/*.d.ts`), 프로젝트 안의 기존 사용 예, 공식 문서(검색/WebFetch).
- 확인할 수 없으면 해당 위치에 아래 형식의 주석을 남기고, 답변에서도 어느 부분인지 알린다.

```ts
// [문서확인] 이 부분은 관련 문서를 확인해야 합니다: 서명 URL 만료 시간 옵션의 이름과 단위
const { data } = await supabase.storage.from('closet').createSignedUrl(path, 60)
```

- 확신 있는 부분에는 달지 않는다. (주석 노이즈 방지)
- `[문서확인]` 마커는 PR 전에 `grep -rn "\[문서확인\]" src`로 찾아서 모두 해결하거나 사용자에게 보고한다. 해결되면 주석을 지운다.
