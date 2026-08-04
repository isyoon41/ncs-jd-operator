<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 인수인계 프로토콜 (Codex ↔ Claude Code)

이 프로젝트는 여러 에이전트(Codex, Claude Code 등)가 서로 다른 세션에서 번갈아 작업합니다. 컨텍스트 단절 없이 이어받기 위해 `docs/HANDOFF_*.md` 문서로 인수인계합니다.

사용자가 `/인수` 또는 `/인계`라고만 말해도 아래 절차를 그대로 수행한다 (Claude Code에서는 `.claude/commands/인수.md`, `.claude/commands/인계.md`로 등록되어 있음. Codex 등 다른 도구에는 이 슬래시 명령이 없을 수 있으니, 그럴 땐 이 섹션의 절차를 직접 따른다):
- `/인수` = 세션 시작 시 절차 (최신 인수인계서 읽고 상태 파악)
- `/인계` = 세션 종료 시 절차 (인수인계서 작성, 변경사항 커밋, GitHub 푸시)

## 세션 시작 시
1. `docs/` 안에서 파일명 날짜가 가장 최신인 `HANDOFF_YYYYMMDD.md`를 찾아 전체를 읽는다.
2. 거기 적힌 "미해결 과제"와 "주의사항"을 먼저 확인한 뒤 작업을 시작한다.
3. 코드/스키마 상태가 문서 내용과 다르면(예: 커밋이 더 진행됨) 실제 상태를 우선한다 — 문서는 스냅샷일 뿐이다.

## 세션 종료 시 (의미 있는 작업 단위를 마쳤을 때)
`docs/HANDOFF_YYYYMMDD.md`를 새로 작성한다 (당일 파일이 이미 있으면 덮어써서 최신 상태로 갱신). 아래 섹션을 반드시 포함한다:

- **프로젝트 개요**: 경로, 스택, Supabase 프로젝트 ID, 배포 URL, 최신 커밋
- **오늘 작업 내용**: 이번 세션에서 실제로 한 일 (번호 목록)
- **현재 상태**: git 상태(clean 여부), 브랜치/원격 상태, 커밋 이력
- **아키텍처 핵심 패턴**: 이후 세션이 반드시 지켜야 할 설계 규칙
- **주요 파일 경로**: 다음 작업자가 바로 찾아가야 할 핵심 파일 목록
- **환경변수**: 어떤 키가 필요한지 (값 자체는 절대 적지 않음)
- **미해결 과제**: 다음 세션이 이어받아야 할 것
- **주의사항**: 실수하기 쉬운 함정, 커밋 금지 파일, 하지 말아야 할 것

인수인계서를 작성한 뒤 다음 절차까지 연속으로 수행한다:

1. `git status`와 diff를 확인해 이번 세션의 변경 범위를 검토한다.
2. `.env.local`, 실제 서비스 키, 자격증명, 기타 비밀값이 커밋 대상에 포함되지 않았는지 확인한다.
3. 이번 세션의 변경사항과 인수인계서를 함께 커밋한다. `/인계` 명령 자체가 커밋과 푸시에 대한 사용자의 명시적 요청으로 간주되므로 별도로 확인하지 않는다.
4. 현재 브랜치를 `origin`에 푸시한다.
5. 커밋 해시와 푸시 결과를 사용자에게 보고한다. 커밋 또는 푸시가 실패하면 성공한 것처럼 보고하지 말고, 실패 원인과 남아 있는 로컬 상태를 알린다.

일반 작업 중에는 기존 원칙대로 사용자가 명시적으로 요청할 때만 커밋한다. 자동 커밋·푸시는 `/인계`에만 적용한다.
