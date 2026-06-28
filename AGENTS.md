# CLAUDE.md — 검은 고양이 데스크탑 펫 (Kuro Desktop Pet)

## 프로젝트 개요

Windows 데스크탑에 상주하는 검은 고양이 펫 애플리케이션.
Electron 기반, JavaScript/HTML/CSS로 구현.
레퍼런스: https://github.com/rullerzhou-afk/clawd-on-desk

## 기술 스택

- **런타임**: Electron 33+
- **언어**: JavaScript (ES2022+, CommonJS for main process, ESM for renderer where possible)
- **빌드/배포**: electron-builder + NSIS installer (Windows)
- **자동 업데이트**: electron-updater (GitHub Releases 기반)
- **키보드 감지**: uiohook-napi (글로벌 키 이벤트)
- **설정 저장**: electron-store
- **패키지 매니저**: npm

## 디렉토리 구조

```
kuro-pet/
├── CLAUDE.md              # 이 파일
├── plan.md                # 개발 로드맵
├── package.json
├── forge.config.js        # electron-builder 설정
├── assets/
│   ├── sprites/           # 스프라이트 에셋
│   │   ├── idle.svg       # idle 상태 (눈동자 추적용, SVG 필수)
│   │   ├── walk.gif       # 걷기 애니메이션
│   │   ├── sit.png        # 앉기 (방향별)
│   │   ├── sleep.gif      # 자는 애니메이션
│   │   ├── typing.gif     # 타이핑 모션
│   │   ├── thinking.gif   # 생각 중
│   │   ├── happy.gif      # 기쁨/완료
│   │   ├── grabbed.png    # 잡혔을 때 (CSS transform으로 늘림)
│   │   └── walk-*.gif     # 방향별 걷기 (필요시)
│   ├── sounds/            # 효과음 (선택)
│   └── tray-icon.png      # 시스템 트레이 아이콘 (16x16 또는 32x32)
├── src/
│   ├── main/              # Electron 메인 프로세스
│   │   ├── main.js        # 앱 진입점, BrowserWindow 생성
│   │   ├── tray.js        # 시스템 트레이 메뉴
│   │   ├── updater.js     # 자동 업데이트
│   │   ├── ipc-handlers.js # IPC 메인 측 핸들러
│   │   └── global-input.js # uiohook 글로벌 입력 감지
│   ├── renderer/          # Electron 렌더러 프로세스
│   │   ├── index.html     # 메인 HTML (투명 윈도우)
│   │   ├── renderer.js    # 렌더러 진입점
│   │   ├── state-machine.js    # 펫 상태 머신
│   │   ├── eye-tracker.js      # 마우스 시선 추적
│   │   ├── drag-handler.js     # 드래그 + 모찌 늘어남
│   │   ├── follow-mode.js      # 마우스 따라가기 모드
│   │   ├── animation.js        # 스프라이트 전환/재생
│   │   └── chat-bubble.js      # Gemini 채팅 말풍선 (Phase 5)
│   ├── hooks/             # 에이전트 연동 훅
│   │   ├── claude-code.js # Claude Code hook 등록/이벤트
│   │   └── hook-server.js # 로컬 HTTP 서버 (hook 이벤트 수신)
│   └── preload.js         # contextBridge 설정
├── config/
│   └── default-settings.json  # 기본 설정값
└── .github/
    └── workflows/
        └── release.yml    # GitHub Actions 자동 빌드/릴리스
```

## 코딩 컨벤션

### 일반 규칙
- 모든 코드와 주석은 **영어**로 작성 (UI 텍스트만 한국어 기본 + i18n 대비)
- 세미콜론 사용, 싱글 쿼트 기본
- 들여쓰기: 스페이스 2칸
- 파일명: kebab-case (`state-machine.js`, `eye-tracker.js`)
- 함수/변수: camelCase
- 클래스: PascalCase
- 상수: UPPER_SNAKE_CASE
- 한 파일 300줄 이하 목표, 넘으면 분리

### Electron 관련
- 메인 프로세스 ↔ 렌더러 통신은 반드시 `contextBridge` + `ipcRenderer.invoke` 사용
- 렌더러에서 `require('electron')` 직접 사용 금지
- `nodeIntegration: false`, `contextIsolation: true` 필수
- 투명 윈도우 설정: `transparent: true`, `frame: false`, `alwaysOnTop: true`
- 클릭 스루: `win.setIgnoreMouseEvents(true, { forward: true })` → 스프라이트 영역만 이벤트 받기

### 상태 머신
- 펫의 모든 행동은 상태 머신으로 관리
- 상태 전이는 명시적으로 정의 (어떤 상태에서 어떤 상태로 갈 수 있는지)
- 상태 목록: `idle`, `walking`, `sitting`, `sleeping`, `typing`, `thinking`, `happy`, `error`, `grabbed`, `following`
- 각 상태는 `enter()`, `update()`, `exit()` 메서드를 가짐

### 에셋 관련
- idle 상태는 반드시 SVG (눈동자 DOM 조작 필요)
- 애니메이션 상태는 GIF 또는 APNG (WebP도 가능)
- 모든 스프라이트는 투명 배경 필수
- 기본 렌더링 사이즈: 128x128px (S), 192x192px (M), 256x256px (L)
- 트레이 아이콘: 32x32px PNG

### 성능
- requestAnimationFrame 기반 업데이트 루프 사용
- 마우스 위치 폴링은 16ms(60fps)가 아닌 50ms 간격으로 충분
- 글로벌 키 이벤트는 디바운스 300ms 적용
- idle 상태에서 눈동자만 움직일 때는 SVG attribute만 변경 (리페인트 최소화)
- 슬립 상태에서는 업데이트 루프 주기를 1초로 늘리기

### 에러 핸들링
- 메인 프로세스 크래시 방지: `process.on('uncaughtException')` 핸들링
- 에셋 로드 실패 시 fallback (기본 원형 아이콘이라도 표시)
- hook 서버 포트 충돌 시 자동 포트 변경

## 빌드 & 배포

```bash
# 개발 실행
npm start

# 프로덕션 빌드 (Windows exe)
npm run dist

# GitHub Release로 배포 (자동 업데이트 대상)
npm run publish
```

- electron-builder의 `publish` 설정은 GitHub Releases 사용
- NSIS installer로 Windows exe 생성
- `electron-updater`가 앱 시작 시 GitHub Releases에서 최신 버전 확인 → 자동 다운로드 → 다음 실행 시 적용

## 자주 참고할 레퍼런스

- clawd-on-desk 구조: https://github.com/rullerzhou-afk/clawd-on-desk
- Electron 투명 윈도우: https://www.electronjs.org/docs/latest/tutorial/window-customization
- electron-builder: https://www.electron.build/
- uiohook-napi: https://github.com/nicegamer7/uiohook-napi
- electron-store: https://github.com/nicegamer7/electron-store

## 주의사항

- 이 프로젝트는 개인 프로젝트 + 친구 배포 목적. 라이선스는 MIT.
- clawd-on-desk의 코드를 "참고"하되, 그대로 복사하지 않기 (AGPL 라이선스)
- Gemini API 키는 사용자가 직접 입력, 코드에 하드코딩 절대 금지
- 스프라이트 에셋은 직접 제작 또는 라이선스 확보된 것만 사용
