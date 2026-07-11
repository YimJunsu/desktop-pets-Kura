# 맹구 및 모몽가 캐릭터 스프라이트 생성 프롬프트 가이드 🎨

이 가이드는 ChatGPT(DALL-E 3) 또는 Midjourney를 활용하여 **맹구(Maenggu)**와 **모몽가(Momonga)**의 데스크탑 펫 스프라이트(동작별 고화질 이미지)를 일관되게 생성할 수 있는 상세 영문 프롬프트 모음입니다.

이미지 생성 모델은 영어 프롬프트를 인식하는 성능이 훨씬 뛰어나므로 모든 프롬프트는 **영어**로 작성되었습니다.

---

## 1. 🪨 맹구 (Maenggu / Boo) 프롬프트 가이드

맹구 캐릭터의 핵심은 **동글동글한 두상, 코에 대롱대롱 매달려 있는 투명하고 흰 콧물, 그리고 손에 쥐고 있는 둥근 조약돌**입니다. 스타일은 동글동글하고 부드러운 **3D 클레이(찰흙) 토이 스타일**로 유도합니다.

### 🎨 맹구 공통 스타일 지시어 (Style Definition)
매 프롬프트 생성 시 아래 스타일 지시 사항을 함께 붙여주세요:
> **[Style Guide]** Chibi anime style, round cute boy character inspired by Boo (Maenggu) from Crayon Shin-chan. Soft 3D claymation toy render texture, vinyl figure aesthetic, smooth rounded shapes, pastel colors. Face is round with chubby cheeks, tiny black dot eyes, and a prominent white shiny droplet of snot hanging from his nose. Wearing a light yellow long-sleeve sweater and teal shorts, white socks, and green slip-on shoes. Completely flat bright solid solid-green background (for easy chroma keying), no floor shadow, no gradient, no background elements. Consistent character design across all generations.

---

### 맹구 동작별 상세 프롬프트 (Prompts by State)

#### 1. Idle (기본 대기 상태)
> Single front-facing view of chibi Maenggu character standing blankly, looking straight ahead with a quiet, vacant expression. He is holding a small, smooth grey round pebble in his right hand. A single white droplet of mucus hangs from his nose. 3D soft claymation style, flat solid solid-green background, 512x512 pixels.

#### 2. Walking (걷기 모션 - 자연스러운 연결 및 프레임 분리)
> **[Layout: Sliced Walk Cycle]** A horizontal sprite sheet consisting of 4 distinct walking animation frames of chibi Maenggu character waddling from left to right.
> **[Frame Isolation Rules]** Each of the 4 frames must be strictly separated by a thick vertical black divider line to prevent adjacent character outlines from touching or merging. Each frame contains a single centered character.
> **[Animation Guidance]** Frame 1: Left leg forward, holding stone. Frame 2: Legs together, body slightly higher. Frame 3: Right leg forward, waddling. Frame 4: Legs together, body slightly lower. The character's size, height, and clothes must remain identical across all 4 frames. 3D soft claymation style, flat solid solid-green background.

#### 3. Sleeping (낮잠 모션)
> Single view of chibi Maenggu character curled up and sleeping peacefully. He is lying on his side, eyes closed as curved lines, breathing gently. The snot droplet on his nose is inflating and deflating as a small bubble. Cute sleeping pose, 3D soft claymation style, flat solid solid-green background, 512x512 pixels.

#### 4. Typing (코딩 / 타이핑 모션 - 자연스러운 손움직임)
> **[Layout: Sliced Typing Cycle]** A horizontal sprite sheet consisting of 3 distinct typing animation frames of chibi Maenggu character.
> **[Frame Isolation Rules]** Each of the 3 frames must be strictly separated by a thick vertical black divider line to prevent frames from merging.
> **[Animation Guidance]** The character is sitting on the floor with a tiny grey computer keyboard in front of him. Frame 1: Left hand tapping keyboard keys, right hand raised slightly. Frame 2: Right hand tapping keyboard keys, left hand raised slightly. Frame 3: Concentrated facial expression, both hands tapping keyboard keys. Character height and keyboard position must be identical across frames. 3D soft claymation style, flat solid solid-green background.

#### 5. Thinking (생각 중 모션)
> Single view of chibi Maenggu character sitting down, looking slightly upwards with a puzzled, blank expression. One hand is placed on his chin in thought. A small clean thought bubble with "..." inside floats above his head. 3D soft claymation style, flat solid solid-green background, 512x512 pixels.

#### 6. Happy (완료 / 기쁨 모션)
> Single view of chibi Maenggu character celebrating. He is jumping slightly with joy, arms raised high, holding his favorite shiny stone in his hand. Sparkles and cute star effects float around him. Wide smile, happy expression. 3D soft claymation style, flat solid solid-green background, 512x512 pixels.

#### 7. Grabbed (마우스 드래그 모션)
> Single view of chibi Maenggu character being picked up from above. His body is vertically stretched and elongated like a soft mochi doll. Hands and feet are dangling down in shock. Large wide blank eyes, snot droplet stretching downwards. 3D soft claymation style, flat solid solid-green background, 512x512 pixels.

#### 8. Error (에러 / 슬픈 모션)
> Single view of chibi Maenggu character looking sad and startled. He has tears welling up in his eyes, and a small storm cloud or red "!" sign floats above his head. He is crying cutely. 3D soft claymation style, flat solid solid-green background, 512x512 pixels.

---

## 2. 🐿️ 모몽가 (Momonga) 프롬프트 가이드

모몽가의 핵심은 **몽실몽실하고 하얀 털, 귀엽고 동그란 눈에 맺힌 그렁그렁한 하이라이트, 옅은 핑크색 볼 터치, 그리고 귀여운 하늘색 꼬리와 귀 안쪽 색상**입니다. 스타일은 치이카와 스타일의 **선이 살아있고 귀여운 2D 손그림 일러스트 스타일**로 유도합니다.

### 🎨 모몽가 공통 스타일 지시어 (Style Definition)
매 프롬프트 생성 시 아래 스타일 지시 사항을 함께 붙여주세요:
> **[Style Guide]** Chibi flying squirrel character inspired by Momonga from Chiikawa. Cute hand-drawn 2D cartoon illustration style, clean digital colored brush outline, pastel colors. Soft white fluffy fur body, huge cute expressive round eyes with sparkling white highlights, pink circular blush on cheeks. Outer ears and fluffy large tail are soft blue-teal color. Stubby limbs, cute chubby squirrel silhouette. Completely transparent PNG background, no ground, no shadow. Consistent character design.

---

### 모몽가 동작별 상세 프롬프트 (Prompts by State)

#### 1. Idle (기본 대기 상태)
> Single front-facing view of chibi white flying squirrel character Momonga sitting upright, looking at the viewer with a cute, slightly smug and adorable smile. Big sparkling black eyes, blue fluffy tail curled behind him. Clean 2D hand-drawn cartoon style, transparent background, 512x512 pixels.

#### 2. Walking (걷기 모션)
> [Layout: Sliced Walk Cycle] A horizontal sprite sheet consisting of 4 distinct walking animation frames of chibi Momonga character waddling from left to right. [Frame Isolation Rules] Each of the 4 frames must be strictly separated by a thick vertical black divider line to prevent adjacent character outlines from touching or merging. Each frame contains a single centered character. [Style Guide] Chibi flying squirrel character inspired by Momonga from Chiikawa. Cute hand-drawn 2D cartoon illustration style, clean digital colored brush outline, pastel colors. Soft white fluffy fur body, huge cute expressive round eyes with sparkling white highlights, pink circular blush on cheeks. Outer ears and fluffy large tail are soft blue-teal color. Stubby limbs, cute chubby squirrel silhouette. Completely flat bright solid solid-green background, no ground, no shadow. Consistent character design.

#### 3. Sleeping (낮잠 모션)
> Single view of chibi Momonga character sleeping, curled up in a fluffy ball. Eyes are closed tightly (cute curved lines), tail wrapped around his body like a blue blanket. Tiny Zzz letters floating above his head. Clean 2D hand-drawn style, transparent background, 512x512 pixels.

#### 4. Typing (코딩 / 타이핑 모션)
> Sprite sheet in a horizontal row showing a 3-frame typing cycle of chibi Momonga character. He is sitting on the floor with a tiny mechanical keyboard in front of him, tapping keys furiously with his small front paws. Frame 1: Left paw tapping. Frame 2: Right paw tapping. Frame 3: Both paws typing fast. Determined, energetic expression. Clean 2D cartoon style, transparent background.

#### 5. Thinking (생각 중 모션)
> Single view of chibi Momonga character with a thinking pose. He is sitting, head tilted, one tiny paw resting on his chin, looking upwards in deep thought. A thought bubble with "..." floats above him. Clean 2D hand-drawn style, transparent background, 512x512 pixels.

#### 6. Happy (완료 / 기쁨 모션)
> Single view of chibi Momonga character jumping up in joy. Eyes closed in happiness (^_^), arms raised, starry sparkles and hearts floating around him. Big happy expression, showcasing his cute fluffy blue tail. Clean 2D cartoon style, transparent background, 512x512 pixels.

#### 7. Grabbed (마우스 드래그 모션)
> Single view of chibi Momonga character grabbed from above. His round fluffy body is stretched vertically, limbs dangling down in panic. Large round shocked eyes with small pupils, tail straight down. Clean 2D hand-drawn style, transparent background, 512x512 pixels.

#### 8. Error (에러 / 당황 모션)
> Single view of chibi Momonga character looking angry or startled. He is throwing a cute tantrum, waving his tiny fists with a grumbling, cute angry expression. Sparks of annoyance float near his head. Clean 2D cartoon style, transparent background, 512x512 pixels.
