// challenge.js
// 챌린지 모드(MODE_CHALLENGE) 화면/로직. app.js의 openTemplate/computeCompletion을
// 옵션 파라미터로 재사용하고, 나머지(선택 화면, 문제 루프, 점수 계산)는 여기서 새로 만든다.
(function () {
  'use strict';

  const CFG = window.CHALLENGE_CONFIG;
  // app.js는 하나의 IIFE라 goalCanvas/coloringScreen 같은 const, openTemplate/computeCompletion/
  // getTemplatesForLevel 같은 함수 선언 모두 스크립트 밖에서는 안 보인다 — Task 3이 이 5개만
  // window.__challengeInternals로 최소 export 해뒀다(app.js:2785 부근). 여기서 그대로 꺼내 쓴다.
  const { goalCanvas, coloringScreen, openTemplate, computeCompletion, getTemplatesForLevel } = window.__challengeInternals;
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
    problemTimerId: null, problemDeadline: 0, lastResult: null,
  };

  // 디버그/테스트용: loadNextProblem이 다음 문제를 열고 준비를 마쳤을 때 한 번 불려나가는 훅.
  // __debugChallengeSimulateLevel이 실제 도안 로딩(비동기)이 끝나는 시점을 기다리는 데 쓴다.
  let debugOnReady = null;

  // startLevel1Reveal이 예약한 "1초 뒤 숨기기" 타이머 id. 마지막 문제를 1초가 다 되기 전에
  // 풀어서 finishLevel이 goalCanvas를 다시 보이게 해줘도, 취소 안 하면 이 타이머가 뒤늦게 발동해
  // 방금 복구한 goalCanvas를(심지어 다음에 여는 Child 모드 도안까지) 도로 숨겨버린다.
  let revealTimerId = null;

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
      if (debugOnReady) { const cb = debugOnReady; debugOnReady = null; cb(); }
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
    clearTimeout(revealTimerId); // 마지막 문제의 리빌-숨김 예약이 아직 안 끝났다면 취소(아래 줄을 나중에 덮어쓰지 않게)
    goalCanvas.hidden = false; // LEVEL1 기억매칭 연출로 숨겨둔 상태였다면 Child 모드로 돌아갈 때를 위해 원상 복구
    const accuracyPct = Math.round((run.correctCount / run.problems.length) * 100);
    const remainingSeconds = Math.max(0, Math.round((run.problemDeadline - Date.now()) / 1000));
    const result = computeFinalScore({
      level: run.level, difficulty: run.difficulty, accuracyPct,
      mistakeCount: run.mistakeCount, remainingSeconds, maxCombo: run.maxCombo,
    });
    run.lastResult = result;
    const isNewRecord = saveBestScoreIfHigher(run.difficulty, run.level, result.finalScore);
    coloringScreen.hidden = true;
    selectScreen.hidden = false;
    renderLevelGrid();
    alert('Score: ' + result.finalScore + (isNewRecord ? ' (NEW RECORD!)' : '') + (result.isPerfect ? ' PERFECT!' : ''));
    // 축하 연출/모달은 Phase 4에서 명세서 43번(Next/Back 클릭음) 작업과 함께 다듬는다. Phase 1은 결과값 저장/노출까지만.
  }

  function startLevel1Reveal() {
    // 명세서 8번: Goal을 1초 보여주고 숨긴다
    clearTimeout(revealTimerId); // 이전 문제의 숨김 예약이 남아있다면 취소하고 이 문제 기준으로 다시 잡는다
    goalCanvas.hidden = false; // app.js가 이미 캐싱해 둔 전역 goalCanvas 참조를 __challengeInternals로 재사용
    revealTimerId = setTimeout(() => { goalCanvas.hidden = true; }, CFG.LEVEL1_GOAL_DISPLAY_MS);
  }

  // 챌린지 진행 중일 때만 #btn-save를 가로챈다. Child 모드(hud.root.hidden===true)에서는
  // 아무 것도 하지 않고 app.js의 기존 버블 단계 핸들러가 그대로 실행된다.
  document.getElementById('btn-save').addEventListener('click', (e) => {
    if (!hud.root.hidden) { // 챌린지 진행 중이면
      e.stopImmediatePropagation(); // app.js의 기존 핸들러(Child용 100%매치 로직) 실행 막기
      submitCurrentProblem();
    }
  }, true); // capture:true로 등록해 app.js의 버블 단계 리스너보다 먼저 가로챈다

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

  window.Challenge = { state, openSelectScreen, closeSelectScreen, startLevel, getBestScore };
})();
