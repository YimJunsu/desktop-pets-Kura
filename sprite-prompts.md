# 스프라이트 이미지 생성 프롬프트 가이드

> ChatGPT (GPT-4o 이미지 생성) 또는 DALL-E용 프롬프트.
> 일관된 캐릭터를 유지하기 위해 **첫 번째 프롬프트로 캐릭터 시트를 먼저 확정**한 뒤,
> 나머지를 하나씩 생성하는 순서를 추천.

---

## 🎨 스타일 공통 지시

모든 프롬프트 앞에 아래 내용을 붙여주세요:

```
Style guide for all images below:
- Chibi / super-deformed proportions (head is 40-50% of total height, short stubby body)
- Solid black fur, pink inner ears, small pink nose, golden-yellow round eyes
- Clean vector-style illustration with smooth lines, NO sketchy/rough edges
- Transparent PNG background (no ground, no shadow on ground)
- Consistent character design across all outputs
- Minimal shading: one shade of dark gray for fur depth, slight highlight on eyes
- Target render size: 256x256 pixels per sprite
- Cute and round overall silhouette
```

---

## 0. 캐릭터 레퍼런스 시트 (가장 먼저 생성)

```
Character reference sheet of a chibi black kitten mascot.
Show 4 views in a 2x2 grid on a plain white background:
- Top-left: Front view, sitting upright, paws together, looking straight at camera
- Top-right: 3/4 view, sitting, slight head tilt
- Bottom-left: Side view (left-facing), sitting
- Bottom-right: Back view, sitting, showing the tail curled

The kitten has: solid black fur, large round golden-yellow eyes, small pink nose,
pink inner ears, short stubby legs, round head that's almost half the body size.
Clean vector illustration style, smooth outlines, no sketchy lines.
Transparent background for each view.
```

> ⚠️ 이 결과물이 마음에 들면 저장해두고, 이후 프롬프트마다 "in the same style and character design as the attached reference" 를 붙이세요.

---

## 1. Idle (앉아있기) — SVG 변환용 기본 포즈

```
A single chibi black kitten sitting upright, facing the viewer at a slight 3/4 angle.
Front paws resting neatly together, tail curled to one side.
Eyes are large, round, golden-yellow, looking slightly to the right.
Expression: calm, content, slightly curious.
Clean vector style with smooth outlines, suitable for SVG tracing.
Transparent PNG background, 256x256 pixels.
Simple flat coloring with minimal shading — this will be converted to SVG.
```

> 이 이미지를 기반으로 SVG를 수동 제작하거나, Vector Magic / Inkscape로 트레이싱합니다.
> 눈동자는 SVG에서 별도 `<circle>` 요소로 분리해야 합니다.

---

## 2. Walking (걷기) — 스프라이트 시트

```
Sprite sheet of a chibi black kitten walking to the right.
8 frames in a single horizontal row, evenly spaced.
Each frame is 256x256 pixels (total image: 2048x256).
The walk cycle shows: contact → passing → contact → passing for both left and right legs.
Side view, the kitten moves with a cute bouncy waddle.
All frames must have identical body proportions and style.
Clean vector illustration, transparent background.
```

> 8프레임이 한 줄로 나오면 잘라서 GIF로 합칩니다.
> ChatGPT가 정확히 8프레임을 안 줄 수 있으므로, 4~6프레임이라도 OK.

---

## 3. Sleeping (자기) — 애니메이션 프레임

```
Sprite sheet of a chibi black kitten sleeping, curled up in a ball.
4 frames in a horizontal row showing a gentle breathing cycle:
Frame 1: Curled up, body slightly compressed (inhale start)
Frame 2: Body slightly expanded (full inhale)
Frame 3: Body slightly compressed again (exhale start)
Frame 4: Fully relaxed, tiny "zzz" above head
Side view, eyes closed (two curved lines), small smile.
Pink inner ears visible, tail wrapped around body.
Clean vector style, transparent background, 256x256 per frame.
```

---

## 4. Typing (타이핑) — 앞발 키보드 모션

```
Sprite sheet of a chibi black kitten sitting upright and typing on a tiny keyboard.
4 frames in a horizontal row:
Frame 1: Left paw raised, right paw on keyboard
Frame 2: Left paw on keyboard, right paw raised
Frame 3: Left paw raised higher, right paw tapping down
Frame 4: Both paws on keyboard, focused expression
The kitten faces the viewer at a slight 3/4 angle, looking down at the keyboard.
A small cute keyboard (gray rectangle with tiny keys) sits in front of the kitten.
Expression: concentrated, determined, slight tongue sticking out.
Clean vector style, transparent background, 256x256 per frame.
```

---

## 5. Thinking (생각 중) — 에이전트 대기 상태

```
A single chibi black kitten sitting upright with a thinking expression.
One paw raised to chin, head slightly tilted.
A small thought bubble (cloud shape) floats above the head with "..." inside.
Eyes looking upward, golden-yellow, slightly squinted in thought.
Clean vector style, transparent background, 256x256 pixels.
```

> 말풍선의 "..."을 나중에 다른 아이콘으로 교체할 수 있도록,
> 말풍선과 고양이를 별도 레이어로 만드는 것도 고려하세요.

---

## 6. Happy (기쁨 / 작업 완료)

```
Sprite sheet of a chibi black kitten celebrating, 4 frames in a horizontal row:
Frame 1: Sitting, big sparkly eyes, mouth open in joy
Frame 2: Jumping up slightly, both paws raised, star effects around
Frame 3: At peak of jump, eyes closed in happiness (^_^)
Frame 4: Landing back down, tail wagging, small heart above head
Clean vector style, transparent background, 256x256 per frame.
```

---

## 7. Grabbed (잡혔을 때) — 모찌 효과 기본

```
A single chibi black kitten being held/grabbed from above.
The kitten's body is slightly stretched vertically (elongated torso).
Front and back paws dangling down limply.
Expression: surprised wide eyes, small "o" shaped mouth.
Ears perked up in shock. Tail hanging straight down.
The overall shape should look like a stretched mochi — round head on top,
body elongated below.
Clean vector style, transparent background, 256x256 pixels.
```

> 실제 모찌 효과는 CSS transform으로 추가로 늘이므로,
> 이 이미지 자체는 약간만 늘어난 상태면 됩니다.

---

## 8. Error (에러 / 놀람)

```
A single chibi black kitten with a startled/shocked expression.
Fur slightly puffed up (spiky outline around body).
Eyes are wide circles with tiny pupils (shock expression).
Tail straight up and bushy/puffed.
A small "!" or "⚡" symbol above the head.
Clean vector style, transparent background, 256x256 pixels.
```

---

## 9. 트레이 아이콘 (작게)

```
A tiny icon of a chibi black kitten face, front view.
Only the head: round black face, golden-yellow eyes, pink nose,
pink inner ears poking up.
Simple and recognizable at very small sizes (16x16 to 32x32 pixels).
Clean flat vector style with thick outlines for readability at small size.
Transparent background, 64x64 pixels (will be scaled down).
```

---

## 💡 팁

### 일관성 유지
ChatGPT 이미지 생성은 같은 대화 내에서 연속 생성하면 캐릭터 일관성이 높아집니다.
레퍼런스 시트를 먼저 만들고, 같은 대화에서 나머지를 이어서 생성하세요.

### 스프라이트 시트가 잘 안 나올 때
ChatGPT가 정확한 프레임 수의 스프라이트 시트를 잘 못 만들 수 있습니다.
그럴 때는 각 프레임을 개별 이미지로 하나씩 생성한 뒤, 직접 합치세요:
- Aseprite (유료, 스프라이트 전문)
- Piskel (무료 웹앱, piskelapp.com)
- ezgif.com (이미지 → GIF 변환)

### SVG 변환
idle 이미지를 SVG로 변환하는 방법:
1. PNG를 Inkscape에서 열기 → Trace Bitmap
2. 눈동자 부분만 별도로 `<circle id="left-eye">`, `<circle id="right-eye">`로 수동 생성
3. 또는 처음부터 Figma/Illustrator에서 SVG로 직접 그리기 (PNG을 밑그림으로)

### 해상도
256x256이 기본이지만, 512x512로 생성한 뒤 축소하면 더 깨끗합니다.
ChatGPT에 "output at 512x512 pixels"로 바꿔서 생성하세요.
