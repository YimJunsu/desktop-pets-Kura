# 🎨 Kuro Desktop Pet — Sprite Generator Tool

이 도구는 외부 AI 이미지 생성기(Midjourney, Stable Diffusion 등)로 구운 캐릭터 스프라이트 시트 이미지(한 장으로 이루어진 그림판)를 바탕으로, **배경을 투명하게 날리고 개별 프레임 PNG 및 투명 GIF 애니메이션 파일로 자동 가공해 주는 유틸리티**입니다. 

`aldegad/sprite-gen` 프로젝트의 프레임 정제 및 알파 마스킹 핵심 설계를 당사 프로젝트 규격에 맞게 경량화하여 포팅하였습니다.

---

## 🛠️ 1. 사전 준비 사항

이 도구는 **Python 3.10 이상** 및 **Pillow(PIL)** 라이브러리로 구동됩니다.

```bash
# 1. 도구 디렉토리로 이동
cd tools/sprite-generator

# 2. 필수 의존성 패키지 설치
pip install -r requirements.txt
```

---

## 🚀 2. 사용 방법 (CLI 명령어)

`sprite_generator.py`를 실행하여 단색 배경을 지우고 애니메이션 GIF를 추출할 수 있습니다.

### 기본 실행 명령어
```bash
python sprite_generator.py --sheet <스프라이트시트경로> --out-dir <출력폴더> --rows <행개수> --cols <열개수> --chroma <배경RGB> --action <동작명>
```

### 매개변수 옵션 (Arguments)
| 옵션 | 기본값 | 설명 |
| :--- | :---: | :--- |
| `--sheet` | **(필수)** | 가공할 원본 스프라이트 시트 이미지 경로 (예: `my_pet_sheet.png`) |
| `--out-dir` | **(필수)** | 잘라낸 프레임 파일과 GIF를 저장할 결과 디렉토리 |
| `--rows` | `1` | 스프라이트 시트의 세로 격자(행) 수 |
| `--cols` | `1` | 스프라이트 시트의 가로 격자(열) 수 |
| `--chroma` | `255,255,255` | 지우고 투명화할 단색 배경 RGB 값 (기본값: 흰색 `255,255,255`) |
| `--threshold`| `45` | 투명화 감도 (높을수록 더 많은 범위의 유사 배경색을 삭제) |
| `--action` | `walk` | 추출할 펫의 상태 애니메이션 파일 이름 (예: `walk`, `sleep`, `typing`) |
| `--fps` | `10` | 엮어낼 GIF 루프의 재생 프레임 속도 (FPS) |
| `--no-trim` | `False` | 켜면 캐릭터 주변의 불필요한 투명 여백을 자동으로 잘라내지(Trim) 않습니다. |

---

## 📝 3. 신규 펫 캐릭터 제작 튜토리얼 (Step-by-Step)

#### Step 1: AI 이미지로 스프라이트 시트 만들기
Midjourney 등에서 단색 배경을 둔 4~8프레임의 아기자기한 캐릭터 걷기/잠자기 스프라이트를 생성하여 `my_pet_raw.png`로 준비합니다.

#### Step 2: 걷기 애니메이션 추출
배경이 흰색(`255,255,255`)이고 가로 6개 프레임으로 구성된 시트일 때:
```bash
python sprite_generator.py --sheet my_pet_raw.png --out-dir ../../assets/sprites/mypet --rows 1 --cols 6 --chroma 255,255,255 --action walk --fps 12
```
* **결과**: `assets/sprites/mypet/` 폴더 내에 낱개 투명 프레임 이미지들(`frame_00.png` 등)과 부드럽게 걷는 움짤 `walk.gif`가 자동으로 구워집니다!

#### Step 3: 대기 상태 SVG 제작
* `extract_grid_frames`로 분리된 투명 PNG 중 정면을 응시하는 정지 이미지(예: `frame_00.png`)를 벡터 변환기(ezgif, Illustrator 등)를 활용하여 `idle.svg`로 변환합니다.
* 펫의 눈동자가 마우스를 따라오게 하려면, `idle.svg` 내의 눈동자 레이어 엘리먼트(`path` 또는 `circle`)에 다음과 같이 아이디를 직접 붙여줍니다:
  - `<circle id="pupil-left" ... />`
  - `<circle id="pupil-right" ... />`
  - 자세한 레이어 가이드는 `sprite-prompts.md`를 참고하세요.

#### Step 4: 설정 모달 등록
* `src/renderer/settings-modal.html` 파일을 열고, **🐾 PET 탭**의 `pet-cards` 컨테이너에 신규 펫을 선택할 수 있는 카드를 복사해 추가합니다:
  ```html
  <div class="pet-card" data-model="mypet">
    <div class="card-preview">
       <!-- 아이콘 또는 대표 SVG -->
    </div>
    <div class="card-name">My Cute Pet</div>
  </div>
  ```

#### Step 5: Gemini 성격 정보 부여
* `src/renderer/chat-bubble.js` 내의 `callGeminiAPI` 메소드에 분기문을 추가하여 새로운 펫에 귀여운 AI 대화 정체성을 불어넣어 줍니다.
  ```javascript
  } else if (currentModel === 'mypet') {
    systemText = "You are My Cute Pet, a small and loyal dog pet...";
  }
  ```
