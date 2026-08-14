# 챌린지 모드 Phase 2 (LEVEL 3~10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1에서 만든 챌린지 모드(LEVEL 1·2, 선택 화면, Score/Combo/BestScore 엔진)에 LEVEL 3~10을 추가한다. 보스(28~39)/랭킹 연동(41)/오디오 연출(42~44)은 이 Phase 범위 밖(사용자 확정, 별도 Phase).

**Architecture:** `challenge.js`에 레벨별 `startLevelN.../stopLevelN...` 함수 8쌍을 추가하고, `loadNextProblem`/`advanceToNextProblem`/`endRun`을 레벨 번호로 분기하는 `LEVEL_EFFECTS` 디스패치 테이블로 리팩터한다(현재 `if (run.level===1) ... else if (run.level===2) ...`가 8개 더 늘어나는 걸 막기 위함). `app.js`는 딱 한 태스크(Task 2)에서만, 8개 레벨이 공통으로 쓸 프리미티브 4개(Goal 임의색 재도색, 영역 픽셀 직접 쓰기, 영역 스냅샷 조회, line 이미지 참조 보관)만 최소 추가한다 — Child 모드 동작은 100% 무변경.

**Tech Stack:** Vanilla JS, CSS transition/keyframes + `requestAnimationFrame`, localStorage. 테스트는 `scripts/verify-challenge-phase1.js` 패턴을 그대로 따르는 puppeteer-core(Edge 헤드리스) 스크립트.

**Spec:** `1차 업데이트 기획서 및 명세서\REV최종\Claude Code용 앱 업데이트 개발 명세서 최종.odt` (v7.0 FINAL) 8~17번(LEVEL 3~10), 16번(Magnifier, 이번 Phase 범위 아님), 45번(Config 원칙). 텍스트 추출본 127~245줄.

## Global Constraints

- **MODE_CHILD, LEVEL 1·2, 선택 화면/Score 엔진은 100% 무변경.** `app.js` 수정은 Task 2 하나로 묶고, 전부 "새 함수 추가 또는 기존 로직을 함수로 추출만(출력 동일)" 형태로 한다.
- 밸런스 수치는 전부 `CHALLENGE_CONFIG`에 모은다. 명세서에 구체 숫자가 없는 값은 임시값 + `// 임시값 - 밸런스 테스트 후 조정` 주석을 반드시 남긴다.
- 각 레벨 태스크는 `IMPLEMENTED_LEVELS` 배열에 자기 레벨 번호를 추가하는 것으로 끝난다(그 전까지는 선택 화면에서 `disabled`로 잠겨 있어 안전하게 미완성 상태로 커밋 가능).
- `sw.js`의 `CACHE_NAME`은 매 커밋(각 Task)마다 올린다.
- 이번 Phase는 새 사용자 노출 문자열이 없다(전부 시각 효과/타이밍) — 새 문자열이 생기면 그 태스크에서 `i18n.js` 5개 언어에 추가한다.

## 해석이 갈리는 지점 (구현 전 확인 필요 — Self-Review에서도 재확인)

1. **LEVEL 6** "Goal과 동일한 상태가 되면 1초 Pause": 영역 수가 많으면(예: 레벨6 도안 10개 영역) 매 tick 랜덤 배정이 실제 정답과 전부 우연히 일치할 확률이 사실상 0에 가깝다. Task 7은 스펙 문구를 문자 그대로 구현하지만, **실제 플레이에서 Pause가 거의 발생하지 않을 수 있다** — 실물 확인 후 방식을 바꿀 수도 있음을 미리 밝혀둔다.
2. **LEVEL 10** "COLOR_CHANGED 영역만 재색칠 가능/모든 영역 정상 상태면 CLEAR": 명세서엔 이게 문제 1~10 루프 밖의 "끝까지 버티기"처럼도 읽히지만, 다른 레벨(1~9)과 동일하게 **10문제 × Difficulty 제한시간 루프 안에서, 그 문제가 진행되는 동안 배경에서 카오스가 도는 방식**으로 구현한다(기존 아키텍처와 일관성 유지, Score/Combo/BestScore 엔진 재사용 가능). "이미 정답 상태인 영역"은 색상 tolerance 비교 대신 **"칠해져 있음(painted)" 여부로 단순화**한다 — 정밀한 재검증은 다음 조정에서.
3. 위 두 가지는 Task 7/11 완료 후 실물 플레이로 "이게 맞나" 재확인이 필요하다.

---

## File Structure

| 파일 | 종류 | 책임 |
|---|---|---|
| `challenge-config.js` | 수정 | LEVEL 3~10 밸런스 수치 추가 |
| `app.js` | 수정(Task 2 한 번만) | `repaintGoalWithColors`/`paintRegionPixels`/`getChallengeRegionInfo` 추가, `currentLineImg` 보관, `__challengeInternals` 확장 |
| `challenge.js` | 수정 | `LEVEL_EFFECTS` 디스패치 테이블 + 레벨별 `startLevelN*/stopLevelN*` 8쌍 |
| `style.css` | 수정(끝에 추가) | 레벨별 애니메이션/오클루전 CSS |
| `sw.js` | 수정 | 매 태스크 캐시 버전업 |
| `scripts/verify-challenge-phase1.js` | 수정(Task 12) | 레벨 3~10 자동 진행 확인 추가 |

---

### Task 1: CHALLENGE_CONFIG에 LEVEL 3~10 수치 추가

**Files:**
- Modify: `challenge-config.js`

**Interfaces:**
- Produces: `CHALLENGE_CONFIG.LEVEL3_OCCLUSION_OPACITY`, `LEVEL4_TRANSITION_MS`, `LEVEL5_ROTATION_MS`, `LEVEL5_MIRROR_INTERVAL_MS`, `LEVEL6_COLOR_CHANGE_MS`, `LEVEL6_MATCH_PAUSE_MS`, `LEVEL7_SWEEP_START_MS`, `LEVEL7_SWEEP_END_MS`, `LEVEL8_SHOW_START_MS`, `LEVEL8_SHOW_END_MS`, `LEVEL8_HIDE_START_MS`, `LEVEL8_HIDE_END_MS`, `LEVEL9_INTERVAL_1`, `LEVEL9_INTERVAL_2`, `LEVEL9_INTERVAL_3`, `LEVEL10_COLOR_CHANGE_INTERVAL_MS`.

- [ ] **Step 1: `challenge-config.js`의 `MAGNIFIER_MAX_LEVEL` 줄 뒤에 추가**

```js
    // ---- LEVEL 3, 명세서 8번: Cloud/Rain/Snow 가림 불투명도 (Goal을 완전히 가리지 않음) ----
    LEVEL3_OCCLUSION_OPACITY: 0.35, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 4, 명세서 9번: Fade/Shrink/Fragment 사라짐 애니메이션 길이(ms) ----
    LEVEL4_TRANSITION_MS: 600, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 5, 명세서 10번: 360도 회전 1바퀴 시간 / Mirror 전환 간격(ms) ----
    LEVEL5_ROTATION_MS: 4000, // 임시값 - 밸런스 테스트 후 조정
    LEVEL5_MIRROR_INTERVAL_MS: 4000, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 6, 명세서 11번: 영역별 색상 랜덤 변경 주기 / 실제 정답과 일치 시 Pause 길이(ms) ----
    LEVEL6_COLOR_CHANGE_MS: 800, // 임시값 - 밸런스 테스트 후 조정
    LEVEL6_MATCH_PAUSE_MS: 1000, // 명세서 11번에 "1초"로 명시됨

    // ---- LEVEL 7, 명세서 12번: Goal이 LEFT->RIGHT로 쓸고 지나가는 시간(ms). 문제 1->10로 갈수록
    // SWEEP_START_MS에서 SWEEP_END_MS로 짧아진다(=속도 증가). ----
    LEVEL7_SWEEP_START_MS: 3000, // 임시값 - 밸런스 테스트 후 조정
    LEVEL7_SWEEP_END_MS: 900, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 8, 명세서 13번: Goal Blink Show/Hide 시간(ms). 문제 1->10로 갈수록 START에서 END로 짧아짐 ----
    LEVEL8_SHOW_START_MS: 1500, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_SHOW_END_MS: 500, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_HIDE_START_MS: 500, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_HIDE_END_MS: 200, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 9, 명세서 14번: 색칠 영역 랜덤 소멸 간격(초 -> ms). 명세서에 1.5/1/0.7초로 명시됨 ----
    LEVEL9_INTERVAL_1: 1500,
    LEVEL9_INTERVAL_2: 1000,
    LEVEL9_INTERVAL_3: 700,

    // ---- LEVEL 10, 명세서 15번: 색상 변경 주기(ms). 명세서에 "3초마다"로 명시됨 ----
    LEVEL10_COLOR_CHANGE_INTERVAL_MS: 3000,
```

- [ ] **Step 2: 검증**

`node -e "require('./challenge-config.js')"`는 `window`가 없어 그대로는 못 돌린다 — 대신 `미리보기.bat` → 콘솔에서 `CHALLENGE_CONFIG.LEVEL10_COLOR_CHANGE_INTERVAL_MS === 3000` 확인.

- [ ] **Step 3: 커밋**

```bash
git add challenge-config.js
git commit -m "feat: 챌린지 LEVEL 3~10 Config 수치 추가"
```

---

### Task 2: `app.js` 외과적 수정 — 챌린지 공용 프리미티브 4개 추가

**Files:**
- Modify: `app.js:1808-1842` (`renderGoalPreview`)
- Modify: `app.js` (`__challengeInternals` export, 2785번 부근)

**Interfaces:**
- Produces: `repaintGoalWithColors(colorMap)` — `colorMap`이 `Map<label,hex>`면 그 색으로, `null`/`undefined`면 실제 정답색(`currentLabelToColor`)으로 goalCanvas를 다시 그린다. `paintRegionPixels(seed, hexColorOrNull)` — `floodFill`과 같은 벽 경계 연결 채우기지만 Undo 기록/효과음을 남기지 않는다(시스템이 자동으로 바꾸는 용도라 플레이어 Undo 스택을 건드리면 안 됨), `hexColorOrNull=null`이면 그 영역을 다시 미색칠(alpha 0) 상태로 되돌린다. `getChallengeRegionInfo()` — `[{seed, label, targetColor, painted}]`.
- Consumes: Task 3부터 모든 레벨 태스크가 `window.__challengeInternals`를 통해 이 4개를 가져다 쓴다.

- [ ] **Step 1: `currentLineImg` 저장 + `repaintGoalWithColors` 추출 (`app.js:1808-1842`)**

기존 `renderGoalPreview` 끝부분(`imgData`~`drawImage`)을 새 함수로 빼내고, `renderGoalPreview`는 그 함수를 호출하도록 바꾼다:

```js
  let currentLineImg = null; // Task2: repaintGoalWithColors가 line art를 다시 그릴 때 재사용

  function renderGoalPreview(lineImg) {
    currentLineImg = lineImg;
    currentLabelToColor = new Map();
    const custom = currentTemplate && currentTemplate.partColors;
    const cyclePalette = (currentTemplate && currentTemplate.paletteOverride) ||
      targetPaletteForLevel(currentTemplate && currentTemplate.difficulty);
    const sampled = currentSampledColors;
    if (custom) {
      currentGradableRegions.forEach((r, i) => {
        if (custom[i]) currentLabelToColor.set(r.label, custom[i]);
      });
    } else if (getMode() === 'easy' || (currentTemplate && currentTemplate.isBoss)) {
      currentGradableRegions.forEach((r, i) => {
        const hex = (sampled && sampled.has(r.label)) ? sampled.get(r.label) : cyclePalette[i % cyclePalette.length];
        currentLabelToColor.set(r.label, hex);
      });
    } else {
      const seed = (currentTemplate ? currentTemplate.id : 'x') + ':' + getMode();
      const randomColors = seededRegionColors(currentGradableRegions, currentLabelMap, cyclePalette, seed);
      currentGradableRegions.forEach((r) => currentLabelToColor.set(r.label, randomColors.get(r.label)));
    }
    repaintGoalWithColors(currentLabelToColor);
  }

  // Task2(챌린지 Phase2): goalCanvas를 임의의 label->hex 맵으로 다시 그린다. colorMap이 없으면
  // 실제 정답색(currentLabelToColor)으로 복원. renderGoalPreview의 기존 픽셀 루프를 그대로 뺀 것뿐이라
  // Child 모드 출력은 100% 동일.
  function repaintGoalWithColors(colorMap) {
    const useMap = colorMap || currentLabelToColor;
    const imgData = goalCtx.createImageData(WORK_SIZE, WORK_SIZE);
    const data = imgData.data;
    for (let i = 0; i < WORK_SIZE * WORK_SIZE; i++) {
      const label = currentLabelMap[i];
      const hex = label >= 0 ? useMap.get(label) : undefined;
      if (hex) {
        const [r, g, b] = hexToRgba(hex);
        const p = i * 4;
        data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255;
      }
    }
    goalCtx.putImageData(imgData, 0, 0);
    if (currentLineImg) goalCtx.drawImage(currentLineImg, 0, 0, WORK_SIZE, WORK_SIZE);
  }
```

- [ ] **Step 2: `paintRegionPixels` 추가 (`floodFill` 함수 바로 뒤, `app.js:2040` 부근)**

```js
  // Task2(챌린지 Phase2): floodFill과 같은 벽(wallMask) 경계 연결 채우기지만, 시스템이 자동으로
  // 색을 바꾸는 용도(LEVEL 9/10)라 pushUndo/playPop을 호출하지 않는다 — 플레이어가 실행취소를
  // 눌렀을 때 게임이 몰래 바꾼 색까지 취소돼버리는 걸 막기 위함. hexColor가 null이면 그 영역을
  // 다시 미색칠(alpha 0) 상태로 되돌린다(LEVEL 9의 "랜덤 소멸").
  function paintRegionPixels(seed, hexColor) {
    if (!wallMask || wallMask[seed] === 1) return;
    const imgData = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE);
    const data = imgData.data;
    const [r, g, b, a] = hexColor ? hexToRgba(hexColor) : [0, 0, 0, 0];
    const visited = new Uint8Array(WORK_SIZE * WORK_SIZE);
    const stack = [seed];
    visited[seed] = 1;
    while (stack.length) {
      const idx = stack.pop();
      const x = idx % WORK_SIZE;
      const y = (idx / WORK_SIZE) | 0;
      const p = idx * 4;
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = a;
      if (x > 0) tryPush(idx - 1);
      if (x < WORK_SIZE - 1) tryPush(idx + 1);
      if (y > 0) tryPush(idx - WORK_SIZE);
      if (y < WORK_SIZE - 1) tryPush(idx + WORK_SIZE);
    }
    function tryPush(nIdx) {
      if (visited[nIdx] || wallMask[nIdx] === 1) return;
      visited[nIdx] = 1;
      stack.push(nIdx);
    }
    fillCtx.putImageData(imgData, 0, 0);
  }

  // Task2(챌린지 Phase2): 현재 도안의 영역별 스냅샷(정답색 + 지금 칠해져 있는지 여부).
  // LEVEL 6/9/10이 "어느 영역을 건드릴지" 고르는 데 쓴다.
  function getChallengeRegionInfo() {
    if (!currentGradableRegions || currentGradableRegions.length === 0) return [];
    const data = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
    return currentGradableRegions.map((r) => {
      const p = r.seed * 4;
      return { seed: r.seed, label: r.label, targetColor: currentLabelToColor.get(r.label), painted: data[p + 3] !== 0 };
    });
  }
```

- [ ] **Step 3: `__challengeInternals` export 확장 (`app.js:2785` 부근)**

기존:
```js
  window.__challengeInternals = {
    goalCanvas, coloringScreen, openTemplate, computeCompletion, getTemplatesForLevel
  };
```
수정 후:
```js
  window.__challengeInternals = {
    goalCanvas, coloringScreen, openTemplate, computeCompletion, getTemplatesForLevel,
    repaintGoalWithColors, paintRegionPixels, getChallengeRegionInfo, COLORS
  };
```
(실제 줄 내용은 파일에서 정확한 현재 형태를 확인하고 그 형태에 맞춰 키만 추가할 것)

- [ ] **Step 4: 검증**

`미리보기.bat` → Child 모드로 아무 도안이나 정상적으로 색칠/저장되는지(회귀 없음) 확인. 콘솔에서:
```js
window.__debugChallengeOpenTemplate('sun').then(() => {
  console.log(window.__challengeInternals.getChallengeRegionInfo().length > 0);
  window.__challengeInternals.repaintGoalWithColors(null); // 에러 없이 실행되는지만 확인
});
```

- [ ] **Step 5: 커밋**

```bash
git add app.js
git commit -m "feat: app.js에 챌린지 Phase2 공용 프리미티브 추가(repaintGoalWithColors/paintRegionPixels/getChallengeRegionInfo)"
```

---

### Task 3: `challenge.js` — `LEVEL_EFFECTS` 디스패치 테이블 도입

**Files:**
- Modify: `challenge.js`

**Interfaces:**
- Produces: `LEVEL_EFFECTS` (레벨 번호 -> `{start, stop}`), `goalCanvasWrap`/`COLORS`/`getChallengeRegionInfo`/`repaintGoalWithColors`/`paintRegionPixels` 모듈 상수.
- Consumes: Task 2의 `__challengeInternals` 확장분.

- [ ] **Step 1: import 구조분해 확장 (`challenge.js:11`)**

기존:
```js
  const { goalCanvas, coloringScreen, openTemplate, computeCompletion, getTemplatesForLevel } = window.__challengeInternals;
```
수정 후:
```js
  const {
    goalCanvas, coloringScreen, openTemplate, computeCompletion, getTemplatesForLevel,
    repaintGoalWithColors, paintRegionPixels, getChallengeRegionInfo, COLORS,
  } = window.__challengeInternals;
  const goalCanvasWrap = document.getElementById('goal-canvas-wrap');
```

- [ ] **Step 2: `run` 상태에 레벨별 타이머/애니메이션 id 슬롯 추가 (`challenge.js`의 `run` 객체)**

기존 `run` 객체 끝에 아래 키를 추가:
```js
    level3OccludeClass: null, level5AnimFrame: null, level6TimerId: null,
    level8TimerId: null, level9TimerId: null, level10TimerId: null,
```

- [ ] **Step 3: `LEVEL_EFFECTS` 테이블 + `loadNextProblem`/`advanceToNextProblem`/`endRun` 리팩터**

`loadNextProblem`의 기존 분기:
```js
    openTemplate(tpl, () => {
      run.submitting = false;
      if (run.level === 1) startLevel1Reveal();
      else if (run.level === 2) startLevel2Reveal();
      startProblemTimer();
      if (debugOnReady) { const cb = debugOnReady; debugOnReady = null; cb(); }
    }, { challenge: true });
```
아래로 교체:
```js
    openTemplate(tpl, () => {
      run.submitting = false;
      const effect = LEVEL_EFFECTS[run.level];
      if (effect) effect.start();
      startProblemTimer();
      if (debugOnReady) { const cb = debugOnReady; debugOnReady = null; cb(); }
    }, { challenge: true });
```

`advanceToNextProblem`의 기존:
```js
  function advanceToNextProblem() {
    if (run.level === 2) stopLevel2Reveal();
    run.index++;
    loadNextProblem();
  }
```
아래로 교체:
```js
  function advanceToNextProblem() {
    const effect = LEVEL_EFFECTS[run.level];
    if (effect && effect.stop) effect.stop();
    run.index++;
    loadNextProblem();
  }
```

`endRun`의 기존:
```js
  function endRun() {
    clearInterval(run.problemTimerId);
    clearTimeout(revealTimerId);
    stopLevel2Reveal();
    goalCanvas.hidden = false;
    hud.root.hidden = true;
  }
```
아래로 교체(레벨별 잔여 효과 정리 + goalCanvas 스타일 원상복구를 한 곳에 모음):
```js
  function endRun() {
    clearInterval(run.problemTimerId);
    clearTimeout(revealTimerId);
    const effect = LEVEL_EFFECTS[run.level];
    if (effect && effect.stop) effect.stop();
    goalCanvas.hidden = false;
    goalCanvas.className = 'goal-canvas'; // 레벨별로 붙였던 클래스(회전/슬라이드/가림 등) 전부 제거
    goalCanvas.style.transform = '';
    goalCanvas.style.transition = '';
    goalCanvasWrap.style.overflow = '';
    hud.root.hidden = true;
  }
```

`LEVEL_EFFECTS`는 파일 맨 아래(`window.Challenge = ...` 바로 위)에 선언한다 — 아직 정의 안 된 레벨3~10 함수들은 Task 4~11이 하나씩 채운다. 지금 단계에서는 1·2만 채우고 나머지는 `null`로 둔다:
```js
  const LEVEL_EFFECTS = {
    1: { start: startLevel1Reveal, stop: null },
    2: { start: startLevel2Reveal, stop: stopLevel2Reveal },
    3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null,
  };
```
(Task 4~11이 각자 `3: {...}` 처럼 자기 항목만 채워 넣는다)

- [ ] **Step 4: 검증**

`LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-challenge-phase1.js` 통과 확인(LEVEL 1·2 회귀 없음). Child 모드 플레이도 재확인.

- [ ] **Step 5: 커밋**

```bash
git add challenge.js
git commit -m "refactor: 챌린지 레벨 이펙트를 LEVEL_EFFECTS 디스패치 테이블로 정리(레벨3~10 확장 준비)"
```

---

### Task 4: LEVEL 3 (Cloud/Rain/Snow 가림)

**Files:**
- Modify: `challenge.js`, `style.css`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[3]`.

- [ ] **Step 1: `style.css` 끝에 추가**

```css
/* ===== 챌린지 LEVEL 3: Goal을 완전히 가리지 않는 날씨 오클루전 ===== */
.challenge-occlude::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 2;
  opacity: var(--challenge-occlude-opacity, 0.35);
}
.challenge-occlude-cloud::after {
  background: radial-gradient(circle at 30% 30%, #fff 0 40%, transparent 41%),
              radial-gradient(circle at 68% 45%, #fff 0 34%, transparent 35%);
}
.challenge-occlude-rain::after {
  background: repeating-linear-gradient(115deg, rgba(120,170,255,0.9) 0 3px, transparent 3px 22px);
}
.challenge-occlude-snow::after {
  background: radial-gradient(circle, #fff 2px, transparent 3px) 0 0/18px 18px,
              radial-gradient(circle, #fff 2px, transparent 3px) 9px 9px/18px 18px;
}
```

- [ ] **Step 2: `challenge.js`에 함수 추가 + `LEVEL_EFFECTS[3]` 채우기**

```js
  function startLevel3Occlusion() {
    const problemNum = run.index + 1;
    const type = problemNum <= 3 ? 'cloud' : problemNum <= 6 ? 'rain' : 'snow';
    goalCanvasWrap.style.setProperty('--challenge-occlude-opacity', CFG.LEVEL3_OCCLUSION_OPACITY);
    goalCanvasWrap.classList.add('challenge-occlude', 'challenge-occlude-' + type);
    run.level3OccludeClass = 'challenge-occlude-' + type;
  }
  function stopLevel3Occlusion() {
    goalCanvasWrap.classList.remove('challenge-occlude', run.level3OccludeClass || '');
    run.level3OccludeClass = null;
  }
```
`LEVEL_EFFECTS[3]`을 Task 3의 `3: null,`에서 아래로 교체:
```js
  LEVEL_EFFECTS[3] = { start: startLevel3Occlusion, stop: stopLevel3Occlusion };
```
(테이블 선언 자체를 `const LEVEL_EFFECTS = {1:..., 2:..., 3: null, ...}`에서 매번 고쳐 쓰지 않도록, Task 4부터는 테이블 선언 **아래**에 `LEVEL_EFFECTS[N] = {...}` 한 줄을 추가하는 방식으로 채운다.)

- [ ] **Step 3: `IMPLEMENTED_LEVELS`에 3 추가 (`challenge.js:13`)**

```js
  const IMPLEMENTED_LEVELS = [1, 2, 3];
```

- [ ] **Step 4: 검증**

`미리보기.bat` → 챌린지 → LEVEL 3 → 문제 1~3은 구름, 4~6은 비, 7~10은 눈 오버레이가 Goal 위에 옅게 보이되 완전히 가리지 않는지 확인. 10문제 종료 후 점수 화면 정상 노출 확인.

- [ ] **Step 5: 커밋**

```bash
git add challenge.js style.css
git commit -m "feat: 챌린지 LEVEL 3(Cloud/Rain/Snow 가림) 구현"
```

---

### Task 5: LEVEL 4 (Fade Out / Shrink Out / Fragment+Fall)

**Files:**
- Modify: `challenge.js`, `style.css`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[4]`. Consumes: `revealTimerId`(Phase1이 LEVEL1용으로 이미 선언한 모듈 변수, 여기서도 재사용).

- [ ] **Step 1: `style.css` 끝에 추가**

```css
/* ===== 챌린지 LEVEL 4: Goal이 사라지는 3가지 연출 ===== */
.challenge-vanish-fade { transition: opacity var(--challenge-vanish-ms, 600ms) ease-out; }
.challenge-vanish-fade.is-vanishing { opacity: 0; }
.challenge-vanish-shrink { transition: transform var(--challenge-vanish-ms, 600ms) ease-in; }
.challenge-vanish-shrink.is-vanishing { transform: scale(0); }
.challenge-vanish-fragment { transition: transform var(--challenge-vanish-ms, 600ms) ease-in, opacity var(--challenge-vanish-ms, 600ms) ease-in; }
.challenge-vanish-fragment.is-vanishing { transform: translateY(60%) rotate(25deg); opacity: 0; }
```
(진짜 "조각나서 떨어짐"은 SVG per-region transform이 필요해 범위가 커지므로, Phase 2는 통짜 이미지가 아래로 떨어지며 사라지는 것으로 단순화 — 명세서의 "Fragment+Fall" 취지(사라지는 방식이 다르다는 것)는 유지하되 세부 파편화는 다음 조정으로 미룸.)

- [ ] **Step 2: `challenge.js`에 함수 추가**

```js
  function startLevel4Vanish() {
    const problemNum = run.index + 1;
    const variant = problemNum <= 3 ? 'fade' : problemNum <= 6 ? 'shrink' : 'fragment';
    clearTimeout(revealTimerId);
    goalCanvas.hidden = false;
    goalCanvas.className = 'goal-canvas challenge-vanish-' + variant;
    goalCanvas.style.setProperty('--challenge-vanish-ms', CFG.LEVEL4_TRANSITION_MS + 'ms');
    revealTimerId = setTimeout(() => {
      goalCanvas.classList.add('is-vanishing');
      revealTimerId = setTimeout(() => { goalCanvas.hidden = true; }, CFG.LEVEL4_TRANSITION_MS);
    }, CFG.LEVEL1_GOAL_DISPLAY_MS);
  }
```
`LEVEL_EFFECTS` 테이블 아래에 추가:
```js
  LEVEL_EFFECTS[4] = { start: startLevel4Vanish, stop: null };
```
(`stop`이 없어도 되는 이유: `endRun`이 매 문제 전환 때 `goalCanvas.className = 'goal-canvas'`로 이미 원상복구하므로 별도 정리 불필요 — Task 3에서 이미 그렇게 리팩터해 둠.)

- [ ] **Step 3: `IMPLEMENTED_LEVELS`에 4 추가**

- [ ] **Step 4: 검증**

챌린지 → LEVEL 4 → 문제 1~3은 서서히 흐려짐, 4~6은 축소, 7~10은 아래로 떨어지며 사라지는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add challenge.js style.css
git commit -m "feat: 챌린지 LEVEL 4(Fade/Shrink/Fragment 사라짐) 구현"
```

---

### Task 6: LEVEL 5 (360도 회전 + Mirror)

**Files:**
- Modify: `challenge.js`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[5]`.

- [ ] **Step 1: `challenge.js`에 함수 추가**

```js
  function startLevel5Rotation() {
    const startTime = Date.now();
    function tick() {
      const elapsed = Date.now() - startTime;
      const deg = (elapsed % CFG.LEVEL5_ROTATION_MS) / CFG.LEVEL5_ROTATION_MS * 360;
      const mirrored = Math.floor(elapsed / CFG.LEVEL5_MIRROR_INTERVAL_MS) % 2 === 1;
      goalCanvas.style.transform = 'rotate(' + deg + 'deg)' + (mirrored ? ' scaleX(-1)' : '');
      run.level5AnimFrame = requestAnimationFrame(tick);
    }
    tick();
  }
  function stopLevel5Rotation() {
    if (run.level5AnimFrame) cancelAnimationFrame(run.level5AnimFrame);
    run.level5AnimFrame = null;
  }
```
```js
  LEVEL_EFFECTS[5] = { start: startLevel5Rotation, stop: stopLevel5Rotation };
```
(`goalCanvas.style.transform` 원상복구는 `endRun`이 이미 처리 — Task 3 참고.)

- [ ] **Step 2: `IMPLEMENTED_LEVELS`에 5 추가**

- [ ] **Step 3: 검증**

챌린지 → LEVEL 5 → Goal이 계속 360도로 회전하며, 주기적으로 좌우반전(Mirror)되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add challenge.js
git commit -m "feat: 챌린지 LEVEL 5(360도 회전 + Mirror) 구현"
```

---

### Task 7: LEVEL 6 (영역별 색상 랜덤 변경)

**Files:**
- Modify: `challenge.js`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[6]`. Consumes: Task 2의 `repaintGoalWithColors`/`getChallengeRegionInfo`/`COLORS`.

- [ ] **Step 1: `challenge.js`에 함수 추가**

```js
  function startLevel6Flicker() {
    function tick() {
      const info = getChallengeRegionInfo();
      const map = new Map();
      let allMatch = info.length > 0;
      info.forEach((r) => {
        const hex = COLORS[Math.floor(Math.random() * COLORS.length)];
        map.set(r.label, hex);
        if (hex !== r.targetColor) allMatch = false;
      });
      repaintGoalWithColors(map);
      run.level6TimerId = setTimeout(tick, allMatch ? CFG.LEVEL6_MATCH_PAUSE_MS : CFG.LEVEL6_COLOR_CHANGE_MS);
    }
    tick();
  }
  function stopLevel6Flicker() {
    clearTimeout(run.level6TimerId);
    repaintGoalWithColors(null); // 실제 정답색으로 복원
  }
```
```js
  LEVEL_EFFECTS[6] = { start: startLevel6Flicker, stop: stopLevel6Flicker };
```

- [ ] **Step 2: `IMPLEMENTED_LEVELS`에 6 추가**

- [ ] **Step 3: 검증**

챌린지 → LEVEL 6 → Goal 영역들이 계속 랜덤 색으로 바뀌는지 확인(우연히 다 맞아 1초 멈추는 건 위 "해석이 갈리는 지점" 1번 참고 — 거의 안 보여도 정상).

- [ ] **Step 4: 커밋**

```bash
git add challenge.js
git commit -m "feat: 챌린지 LEVEL 6(영역별 색상 랜덤 변경) 구현"
```

---

### Task 8: LEVEL 7 (Goal LEFT→RIGHT→OUT, 속도 증가)

**Files:**
- Modify: `challenge.js`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[7]`.

- [ ] **Step 1: `challenge.js`에 함수 추가**

```js
  function startLevel7Slide() {
    const problemNum = run.index + 1;
    const t = (problemNum - 1) / (TOTAL_CHALLENGE_LEVELS - 1);
    const sweepMs = CFG.LEVEL7_SWEEP_START_MS - (CFG.LEVEL7_SWEEP_START_MS - CFG.LEVEL7_SWEEP_END_MS) * t;
    goalCanvasWrap.style.overflow = 'hidden';
    goalCanvas.hidden = false;
    goalCanvas.style.transition = 'none';
    goalCanvas.style.transform = 'translateX(-100%)'; // LEFT에서 시작
    void goalCanvas.offsetWidth; // transition:none 적용을 강제로 반영(다음 transform이 즉시 안 튀도록)
    goalCanvas.style.transition = 'transform ' + sweepMs + 'ms linear';
    goalCanvas.style.transform = 'translateX(100%)'; // RIGHT까지 쓸고 지나감
    clearTimeout(revealTimerId);
    revealTimerId = setTimeout(() => {
      goalCanvas.style.transform = 'translateX(220%)'; // OUT — 화면 밖으로 완전히 벗어난 채 유지
    }, sweepMs);
  }
```
```js
  LEVEL_EFFECTS[7] = { start: startLevel7Slide, stop: null };
```
(`stop` 불필요 — `endRun`이 `transform`/`transition`/`overflow`를 이미 원상복구.)

- [ ] **Step 2: `IMPLEMENTED_LEVELS`에 7 추가**

- [ ] **Step 3: 검증**

챌린지 → LEVEL 7 → Goal이 왼쪽에서 나타나 오른쪽으로 지나간 뒤 화면 밖으로 사라지는지, 문제가 뒤로 갈수록 그 속도가 빨라지는지(=쓸고 지나가는 시간이 짧아짐) 확인.

- [ ] **Step 4: 커밋**

```bash
git add challenge.js
git commit -m "feat: 챌린지 LEVEL 7(Goal 좌우 슬라이드+속도증가) 구현"
```

---

### Task 9: LEVEL 8 (Goal Blink, Show/Hide 시간 점점 짧아짐)

**Files:**
- Modify: `challenge.js`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[8]`.

- [ ] **Step 1: `challenge.js`에 함수 추가**

```js
  function startLevel8Blink() {
    const problemNum = run.index + 1;
    const t = (problemNum - 1) / (TOTAL_CHALLENGE_LEVELS - 1);
    const showMs = CFG.LEVEL8_SHOW_START_MS - (CFG.LEVEL8_SHOW_START_MS - CFG.LEVEL8_SHOW_END_MS) * t;
    const hideMs = CFG.LEVEL8_HIDE_START_MS - (CFG.LEVEL8_HIDE_START_MS - CFG.LEVEL8_HIDE_END_MS) * t;
    goalCanvas.hidden = false;
    function blinkOff() {
      goalCanvas.hidden = true;
      run.level8TimerId = setTimeout(blinkOn, hideMs);
    }
    function blinkOn() {
      goalCanvas.hidden = false;
      run.level8TimerId = setTimeout(blinkOff, showMs);
    }
    run.level8TimerId = setTimeout(blinkOff, showMs);
  }
  function stopLevel8Blink() {
    clearTimeout(run.level8TimerId);
  }
```
```js
  LEVEL_EFFECTS[8] = { start: startLevel8Blink, stop: stopLevel8Blink };
```

- [ ] **Step 2: `IMPLEMENTED_LEVELS`에 8 추가**

- [ ] **Step 3: 검증**

챌린지 → LEVEL 8 → Goal이 깜빡이며, 문제가 뒤로 갈수록 보이는/숨는 시간이 짧아지는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add challenge.js
git commit -m "feat: 챌린지 LEVEL 8(Goal Blink) 구현"
```

---

### Task 10: LEVEL 9 (색칠 영역 랜덤 소멸)

**Files:**
- Modify: `challenge.js`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[9]`. Consumes: Task 2의 `paintRegionPixels`/`getChallengeRegionInfo`.

- [ ] **Step 1: `challenge.js`에 함수 추가**

```js
  function startLevel9Vanish() {
    const problemNum = run.index + 1;
    const intervalMs = problemNum <= 3 ? CFG.LEVEL9_INTERVAL_1
      : problemNum <= 6 ? CFG.LEVEL9_INTERVAL_2 : CFG.LEVEL9_INTERVAL_3;
    run.level9TimerId = setInterval(() => {
      const painted = getChallengeRegionInfo().filter((r) => r.painted);
      if (painted.length === 0) return;
      const pick = painted[Math.floor(Math.random() * painted.length)];
      paintRegionPixels(pick.seed, null); // 다시 미색칠 상태로
    }, intervalMs);
  }
  function stopLevel9Vanish() {
    clearInterval(run.level9TimerId);
  }
```
```js
  LEVEL_EFFECTS[9] = { start: startLevel9Vanish, stop: stopLevel9Vanish };
```

- [ ] **Step 2: `IMPLEMENTED_LEVELS`에 9 추가**

- [ ] **Step 3: 검증**

챌린지 → LEVEL 9 → 색칠해둔 영역이 시간이 지나면 랜덤하게 다시 하얗게(미색칠) 되는지, 문제가 뒤로 갈수록 그 주기가 짧아지는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add challenge.js
git commit -m "feat: 챌린지 LEVEL 9(색칠 영역 랜덤 소멸) 구현"
```

---

### Task 11: LEVEL 10 (정답 영역 색상 강제 변경 — COLOR_CHANGED)

**Files:**
- Modify: `challenge.js`

**Interfaces:**
- Produces: `LEVEL_EFFECTS[10]`. Consumes: Task 2의 `paintRegionPixels`/`getChallengeRegionInfo`/`COLORS`.

- [ ] **Step 1: `challenge.js`에 함수 추가**

```js
  function startLevel10Chaos() {
    run.level10TimerId = setInterval(() => {
      // 단순화(위 "해석이 갈리는 지점" 2번 참고): "정답 상태인 영역"을 색상 tolerance 비교 대신
      // "칠해져 있음(painted)"으로 판정한다.
      const painted = getChallengeRegionInfo().filter((r) => r.painted);
      if (painted.length === 0) return;
      const pick = painted[Math.floor(Math.random() * painted.length)];
      let wrong = pick.targetColor;
      while (wrong === pick.targetColor) wrong = COLORS[Math.floor(Math.random() * COLORS.length)];
      paintRegionPixels(pick.seed, wrong);
    }, CFG.LEVEL10_COLOR_CHANGE_INTERVAL_MS);
  }
  function stopLevel10Chaos() {
    clearInterval(run.level10TimerId);
  }
```
```js
  LEVEL_EFFECTS[10] = { start: startLevel10Chaos, stop: stopLevel10Chaos };
```
(사용자가 강제로 바뀐 영역을 다시 올바른 색으로 칠하면, 기존 탭-채우기 엔진이 그대로 반영하고 제출 시 `computeCompletion`이 정상 판정한다 — 별도 상태 플래그 불필요.)

- [ ] **Step 2: `IMPLEMENTED_LEVELS`에 10 추가**

- [ ] **Step 3: 검증**

챌린지 → LEVEL 10 → 이미 칠해둔 영역 중 하나가 주기적으로 다른(틀린) 색으로 바뀌는지, 사용자가 그 영역만 다시 칠하면 정상 반영되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add challenge.js
git commit -m "feat: 챌린지 LEVEL 10(정답 영역 색상 강제 변경) 구현"
```

---

### Task 12: 자동 검증 확장 + sw.js 캐시 버전업 + 전체 회귀 확인

**Files:**
- Modify: `scripts/verify-challenge-phase1.js` (또는 `verify-challenge-phase2.js`로 분리 — 아래는 기존 파일에 이어 붙이는 안)
- Modify: `sw.js`

**Interfaces:**
- Consumes: `window.__debugChallengeSimulateLevel(level, correctRate)`(Phase1이 이미 제공).

- [ ] **Step 1: `scripts/verify-challenge-phase1.js`에 레벨 3~10 자동 진행 확인 추가**

기존 5번 검증(Best Score) 다음에 추가:
```js
    // 6) LEVEL 3~10이 에러 없이 끝까지(10문제) 자동 진행되는지 확인
    await page.evaluate(() => document.getElementById('player-entry-skip').click().catch(() => {}));
    page.on('dialog', (d) => d.accept()); // finishLevel의 alert() 자동 닫기
    for (const lv of [3, 4, 5, 6, 7, 8, 9, 10]) {
      const result = await page.evaluate((level) => window.__debugChallengeSimulateLevel(level, 1), lv);
      if (!result || typeof result.finalScore !== 'number') throw new Error('LEVEL ' + lv + ' 자동 진행 실패');
    }
```

- [ ] **Step 2: `sw.js` 캐시 버전업**

`sw.js:1`의 `CACHE_NAME` 숫자를 이 Phase의 마지막 커밋 시점 값에서 +1.

- [ ] **Step 3: 실행**

```bash
node scripts/serve.js &
LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-challenge-phase1.js
LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-full-clear.js
```
둘 다 통과 확인 — 후자는 Child 모드 4개 난이도 풀클리어 회귀 재확인(Task 2가 유일하게 `app.js`를 건드렸으므로 필수).

- [ ] **Step 4: 커밋**

```bash
git add scripts/verify-challenge-phase1.js sw.js
git commit -m "test: 챌린지 LEVEL 3~10 자동 검증 추가 + sw.js 캐시 버전업"
```

---

## Self-Review 메모 (계획 작성자 체크)

- **명세서 커버리지**: 8~15번(LEVEL 3~10) 전부 Task 4~11이 하나씩 다룬다. 16번(Magnifier)은 Phase 1에도 없고 이번 Phase 범위에서도 의도적으로 제외(사용자 확인: LEVEL 3~10만). 18~27(색판정/Score)·30(BestScore)은 Phase 1이 이미 구현했고 이번 Phase는 그 엔진을 그대로 재사용한다.
- **미해결 해석**: 문서 상단 "해석이 갈리는 지점" 1·2번(LEVEL 6 Pause 발생 빈도, LEVEL 10 "정답 상태" 판정 단순화) — 임의로 숨기지 않고 명시했다. Task 7·11 완료 후 실물 확인 필요.
- **플레이스홀더 스캔**: Task 1에서 추가한 수치 중 명세서에 구체값이 없는 건 전부 `// 임시값` 주석 있음(LEVEL9/LEVEL10 간격만 명세서에 수치가 명시돼 있어 주석 없음).
- **타입/시그니처 일관성**: `LEVEL_EFFECTS[N] = { start, stop }` 형태를 Task 3에서 정의한 그대로 Task 4~11이 따른다. `paintRegionPixels(seed, hexColorOrNull)`, `repaintGoalWithColors(colorMapOrNull)`, `getChallengeRegionInfo()`의 시그니처가 Task 2 정의 그대로 이후 태스크에서 쓰인다.
