# Git 작업 규칙

> `CLAUDE.md`가 `@docs/git-workflow.md`로 불러온다(항상 로드). 상세 절차는 `git-convention` 스킬.

- 브랜치 `feature/<설명>`(새 기능), `fix/<기능>_<설명>`(개선). `main` 직접 커밋·푸시 금지.
- 티켓 1개 = 브랜치 1개 = PR 1개. 머지는 **사용자 승인 후에만**.
- 커밋 `feat|fix|docs|refactor|test: ...`.
- PR 전 `pr-checklist`. 작성자와 검토자(`reviewer`, 읽기 전용)는 분리.
- 다른 기능으로 넘어가기 전에 현재 변경을 커밋하고 새 브랜치를 만든다. → `git-convention`
