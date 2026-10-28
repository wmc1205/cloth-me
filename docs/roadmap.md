# 로드맵 / 폴더 구조

> 필요할 때만 읽는 문서다. (CLAUDE.md에는 요약만 둔다)

## 개발 순서
### 웹 (모바일 우선)
1. 프로젝트 세팅 + CLAUDE.md + Vercel/Git 연동
2. 로그인 + 옷 사진 업로드 (아우터/상의/하의/신발/기타)
3. AI 자동 태깅 (`closet-tagging`)
4. 프롬프트 기반 코디 추천, 먼저 하루치 (`outfit-recommend`)
5. 월~일 주간 추천 (같은 옷 반복 최소화) + 날씨 연동
6. 쇼핑 추천(`shopping-recommend`) + 링크 위시리스트(`wishlist-link`)

### 이후
7. PWA로 폰에서 카메라 업로드 테스트
8. 필요하면 Expo(React Native) 앱 — 웹과 같은 서버/API 사용

## 폴더 구조 (예정)
```
src/
  app/                 # 화면 + API Route Handler
    api/
      closet/          # 옷 업로드/조회
      outfits/         # 코디 추천
      shopping/        # 쇼핑 상품 검색 (네이버 쇼핑 API)
      wishlist/        # 링크 붙여넣기 위시리스트
  lib/
    ai/                # AI 호출, 프롬프트, 출력 스키마(Zod)
    shopping/          # 네이버 쇼핑 API 클라이언트, 캐시
    db/                # 스키마, 쿼리
  components/
supabase/migrations/   # DB 스키마 SQL (Git 관리)
tests/fixtures/        # 태깅/코디 평가용 샘플
docs/                  # 로드맵, 결정 기록
.claude/               # 에이전트, 스킬, 설정
```
