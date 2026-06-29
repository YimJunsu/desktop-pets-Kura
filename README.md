# 🐾 Kura Desktop Pets (쿠라 데스크탑 펫)

> **Windows 데스크탑 화면 위에 상주하며 함께 일하고 코딩하는 개성 만점 5종 펫 패밀리 애플리케이션.**  
> Electron 33+과 Node.js 기반으로 구축되어, 부드러운 Mochi-Stretch 드래그 물리 엔진, 마우스 커서 시선 추적, 로컬 SQLite3 설정 저장소, Gemini v1 AI 챗봇 대화 및 AI 코딩 에이전트(Claude Code 등) 연동을 지원합니다.

---

## 🎭 펫 패밀리 라인업 (Pet Characters)

설정 대시보드(⚙️)에서 마음에 드는 펫을 언제든지 자유롭게 선택해 데스크탑에 올려둘 수 있습니다. 각 펫은 고유의 외모, 애니메이션 및 Gemini AI 대화 퍼스널리티를 가지고 있습니다.

| 펫 이미지 | 이름 (Name) | 설명 & 대화 스타일 (Style & Personality) |
| :---: | :---: | :--- |
| 🐙 | **Clawd (클라우드)** | 주황색 산호 문어 펫. 데스크탑 위를 둥둥 떠다니며 코딩을 도와줍니다. 대화 시 귀여운 이모지(🐙, 💻, ✨)를 섞어 다정하고 짧게 답변합니다. |
| 👨‍🦳 | **OyaJiChi (오야지치)** | 대머리와 얇은 콧수염을 가진 익살스러운 중년 삼촌 캐릭터. 그늘지고 엉뚱한 매력을 뽐내며, 대화 시 약간 투덜거리는 삼촌 말투(👨‍🦳, ☕, 💢)를 구사합니다. |
| 🐈‍⬛ | **BlackYang (블랙냥)** | 뾰족한 귀와 동그란 눈을 가진 깜찍한 검은 아기 고양이. 꼬리를 살랑이며 재롱을 부리고, 대화 시 애교 넘치는 아기고양이 말투(`~냥냥🐾`)를 사용합니다. |
| 🐈 | **CheeseYang (치즈냥)** | 귀여운 줄무늬가 몸통과 이마에 새겨진 오렌지색 치즈 고양이. 머리를 bobbing하며 주인의 키보드 소리에 맞춰 발을 들썩이며, 정겨운 고양이 말투를 씁니다. |
| 🦝 | **Raccoon (너구리)** | 이번에 새롭게 패밀리에 합류한 장난꾸러기 너구리. 타이핑 시 앞발을 뚱땅거리며 무섭게 타자를 치며, 대화 시 씻을 거리를 찾거나 과자를 달라고 조르는 개구쟁이 말투(🦝, 🧹, 🍪)를 씁니다. |

---

## 🎨 주요 특징 (Key Features)

* **👀 마우스 커서 시선 추적 (Eye Tracking)**
  * 마우스 커서의 좌표를 실시간으로 추적하여 펫의 눈동자가 마우스를 꼼꼼히 따라다닙니다.
* **🧬 쫀득한 모찌 드래그 물리 엔진 (Mochi-Stretch Physics)**
  * 펫을 마우스 왼쪽 버튼으로 잡고 드래그하면, 이동 속도와 방향에 맞춰 펫의 몸뚱아리가 쫀득하게 늘어나고 회전(scaleY, skewX)합니다. 마우스 버튼을 놓으면 스프링 바운딩 효과와 함께 원래 비율로 통통 튕기며 복귀합니다.
* **⌨️ 글로벌 타이핑 모션 감지 (Typewriter Motion)**
  * `uiohook-napi` 글로벌 입력 후킹 시스템을 통해 키보드 입력을 실시간 디바운스 감지합니다. 사용자가 코딩이나 문서 작성을 시작하면 펫이 책상 위에서 앞발을 뚱땅거리며 귀엽게 키보드를 두드리는 애니메이션을 실행합니다.
* **💬 원클릭 Gemini API AI 챗봇 (AI Chatbot Integration)**
  * 마우스 호버 시 뜨는 💬 아이콘을 **단 한 번 클릭**하면 우측 하단에 미려한 다크 글래스모피즘 입력 다이어로그 패널이 열립니다.
  * Google AI Studio의 **Gemini 1.5 Flash 모델(v1 Endpoint)**과 실시간 연동하여 대화하며, 타자기(Typewriter) 효과로 펫 머리 위에 실시간 대화 말풍선이 둥실 떠오릅니다.
  * 펫 사이즈(`S`, `M`, `L`)에 맞춰 답변 말풍선 아래의 여백이 동적으로 완전 조율되어 비주얼 깨짐 현상이 전혀 없습니다.
* **⚙️ 다크 글래스모피즘 3탭 대시보드 (Settings Dashboard)**
  * ⚙️ 아이콘을 누르면 펫의 종류 변경, 크기 변경(S/M/L), 따라오기 모드, 자동 취침 모드, Gemini API 키 저장, AI 에이전트 연동 상태 조회 및 로컬 DB 저장 경로 확인이 가능한 올인원 제어판이 열립니다.
* **⚡ AI 코딩 에이전트 연동 (Agent Integration)**
  * 로컬 HTTP 훅 서버(포트 `18900`)가 내장되어, **Claude Code** 등 터미널 기반 AI 에이전트가 작동할 때 펫이 실시간으로 생각(`thinking`), 작성(`typing`), 완료(`happy`), 에러(`error`) 상태로 자동 연동되어 반응합니다.
* **🎁 3연타 이스터에그 (Interactive Triple-Click)**
  * 펫 몸뚱아리를 마우스로 **빠르게 3번 연속 연타**하면 펫이 깜짝 놀라면서 하트(`💖`) 효과와 함께 방긋 웃는 기분 좋은(`happy`) 상태로 즉시 변경됩니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **Runtime**: Electron 33+ (Node.js 20+)
* **Database**: SQLite3 (OS 표준 `%APPDATA%/kuro-pet/settings.db` 자동 동적 라우팅)
* **Global Input**: `uiohook-napi` (글로벌 OS 키보드/마우스 감지)
* **Styling**: Vanilla CSS (Vibrant Colors, Dark Glassmorphism, CSS Variables)
* **AI Model**: Google Gemini API (`gemini-1.5-flash` via production v1 endpoint)

---

## 📂 디렉토리 구조 (Directory Structure)

```
kuro-pet/
├── assets/
│   ├── sprites/           # 펫 상태별 에셋 (clawd, blackyang, cheeseyang, oyajichi, raccoon)
│   │   ├── idle.svg       # 눈동자 시선 제어용 SVG 에셋 (눈동자 태그 포함)
│   │   ├── walk.gif       # 걷기 애니메이션
│   │   ├── sleep.gif      # 쿨쿨 잠자기 애니메이션
│   │   └── typing.svg/gif # 키보드 뚱땅거리기 애니메이션
│   └── tray-icon.png      # 윈도우 시스템 트레이 아이콘 (32x32)
├── src/
│   ├── main/              # Electron 메인 프로세스
│   │   ├── main.js        # 진입점 및 투명 윈도우 관리
│   │   ├── db.js          # SQLite3 데이터베이스 및 로컬 암호화 스토어
│   │   ├── global-input.js# uiohook 글로벌 인풋 리스너
│   │   └── hook-server.js # AI 에이전트 연동 훅 HTTP 서버
│   ├── renderer/          # Electron 렌더러 프로세스
│   │   ├── index.html     # 투명 메인 윈도우 UI 마크업
│   │   ├── renderer.js    # 렌더러 메인 제어 및 이스터에그 바인딩
│   │   ├── state-machine.js# 펫 상태 머신 (idle, walking, typing, happy 등)
│   │   ├── drag-handler.js# 모찌 드래그 물리 엔진 및 이벤트 가드
│   │   ├── chat-bubble.js # Gemini v1 API 통신 및 우하단 챗 제어
│   │   ├── settings-modal.html # 설정 대시보드 마크업 & JS 스크립트
│   │   └── styles.css     # 다크 글래스모피즘 및 애니메이션 시트
│   └── preload.js         # contextBridge IPC 안전 터널 설정
└── package.json
```

---

## 🚀 시작하기 (Getting Started)

### 1. 요구 사항
* **Node.js** 20 버전 이상 설치 필수
* C/C++ 네이티브 빌드 모듈(`uiohook-napi`, `sqlite3`) 컴파일을 위해 Windows 환경의 **Build Tools**가 설치되어 있어야 합니다.

### 2. 설치 및 실행 방법
```powershell
# 1. 저장소 클론
git clone https://github.com/YimJunsu/desktop-pets-Kura.git
cd desktop-pets-Kura

# 2. 의존성 패키지 설치
npm install

# 3. 애플리케이션 실행
npm start
```

---

## 🧪 기능 제어 및 이스터에그 (Usage & Tips)

1. **펫 잡아서 당기기**: 마우스로 펫 몸통을 누르고 휘두르면 물리 엔진에 의해 말랑말랑 늘어납니다. 놓으면 복원됩니다.
2. **트레이 제어**: 작업 표시줄 우측 트레이 아이콘을 우클릭하여 설정 창을 열거나, 펫의 크기 조정 및 따라오기 모드를 온/오프할 수 있습니다.
3. **💬 AI 챗봇 켜기**: 펫에 마우스를 호버하면 나타나는 💬 아이콘을 단 한 번 클릭합니다. 우측 하단에 대화 다이어로그가 뜹니다. 질문을 치고 엔터 또는 Send를 누르세요.
4. **쓰다듬기(이스터에그)**: 펫 몸통을 **연속 3번 마우스로 톡톡톡 연타**해 보세요! 기분 좋은 얼굴과 함께 하트가 쏟아집니다.

---

## 🔧 문제 해결 및 자가 진단 (Troubleshooting)

### Q1. `Lock file can not be created! Error code: 32` 에러가 나면서 실행되지 않아요.
* **원인**: 이전 실행 세션에서 종료되지 않은 Electron 프로세스가 백그라운드 메모리에 여전히 상주하여 파일 잠금을 쥐고 있기 때문입니다.
* **해결법**: PowerShell을 열고 아래 명령을 실행해 백그라운드 프로세스를 강제 사살하고 다시 구동해 주세요.
  ```powershell
  taskkill /f /im electron.exe
  npm start
  ```

### Q2. 챗 아이콘을 눌렀는데 반응이 없고 펫이 쥐어짜듯 늘어납니다.
* **원인**: 드래그 핸들러가 클릭 이벤트를 펫을 짚은 모션으로 오인하여 삼킨 상태입니다.
* **해결법**: 최신 패치가 적용된 [drag-handler.js](src/renderer/drag-handler.js)를 사용해 주시면, 마우스 mousedown 시점에 `#chat-trigger` 및 `#chat-input-panel` 요소가 완벽히 배제되어 정상 클릭됩니다.

---

## 📄 라이선스 (License)

본 프로젝트는 **MIT License** 하에 제공되는 오픈소스 프로젝트입니다.
자유롭게 수정하고 공유하실 수 있습니다!
