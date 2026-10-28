---
name: db-migration
description: DB 스키마 변경 절차와 RLS 점검 항목. 테이블/컬럼/정책을 만들거나 바꿀 때.
---

# DB 스키마 변경 (Supabase, ORM 없음)

## 원칙
- 스키마는 **SQL 마이그레이션 파일**(`supabase/migrations/`)로만 바꾼다. 대시보드에서 손으로 바꾸면 기록이 안 남는다.
- DB 접근은 **사용자 세션의 `supabase-js`**로 한다. 그래야 RLS가 자동 적용된다.
- `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회한다. 서버 전용이며, 캐시 쓰기처럼 꼭 필요한 곳에만 쓴다.

## 초기 테이블
`closet_items` / `outfit_plans`(결과는 `jsonb`) / `wishlist_items` / `shopping_cache`

## 절차
1. 변경 이유와 영향받는 테이블/코드를 먼저 적는다. (여러 곳이 바뀌면 `codebase-analysis`)
2. Supabase CLI로 새 마이그레이션 파일을 만들고 SQL을 작성한다. (`supabase migration new <이름>`)
3. 로컬 또는 **개발용 프로젝트**에 적용해 확인한다. **운영 DB에 바로 적용하지 않는다.**
4. 스키마가 바뀌었으면 타입을 다시 생성해서 함께 커밋한다. (`supabase gen types typescript`)
5. 아래 RLS 체크리스트를 통과한 뒤 PR을 올린다.

> CLI 명령과 옵션은 버전에 따라 다를 수 있다. 쓰기 전에 공식 문서로 확인하고, 확인이 안 되면 `[문서확인]` 주석을 남긴다.

## 새 테이블 체크리스트 (사용자 데이터)
- [ ] `user_id uuid not null references auth.users(id)` 컬럼이 있다
- [ ] `enable row level security`를 켰다
- [ ] 조회/추가/수정/삭제 정책이 각각 `auth.uid() = user_id` 조건이다
- [ ] `user_id`에 인덱스가 있다
- [ ] `created_at timestamptz default now()`가 있다

## 예외: 공용 테이블 (`shopping_cache`)
- 사용자별 데이터가 아니므로 RLS를 켜고 **정책을 만들지 않는다**. (일반 사용자는 접근 불가)
- 읽기/쓰기는 서버에서 service role로만 한다.

## 사진 저장소 (Storage)
- 비공개 버킷을 쓴다. 파일 경로는 `<user_id>/<파일명>` 형태로 하고, 정책도 본인 폴더만 허용한다.
- 화면에는 만료되는 서명 URL로 보여준다.

## 테스트
- 다른 사용자 계정으로 접근했을 때 **0건이거나 거부**되는지 확인한다.
- 마이그레이션을 처음부터 다시 적용해도 에러가 없는지 확인한다.
