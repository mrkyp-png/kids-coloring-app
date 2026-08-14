// challenge.js
// 챌린지 모드(MODE_CHALLENGE) 화면/로직. app.js의 openTemplate/computeCompletion을
// 옵션 파라미터로 재사용하고, 나머지(선택 화면, 문제 루프, 점수 계산)는 여기서 새로 만든다.
(function () {
  'use strict';

  const CFG = window.CHALLENGE_CONFIG;
  // app.js는 하나의 IIFE라 goalCanvas/coloringScreen 같은 const, openTemplate/computeCompletion/
  // getTemplatesForLevel 같은 함수 선언 모두 스크립트 밖에서는 안 보인다 — Task 2가 레벨3~10
  // 구현에 필요한 항목까지 window.__challengeInternals로 export 해뒀다(app.js:2873 부근). 여기서
  // 그대로 꺼내 쓴다.
  const {
    goalCanvas, coloringScreen, openTemplate, computeCompletion, getTemplatesForLevel,
    repaintGoalWithColors, paintRegionPixels, getChallengeRegionInfo, colorDistance, COLORS,
    setWormProgress, setWormExit, resetWormForNewProblem,
  } = window.__challengeInternals;
  const goalCanvasWrap = document.getElementById('goal-canvas-wrap');
  const weatherLayer = document.getElementById('challenge-weather-layer');
  const TOTAL_CHALLENGE_LEVELS = 10;
  const IMPLEMENTED_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Phase 1에서 실제로 플레이 가능한 레벨. Phase 2에서 3~10 추가.

  const coverScreen = document.getElementById('cover-screen');
  const selectScreen = document.getElementById('challenge-select-screen');
  const btnCoverStartChallenge = document.getElementById('btn-cover-start-challenge');
  const btnChallengeBack = document.getElementById('btn-challenge-back');
  const diffRow = document.getElementById('challenge-difficulty-row');
  const levelGrid = document.getElementById('challenge-level-grid');

  const state = { difficulty: 'easy', level: null };

  // I7(최종 리뷰): 미완성 상태로 전체 배포되는 걸 막기 위해 진입 버튼을 기본 숨김.
  // CHALLENGE_CONFIG.ENABLED를 true로 바꾸면(로컬 테스트 등) 그대로 다시 노출된다.
  // 2026-08-14: 진입 버튼이 맵 화면 -> 표지 화면(btn-cover-start-challenge)으로 이동.
  btnCoverStartChallenge.hidden = !CFG.ENABLED;

  function openSelectScreen() {
    coverScreen.hidden = true;
    selectScreen.hidden = false;
    renderDifficultyRow();
    renderLevelGrid();
  }

  function closeSelectScreen() {
    selectScreen.hidden = true;
    coverScreen.hidden = false;
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

  btnChallengeBack.addEventListener('click', closeSelectScreen);

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

  // ---- LEVEL 1 문제 루프 ----
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
    problemTimerId: null, problemDeadline: 0, lastResult: null, level2RevealTimerId: null,
    submitting: false, // I2: #btn-save 연타로 문제 하나를 건너뛰며 오답 처리되는 것 방지
    totalRegionsCorrect: 0, totalRegionsAll: 0, // I1: Accuracy는 문제 단위가 아니라 영역 단위 누적
    totalRemainingSeconds: 0, // I6: TimeBonus는 마지막 문제가 아니라 문제별 남은시간 누적
    level3OccludeClass: null, level5AnimFrame: null, level6TimerId: null,
    level7TimerId: null, level8TimerId: null, level9TimerId: null, level10TimerId: null,
    wormResetTimerId: null, wormSuppressUntil: 0,
  };

  // 디버그/테스트용: loadNextProblem이 다음 문제를 열고 준비를 마쳤을 때 한 번 불려나가는 훅.
  // __debugChallengeSimulateLevel이 실제 도안 로딩(비동기)이 끝나는 시점을 기다리는 데 쓴다.
  let debugOnReady = null;

  // startLevel1Reveal이 예약한 "1초 뒤 숨기기" 타이머 id. 마지막 문제를 1초가 다 되기 전에
  // 풀어서 finishLevel이 goalCanvas를 다시 보이게 해줘도, 취소 안 하면 이 타이머가 뒤늦게 발동해
  // 방금 복구한 goalCanvas를(심지어 다음에 여는 Child 모드 도안까지) 도로 숨겨버린다.
  let revealTimerId = null;

  function startLevel(level) {
    endRun(); // C1: 방어적 재진입 — 이전 run의 타이머/goalCanvas 상태가 남아있다면 먼저 정리
    const problems = getTemplatesForLevel(level); // app.js가 이미 제공, 레벨당 10개
    Object.assign(run, {
      difficulty: state.difficulty, level, problems, index: 0,
      correctCount: 0, mistakeCount: 0, combo: 0, maxCombo: 0, submitting: false,
      totalRegionsCorrect: 0, totalRegionsAll: 0, totalRemainingSeconds: 0,
    });
    selectScreen.hidden = true;
    hud.root.hidden = false;
    hud.combo.textContent = I18N.t('challenge.hud.combo', { multiplier: '1.0' });
    hud.accuracy.textContent = I18N.t('challenge.hud.accuracy', { percent: 100 });
    loadNextProblem();
  }

  function loadNextProblem() {
    if (run.index >= run.problems.length) return finishLevel();
    const tpl = run.problems[run.index];
    hud.problem.textContent = (run.index + 1) + ' / ' + run.problems.length;

    openTemplate(tpl, () => {
      run.submitting = false; // I2: 다음 문제 준비가 끝난 시점에야 다시 제출 가능
      const effect = LEVEL_EFFECTS[run.level];
      if (effect) effect.start();
      startProblemTimer();
      if (debugOnReady) { const cb = debugOnReady; debugOnReady = null; cb(); }
    }, { challenge: true });
  }

  // 2026-08-14: "60초 끝나면 지렁이가 오른쪽으로 사라지고, 다음 문제는 다른 색 지렁이" —
  // 문제마다 이전과 다른 색을 랜덤으로 골라 배정한다.
  const WORM_COLORS = [
    ['#3E2418', '#7F5539', '#5c3d28'], // 갈색(기존 기본값)
    ['#7a1f1f', '#e05a5a', '#b23a3a'], // 빨강
    ['#1f4d2e', '#4caf7d', '#2e7d4f'], // 초록
    ['#1f3a5f', '#5b9bd5', '#2f6aa8'], // 파랑
    ['#4a1f5f', '#b06fd6', '#7a3ba3'], // 보라
    ['#5f4a1f', '#e0b04a', '#b28a2f'], // 노랑
  ];
  let lastWormColorIndex = -1;
  function pickNextWormColor() {
    let idx;
    do { idx = Math.floor(Math.random() * WORM_COLORS.length); } while (idx === lastWormColorIndex);
    lastWormColorIndex = idx;
    resetWormForNewProblem(WORM_COLORS[idx][0], WORM_COLORS[idx][1], WORM_COLORS[idx][2]);
  }

  function startProblemTimer() {
    const seconds = CFG.DIFFICULTY_TIME[run.difficulty];
    run.problemDeadline = Date.now() + seconds * 1000;
    // 2026-08-14: "지렁이가 우측으로 사라지는 게 안 보인다" 피드백 — 다음 도안 로딩이 빨라서
    // setWormExit() 애니메이션(0.6초)이 끝나기도 전에 여기서 바로 리셋해버려 순간적으로
    // 바뀌는 것처럼 보였다. 퇴장 애니메이션이 끝날 시간을 준 뒤에 새 지렁이를 등장시킨다.
    clearTimeout(run.wormResetTimerId);
    run.wormSuppressUntil = Date.now() + 650; // 이 시점까지는 tickProblemTimer가 진행률을 안 건드림
    run.wormResetTimerId = setTimeout(pickNextWormColor, 650);
    clearInterval(run.problemTimerId);
    run.problemTimerId = setInterval(tickProblemTimer, 250);
    tickProblemTimer();
  }

  // 2026-08-14: "지렁이가 없어졌다, 왼쪽에서 오른쪽으로 기어가는 거 복귀" 피드백 — 문제별
  // 제한시간 진행률(0=시작/왼쪽, 1=시간 다 됨/오른쪽)을 지렁이 진행률로도 같이 반영한다.
  function tickProblemTimer() {
    const seconds = CFG.DIFFICULTY_TIME[run.difficulty];
    const remaining = Math.max(0, Math.ceil((run.problemDeadline - Date.now()) / 1000));
    hud.timer.textContent = '⏱ ' + remaining;
    // 2026-08-14: 이 틱이 곧바로 --worm-progress를 (남은시간 기준으로) 다시 써버려서, 방금
    // setWormExit()으로 오른쪽으로 내보낸 지렁이가 새 문제 타이머가 시작되자마자(다음 틱에서)
    // 바로 0으로 되돌아와 버렸다 — 실제 제한시간(remaining)은 그대로 정상 진행시키되, 지렁이
    // 진행률 갱신만 wormSuppressUntil까지 잠깐 멈춰서 퇴장 애니메이션이 끝날 시간을 준다.
    if (Date.now() >= run.wormSuppressUntil) {
      setWormProgress(1 - remaining / seconds);
    }
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
    hud.combo.textContent = I18N.t('challenge.hud.combo', { multiplier: comboMultiplierFor(run.combo).toFixed(1) });
  }

  function registerCorrect() {
    run.correctCount++;
    run.combo++;
    if (run.combo > run.maxCombo) run.maxCombo = run.combo;
    hud.combo.textContent = I18N.t('challenge.hud.combo', { multiplier: comboMultiplierFor(run.combo).toFixed(1) });
  }

  // I1: Accuracy는 문제 단위 정답/오답이 아니라 명세서 19번대로 영역(region) 단위 누적으로 계산한다.
  function updateAccuracyHud() {
    const accPct = run.totalRegionsAll > 0 ? Math.round((run.totalRegionsCorrect / run.totalRegionsAll) * 100) : 100;
    hud.accuracy.textContent = I18N.t('challenge.hud.accuracy', { percent: accPct });
  }

  // 사용자가 '완료' 버튼을 눌렀을 때 challenge.js가 직접 판정한다(Child의 #btn-save 핸들러는 건드리지 않음).
  function submitCurrentProblem() {
    if (run.submitting) return; // I2: 다음 문제가 준비되기 전 연타 방지
    run.submitting = true;
    const { matched, total } = computeCompletion(CFG.COLOR_TOLERANCE);
    clearInterval(run.problemTimerId);
    run.totalRegionsCorrect += matched;
    run.totalRegionsAll += total;
    // I6: 이 문제에서 남은 시간을 문제별로 누적(마지막 문제 한 번만 반영되던 버그 수정)
    run.totalRemainingSeconds += Math.max(0, Math.round((run.problemDeadline - Date.now()) / 1000));
    updateAccuracyHud();
    if (matched === total) registerCorrect(); else registerMistake();
    advanceToNextProblem();
  }

  function advanceToNextProblem() {
    const effect = LEVEL_EFFECTS[run.level];
    if (effect && effect.stop) effect.stop();
    setWormExit(); // 이번 문제의 지렁이는 오른쪽으로 사라짐 — 다음 문제 시작 시 새 색으로 리셋됨
    run.index++;
    loadNextProblem();
  }

  function finishLevel() {
    endRun(); // C1: 타이머 정리 + goalCanvas 원상복구 + HUD 숨김을 한 곳에서
    // I1: Accuracy는 문제 단위가 아니라 영역(region) 단위 누적값 사용
    const accuracyPct = run.totalRegionsAll > 0 ? Math.round((run.totalRegionsCorrect / run.totalRegionsAll) * 100) : 100;
    const result = computeFinalScore({
      level: run.level, difficulty: run.difficulty, accuracyPct,
      mistakeCount: run.mistakeCount, remainingSeconds: run.totalRemainingSeconds, maxCombo: run.maxCombo,
    });
    run.lastResult = result;
    const isNewRecord = saveBestScoreIfHigher(run.difficulty, run.level, result.finalScore);
    coloringScreen.hidden = true;
    selectScreen.hidden = false;
    renderLevelGrid();
    let resultMsg = I18N.t('challenge.result.score', { score: result.finalScore });
    if (isNewRecord) resultMsg += ' ' + I18N.t('challenge.result.newRecord');
    if (result.isPerfect) resultMsg += ' ' + I18N.t('challenge.result.perfect');
    alert(resultMsg);
    // 축하 연출/모달은 Phase 4에서 명세서 43번(Next/Back 클릭음) 작업과 함께 다듬는다. Phase 1은 결과값 저장/노출까지만.
  }

  // C1(최종 리뷰): run이 10문제를 다 풀지 않고 중간에 끝나는 모든 경로(🏠, 재진입 등)에서
  // 공유 DOM(goalCanvas)과 타이머를 원상복구하는 단일 진입점. finishLevel()에서도 호출한다.
  function endRun() {
    clearInterval(run.problemTimerId);
    clearTimeout(run.wormResetTimerId); // 예약된 지렁이 색상 리셋(있다면) 취소
    clearTimeout(revealTimerId); // LEVEL1 리빌-숨김 예약
    const effect = LEVEL_EFFECTS[run.level];
    if (effect && effect.stop) effect.stop();
    goalCanvas.hidden = false; // LEVEL1이 숨겨둔 상태였다면 Child 모드를 위해 복구
    goalCanvas.className = 'goal-canvas'; // 레벨별로 붙였던 클래스(회전/슬라이드/가림 등) 전부 제거
    goalCanvas.style.transform = '';
    goalCanvas.style.transition = '';
    goalCanvasWrap.style.overflow = '';
    setWormProgress(0); // 다음(또는 Child) 진입 시 지렁이가 이전 진행률로 남아있지 않게
    hud.root.hidden = true;
  }

  // 2026-08-14 피드백: "LEVEL8이 LEVEL4(사라짐)랑 컨셉이 겹친다" — 새 컨셉인 "실루엣 모드"로
  // 교체. 평소엔 도안을 전부 무채색 실루엣(모양만 보이고 색은 안 보임)으로 보여주다가, 짧게
  // 진짜 색으로 반짝 보여준다. 문제가 뒤로 갈수록 실루엣 유지 시간은 길어지고, 반짝이는
  // 시간은 짧아져서 더 어려워진다.
  const LEVEL8_SILHOUETTE_HEX = '#3a3a3a';
  function startLevel8Silhouette() {
    const problemNum = run.index + 1;
    const t = (problemNum - 1) / (TOTAL_CHALLENGE_LEVELS - 1);
    const silhouetteMs = CFG.LEVEL8_SILHOUETTE_START_MS + (CFG.LEVEL8_SILHOUETTE_END_MS - CFG.LEVEL8_SILHOUETTE_START_MS) * t;
    const flashMs = CFG.LEVEL8_FLASH_START_MS - (CFG.LEVEL8_FLASH_START_MS - CFG.LEVEL8_FLASH_END_MS) * t;
    function showSilhouette() {
      const info = getChallengeRegionInfo();
      const map = new Map();
      info.forEach((r) => map.set(r.label, LEVEL8_SILHOUETTE_HEX));
      repaintGoalWithColors(map);
      run.level8TimerId = setTimeout(showFlash, silhouetteMs);
    }
    function showFlash() {
      repaintGoalWithColors(null); // 실제 정답색
      run.level8TimerId = setTimeout(showSilhouette, flashMs);
    }
    showSilhouette();
  }

  function stopLevel8Silhouette() {
    clearTimeout(run.level8TimerId);
    repaintGoalWithColors(null); // 실제 정답색으로 복원
  }

  // 2026-08-14: "랜덤 점프 대신 원이 지그재그로 화면을 훑고, 30초 안에 전체를 한 번 다 보여주게"
  // 요청 — 위→아래로 줄을 내려가며 왼↔오 지그재그로 훑어서, LEVEL2_SWEEP_CYCLE_MS(30초) 안에
  // 640x640 전체가 원 반경만큼씩 빠짐없이 지나가게 한다.
  // 2026-08-14 피드백: 문제 번호대별로 노출 패턴을 다르게 — 1~3번은 기존 가로 지그재그,
  // 4~6번은 세로 지그재그, 7~10번은 원래(Phase1)의 랜덤 점프로.
  // 2026-08-14 피드백: 줄 끝에서 다음 줄로 넘어갈 때 가로 이동 없이 세로로만 툭 튀어서
  // "잠깐 사라졌다 딴 데서 나타나는" 것처럼 보이던 문제 — 각 줄 시간의 마지막 일부를 다음 줄
  // 시작점까지 대각선으로 부드럽게 이어지는 구간으로 써서, 순간이동 없이 계속 움직이게 한다.
  function startLevel2Zigzag(radius, vertical) {
    const step = radius * 2; // 원 지름만큼 이동해야 인접 줄끼리 딱 맞닿아 빈틈이 안 생김
    const lines = Math.max(1, Math.ceil((640 - radius * 2) / step) + 1);
    const start = radius;
    const end = 640 - radius;
    const span = Math.max(1, end - start);
    const perLineMs = CFG.LEVEL2_SWEEP_CYCLE_MS / lines;
    const transitionFrac = 0.15; // 각 줄 시간의 마지막 15%는 다음 줄로 대각선 전환하는 구간
    const startTime = Date.now();
    function posForLine(lineIndex, progress) {
      const cross = radius + lineIndex * step; // 줄의 고정 좌표(가로형은 y, 세로형은 x)
      const forward = lineIndex % 2 === 0; // 지그재그: 짝수 줄은 정방향, 홀수 줄은 역방향
      const along = forward ? start + span * progress : end - span * progress;
      return vertical ? { x: cross, y: along } : { x: along, y: cross };
    }
    function tick() {
      const elapsed = (Date.now() - startTime) % CFG.LEVEL2_SWEEP_CYCLE_MS;
      const lineIndex = Math.min(lines - 1, Math.floor(elapsed / perLineMs));
      const t = (elapsed % perLineMs) / perLineMs; // 0~1, 이 줄 안에서의 시간 진행률
      let pos;
      if (t < 1 - transitionFrac) {
        pos = posForLine(lineIndex, t / (1 - transitionFrac));
      } else {
        // 다음 줄(마지막 줄이면 다시 첫 줄로) 시작점까지 대각선으로 이어짐
        const blend = (t - (1 - transitionFrac)) / transitionFrac;
        const from = posForLine(lineIndex, 1);
        const to = posForLine((lineIndex + 1) % lines, 0);
        pos = { x: from.x + (to.x - from.x) * blend, y: from.y + (to.y - from.y) * blend };
      }
      goalCanvas.style.clipPath = `circle(${radius}px at ${pos.x}px ${pos.y}px)`;
      run.level2RevealTimerId = requestAnimationFrame(tick);
    }
    tick();
  }

  function startLevel2Random(radius) {
    function moveOnce() {
      const x = radius + Math.random() * (640 - radius * 2);
      const y = radius + Math.random() * (640 - radius * 2);
      goalCanvas.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
    }
    moveOnce();
    let lastJump = Date.now();
    function tick() {
      const now = Date.now();
      if (now - lastJump >= CFG.LEVEL2_RANDOM_JUMP_MS) { lastJump = now; moveOnce(); }
      run.level2RevealTimerId = requestAnimationFrame(tick);
    }
    run.level2RevealTimerId = requestAnimationFrame(tick);
  }

  function startLevel2Reveal() {
    goalCanvas.hidden = false;
    goalCanvas.classList.add('challenge-goal-mask');
    const radius = CFG.LEVEL2_REVEAL_RADIUS_PX;
    const problemNum = run.index + 1;
    if (problemNum <= 3) startLevel2Zigzag(radius, false); // 1~3번: 가로 지그재그
    else if (problemNum <= 6) startLevel2Zigzag(radius, true); // 4~6번: 세로 지그재그
    else startLevel2Random(radius); // 7~10번: 랜덤 점프
  }

  function stopLevel2Reveal() {
    cancelAnimationFrame(run.level2RevealTimerId);
    goalCanvas.classList.remove('challenge-goal-mask');
    goalCanvas.style.clipPath = '';
  }

  // 2026-08-14 피드백(2차): "goal 실루엣 안쪽에만" 마스킹하지 말고 LEVEL7처럼 박스 전체를
  // 가로지르게 변경 — 구름/비/눈이 goal 이미지 실루엣과 무관하게 화면 전체를 지나간다.
  // 구름/빗줄기/눈송이 크기는 매번 랜덤해서 일정하지 않게 한다.
  function rand(min, max) { return min + Math.random() * (max - min); }

  function startLevel3Occlusion() {
    const problemNum = run.index + 1;
    const type = problemNum <= 3 ? 'cloud' : problemNum <= 6 ? 'rain' : 'snow';
    goalCanvasWrap.style.setProperty('--challenge-occlude-opacity', CFG.LEVEL3_OCCLUSION_OPACITY);

    weatherLayer.innerHTML = '';
    if (type === 'cloud') {
      const count = 5 + Math.floor(Math.random() * 3); // 5~7개, 크기/속도/위치 제각각
      for (let i = 0; i < count; i++) {
        const cloud = document.createElement('span');
        cloud.className = 'challenge-cloud';
        cloud.style.setProperty('--cloud-size', rand(22, 48) + '%');
        cloud.style.setProperty('--cloud-top', rand(5, 70) + '%');
        cloud.style.setProperty('--cloud-duration', rand(3, 6) + 's');
        cloud.style.setProperty('--cloud-delay', rand(-4, 0) + 's');
        weatherLayer.appendChild(cloud);
      }
    } else if (type === 'rain') {
      weatherLayer.appendChild(document.createElement('div')).className = 'challenge-rain';
    } else {
      weatherLayer.appendChild(document.createElement('div')).className = 'challenge-snow';
    }
    weatherLayer.hidden = false;
    run.level3OccludeClass = type;
  }

  function stopLevel3Occlusion() {
    weatherLayer.hidden = true;
    weatherLayer.innerHTML = '';
    run.level3OccludeClass = null;
  }

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

  // 2026-08-14 피드백: 평면(Z축) 회전이 아니라 "상단/하단은 고정된 채 Y축(세로축)으로 도는"
  // 3D 회전이어야 함 — 동전을 세로로 세워 돌리는 느낌. rotateY로 돌리면 180도 지점에서
  // 뒷면(backface-visibility 기본값 visible)이 자동으로 좌우반전(거울상)으로 보여서, 스펙의
  // "NORMAL -> MIRROR -> NORMAL -> MIRROR"가 별도 로직 없이 자연스럽게 나온다.
  function startLevel5Rotation() {
    const startTime = Date.now();
    function tick() {
      const elapsed = Date.now() - startTime;
      const deg = (elapsed % CFG.LEVEL5_ROTATION_MS) / CFG.LEVEL5_ROTATION_MS * 360;
      goalCanvas.style.transform = 'perspective(800px) rotateY(' + deg + 'deg)';
      run.level5AnimFrame = requestAnimationFrame(tick);
    }
    tick();
  }

  function stopLevel5Rotation() {
    if (run.level5AnimFrame) cancelAnimationFrame(run.level5AnimFrame);
    run.level5AnimFrame = null;
  }

  // 2026-08-14 피드백: 15초 주기 반복 — 처음 3초는 진짜 정답 이미지를 보여주고(암기 구간),
  // 나머지 12초는 색을 계속 랜덤으로 바꾼다(헷갈리는 구간). 문제 시간이 끝날 때까지 반복.
  function startLevel6Flicker() {
    function showReal() {
      repaintGoalWithColors(null); // null = 실제 정답색(currentLabelToColor)
      run.level6TimerId = setTimeout(startScramble, CFG.LEVEL6_REAL_DISPLAY_MS);
    }
    function startScramble() {
      const scrambleEnd = Date.now() + (CFG.LEVEL6_CYCLE_MS - CFG.LEVEL6_REAL_DISPLAY_MS);
      scrambleTick(scrambleEnd);
    }
    function scrambleTick(scrambleEnd) {
      const info = getChallengeRegionInfo();
      const map = new Map();
      info.forEach((r) => map.set(r.label, COLORS[Math.floor(Math.random() * COLORS.length)]));
      repaintGoalWithColors(map);
      if (Date.now() < scrambleEnd) {
        run.level6TimerId = setTimeout(() => scrambleTick(scrambleEnd), CFG.LEVEL6_COLOR_CHANGE_MS);
      } else {
        showReal(); // 사이클 반복
      }
    }
    showReal();
  }

  function stopLevel6Flicker() {
    clearTimeout(run.level6TimerId);
    repaintGoalWithColors(null); // 실제 정답색으로 복원
  }

  // 2026-08-14 피드백: 문제당 한 번만 지나가고 끝이 아니라, 왼->오->퇴장 사이클을
  // LEVEL7_CYCLE_MS(15초)마다 문제 시간 내내 반복한다.
  // 2026-08-14 피드백: 거북이처럼 머리/꼬리가 있는 도안은 슬라이드 방향이 틀리면 꼬리부터
  // 나와 뒤로 가는 것처럼 보인다 — tpl.faceLeft(머리가 왼쪽)면 우->좌로, 아니면(대칭/기본)
  // 기존대로 좌->우로 슬라이드한다.
  function startLevel7Slide() {
    const problemNum = run.index + 1;
    const t = (problemNum - 1) / (TOTAL_CHALLENGE_LEVELS - 1);
    const sweepMs = CFG.LEVEL7_SWEEP_START_MS - (CFG.LEVEL7_SWEEP_START_MS - CFG.LEVEL7_SWEEP_END_MS) * t;
    const tpl = run.problems[run.index];
    const reverse = !!(tpl && tpl.faceLeft);
    const fromPct = reverse ? 100 : -100;
    const toPct = reverse ? -100 : 100;
    const outPct = reverse ? -220 : 220;
    goalCanvasWrap.style.overflow = 'hidden';
    function runOneSweep() {
      goalCanvas.hidden = false;
      goalCanvas.style.transition = 'none';
      goalCanvas.style.transform = 'translateX(' + fromPct + '%)'; // 시작 지점
      void goalCanvas.offsetWidth; // transition:none 적용을 강제로 반영(다음 transform이 즉시 안 튀도록)
      goalCanvas.style.transition = 'transform ' + sweepMs + 'ms linear';
      goalCanvas.style.transform = 'translateX(' + toPct + '%)'; // 반대편까지 쓸고 지나감
      run.level7TimerId = setTimeout(() => {
        goalCanvas.style.transform = 'translateX(' + outPct + '%)'; // OUT — 다음 사이클까지 화면 밖에 머무름
        run.level7TimerId = setTimeout(runOneSweep, Math.max(0, CFG.LEVEL7_CYCLE_MS - sweepMs));
      }, sweepMs);
    }
    runOneSweep();
  }

  function stopLevel7Slide() {
    clearTimeout(run.level7TimerId);
  }

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

  // 2026-08-14 최종 리뷰 fix wave: pick.targetColor는 실제 이모지에서 샘플링한 색이라 COLORS
  // 안에 정확히 들어있는 경우가 사실상 없다 — 원래의 `wrong === pick.targetColor` 재추첨 루프는
  // 매번 첫 시도에서 바로 통과해버려, tolerance 안쪽이라 사실상 "안 틀린" 색을 wrong으로 배정할
  // 수 있었다(자기파괴적 가드). computeCompletion과 같은 기준(COLOR_TOLERANCE)으로 "진짜 육안으로
  // 틀린 색"만 통과시키도록 고치되, 최대 시도 횟수를 두어 병적인 tolerance 값에서도 무한루프에
  // 빠지지 않게 한다 — 다 실패하면 후보 중 정답과 가장 먼 색으로 폴백.
  function pickWrongColor(targetColor) {
    const MAX_ATTEMPTS = 20;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const candidate = COLORS[Math.floor(Math.random() * COLORS.length)];
      if (colorDistance(candidate, targetColor) > CFG.COLOR_TOLERANCE) return candidate;
    }
    let farthest = COLORS[0];
    let farthestDist = -1;
    COLORS.forEach((hex) => {
      const dist = colorDistance(hex, targetColor);
      if (dist > farthestDist) { farthestDist = dist; farthest = hex; }
    });
    return farthest;
  }

  function startLevel10Chaos() {
    // 2026-08-14 피드백: LEVEL9처럼 문제 번호대별로 색상 변경 주기를 다르게(1~3번 5초,
    // 4~6번 4초, 7~10번 3초).
    const problemNum = run.index + 1;
    const intervalMs = problemNum <= 3 ? CFG.LEVEL10_INTERVAL_1
      : problemNum <= 6 ? CFG.LEVEL10_INTERVAL_2 : CFG.LEVEL10_INTERVAL_3;
    run.level10TimerId = setInterval(() => {
      // 단순화(위 "해석이 갈리는 지점" 2번 참고): "정답 상태인 영역"을 색상 tolerance 비교 대신
      // "칠해져 있음(painted)"으로 판정한다.
      const painted = getChallengeRegionInfo().filter((r) => r.painted);
      if (painted.length === 0) return;
      const pick = painted[Math.floor(Math.random() * painted.length)];
      const wrong = pickWrongColor(pick.targetColor);
      paintRegionPixels(pick.seed, wrong);
    }, intervalMs);
  }

  function stopLevel10Chaos() {
    clearInterval(run.level10TimerId);
  }

  // 챌린지 진행 중일 때만 #btn-save를 가로챈다. Child 모드(hud.root.hidden===true)에서는
  // 아무 것도 하지 않고 app.js의 기존 버블 단계 핸들러가 그대로 실행된다.
  document.getElementById('btn-save').addEventListener('click', (e) => {
    if (!hud.root.hidden) { // 챌린지 진행 중이면
      e.stopImmediatePropagation(); // app.js의 기존 핸들러(Child용 100%매치 로직) 실행 막기
      submitCurrentProblem();
    }
  }, true); // capture:true로 등록해 app.js의 버블 단계 리스너보다 먼저 가로챈다

  // 2026-08-14: "챌린지 모드에서 첫화면으로 돌아가는 버튼 필요" 요청 — 예전엔 챌린지 중 🏠을
  // 눌러도 challenge run만 정리하고 app.js의 goHome()(Child용, 갤러리/맵 화면으로 이동)이
  // 그대로 이어져서 챌린지 도중에 엉뚱한 Child 화면으로 튀는 버그가 있었다. 이제 여기서
  // 전파를 막고 챌린지 선택 화면으로 직접 돌려보낸다.
  document.getElementById('btn-home').addEventListener('click', (e) => {
    if (!hud.root.hidden) {
      e.stopImmediatePropagation();
      endRun();
      coloringScreen.hidden = true;
      selectScreen.hidden = false;
    }
  }, true);

  // 2026-08-14 최종 리뷰 fix wave: paintRegionPixels가 pushUndo를 안 남기기 때문에(app.js 주석
  // 참고) #btn-undo가 챌린지 진행 중에 그대로 열려 있으면 LEVEL 9/10이 방금 만든 변화(소멸/색
  // 강제 변경)를 플레이어가 그냥 되돌려 난이도를 무력화할 수 있었다 — #btn-save와 동일한
  // capture-listener 패턴으로 가로채 챌린지 중에는 완전히 무효화한다.
  document.getElementById('btn-undo').addEventListener('click', (e) => {
    if (!hud.root.hidden) {
      e.stopImmediatePropagation();
    }
  }, true);

  // 위와 같은 이유로 #btn-clear도 챌린지 중에는 무효화(전체 지우기로 챌린지 진행 상황을 날리는
  // 것도 같은 종류의 구멍이라 일관성 있게 막는다).
  document.getElementById('btn-clear').addEventListener('click', (e) => {
    if (!hud.root.hidden) {
      e.stopImmediatePropagation();
    }
  }, true);

  // C2: 챌린지 진행 중에는 돋보기 확대(app.js:goalZoomModal)가 LEVEL1 암기/LEVEL2 마스크
  // 메커닉을 완전히 무력화하므로, 진행 중일 때만 클릭을 가로채 무효화한다(Phase 1 최소 조치 —
  // 명세서 19번의 "Level당 1회" 미터링은 Phase 2+ 범위).
  document.getElementById('goal-canvas-wrap').addEventListener('click', (e) => {
    if (!hud.root.hidden) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  // 디버그/테스트용: 실제 색칠 조작 없이 레벨 1개(10문제)를 자동 진행. correctRate(0~1, 기본 1)
  // 확률로 각 문제를 정답 처리(window.__debugSimulatePerfect로 캔버스를 실제로 채운 뒤 제출)하고,
  // 그 외에는 안 칠한 채로 제출해 오답(Mistake) 처리되게 한다. finishLevel의 alert()까지 그대로
  // 타므로 호출 전에 puppeteer의 page.on('dialog', ...)로 자동 수락 처리를 걸어둬야 한다.
  window.__debugChallengeSimulateLevel = (level, correctRate) => new Promise((resolve) => {
    correctRate = correctRate == null ? 1 : correctRate;
    function step() {
      if (Math.random() < correctRate && window.__debugSimulatePerfect) window.__debugSimulatePerfect();
      submitCurrentProblem();
      if (hud.root.hidden) { resolve(run.lastResult); return; } // finishLevel까지 끝난 상태
      debugOnReady = step;
    }
    debugOnReady = step;
    startLevel(level);
  });

  // 디버그/테스트용: 진행 중인 run 상태 스냅샷(콤보/미스카운트 등 HUD 텍스트만으로 확인하기 어려운 값 검증용)
  window.__debugChallengeRunState = () => ({ ...run });

  // 레벨별 시작/정지 효과 디스패치 테이블. loadNextProblem/advanceToNextProblem/endRun이 레벨을
  // if/else로 분기하지 않고 이 테이블을 조회한다. 레벨3~10은 각 담당 Task가 자기 항목만 채운다.
  const LEVEL_EFFECTS = {
    // 2026-08-14: "레벨1 사라짐 vs 레벨8 깜빡임, 깜빡임이 더 쉬움" 피드백으로 1과 8을 서로
    // 교체(1은 깜빡임=startLevel8Blink). 이후 "레벨8이 레벨4랑 겹친다" 피드백으로 레벨8은
    // 다시 별도의 실루엣 모드(startLevel8Silhouette)로 교체했다.
    1: { start: startLevel8Blink, stop: stopLevel8Blink },
    2: { start: startLevel2Reveal, stop: stopLevel2Reveal },
    3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null,
  };

  LEVEL_EFFECTS[3] = { start: startLevel3Occlusion, stop: stopLevel3Occlusion };
  LEVEL_EFFECTS[4] = { start: startLevel4Vanish, stop: null };
  LEVEL_EFFECTS[5] = { start: startLevel5Rotation, stop: stopLevel5Rotation };
  LEVEL_EFFECTS[6] = { start: startLevel6Flicker, stop: stopLevel6Flicker };
  LEVEL_EFFECTS[7] = { start: startLevel7Slide, stop: stopLevel7Slide };
  LEVEL_EFFECTS[8] = { start: startLevel8Silhouette, stop: stopLevel8Silhouette };
  LEVEL_EFFECTS[9] = { start: startLevel9Vanish, stop: stopLevel9Vanish };
  LEVEL_EFFECTS[10] = { start: startLevel10Chaos, stop: stopLevel10Chaos };

  window.Challenge = { state, openSelectScreen, closeSelectScreen, startLevel, getBestScore };
})();
