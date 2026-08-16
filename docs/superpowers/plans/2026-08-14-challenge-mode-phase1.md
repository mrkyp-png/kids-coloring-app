# 챌린지 모드 Phase 1 (뼈대) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MODE_CHALLENGE(게임/챌린지 모드)의 공용 골격 — 난이도 선택, LEVEL 1(기억)·LEVEL 2(부분노출) 두 개 레벨, Score/Accuracy/Combo/ColorTolerance 채점 엔진, Best Score 저장 — 을 기존 MODE_CHILD를 건드리지 않고 추가한다.

**Architecture:** 새 파일 `challenge-config.js`(밸런스 수치) + `challenge.js`(챌린지 모드 화면·로직)를 추가한다. 기존 영역인식/픽셀 판정 엔진(`app.js`의 `openTemplate`, `computeCompletion`)은 복사하지 않고 그대로 재사용하되, 두 함수에 **기본값이 기존 동작과 동일한 선택적 파라미터**를 추가해 Child 모드 호출부는 1바이트도 동작이 바뀌지 않게 한다. 챌린지 모드는 기존 `#coloring-screen`(캔버스/팔레트/도안 렌더링 전부)을 그대로 재사용하고, 그 위에 챌린지 전용 HUD(점수/콤보/문제번호)만 얹는다.

**Tech Stack:** Vanilla JS(빌드 없음), `<script>` 태그 로드, localStorage, Canvas 2D. 테스트 프레임워크 없음 — 이 프로젝트의 기존 관행대로 `scripts/*.js`의 puppeteer-core(Edge 헤드리스) + `window.__debug*` 훅으로 검증한다(`scripts/verify-full-clear.js` 패턴 그대로).

**Spec:**
- `C:\Users\master\Desktop\색칠앱\1차 업데이트 기획서 및 명세서\REV최종\색칠 게임 앱 게임 기획서 최종.odt` (기획서 v7.0 FINAL)
- `C:\Users\master\Desktop\색칠앱\1차 업데이트 기획서 및 명세서\REV최종\Claude Code용 앱 업데이트 개발 명세서 최종.odt` (개발 명세서 v7.0 FINAL)
- 텍스트 추출본: `C:\Users\master\AppData\Local\Temp\claude\C--Users-master-Desktop\0dd7b69b-c2cd-4fd6-bac6-77e20fa370d5\scratchpad\odt\{plan,spec}\*.txt`

## Global Constraints

- **MODE_CHILD 기존 동작/DOM/CSS는 100% 무변경.** `app.js` 수정은 전부 "새 옵션 파라미터, 기본값=기존 동작"으로만 한다.
- 밸런스 수치(제한시간, 배율, 보너스, 색상허용오차 등)는 전부 `challenge-config.js`의 `CHALLENGE_CONFIG`에 몬다 (명세서 45번 "Config 원칙").
- **명세서에 구체 숫자가 없는 값**(TIME_BONUS, MISTAKE_PENALTY, PERFECT_BONUS, PERFECT_ACCURACY, LEVEL2 노출 반경/간격)은 플레이 테스트 전 임시값으로 넣고 주석에 `// 임시값 - 밸런스 테스트 후 조정` 명시한다. 임의로 "적당히 만들어서 숨기지" 않는다.
- Accuracy와 MistakeCount는 반드시 분리 관리한다(명세서 19-20번) — 재색칠해도 Accuracy는 깎이지 않는다.
- `#btn-level-next`/`#btn-level-back`(app.js:1001,1011) 같은 Child 전용 버튼 로직은 건드리지 않는다 — 챌린지 모드는 별도의 Next/Back 버튼을 새로 만들고, 그 버튼엔 TTS 대신 클릭 SFX만 쓴다(명세서 43번). Phase 1에는 Level 내 문제 자동 진행뿐이라 Next/Back 버튼 자체는 Phase 4(요구시 재검토)로 미룬다.
- `sw.js`의 `CACHE_NAME`은 새 파일/수정 파일이 생길 때마다 반드시 올린다(현재 `coloring-app-v97`).
- 신규 UI 문자열은 `i18n.js`의 5개 언어(ko/en/ja/zh/es) 블록에 전부 추가한다.

---

## File Structure

| 파일 | 종류 | 책임 |
|---|---|---|
| `challenge-config.js` | 신규 | `CHALLENGE_CONFIG` — 난이도별 제한시간/점수배율, 콤보표, ColorTolerance, LEVEL별 Base Score, 임시 밸런스 수치 |
| `challenge.js` | 신규 | 챌린지 모드 화면 전환, 난이도/레벨 선택, LEVEL 1·2 문제 루프, Score/Accuracy/Combo 계산, Best Score 저장, `window.Challenge` 네임스페이스 |
| `app.js` | 수정 | `computeCompletion`에 `tolerance` 옵션 추가, `openTemplate`에 `opts.challenge` 옵션 추가(둘 다 기본값=기존 동작), 디버그 훅 3개 추가 |
| `index.html` | 수정 | `<script>` 태그 2개 추가, 맵 화면에 챌린지 진입 버튼, `#challenge-select-screen`(난이도/레벨 선택) 마크업, `#coloring-screen` 안에 챌린지 HUD 마크업 |
| `style.css` | 수정(끝에 추가) | 챌린지 선택화면/HUD/LEVEL2 원형노출 마스크 CSS |
| `i18n.js` | 수정 | `challenge.*` 키를 5개 언어 블록에 추가 |
| `sw.js` | 수정 | `CACHE_NAME` 버전업, `CRITICAL_SHELL`에 두 신규 파일 추가 |
| `scripts/verify-challenge-phase1.js` | 신규 | puppeteer 자동 검증 스크립트(`verify-full-clear.js` 패턴) |

---

### Task 1: Config 파일 생성 + 배포 배선(script 태그, sw.js 버전업)

**Files:**
- Create: `challenge-config.js`
- Modify: `index.html:236-238`
- Modify: `sw.js:1`, `sw.js:7-18`

**Interfaces:**
- Produces: 전역 `window.CHALLENGE_CONFIG` — 이후 모든 태스크가 이 객체의 값만 참조하고 숫자를 직접 하드코딩하지 않는다.

- [ ] **Step 1: `challenge-config.js` 작성**

```js
// challenge-config.js
// 챌린지 모드(MODE_CHALLENGE) 밸런스 수치. 명세서 45번 "Config 원칙" — 게임 로직은
// 이 값을 참조만 하고, 숫자 자체는 여기서만 바꾼다.
(function () {
  'use strict';

  window.CHALLENGE_CONFIG = {
    // ---- DIFFICULTY: 문제 1개당 제한시간(초), 명세서 4번 ----
    DIFFICULTY_TIME: { easy: 30, normal: 20, hard: 15, veryhard: 10 },
    // ---- DIFFICULTY: Ranking 점수 배율, 명세서 5번 ----
    DIFFICULTY_SCORE_MULTIPLIER: { easy: 1.0, normal: 1.5, hard: 2.0, veryhard: 3.0 },

    // ---- LEVEL별 Base Score, 명세서 25번(1~10 전부 명시돼 있어 한번에 등록) ----
    LEVEL_BASE_SCORE: [100, 120, 140, 160, 180, 200, 220, 240, 270, 300], // index 0 = LEVEL1

    // ---- Combo 배율, 명세서 27번 ----
    // { min, max(null=무제한), multiplier }
    COMBO_TABLE: [
      { min: 1, max: 2, multiplier: 1.0 },
      { min: 3, max: 4, multiplier: 1.1 },
      { min: 5, max: 7, multiplier: 1.2 },
      { min: 8, max: 10, multiplier: 1.3 },
      { min: 11, max: null, multiplier: 1.5 },
    ],

    // ---- 색상 허용 오차, 명세서 20번. app.js의 colorDistance()와 같은 단위(RGB 유클리드 거리, 0~441) ----
    COLOR_TOLERANCE: 30, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 1, 명세서 8번: Goal 표시 시간(ms) ----
    LEVEL1_GOAL_DISPLAY_MS: 1000,

    // ---- LEVEL 2, 명세서 9번: 원형 노출 반경/이동 간격 (명세서에 구체값 없음 - 임시값) ----
    LEVEL2_REVEAL_RADIUS_PX: 90, // 임시값 - 밸런스 테스트 후 조정 (WORK_SIZE=640 기준)
    LEVEL2_REVEAL_MOVE_MS: 900, // 임시값 - 밸런스 테스트 후 조정

    // ---- Perfect 조건, 명세서 28번 (구체값 없음 - 임시값) ----
    PERFECT_ACCURACY: 100, // 임시값 - 밸런스 테스트 후 조정 (%, 이 이상이어야 Perfect)
    PERFECT_BONUS: 200, // 임시값 - 밸런스 테스트 후 조정

    // ---- Score 부가 요소 (구체 공식 없음 - 임시값) ----
    TIME_BONUS_PER_SEC: 5, // 임시값 - 남은시간(초) x 이 값 = TimeBonus
    MISTAKE_PENALTY_PER_MISTAKE: 20, // 임시값 - MistakeCount x 이 값 = MistakePenalty

    // ---- 돋보기, 명세서 19번: LEVEL 1~6만 Level당 1회 ----
    MAGNIFIER_MAX_LEVEL: 6,
  };
})();
```

- [ ] **Step 2: `index.html`에 script 태그 추가**

`index.html:236-238`(기존 `i18n.js`→`templates.js`→`app.js` 순서) 바로 앞에 아래 두 줄을 추가한다 (challenge-config.js는 app.js보다 먼저 로드되어야 하고, challenge.js는 app.js가 정의하는 함수들을 쓰므로 app.js 뒤):

```html
<script src="challenge-config.js"></script>
<script src="templates.js"></script>
<script src="i18n.js"></script>
<script src="app.js"></script>
<script src="challenge.js"></script>
```

(기존 3줄의 상대 순서는 그대로 두고 `challenge-config.js`를 맨 앞, `challenge.js`를 맨 뒤에 추가)

- [ ] **Step 3: `sw.js` 버전업 + 캐시 목록 추가**

`sw.js:1`:
```js
const CACHE_NAME = 'coloring-app-v98';
```

`sw.js:7-18`의 `CRITICAL_SHELL` 배열에 `'./challenge-config.js'`, `'./challenge.js'` 두 줄을 기존 `'./app.js'` 항목 옆에 추가한다(기존 항목 순서/포맷 그대로 따라서 추가만).

- [ ] **Step 4: 검증**

`미리보기.bat` 실행 → 브라우저 콘솔에서:
```js
typeof CHALLENGE_CONFIG === 'object' && CHALLENGE_CONFIG.DIFFICULTY_TIME.easy === 30
// true 여야 함
```
에러 없이 페이지가 기존과 동일하게 뜨는지(맵 화면, 색칠 화면 전부 기존과 동일 동작) 확인.

- [ ] **Step 5: 커밋**

```bash
git add challenge-config.js index.html sw.js
git commit -m "feat: 챌린지 모드 Config + 배포 배선 추가"
```

---

### Task 2: 챌린지 모드 진입 UI (난이도/레벨 선택 화면)

**Files:**
- Modify: `index.html` (`#map-screen` 영역, `index.html:83-112` 부근에 버튼 추가 / 새 `<section>` 추가)
- Modify: `style.css` (파일 끝에 추가)
- Modify: `i18n.js:15` 이하 5개 언어 블록
- Create 시작: `challenge.js`

**Interfaces:**
- Produces: `window.Challenge.openSelectScreen()` — 맵 화면에서 챌린지 진입 버튼을 누르면 호출됨. `window.Challenge.state` — `{ difficulty, level }` 현재 선택 상태.
- Consumes: 없음(이 태스크는 순수 신규 UI).

- [ ] **Step 1: `index.html`에 챌린지 진입 버튼 추가**

`#map-screen` 안, 기존 `#mode-selector`(`index.html:88-93`) 바로 아래에 추가:
```html
<button id="btn-open-challenge" class="challenge-entry-btn" data-i18n="challenge.entryBtn" type="button">🎮 챌린지 모드</button>
```

- [ ] **Step 2: `index.html`에 `#challenge-select-screen` 추가**

`</section>` (map-screen 닫는 태그, `index.html:112` 부근) 바로 뒤에 새 섹션 추가:
```html
<section id="challenge-select-screen" class="screen" hidden>
  <header class="challenge-select-header">
    <button id="btn-challenge-back" class="icon-btn" type="button" aria-label="Back">⬅️</button>
    <h2 data-i18n="challenge.selectTitle">챌린지 모드</h2>
  </header>

  <div id="challenge-difficulty-row" class="challenge-difficulty-row">
    <button class="challenge-diff-btn" data-difficulty="easy" data-i18n="challenge.difficulty.easy" type="button">EASY</button>
    <button class="challenge-diff-btn" data-difficulty="normal" data-i18n="challenge.difficulty.normal" type="button">NORMAL</button>
    <button class="challenge-diff-btn" data-difficulty="hard" data-i18n="challenge.difficulty.hard" type="button">HARD</button>
    <button class="challenge-diff-btn" data-difficulty="veryhard" data-i18n="challenge.difficulty.veryhard" type="button">VERY HARD</button>
  </div>

  <div id="challenge-level-grid" class="challenge-level-grid"></div>
</section>
```
`#challenge-level-grid`는 challenge.js가 `renderLevelGrid()`에서 LEVEL 1~10 버튼 10개를 JS로 채운다(1·2번만 활성화, 3~10번은 `disabled` + "준비중" 표시 — Phase 2에서 하나씩 활성화).

- [ ] **Step 3: `style.css` 끝에 추가**

```css
/* ===== 챌린지 모드 (Phase 1) ===== */
.challenge-entry-btn {
  display: block;
  width: 100%;
  margin: 12px 0;
  padding: 14px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #ff6b6b, #ffa94d);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}
.challenge-select-header { display: flex; align-items: center; gap: 8px; padding: 12px; }
.challenge-difficulty-row { display: flex; gap: 8px; padding: 0 12px; flex-wrap: wrap; }
.challenge-diff-btn {
  flex: 1 1 auto; min-width: 80px; padding: 10px; border-radius: 12px;
  border: 2px solid #ddd; background: #fff; font-weight: 700; cursor: pointer;
}
.challenge-diff-btn.selected { border-color: #ff6b6b; background: #fff0ec; }
.challenge-level-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; padding: 16px 12px;
}
.challenge-level-btn {
  aspect-ratio: 1; border-radius: 14px; border: none; background: #4dabf7; color: #fff;
  font-size: 1.3rem; font-weight: 800; cursor: pointer;
}
.challenge-level-btn:disabled { background: #ccc; cursor: not-allowed; opacity: 0.6; }
```

- [ ] **Step 4: `i18n.js` 5개 언어 블록에 키 추가**

`i18n.js:15`부터 시작하는 각 언어(`en`, `ko`, `ja`, `zh`, `es`) 블록에 아래 키를 추가한다. 예시(영/한만 표기, 나머지 3개 언어도 같은 키로 자연스럽게 번역해 추가):
```js
// en 블록에 추가
'challenge.entryBtn': '🎮 Challenge Mode',
'challenge.selectTitle': 'Challenge Mode',
'challenge.difficulty.easy': 'EASY',
'challenge.difficulty.normal': 'NORMAL',
'challenge.difficulty.hard': 'HARD',
'challenge.difficulty.veryhard': 'VERY HARD',

// ko 블록에 추가
'challenge.entryBtn': '🎮 챌린지 모드',
'challenge.selectTitle': '챌린지 모드',
'challenge.difficulty.easy': '쉬움',
'challenge.difficulty.normal': '보통',
'challenge.difficulty.hard': '어려움',
'challenge.difficulty.veryhard': '매우 어려움',
```

- [ ] **Step 5: `challenge.js` 뼈대 + 화면 전환 로직 작성**

```js
// challenge.js
// 챌린지 모드(MODE_CHALLENGE) 화면/로직. app.js의 openTemplate/computeCompletion을
// 옵션 파라미터로 재사용하고, 나머지(선택 화면, 문제 루프, 점수 계산)는 여기서 새로 만든다.
(function () {
  'use strict';

  const CFG = window.CHALLENGE_CONFIG;
  const DIFFICULTIES = ['easy', 'normal', 'hard', 'veryhard'];
  const TOTAL_CHALLENGE_LEVELS = 10;
  const IMPLEMENTED_LEVELS = [1, 2]; // Phase 1에서 실제로 플레이 가능한 레벨. Phase 2에서 3~10 추가.

  const mapScreen = document.getElementById('map-screen');
  const selectScreen = document.getElementById('challenge-select-screen');
  const btnOpenChallenge = document.getElementById('btn-open-challenge');
  const btnChallengeBack = document.getElementById('btn-challenge-back');
  const diffRow = document.getElementById('challenge-difficulty-row');
  const levelGrid = document.getElementById('challenge-level-grid');

  const state = { difficulty: 'easy', level: null };

  function openSelectScreen() {
    mapScreen.hidden = true;
    selectScreen.hidden = false;
    renderDifficultyRow();
    renderLevelGrid();
  }

  function closeSelectScreen() {
    selectScreen.hidden = true;
    mapScreen.hidden = false;
  }

  function renderDifficultyRow() {
    Array.from(diffRow.children).forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.difficulty === state.difficulty);
    });
  }

  function renderLevelGrid() {
    levelGrid.innerHTML = '';
    for (let lv = 1; lv <= TOTAL_CHALLENGE_LEVELS; lv++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'challenge-level-btn';
      btn.textContent = String(lv);
      btn.disabled = !IMPLEMENTED_LEVELS.includes(lv);
      btn.addEventListener('click', () => startLevel(lv));
      levelGrid.appendChild(btn);
    }
  }

  diffRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.challenge-diff-btn');
    if (!btn) return;
    state.difficulty = btn.dataset.difficulty;
    renderDifficultyRow();
  });

  btnOpenChallenge.addEventListener('click', openSelectScreen);
  btnChallengeBack.addEventListener('click', closeSelectScreen);

  function startLevel(level) {
    // Task 4에서 실제 구현
    state.level = level;
  }

  window.Challenge = { state, openSelectScreen, closeSelectScreen, startLevel };
})();
```

- [ ] **Step 6: 검증**

`미리보기.bat`으로 맵 화면 진입 → "🎮 챌린지 모드" 버튼 클릭 → 난이도 4개 + 레벨 1~10 그리드(1,2번만 클릭 가능) 뜨는지 확인. 뒤로가기 버튼으로 맵 화면 복귀 확인. 기존 색칠 흐름(레벨1 진입 → 색칠 → 저장)이 예전과 똑같이 동작하는지 재확인(회귀 없음 확인).

- [ ] **Step 7: 커밋**

```bash
git add index.html style.css i18n.js challenge.js
git commit -m "feat: 챌린지 모드 난이도/레벨 선택 화면"
```

---

### Task 3: `app.js` 외과적 수정 — ColorTolerance 옵션 + openTemplate 재사용 옵션

**Files:**
- Modify: `app.js:2104-2119` (`computeCompletion`)
- Modify: `app.js:1092-1112` (`openTemplate`)
- Modify: `app.js:2694` 부근 (디버그 훅 섹션)

**Interfaces:**
- Produces: `computeCompletion(tolerance)` — `tolerance` 생략 시 기존과 동일(정확 매치). `openTemplate(tpl, onReady, opts)` — `opts.challenge` true일 때만 Child의 타임어택 시작 로직을 건너뜀. `window.__debugChallengeOpenTemplate(tplId)`.
- Consumes: Task 2에서 만든 `challenge.js`가 이 두 함수를 호출한다.

- [ ] **Step 1: `computeCompletion`에 tolerance 옵션 추가 (app.js:2104-2119)**

기존:
```js
  function computeCompletion() {
    if (!currentGradableRegions || currentGradableRegions.length === 0) {
      return { matched: 0, total: 0 };
    }
    const data = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
    let matched = 0;
    currentGradableRegions.forEach((r) => {
      const p = r.seed * 4;
      if (data[p + 3] === 0) return; // unpainted
      const targetHex = currentLabelToColor ? currentLabelToColor.get(r.label) : null;
      if (!targetHex) return;
      const [tr, tg, tb] = hexToRgba(targetHex);
      if (data[p] === tr && data[p + 1] === tg && data[p + 2] === tb) matched++;
    });
    return { matched, total: currentGradableRegions.length };
  }
```

수정 후 (기존 호출부 `computeCompletion()`은 `tolerance=0`이 되어 동작 100% 동일):
```js
  function computeCompletion(tolerance) {
    tolerance = tolerance || 0; // 0(기본값) = 기존과 동일한 완전 일치 판정. Child 모드는 항상 이 경로.
    if (!currentGradableRegions || currentGradableRegions.length === 0) {
      return { matched: 0, total: 0 };
    }
    const data = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
    let matched = 0;
    currentGradableRegions.forEach((r) => {
      const p = r.seed * 4;
      if (data[p + 3] === 0) return; // unpainted
      const targetHex = currentLabelToColor ? currentLabelToColor.get(r.label) : null;
      if (!targetHex) return;
      const [tr, tg, tb] = hexToRgba(targetHex);
      if (tolerance > 0) {
        const dist = Math.sqrt((data[p] - tr) ** 2 + (data[p + 1] - tg) ** 2 + (data[p + 2] - tb) ** 2);
        if (dist <= tolerance) matched++;
      } else if (data[p] === tr && data[p + 1] === tg && data[p + 2] === tb) {
        matched++;
      }
    });
    return { matched, total: currentGradableRegions.length };
  }
```

- [ ] **Step 2: `openTemplate`에 challenge 옵션 추가 (app.js:1092-1112)**

기존:
```js
  function openTemplate(tpl, onReady) {
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    currentTemplate = tpl;
    if (tpl.isBoss) {
      currentBossMode = tpl.mode;
      startOrResumeBossAttempt(tpl.mode);
      startLevelTimer();
      setBgmTrack(BOSS_MUSIC_SRC);
    } else {
      currentBossMode = null;
      setBgmTrack(MUSIC_SRC);
      if (!isLevelCleared(tpl.difficulty)) {
        startOrResumeLevelAttempt(tpl.difficulty);
        startLevelTimer();
      }
    }
    coloringTitle.textContent = tpl.emoji + ' ' + I18N.templateName(tpl);
    goalEmoji.textContent = tpl.emoji;
    galleryScreen.hidden = true;
    coloringScreen.hidden = false;
```

수정 후 (세 번째 인자 `opts` 추가, 기본값 `{}`라 Child 호출부 `openTemplate(tpl, onReady)`는 그대로 동일 동작):
```js
  function openTemplate(tpl, onReady, opts) {
    opts = opts || {};
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    currentTemplate = tpl;
    if (opts.challenge) {
      // 챌린지 모드는 자체 타이머/시도추적을 쓰므로 Child의 타임어택 시작 로직을 건너뛴다.
      currentBossMode = null;
    } else if (tpl.isBoss) {
      currentBossMode = tpl.mode;
      startOrResumeBossAttempt(tpl.mode);
      startLevelTimer();
      setBgmTrack(BOSS_MUSIC_SRC);
    } else {
      currentBossMode = null;
      setBgmTrack(MUSIC_SRC);
      if (!isLevelCleared(tpl.difficulty)) {
        startOrResumeLevelAttempt(tpl.difficulty);
        startLevelTimer();
      }
    }
    coloringTitle.textContent = tpl.emoji + ' ' + I18N.templateName(tpl);
    goalEmoji.textContent = tpl.emoji;
    galleryScreen.hidden = true;
    coloringScreen.hidden = false;
```

(이후 `loadTemplateSource(...)` 콜백 부분은 challenge든 child든 필요한 동작이 같으므로 무수정)

- [ ] **Step 3: 디버그 훅 추가 (app.js:2694 부근, 기존 `__debugOpenTemplate` 옆)**

```js
  // 디버그/테스트용: 챌린지 모드로 도안을 열어서(opts.challenge=true) 영역 수 확인
  window.__debugChallengeOpenTemplate = (tplId) => new Promise((resolve) => {
    const tpl = COLORING_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return resolve(null);
    openTemplate(tpl, () => resolve({ regionCount: currentGradableRegions.length }), { challenge: true });
  });

  // 디버그/테스트용: tolerance 값으로 computeCompletion 직접 호출(ColorTolerance 검증용)
  window.__debugComputeCompletion = (tolerance) => computeCompletion(tolerance);
```

- [ ] **Step 4: 검증**

`미리보기.bat` → 콘솔에서:
```js
window.__debugOpenTemplate('sun').then(() => {
  // 기존 Child 경로: 완전일치만 매치되는지
  fillCtx.fillStyle = '#000001'; // 정답과 살짝만 다른 색으로 전부 채웠다고 가정한 수동 확인 대신,
});
window.__debugChallengeOpenTemplate('sun').then((r) => console.log('challenge open ok', r.regionCount > 0));
```
그리고 실제 Child 플레이(레벨 1 아무 그림 색칠 → 저장)가 이전과 완전히 동일하게 동작하는지(회귀 없음) 반드시 재확인 — 이 태스크가 이번 Phase에서 유일하게 `app.js`(기존 배포 코드)를 건드리는 태스크이므로 가장 중요한 검증 지점.

- [ ] **Step 5: 커밋**

```bash
git add app.js
git commit -m "feat: computeCompletion/openTemplate에 챌린지 모드 재사용 옵션 추가(Child 동작 무변경)"
```

---

### Task 4: LEVEL 1(기억 매칭) 문제 루프 + Score 계산 엔진 + Best Score 저장

**Files:**
- Modify: `challenge.js` (Task 2에서 만든 파일에 이어서 작성)
- Modify: `index.html` (`#coloring-screen` 안에 챌린지 HUD 추가)
- Modify: `style.css` (HUD 스타일 추가)

**Interfaces:**
- Consumes: `openTemplate(tpl, onReady, {challenge:true})`, `computeCompletion(tolerance)`, `getTemplatesForLevel(level)` — 전부 app.js가 이미 제공(Task 3에서 옵션 추가 완료).
- Produces: `window.Challenge.startLevel(level)`(Task 2의 자리표시자를 실제 구현으로 교체), `window.Challenge.getBestScore(difficulty, level)`, `window.__debugChallengeSimulateLevel(level, correctRate)`.

- [ ] **Step 1: `index.html`의 `#coloring-screen`에 챌린지 HUD 추가**

`index.html:133-169` 범위 안, 기존 툴바 상단(정확한 위치는 실행 시 `#coloring-screen` 여는 태그 바로 다음 줄)에 추가:
```html
<div id="challenge-hud" class="challenge-hud" hidden>
  <span id="challenge-hud-problem">1 / 10</span>
  <span id="challenge-hud-timer">⏱ 30</span>
  <span id="challenge-hud-combo">Combo x1.0</span>
  <span id="challenge-hud-accuracy">Acc 100%</span>
</div>
```

- [ ] **Step 2: `style.css`에 HUD 스타일 추가**

```css
.challenge-hud {
  display: flex; justify-content: space-between; gap: 8px;
  padding: 8px 12px; font-weight: 700; font-size: 0.9rem;
  background: #fff8f0; border-bottom: 2px solid #ffd8a8;
}
```

- [ ] **Step 3: `challenge.js`에 Score 계산 함수 작성**

```js
  // ---- Score 계산 (명세서 21~27번 공식 그대로) ----
  function comboMultiplierFor(combo) {
    const row = CFG.COMBO_TABLE.find((r) => combo >= r.min && (r.max === null || combo <= r.max));
    return row ? row.multiplier : 1.0;
  }

  function computeFinalScore({ level, difficulty, accuracyPct, mistakeCount, remainingSeconds, maxCombo }) {
    const baseScore = CFG.LEVEL_BASE_SCORE[level - 1];
    const accuracyScore = baseScore * (accuracyPct / 100);
    const difficultyMultiplier = CFG.DIFFICULTY_SCORE_MULTIPLIER[difficulty];
    const comboMultiplier = comboMultiplierFor(maxCombo);
    const timeBonus = Math.max(0, remainingSeconds) * CFG.TIME_BONUS_PER_SEC;
    const isPerfect = mistakeCount === 0 && accuracyPct >= CFG.PERFECT_ACCURACY;
    const perfectBonus = isPerfect ? CFG.PERFECT_BONUS : 0;
    const mistakePenalty = mistakeCount * CFG.MISTAKE_PENALTY_PER_MISTAKE;

    let finalScore = accuracyScore * difficultyMultiplier * comboMultiplier
      + timeBonus + perfectBonus - mistakePenalty;
    if (finalScore < 0) finalScore = 0; // 명세서 26번: 0 미만 불가

    return { finalScore: Math.round(finalScore), isPerfect, accuracyScore, timeBonus, perfectBonus, mistakePenalty };
  }
```

- [ ] **Step 4: `challenge.js`에 Best Score 저장/조회 함수 작성**

```js
  // ---- Best Score 저장, 명세서 30번(Mode/Difficulty/Level 기준) ----
  const BEST_SCORE_KEY = 'challengeBestScore';

  function getAllBestScores() {
    try { return JSON.parse(localStorage.getItem(BEST_SCORE_KEY)) || {}; } catch (e) { return {}; }
  }

  function getBestScore(difficulty, level) {
    const all = getAllBestScores();
    return (all[difficulty] && all[difficulty][level]) || 0;
  }

  function saveBestScoreIfHigher(difficulty, level, score) {
    const all = getAllBestScores();
    if (!all[difficulty]) all[difficulty] = {};
    const prev = all[difficulty][level] || 0;
    const isNewRecord = score > prev;
    if (isNewRecord) {
      all[difficulty][level] = score;
      localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(all));
    }
    return isNewRecord;
  }
```

- [ ] **Step 5: LEVEL 1 문제 루프 구현 (`startLevel`을 Task 2의 자리표시자에서 교체)**

```js
  const hud = {
    root: document.getElementById('challenge-hud'),
    problem: document.getElementById('challenge-hud-problem'),
    timer: document.getElementById('challenge-hud-timer'),
    combo: document.getElementById('challenge-hud-combo'),
    accuracy: document.getElementById('challenge-hud-accuracy'),
  };

  const run = { // 한 레벨 시도(10문제) 동안의 진행 상태
    difficulty: null, level: null, problems: [], index: 0,
    correctCount: 0, mistakeCount: 0, combo: 0, maxCombo: 0,
    problemTimerId: null, problemDeadline: 0,
  };

  function startLevel(level) {
    const problems = getTemplatesForLevel(level); // app.js가 이미 제공, 레벨당 10개
    Object.assign(run, {
      difficulty: state.difficulty, level, problems, index: 0,
      correctCount: 0, mistakeCount: 0, combo: 0, maxCombo: 0,
    });
    selectScreen.hidden = true;
    hud.root.hidden = false;
    loadNextProblem();
  }

  function loadNextProblem() {
    if (run.index >= run.problems.length) return finishLevel();
    const tpl = run.problems[run.index];
    hud.problem.textContent = (run.index + 1) + ' / ' + run.problems.length;

    openTemplate(tpl, () => {
      if (run.level === 1) startLevel1Reveal();
      startProblemTimer();
    }, { challenge: true });
  }

  function startProblemTimer() {
    const seconds = CFG.DIFFICULTY_TIME[run.difficulty];
    run.problemDeadline = Date.now() + seconds * 1000;
    clearInterval(run.problemTimerId);
    run.problemTimerId = setInterval(tickProblemTimer, 250);
    tickProblemTimer();
  }

  function tickProblemTimer() {
    const remaining = Math.max(0, Math.ceil((run.problemDeadline - Date.now()) / 1000));
    hud.timer.textContent = '⏱ ' + remaining;
    if (remaining <= 0) {
      clearInterval(run.problemTimerId);
      handleProblemTimeout();
    }
  }

  function handleProblemTimeout() {
    // 명세서 5번: 시간 0 -> TIME OVER -> 해당 게임 FAIL. LEVEL 1 규칙(8번)대로 오답 처리와 동일하게 다룬다.
    registerMistake();
    advanceToNextProblem();
  }

  function registerMistake() {
    run.mistakeCount++;
    run.combo = 0; // 명세서 20/23번: Wrong -> Combo 초기화
    hud.combo.textContent = 'Combo x' + comboMultiplierFor(run.combo).toFixed(1);
  }

  function registerCorrect() {
    run.correctCount++;
    run.combo++;
    if (run.combo > run.maxCombo) run.maxCombo = run.combo;
    hud.combo.textContent = 'Combo x' + comboMultiplierFor(run.combo).toFixed(1);
    const accPct = Math.round((run.correctCount / run.problems.length) * 100);
    hud.accuracy.textContent = 'Acc ' + accPct + '%';
  }

  // 사용자가 '완료' 버튼을 눌렀을 때 challenge.js가 직접 판정한다(Child의 #btn-save 핸들러는 건드리지 않음).
  function submitCurrentProblem() {
    const { matched, total } = computeCompletion(CFG.COLOR_TOLERANCE);
    clearInterval(run.problemTimerId);
    if (matched === total) registerCorrect(); else registerMistake();
    advanceToNextProblem();
  }

  function advanceToNextProblem() {
    run.index++;
    loadNextProblem();
  }

  function finishLevel() {
    hud.root.hidden = true;
    const accuracyPct = Math.round((run.correctCount / run.problems.length) * 100);
    const remainingSeconds = Math.max(0, Math.round((run.problemDeadline - Date.now()) / 1000));
    const result = computeFinalScore({
      level: run.level, difficulty: run.difficulty, accuracyPct,
      mistakeCount: run.mistakeCount, remainingSeconds, maxCombo: run.maxCombo,
    });
    const isNewRecord = saveBestScoreIfHigher(run.difficulty, run.level, result.finalScore);
    coloringScreen.hidden = true;
    selectScreen.hidden = false;
    renderLevelGrid();
    alert('Score: ' + result.finalScore + (isNewRecord ? ' (NEW RECORD!)' : '') + (result.isPerfect ? ' PERFECT!' : ''));
    // 축하 연출/모달은 Phase 4에서 명세서 43번(Next/Back 클릭음) 작업과 함께 다듬는다. Phase 1은 결과값 저장/노출까지만.
  }

  function startLevel1Reveal() {
    // 명세서 8번: Goal을 1초 보여주고 숨긴다
    goalCanvas.hidden = false; // app.js가 이미 캐싱해 둔 전역 goalCanvas 참조 재사용
    setTimeout(() => { goalCanvas.hidden = true; }, CFG.LEVEL1_GOAL_DISPLAY_MS);
  }
```

**주의(실행 시 확인):** `goalCanvas`가 `app.js` 안에서 `let`/`const`로 선언돼 모듈 스코프에 갇혀 있으면 `challenge.js`에서 접근 불가능하다. 이 경우 Task 3의 Step 3(디버그 훅 섹션)에 `window.__challengeInternals = { goalCanvas, coloringScreen, computeCompletion, openTemplate };` 한 줄을 추가해 필요한 참조만 최소로 export하고, `challenge.js`에서는 `const { goalCanvas, coloringScreen } = window.__challengeInternals;`로 받는다. 이미 `computeCompletion`/`openTemplate`는 전역 함수 선언이라 스크립트 간 그대로 보이므로 이 예외 처리가 필요한 건 DOM 캔버스 참조 몇 개뿐이다.

- [ ] **Step 6: 제출 버튼 연결**

Child의 `#btn-save`(app.js가 이미 리스너를 붙여놓음, `app.js:2129` 부근)는 그대로 두고, 챌린지 모드일 때만 그 버튼의 클릭이 `submitCurrentProblem()`으로 가야 한다. 가장 안전한 방법은 **버튼을 공유하지 않고 캡처 단계에서 분기**:

```js
  document.getElementById('btn-save').addEventListener('click', (e) => {
    if (!hud.root.hidden) { // 챌린지 진행 중이면
      e.stopImmediatePropagation(); // app.js의 기존 핸들러(Child용 100%매치 로직) 실행 막기
      submitCurrentProblem();
    }
  }, true); // capture:true로 등록해 app.js의 버블 단계 리스너보다 먼저 가로챈다
```

- [ ] **Step 7: 검증**

`미리보기.bat` → 챌린지 모드 → EASY → LEVEL 1 → Goal 1초 보이다 사라지는지, 타이머 카운트다운 되는지, "완료" 누르면 다음 문제로 넘어가는지, 10문제 끝나면 alert로 점수 뜨는지 확인. 콘솔에서:
```js
Challenge.getBestScore('easy', 1) // 방금 플레이한 점수와 일치해야 함
```
Child 모드 플레이가 여전히 이전과 동일하게 동작하는지(특히 `#btn-save` 클릭 — capture 리스너가 챌린지 진행 중이 아닐 때는 아무 영향 없어야 함) 재확인.

- [ ] **Step 8: 커밋**

```bash
git add challenge.js index.html style.css
git commit -m "feat: 챌린지 LEVEL 1 문제 루프 + Score 계산 + Best Score 저장"
```

---

### Task 5: LEVEL 2(부분 원형 노출) 구현

**Files:**
- Modify: `challenge.js`
- Modify: `style.css`

**Interfaces:**
- Consumes: Task 4의 `run` 상태, `loadNextProblem`.
- Produces: `startLevel2Reveal()` — `loadNextProblem`의 `if (run.level === 1) ... ` 분기 옆에 `else if (run.level === 2)`로 연결.

- [ ] **Step 1: `style.css`에 원형 마스크 클래스 추가**

```css
.challenge-goal-mask {
  clip-path: circle(90px at 50% 50%); /* JS가 매 이동마다 style.clipPath로 좌표 갱신 */
}
```

- [ ] **Step 2: `challenge.js`에 LEVEL 2 로직 추가**

```js
  function startLevel2Reveal() {
    // 명세서 9번: Goal의 일부만 원형으로 노출, 노출 영역을 반복 변경
    goalCanvas.hidden = false;
    goalCanvas.classList.add('challenge-goal-mask');
    const radius = CFG.LEVEL2_REVEAL_RADIUS_PX;
    const moveReveal = () => {
      const x = radius + Math.random() * (640 - radius * 2);
      const y = radius + Math.random() * (640 - radius * 2);
      goalCanvas.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
    };
    moveReveal();
    run.level2RevealTimerId = setInterval(moveReveal, CFG.LEVEL2_REVEAL_MOVE_MS);
  }

  function stopLevel2Reveal() {
    clearInterval(run.level2RevealTimerId);
    goalCanvas.classList.remove('challenge-goal-mask');
    goalCanvas.style.clipPath = '';
  }
```

`loadNextProblem`의 콜백을 아래처럼 확장:
```js
    openTemplate(tpl, () => {
      if (run.level === 1) startLevel1Reveal();
      else if (run.level === 2) startLevel2Reveal();
      startProblemTimer();
    }, { challenge: true });
```

`advanceToNextProblem`(또는 `submitCurrentProblem`/`handleProblemTimeout` 앞)에서 레벨2였다면 `stopLevel2Reveal()`을 호출해 다음 문제로 넘어가기 전에 인터벌을 정리한다:
```js
  function advanceToNextProblem() {
    if (run.level === 2) stopLevel2Reveal();
    run.index++;
    loadNextProblem();
  }
```

- [ ] **Step 3: 검증**

챌린지 모드 → EASY → LEVEL 2 → Goal 이미지가 전체가 아니라 원형으로 일부만 계속 자리를 옮기며 보이는지 확인. 10문제 종료 후 레벨1과 마찬가지로 점수/Best Score 뜨는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add challenge.js style.css
git commit -m "feat: 챌린지 LEVEL 2(부분 원형 노출) 구현"
```

---

### Task 6: 자동 검증 스크립트 + 전체 회귀 확인

**Files:**
- Create: `scripts/verify-challenge-phase1.js`

**Interfaces:**
- Consumes: Task 3의 `window.__debugChallengeOpenTemplate`, `window.__debugComputeCompletion`, Task 4의 `window.Challenge.getBestScore`.

- [ ] **Step 1: 검증 스크립트 작성 (`scripts/verify-full-clear.js` 패턴 그대로)**

```js
// 챌린지 모드 Phase 1(LEVEL 1~2)이 실제 UI에서 끝까지 동작하는지, 그리고 기존 Child 모드가
// 이번 변경으로 회귀되지 않았는지 헤드리스로 검증한다.
// 사용: LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-challenge-phase1.js
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || 'http://localhost:8843/index.html';

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.goto(INDEX_URL, { waitUntil: 'load' });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => document.getElementById('btn-cover-start').click());

    // 1) 챌린지 진입 UI 존재 확인
    const hasEntryBtn = await page.evaluate(() => !!document.getElementById('btn-open-challenge'));
    if (!hasEntryBtn) throw new Error('챌린지 진입 버튼 없음');

    // 2) Config 로드 확인
    const cfgOk = await page.evaluate(() => typeof CHALLENGE_CONFIG === 'object' && CHALLENGE_CONFIG.DIFFICULTY_TIME.easy === 30);
    if (!cfgOk) throw new Error('CHALLENGE_CONFIG 로드 실패');

    // 3) 엔진 재사용 확인(회귀 없이 challenge 옵션으로 열리는지)
    const openResult = await page.evaluate(() => window.__debugChallengeOpenTemplate('sun'));
    if (!openResult || openResult.regionCount <= 0) throw new Error('__debugChallengeOpenTemplate 실패');

    // 4) ColorTolerance 옵션이 기존 정확매치 판정을 깨지 않는지(둘 다 같은 도안, tolerance=0 결과가
    //    Child 원래 로직과 동일해야 함 - 완전 안 칠했으니 matched=0 total>0 이어야 정상)
    const exact = await page.evaluate(() => window.__debugComputeCompletion(0));
    if (!(exact.total > 0 && exact.matched === 0)) throw new Error('computeCompletion(0) 회귀 의심: ' + JSON.stringify(exact));

    // 5) Best Score 저장 확인 (직접 함수 호출로 로직만 검증 - 실제 10문제 풀이는 수동 QA에서)
    const bestScoreOk = await page.evaluate(() => {
      const before = Challenge.getBestScore('easy', 1);
      return typeof before === 'number';
    });
    if (!bestScoreOk) throw new Error('Challenge.getBestScore 실패');

    if (pageErrors.length) throw new Error('페이지 에러 발생: ' + pageErrors.join(' | '));

    console.log('✅ 챌린지 모드 Phase 1 기본 검증 통과');
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
```

- [ ] **Step 2: 실행**

```bash
node scripts/serve.js &
LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-challenge-phase1.js
```
`✅ 챌린지 모드 Phase 1 기본 검증 통과` 출력 확인.

- [ ] **Step 3: 기존 회귀 스위트 재실행**

```bash
LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-full-clear.js
```
기존 Child 4개 모드 풀클리어 흐름이 여전히 통과하는지 확인 — 이번 Phase에서 유일하게 `app.js`를 건드렸으므로 필수.

- [ ] **Step 4: 커밋**

```bash
git add scripts/verify-challenge-phase1.js
git commit -m "test: 챌린지 모드 Phase 1 자동 검증 스크립트 추가"
```

---

## Self-Review 메모 (계획 작성자 체크)

- **명세서 커버리지**: Phase 1은 명세서의 2(Mode)/3~5(Level·Difficulty·Timer)/6~9(LEVEL1,2 일부)/18~27(색판정~Score)/30(BestScore) 항목을 다룬다. 10(LEVEL3)~17(LEVEL10), 28~39(Boss), 41(Ranking 연동), 42~44(Audio/Next-Back/Level Clear 연출)는 의도적으로 Phase 2~4로 미뤘다 — 위 Phase 분할 계획에 명시.
- **플레이스홀더 스캔**: `TIME_BONUS_PER_SEC`, `MISTAKE_PENALTY_PER_MISTAKE`, `PERFECT_BONUS`, `PERFECT_ACCURACY`, `LEVEL2_REVEAL_RADIUS_PX`, `LEVEL2_REVEAL_MOVE_MS`, `COLOR_TOLERANCE`는 명세서에 구체 숫자가 없어 임시값으로 넣었고 전부 주석으로 표시함(숨기지 않음).
- **타입/시그니처 일관성**: `computeCompletion(tolerance)`가 Task 3에서 정의한 시그니처 그대로 Task 4·6에서 쓰인다. `openTemplate(tpl, onReady, opts)`도 동일. `Challenge.getBestScore(difficulty, level)` 시그니처가 검증 스크립트와 일치.
