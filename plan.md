# plan.md — 개발 로드맵

> 각 Phase는 독립적으로 동작 가능한 단위. Phase 완료마다 동작 확인 후 다음으로 진행.

---

## Phase 0: 프로젝트 초기화 ⏱️ ~30분

### 목표
프로젝트 스캐폴딩, 의존성 설치, 개발 환경 확인

### 작업
- [ ] `npm init` + package.json 기본 설정
- [ ] Electron, electron-builder, electron-store 설치
- [ ] 디렉토리 구조 생성 (CLAUDE.md의 구조 따르기)
- [ ] `.gitignore` 생성 (node_modules, dist, out 등)
- [ ] `npm start`로 빈 Electron 창 뜨는 것 확인

### 완료 기준
`npm start` 실행 시 Electron 창이 뜬다.

---

## Phase 1: 투명 윈도우 + Idle + 눈동자 추적 ⏱️ ~2시간

### 목표
바탕화면 위에 검은 고양이가 앉아있고, 마우스 커서를 눈으로 따라본다.

### 작업
- [ ] BrowserWindow 설정: `transparent: true`, `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`
- [ ] 윈도우 크기: 256x256 (리사이즈 불가)
- [ ] index.html: 투명 배경, 고양이 SVG 표시
- [ ] idle.svg 작성/배치: 고양이 앉은 자세, 눈동자는 별도 `<circle>` 또는 `<ellipse>` 요소
- [ ] eye-tracker.js 구현:
  - `screen.getCursorScreenPoint()` (메인 프로세스) → IPC로 렌더러에 전달
  - 50ms 간격 폴링
  - 커서 방향으로 눈동자 cx/cy 이동 (이동 범위 제한, 눈 바깥으로 안 나가게)
  - 커서 방향에 따라 고양이 머리 미세하게 기울이기 (선택)
- [ ] 클릭 스루 구현: 투명 영역은 마우스 이벤트 통과, 고양이 영역만 클릭 가능
  - `setIgnoreMouseEvents` + `forward: true`
  - 렌더러에서 `mouseenter`/`mouseleave`로 토글
- [ ] 윈도우 위치 기본값: 화면 우하단 (태스크바 위)

### 완료 기준
바탕화면 우하단에 고양이가 앉아있고, 마우스를 움직이면 눈동자가 따라온다.
고양이 뒤의 바탕화면/다른 창을 클릭할 수 있다.

---

## Phase 2: 시스템 트레이 + 상태 머신 기초 ⏱️ ~2시간

### 목표
시스템 트레이 메뉴로 펫을 제어하고, 상태 전이 시스템을 구축한다.

### 작업
- [ ] tray.js: 시스템 트레이 아이콘 + 우클릭 메뉴
  - 크기 조절: 소(128) / 중(192) / 대(256)
  - 재우기 / 깨우기 토글
  - 따라오기 모드 토글
  - 종료
- [ ] state-machine.js 구현:
  - 상태 Enum 정의: `IDLE`, `WALKING`, `SITTING`, `SLEEPING`, `TYPING`, `THINKING`, `HAPPY`, `ERROR`, `GRABBED`, `FOLLOWING`
  - 상태 전이 테이블 (어떤 상태에서 어떤 상태로 전이 가능한지)
  - `setState(newState)` → 현재 상태 `exit()` → 새 상태 `enter()` → 애니메이션 교체
  - 이벤트 기반 전이: `onMouseIdle`, `onTypingDetected`, `onGrabbed`, `onSleepCommand` 등
- [ ] animation.js: 상태별 스프라이트 매핑 + 교체 로직
  - SVG (idle) ↔ GIF/APNG (나머지) 전환
  - 부드러운 전환을 위한 fadeIn/fadeOut (100ms)
- [ ] 자동 슬립: 60초 동안 마우스 미이동 + 키 입력 없음 → sleeping 전환
  - 깨어나기: 마우스 이동 감지 시 idle로 복귀
- [ ] electron-store로 설정 저장/불러오기:
  - 윈도우 위치 (position: {x, y})
  - 크기 설정 (size: 'S' | 'M' | 'L')
  - 모드 설정 (sleep, follow 등)

### 완료 기준
트레이 메뉴에서 재우기/깨우기가 동작한다.
60초 방치 시 자동으로 잔다.
크기를 바꿀 수 있다.
설정이 재시작 후에도 유지된다.

---

## Phase 3: 드래그 + 모찌 늘어남 ⏱️ ~2시간

### 목표
고양이를 마우스로 잡으면 모찌처럼 늘어나며 대롱대롱 매달린다.

### 작업
- [ ] drag-handler.js 구현:
  - `mousedown` on 고양이 → GRABBED 상태 진입
  - Pointer Capture 사용 (빠르게 움직여도 놓치지 않게)
  - 드래그 중: 윈도우 위치를 마우스에 맞춰 이동
- [ ] 모찌 효과:
  - 잡힌 위치(상단)를 기준으로 아래쪽이 늘어남
  - CSS `transform: scaleY()` 동적 적용 (1.0 → 최대 1.6)
  - 드래그 방향에 따라 `skewX()`도 약간 적용 (흔들리는 느낌)
  - 고양이 표정 변경: 잡힌 상태 전용 표정 (놀란 눈, 입 벌림)
- [ ] 놓기:
  - `mouseup` → 스프링 효과로 원래 비율 복귀 (CSS transition 200ms)
  - 놓인 위치에서 idle 상태로 전환
  - 윈도우 위치 저장

### 완료 기준
고양이를 클릭해서 드래그할 수 있다.
드래그 중 아래로 늘어나는 모찌 효과가 보인다.
놓으면 통통 튀듯이 원래 모양으로 돌아온다.

---

## Phase 4: 타이핑 감지 + 따라오기 모드 ⏱️ ~3시간

### 목표
사용자가 키보드를 치면 고양이도 타이핑 모션, 따라오기 모드 구현.

### 작업
- [ ] global-input.js (메인 프로세스):
  - `uiohook-napi` 설치 및 초기화
  - 키 입력 감지 → IPC로 렌더러에 전달
  - 디바운스: 300ms 이내 연속 입력 → "타이핑 중" 이벤트
  - 2초 동안 입력 없음 → "타이핑 종료" 이벤트
  - 마우스 이동도 감지 (슬립 해제용)
- [ ] 상태 전이 추가:
  - `IDLE` + 타이핑 감지 → `TYPING`
  - `TYPING` + 타이핑 종료 → `IDLE`
  - 슬립 중에는 타이핑에 반응 안 함
- [ ] typing.gif 적용: 앞발로 키보드 치는 모션
- [ ] follow-mode.js 구현:
  - 트레이 메뉴에서 "따라오기" 토글
  - 활성화 시: 100ms 간격으로 커서 위치 체크
  - 커서와 고양이 사이 거리 > 200px → WALKING 상태 + 커서 방향으로 이동
  - 이동 속도: 3~5px/프레임, 커서 근처 도달 시 IDLE로 전환
  - 이동 방향에 따라 좌우 반전 (CSS `scaleX(-1)`)
  - 커서가 빠르게 멀어지면 속도 증가 (최대 10px/프레임)

### 완료 기준
키보드를 치면 고양이가 타이핑 모션을 한다.
따라오기 모드를 켜면 마우스를 따라다닌다.
따라갈 때 걷기 애니메이션이 재생된다.

---

## Phase 5: Claude Code / 에이전트 연동 ⏱️ ~4시간

### 목표
Claude Code, Codex 등 AI 코딩 에이전트의 상태를 감지하여 펫이 반응한다.

### 작업
- [ ] hook-server.js: 로컬 HTTP 서버 (포트 18900, 충돌 시 자동 변경)
  - `POST /event` 엔드포인트: hook에서 이벤트 수신
  - 이벤트 타입: `session_start`, `session_end`, `tool_start`, `tool_end`, `thinking`, `error`, `complete`
- [ ] claude-code.js: Claude Code hook 자동 등록
  - `~/.claude/settings.json`에 command hook 추가
  - SessionStart → thinking 상태
  - Tool 실행 중 → typing 상태 (코드 작성)
  - 완료 → happy 상태 (3초 후 idle)
  - 에러 → error 상태 (5초 후 idle)
- [ ] 상태 전이 추가:
  - `IDLE` + session_start → `THINKING`
  - `THINKING` + tool_start → `TYPING`
  - `TYPING` + tool_end → `THINKING`
  - `THINKING` + complete → `HAPPY`
  - any + error → `ERROR`
- [ ] 에이전트 상태 우선순위:
  - agent 이벤트 > 사용자 타이핑 > idle/sleep
  - 에이전트 세션 중에는 자동 슬립 비활성화

### 완료 기준
Claude Code로 작업하면 고양이가 생각 → 타이핑 → 완료 순서로 반응한다.
에이전트가 에러를 내면 고양이가 놀란다.

---

## Phase 6: Gemini 대화 기능 ⏱️ ~3시간

### 목표
사용자가 Gemini API 키를 입력하면, 고양이를 클릭해서 대화할 수 있다.

### 작업
- [ ] 설정 창 (별도 BrowserWindow):
  - Gemini API 키 입력 필드
  - 키 유효성 검증 (테스트 호출)
  - electron-store에 암호화 저장 (safeStorage)
- [ ] chat-bubble.js:
  - 고양이 더블클릭 → 말풍선 UI 표시 (고양이 위에 뜸)
  - 텍스트 입력 필드 + 전송 버튼
  - Gemini API 호출 (fetch, generativelanguage.googleapis.com)
  - 응답을 말풍선에 표시 (타이핑 효과로 한 글자씩)
  - 대화 중 고양이는 thinking → 응답 시 happy/idle
- [ ] 시스템 프롬프트:
  - "너는 사용자의 데스크탑에 사는 검은 고양이야. 짧고 귀엽게 대답해. 이모지를 가끔 써."
  - 대화 히스토리는 세션 내에서만 유지 (앱 종료 시 초기화)
- [ ] 말풍선 UI:
  - 고양이 바로 위에 위치
  - 최대 너비 300px, 둥근 모서리
  - 반투명 배경 + 그림자
  - ESC 또는 바깥 클릭으로 닫기

### 완료 기준
설정에서 Gemini 키를 입력하면, 고양이를 더블클릭해서 대화할 수 있다.
대화 중 고양이가 생각하는 모션을 한다.

---

## Phase 7: 자동 업데이트 + 배포 ⏱️ ~2시간

### 목표
exe 인스톨러를 만들고, 업데이트를 자동으로 배포한다.

### 작업
- [ ] electron-builder 설정 (package.json 또는 electron-builder.yml):
  ```yaml
  appId: com.kuro.desktop-pet
  productName: Kuro Desktop Pet
  win:
    target: nsis
    icon: assets/app-icon.ico
  nsis:
    oneClick: true
    perMachine: false
    allowToChangeInstallationDirectory: false
  publish:
    provider: github
    owner: <github-username>
    repo: kuro-pet
  ```
- [ ] electron-updater 통합:
  - 앱 시작 시 `autoUpdater.checkForUpdatesAndNotify()`
  - 업데이트 발견 → 시스템 트레이 알림
  - 다운로드 완료 → 앱 종료 시 자동 설치
- [ ] GitHub Actions 워크플로우:
  - main 브랜치 태그 push 시 자동 빌드
  - Windows x64 exe 생성 → GitHub Release에 업로드
  - `latest.yml` 매니페스트 자동 생성 (electron-updater가 읽음)
- [ ] 앱 아이콘 (.ico) 생성: 검은 고양이 얼굴
- [ ] 인스톨러 테스트: 설치 → 실행 → 업데이트 → 재설치 사이클

### 완료 기준
`npm run dist`로 exe 인스톨러가 생성된다.
친구가 exe를 설치하면 다음 버전부터 자동 업데이트된다.

---

## Phase 8: 폴리시 + 추가 기능 ⏱️ 점진적

### 목표
완성도를 높이고 추가 인터랙션을 넣는다.

### 작업
- [ ] 클릭 반응: 더블클릭 → 찡긋, 연타 4회 → 깜짝 놀람
- [ ] 효과음: 완료 시 짧은 효과음 (토글 가능)
- [ ] 미니 모드: 화면 가장자리로 드래그 → 숨기기, 호버 시 peek
- [ ] 우클릭 컨텍스트 메뉴 (트레이 외에 고양이 직접 우클릭):
  - 재우기 / 따라오기 / 대화하기 / 설정 / 종료
- [ ] 다중 모니터 지원: 모니터 경계 넘어 드래그 가능
- [ ] 부팅 시 자동 시작 (선택적): `app.setLoginItemSettings`
- [ ] i18n: 한국어 / 영어 전환
- [ ] 윈도우 하단 걷기: 태스크바 바로 위를 좌우로 산책 (idle 상태에서 랜덤)

---

## 우선순위 요약

| Phase | 핵심 | 의존성 |
|-------|------|--------|
| 0 | 프로젝트 셋업 | 없음 |
| 1 | 투명 윈도우 + 눈동자 추적 | Phase 0 |
| 2 | 트레이 + 상태 머신 | Phase 1 |
| 3 | 드래그 + 모찌 | Phase 2 |
| 4 | 타이핑 감지 + 따라오기 | Phase 2 |
| 5 | Claude Code 연동 | Phase 2 |
| 6 | Gemini 대화 | Phase 2 |
| 7 | 자동 업데이트 + 배포 | Phase 0~6 중 원하는 시점 |
| 8 | 폴리시 | 전체 |

Phase 3, 4, 5, 6은 Phase 2 이후 순서 무관하게 병렬 진행 가능.
Phase 7은 친구에게 배포하고 싶은 시점에 진행.
