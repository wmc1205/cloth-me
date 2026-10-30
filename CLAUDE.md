# 옷스스메 (옷 + おすすめ)

옷 사진을 올리면 AI가 월~일 7일치 코디를 추천하고, 어울리는 아이템의 쇼핑몰 검색 링크도 보여준다. (공부 목적: 하네스 엔지니어링)

## 스택 (확정)
Next.js(App Router) + TypeScript / Tailwind + shadcn/ui / Supabase(DB·Auth·Storage; 쿼리는 `supabase-js`+생성 타입, ORM 없음) / Claude API + Vercel AI SDK / Zod·Vitest·Playwright / Vercel 배포 / Notion MCP

구조: `src/app/api`(Route Handler) · `src/lib/{ai,shopping,db}`(로직) · `src/components`

## 핵심 규칙 (상세는 해당 스킬)
1. AI 출력은 항상 JSON으로 받아 **Zod로 검증**한다. AI 호출 코드는 `src/lib/ai/`에만 둔다.
2. 쇼핑 연결은 **검색 바로가기 링크만** 쓴다. AI는 검색어만 만들고 상품 정보는 만들지 않는다. → `shopping-recommend`
3. 위시리스트는 **링크만 저장**한다. 스크래핑·서버에서 해당 URL 요청 금지. → `wishlist-link`
4. 비밀 키는 서버에서만 쓴다. `.env*`는 읽지도 커밋하지도 않는다. 키 이름은 `.env.example`에만.
5. 옷 사진은 본인만 볼 수 있게(RLS). DB는 사용자 세션의 `supabase-js`로 접근하고(service role 키는 서버 전용·최소 사용), 업로드는 서버에서 형식·크기를 검사한다. → `db-migration`
6. 확신 없는 API/라이브러리는 **추측해서 쓰지 않는다.** 그 위치에 `// [문서확인] 이 부분은 관련 문서를 확인해야 합니다: ...` 주석을 남긴다. → `code-convention` §6

## 아키텍처 방향
- **API 우선**: 핵심 기능은 Route Handler(`/api/...`)로 만든다. Server Actions에 핵심 로직 금지(나중에 앱에서 호출 불가).
- **모바일 우선 화면**: 옷 사진은 폰으로 올린다. 순서는 웹 → PWA → (선택) Expo 앱.

## 코드 컨벤션 요약 (상세는 `code-convention`)
- 필요한 것만, 가장 단순하게. 불필요한 데코레이터·DI·추상화·`'use client'`·훅 최소화.
- 함수와 모듈 중심. 구현체 하나뿐인 interface/class, 한 번만 쓰는 헬퍼 금지.
- 요청 범위 밖은 고치지 말고 보고만 한다.

## 작업 방식
- **폴더/패키지 전체를 훑거나 3개 이상 파일을 고칠 때는 plan mode로 소스 분석 먼저.** → `codebase-analysis`
- 문서에 없는 결정은 임의로 정하지 말고 사용자에게 묻는다.
- Git 규칙(브랜치·커밋·PR·머지):

@docs/git-workflow.md

## 파일 역할 분리 (토큰 절약)
| 위치 | 역할 | 로드 시점 |
|---|---|---|
| `CLAUDE.md` | 항상 지켜야 할 규칙 요약, 스킬/문서로 가는 길잡이 | **항상** (80줄 이하 유지) |
| `.claude/skills/*` | 기능별/절차별 상세 규칙, 형식, 예시 | 해당 작업 때만 |
| `.claude/agents/*` | 역할별 담당자 정의 | 호출될 때만 |
| `docs/*` | 로드맵, 결정 기록 등 배경 설명 | 필요할 때 직접 읽음 |

- 새 규칙을 추가할 때: 한두 줄로 요약되면 CLAUDE.md에, 예시·형식·절차가 필요하면 **스킬로 만들고** CLAUDE.md에는 스킬 이름만 적는다.
- 스킬의 `description`은 항상 로드되므로 **한 줄로 짧게** 쓴다.
- 스킬: `closet-tagging` `outfit-recommend` `shopping-recommend` `wishlist-link` `code-convention` `codebase-analysis` `db-migration` `git-convention` `notion-sync` `pr-checklist`
- 에이전트: `planner` `backend` `frontend` `reviewer` (db/config는 에이전트 대신 스킬로 관리)
- 문서: `docs/roadmap.md`(개발 순서·폴더 구조) `docs/decisions.md`(결정 기록) `docs/git-workflow.md`(Git 규칙, 항상 로드)
