---
name: pr-checklist
description: PR 올리기 전 점검 항목(타입체크, 테스트, 비밀 정보, 규칙).
---

# PR 올리기 전 점검

## 1. 자동 점검 (명령어)
```bash
npx tsc --noEmit        # 타입 에러 없음
npm run lint            # 린트 통과
npm test                # 단위 테스트 통과
npm run build           # 빌드 성공 (Vercel 배포 실패 방지)
```
하나라도 실패하면 PR을 올리지 않고 먼저 고친다.

## 2. 비밀 정보 점검
- [ ] `git diff main...HEAD`에 API 키, 토큰, 비밀번호가 없다
- [ ] `.env*` 파일이 변경 목록에 없다 (`.env.example`만 허용)
- [ ] `NEXT_PUBLIC_`으로 시작하는 변수에 비밀 값이 없다

## 3. 규칙 점검 (`CLAUDE.md` 핵심 규칙)
- [ ] AI 출력이 Zod로 검증된다
- [ ] 쇼핑은 검색 바로가기 링크만 쓴다 (AI가 만든 상품명·가격·링크 없음)
- [ ] 위시리스트 URL로 서버 요청을 보내지 않는다
- [ ] 외부 API 호출에 타임아웃/에러 처리/캐시가 있다
- [ ] `code-convention`을 지켰다 (불필요한 추상화/주입/`'use client'`/훅 없음)
- [ ] `grep -rn "\[문서확인\]" src` 결과가 없거나, 남은 항목을 PR 본문에 적었다

## 4. PR 작성
- 제목: `feat: 짧은 설명` 형식
- 본문: 무엇을 / 왜 / 어떻게 확인하는지(테스트 명령 또는 화면 경로) / 스크린샷(화면 변경 시)
- Notion 티켓 링크를 첨부하고 `notion-sync` 절차대로 상태를 `리뷰 중`으로 바꾼다
- 올리기 전에 `reviewer` 에이전트로 한 번 검토받는다

## 5. 머지 전
- [ ] Vercel Preview 배포에서 실제로 동작을 확인했다
- [ ] 환경변수를 새로 추가했다면 Vercel 프로젝트 설정에도 추가했다
