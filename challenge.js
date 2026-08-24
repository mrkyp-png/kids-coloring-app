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
    goalCanvas, coloringScreen, openTemplate, computeCompletion, getChallengeTierTemplates,
    repaintGoalWithColors, paintRegionPixels, getChallengeRegionInfo, colorDistance, COLORS,
    setWormProgress, setWormExit, resetWormForNewProblem, vibrate,
  } = window.__challengeInternals;
  const goalCanvasWrap = document.getElementById('goal-canvas-wrap');
  const weatherLayer = document.getElementById('challenge-weather-layer');
  const goalOccluder = document.getElementById('challenge-goal-occluder');
  const TOTAL_CHALLENGE_LEVELS = 10;

  const coverScreen = document.getElementById('cover-screen');
  const selectScreen = document.getElementById('challenge-select-screen');
  const btnCoverStartChallenge = document.getElementById('btn-cover-start-challenge');
  const btnChallengeBack = document.getElementById('btn-challenge-back');
  const state = { difficulty: 'easy', level: null };

  // I7(최종 리뷰): 미완성 상태로 전체 배포되는 걸 막기 위해 진입 버튼을 기본 숨김.
  // CHALLENGE_CONFIG.ENABLED를 true로 바꾸면(로컬 테스트 등) 그대로 다시 노출된다.
  // 2026-08-14: 진입 버튼이 맵 화면 -> 표지 화면(btn-cover-start-challenge)으로 이동.
  btnCoverStartChallenge.hidden = !CFG.ENABLED;

  function openSelectScreen() {
    coverScreen.hidden = true;
    window.TabBar.hide();
    selectScreen.hidden = false;
    tierCarousels.forEach((c) => c.render());
  }

  function closeSelectScreen() {
    selectScreen.hidden = true;
    coverScreen.hidden = false;
    window.TabBar.show();
  }

  // 2026-08-23(2): "화면 위/중간/아래 = 쉬움/보통/어려움, 셋이 항상 동시에 보이고 구역마다 따로
  // 좌우 캐러셀로 스테이지 1~10을 넘긴다" — 난이도 하나를 먼저 고르는 버전(직전 커밋)을 대체.
  // 원형+홀드링 캐러셀(포인터/휠, 700ms 홀드로 확정) 자체는 지도 화면(setupMapCarousel)과 같은
  // 패턴을 세로(dy)->가로(dx)로 바꿔 재사용하되, 이번엔 구역 3개가 각자 독립 인스턴스가 필요해서
  // 공용 헬퍼(createHorizontalHoldCarousel)로 뽑아 3번 생성한다(복붙 방지).
  const TIER_DIFFICULTIES = ['easy', 'normal', 'hard'];

  function buildTierCircle(difficulty, level, isPeek) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'lv-circle lv-swap-fade';
    node.dataset.diff = difficulty;
    node.disabled = isPeek;
    node.tabIndex = isPeek ? -1 : 0;
    node.textContent = String(level);
    node.setAttribute('aria-label', I18N.t('challenge.difficulty.' + difficulty) + ' ' + level);
    if (!isPeek) {
      node.addEventListener('click', () => {
        state.difficulty = difficulty;
        startLevel(level);
      });
    }
    return node;
  }

  // 캐러셀 하나(컨테이너, 항목 개수 n, "현재 index로 좌/중앙/우 슬롯을 채워라" 콜백)를 만들고
  // { render } 컨트롤을 돌려준다. 포인터 드래그/휠로 index를 한 칸씩 옮기고, 중앙 원을 700ms
  // 꾹 누르면 중앙 원의 click 리스너(버튼별로 다름 — 여기선 startLevel 진입)가 실행된다.
  function createHorizontalHoldCarousel(container, n, renderSlots) {
    let index = 0;
    function render() { renderSlots(index); }

    let dragging = false, startX = 0, moved = false, downCircle = null;
    let holdCircle = null, holdRing = null;
    function onHoldFillTransitionEnd(e) {
      if (e.propertyName !== 'stroke-dashoffset' || !holdCircle) return;
      const stage = holdCircle.parentElement;
      if (!stage || !stage.classList.contains('lv-charging')) return;
      const circle = holdCircle;
      cancelHoldVisuals();
      if (navigator.vibrate) { try { navigator.vibrate([0, 60]); } catch (err) { /* 무시 */ } }
      circle.click();
    }
    function cancelHoldVisuals() {
      if (!holdCircle) return;
      holdCircle.parentElement.classList.remove('lv-charging');
      if (holdRing) holdRing.removeEventListener('transitionend', onHoldFillTransitionEnd);
      holdCircle = null;
      holdRing = null;
    }
    function startHold(circle) {
      const stage = circle.parentElement;
      const ring = stage.querySelector('.lv-hold-ring-fill');
      if (!ring) return;
      holdCircle = circle;
      holdRing = ring;
      ring.addEventListener('transitionend', onHoldFillTransitionEnd);
      stage.classList.add('lv-charging');
      if (navigator.vibrate) {
        try { navigator.vibrate([40, 60, 40, 55, 45, 45, 45, 35, 50, 25, 55, 15, 60]); } catch (err) { /* 무시 */ }
      }
    }
    function cancelHold() {
      if (!holdCircle) return;
      cancelHoldVisuals();
      if (navigator.vibrate) { try { navigator.vibrate(0); } catch (err) { /* 무시 */ } }
    }
    container.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.lv-circle-stage')) return;
      e.preventDefault();
      dragging = true;
      moved = false;
      startX = e.clientX;
      downCircle = e.target.closest('.lv-circle');
      if (downCircle) {
        downCircle.classList.add('lv-pressed');
        startHold(downCircle);
      }
      container.setPointerCapture(e.pointerId);
    });
    container.addEventListener('touchstart', (e) => {
      if (e.target.closest('.lv-circle-stage')) e.preventDefault();
    }, { passive: false });
    container.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 4) {
        if (!moved) cancelHold();
        moved = true;
      }
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      e.preventDefault();
      if (downCircle) downCircle.classList.remove('lv-pressed');
      if (moved) {
        const dx = e.clientX - startX;
        const STEP_THRESHOLD = 40;
        if (dx <= -STEP_THRESHOLD) index = (index + 1) % n;
        else if (dx >= STEP_THRESHOLD) index = (index - 1 + n) % n;
        else return;
        render();
      } else {
        cancelHold();
      }
    }
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    container.addEventListener('click', (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);

    let wheelCooldown = false;
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (wheelCooldown) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta > 0) index = (index + 1) % n;
      else if (delta < 0) index = (index - 1 + n) % n;
      else return;
      render();
      wheelCooldown = true;
      setTimeout(() => { wheelCooldown = false; }, 350);
    }, { passive: false });

    return { render };
  }

  const tierCarousels = TIER_DIFFICULTIES.map((difficulty) => {
    const container = document.getElementById('challenge-tier-carousel-' + difficulty);
    return createHorizontalHoldCarousel(container, TOTAL_CHALLENGE_LEVELS, (index) => {
      const n = TOTAL_CHALLENGE_LEVELS;
      const leftLv = ((index - 1 + n) % n) + 1;
      const centerLv = index + 1;
      const rightLv = ((index + 1) % n) + 1;

      const leftSlot = container.querySelector('.tier-peek-left');
      leftSlot.innerHTML = '';
      leftSlot.appendChild(buildTierCircle(difficulty, leftLv, true));

      const rightSlot = container.querySelector('.tier-peek-right');
      rightSlot.innerHTML = '';
      rightSlot.appendChild(buildTierCircle(difficulty, rightLv, true));

      const stage = container.querySelector('.lv-circle-stage');
      stage.innerHTML = '';
      stage.appendChild(buildTierCircle(difficulty, centerLv, false));
      stage.insertAdjacentHTML('beforeend',
        '<svg class="lv-hold-ring" viewBox="0 0 100 100" aria-hidden="true">' +
        '<circle class="lv-hold-ring-track" cx="50" cy="50" r="47"/>' +
        '<circle class="lv-hold-ring-fill" cx="50" cy="50" r="47"/>' +
        '</svg>');
    });
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

  // 2026-08-24: "챌린지 선택 화면에도 리그별 리셋 버튼(각 모드별 리셋)" 요청 — 컬러링 모드의
  // resetModeProgress(app.js)와 같은 성격이지만, 챌린지는 진행 기록을 challengeBestScore
  // 하나에만 저장하므로(레벨/클리어/보스 같은 별도 키가 없음) 그 난이도 칸만 지우면 된다.
  function resetChallengeDifficulty(difficulty) {
    const all = getAllBestScores();
    delete all[difficulty];
    localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(all));
  }

  document.querySelectorAll('.challenge-tier-reset').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(15);
      if (!window.confirm(I18N.t('confirm.resetMode'))) return;
      resetChallengeDifficulty(btn.dataset.diff);
    });
  });

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
    level7TimerIds: null, level8TimerId: null, level9TimerId: null, level10TimerId: null,
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
    // 2026-08-14 피드백: "영역 수 적은 도안부터 나와야" — 처음엔 LEVEL6만 고정 순서로 재정렬했는데,
    // "다른 레벨도 다 그래야 한다"는 후속 피드백으로 getTemplatesForLevel(app.js) 자체가
    // TEMPLATE_REGION_COUNTS 기준 오름차순 정렬하도록 일반화해서 여기서 따로 처리할 필요 없어짐.
    // 2026-08-15 피드백: 유아용/챌린지 재구성 — 유아용(COLORING_TEMPLATES)과 챌린지(CHALLENGE_TIER_
    // TEMPLATES)가 완전히 분리된 별개 풀이 됐으므로, 챌린지 쉬움 티어도 더는 유아용 풀을 빌려 쓰지
    // 않고 다른 티어와 똑같이 getChallengeTierTemplates에서 가져온다.
    const problems = getChallengeTierTemplates(state.difficulty, level);
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
    tierCarousels.forEach((c) => c.render());
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

  // goal-canvas는 내부 해상도가 640x640(WORK_SIZE)이지만 실제 화면 표시 크기는 반응형으로
  // 훨씬 작다(예: 313px) — left/top/width/height의 px 단위는 표시 크기 기준이라 640 좌표를
  // 그대로 px로 쓰면 원이 화면 밖으로 벗어나 버린다. %로 변환해 정사각형 박스 어떤 크기든
  // 맞게 스케일되게 한다.
  function pct640(v) { return `${(v / 640) * 100}%`; }

  // 2026-08-15 피드백(2차): 1~6번은 "원 안쪽만 보이는" 방식 대신 "goal은 항상 다 보이고, 원이
  // 있는 자리만 안 보이게" — goal-canvas는 항상 클립 없이 그대로 두고, 배경색과 같은 원
  // (challenge-goal-occluder)을 그 위에 얹어서 이동시킨다.
  function setOccluder(x, y, r) {
    goalOccluder.style.left = pct640(x - r);
    goalOccluder.style.top = pct640(y - r);
    goalOccluder.style.width = pct640(r * 2);
    goalOccluder.style.height = pct640(r * 2);
  }

  // 2026-08-15 피드백: 원(공) 하나가 튕기면서 돌아다니게 — axis:'x'(1~3번)는 좌우로 왕복하는
  // 것이 주 이동(왼쪽<->오른쪽), 그러면서 위아래로 튕긴다(보조축). axis:'y'(4~6번)는 그 반대로
  // 상하 왕복이 주 이동, 좌우로 튕긴다. 주 이동은 삼각파(일정 속도 왕복), 튕기는 축은
  // abs(sin) 파형으로 통통 튀는 느낌을 낸다.
  function startLevel2Bounce(axis) {
    const r = CFG.LEVEL2_REVEAL_RADIUS_PX;
    const lo = r, hi = 640 - r, span = hi - lo;
    const startTime = Date.now();
    function tick() {
      const t = Date.now() - startTime;
      const pPhase = (t % CFG.LEVEL2_BOUNCE_CYCLE_MS) / CFG.LEVEL2_BOUNCE_CYCLE_MS; // 0~1, 왕복 삼각파
      const primary = pPhase < 0.5 ? lo + span * (pPhase * 2) : hi - span * ((pPhase - 0.5) * 2);
      const bPhase = (t % CFG.LEVEL2_BOUNCE_ARC_MS) / CFG.LEVEL2_BOUNCE_ARC_MS; // 0~1, 튕기는 원호
      const bounce = lo + span * Math.abs(Math.sin(bPhase * Math.PI));
      const x = axis === 'x' ? primary : bounce;
      const y = axis === 'x' ? bounce : primary;
      setOccluder(x, y, r);
      run.level2RevealTimerId = requestAnimationFrame(tick);
    }
    tick();
  }

  // 문제 7~10번: 랜덤 위치에 글라이드 없이 순간적으로 나타났다(HOLD) 완전히 사라지는(GAP) "도장" 방식.
  function startLevel2Stamp() {
    const radius = CFG.LEVEL2_STAMP_RADIUS_PX;
    const bound = 640 - radius * 2;
    function randomPoint() { return { x: radius + Math.random() * bound, y: radius + Math.random() * bound }; }
    function showStamp() {
      const p = randomPoint();
      goalCanvas.style.clipPath = `circle(${pct640(radius)} at ${pct640(p.x)} ${pct640(p.y)})`;
      run.level2RevealTimerId = setTimeout(hideStamp, CFG.LEVEL2_STAMP_HOLD_MS);
    }
    function hideStamp() {
      goalCanvas.style.clipPath = `circle(0% at 0% 0%)`;
      run.level2RevealTimerId = setTimeout(showStamp, CFG.LEVEL2_STAMP_GAP_MS);
    }
    showStamp();
  }

  function startLevel2Reveal() {
    goalCanvas.hidden = false;
    const problemNum = run.index + 1;
    if (problemNum <= 6) {
      // 1~6번: goal은 항상 다 보이고, 원이 도는 자리만 occluder로 가림
      goalCanvas.classList.remove('challenge-goal-mask');
      goalCanvas.style.clipPath = '';
      goalOccluder.hidden = false;
      startLevel2Bounce(problemNum <= 3 ? 'x' : 'y'); // 1~3: 좌우로 왕복(위아래로 튕김), 4~6: 상하로 왕복(좌우로 튕김)
    } else {
      // 7~10번: 기존 방식(도장 안쪽만 보임) 유지
      goalOccluder.hidden = true;
      goalCanvas.classList.add('challenge-goal-mask');
      startLevel2Stamp();
    }
  }

  function stopLevel2Reveal() {
    // startLevel2Bounce는 requestAnimationFrame, startLevel2Stamp은 setTimeout을 쓰므로 둘 다 정리
    cancelAnimationFrame(run.level2RevealTimerId);
    clearTimeout(run.level2RevealTimerId);
    goalCanvas.classList.remove('challenge-goal-mask');
    goalOccluder.hidden = true;
    goalCanvas.style.clipPath = '';
  }

  // 2026-08-14 피드백(2차): "goal 실루엣 안쪽에만" 마스킹하지 말고 LEVEL7처럼 박스 전체를
  // 가로지르게 변경 — 구름/비/눈이 goal 이미지 실루엣과 무관하게 화면 전체를 지나간다.
  // 구름/빗줄기/눈송이 크기는 매번 랜덤해서 일정하지 않게 한다.
  function rand(min, max) { return min + Math.random() * (max - min); }

  // 2026-08-14 피드백: 구름이 화면 중간에서 갑자기 사라지던 문제 — CSS infinite 애니메이션
  // 대신 LEVEL7의 슬라이드와 같은 방식(JS로 좌표를 명시적으로 옮기고 transition)으로 바꿔서,
  // 왼쪽 밖에서 시작해 오른쪽 밖까지 확실히 다 지나간 뒤에만 다시 시작하게 한다.
  // 2026-08-14 피드백: "시작 화면에 구름이 일부 보인다" — -70%는 구름 자기 너비 기준 오프셋이라
  // 폭이 넓은 구름(최대 72%)은 오른쪽 일부가 박스 안에 걸쳐 보였다. 어떤 크기든 완전히 가려지도록
  // -120%로 더 왼쪽에서 시작. 같은 피드백으로 지나가는 속도도 1.5배 빠르게(구간 rand(3000,6000)
  // -> rand(2000,4000)).
  function startCloudCycle(cloudEl, durationMs, initialDelayMs) {
    function runOnce() {
      cloudEl.style.transition = 'none';
      cloudEl.style.transform = 'translateX(-120%)';
      void cloudEl.offsetWidth;
      cloudEl.style.transition = 'transform ' + durationMs + 'ms linear';
      cloudEl.style.transform = 'translateX(170%)';
      const id = setTimeout(runOnce, durationMs + 400); // 오른쪽 밖으로 나간 뒤 잠깐 쉬었다가 재등장
      run.level3ParticleTimerIds.push(id);
    }
    const id = setTimeout(runOnce, initialDelayMs);
    run.level3ParticleTimerIds.push(id);
  }

  // 2026-08-14 피드백: 대각선 줄무늬 대신 실제 물방울 이미지가 위->아래로 떨어짐. 같은
  // JS 사이클 방식(구름과 동일한 패턴, 축만 X->Y로) — 위쪽 밖에서 시작해 아래쪽 밖까지
  // 확실히 다 떨어진 뒤에만 다시 시작한다.
  // 주의: transform: translateY(%)는 엘리먼트 자기 자신의 높이 기준이라(작은 물방울/눈송이는
  // 100%가 몇 px밖에 안 됨) 박스를 다 못 가로지른다 — top(%)은 컨테이너 기준이라 대신 이걸 쓴다.
  // 2026-08-14 피드백: "구름처럼 빗방울/눈도 시작 화면엔 안 보여야 하는데 보인다" — 물방울
  // 크기가 커지면서 top(요소 위쪽 기준 좌표)만 박스 밖(-15%)이어도 높이(width*4/3, 최대 40%대)
  // 때문에 아래쪽 절반이 이미 박스 안으로 들어와 있었다. 요소 자기 높이(heightPct)만큼 더
  // 위에서 시작하도록 startTop을 호출부에서 계산해 넘긴다(생성 시점 초기값과 동일한 값 사용).
  function startRaindropCycle(dropEl, durationMs, initialDelayMs, startTop) {
    function runOnce() {
      dropEl.style.transition = 'none';
      dropEl.style.top = startTop;
      void dropEl.offsetWidth;
      dropEl.style.transition = 'top ' + durationMs + 'ms linear';
      dropEl.style.top = '115%';
      const id = setTimeout(runOnce, durationMs + 200);
      run.level3ParticleTimerIds.push(id);
    }
    const id = setTimeout(runOnce, initialDelayMs);
    run.level3ParticleTimerIds.push(id);
  }

  function startSnowflakeCycle(flakeEl, durationMs, initialDelayMs, startTop) {
    function runOnce() {
      flakeEl.style.transition = 'none';
      flakeEl.style.top = startTop;
      void flakeEl.offsetWidth;
      flakeEl.style.transition = 'top ' + durationMs + 'ms linear';
      flakeEl.style.top = '108%';
      const id = setTimeout(runOnce, durationMs + 150);
      run.level3ParticleTimerIds.push(id);
    }
    const id = setTimeout(runOnce, initialDelayMs);
    run.level3ParticleTimerIds.push(id);
  }

  function startLevel3Occlusion() {
    const problemNum = run.index + 1;
    const type = problemNum <= 3 ? 'cloud' : problemNum <= 6 ? 'rain' : 'snow';
    goalCanvasWrap.style.setProperty('--challenge-occlude-opacity', CFG.LEVEL3_OCCLUSION_OPACITY);

    weatherLayer.innerHTML = '';
    run.level3ParticleTimerIds = [];
    if (type === 'cloud') {
      // 2026-08-15 피드백: "구름도 비/눈처럼 goal을 80% 가리게" — 실측(캔버스에 실제 모양+겹침
      // 그려서 픽셀 비율 측정)해보니 기존 5~7개는 정상 상태 기준 20% 안팎이라 목표(80%)에
      // 한참 못 미침. 비/눈과 같은 방식으로 개수를 늘려서 커버리지를 채움 — 5~7 -> 38~42개로
      // 두 차례 실측 조정, 정상 상태 커버리지 약 75~80%대로 확인.
      const count = 38 + Math.floor(Math.random() * 5); // 38~42개 (실측 기반 조정)
      for (let i = 0; i < count; i++) {
        const cloud = document.createElement('span');
        cloud.className = 'challenge-cloud';
        cloud.style.setProperty('--cloud-size', rand(33, 72) + '%'); // 2026-08-14: 1.5배 확대(22~48 -> 33~72)
        cloud.style.setProperty('--cloud-top', rand(5, 70) + '%');
        // 2026-08-14 피드백: "시작하자마자 구름이 이미 화면에 나와있다" — startCloudCycle의
        // runOnce가 initialDelayMs만큼 늦게 처음 실행되는데, 그 전까지는 transform 미지정
        // 상태(왼쪽 위 기본 위치)라 화면에 바로 보였다. 딜레이가 끝나기 전에도 왼쪽 밖에
        // 있도록 생성 시점에 미리 같은 시작 위치를 지정해둔다.
        cloud.style.transform = 'translateX(-120%)';
        cloud.style.filter = `brightness(${rand(85, 115)}%)`; // 2026-08-15 피드백: 낱개마다 음영 살짝 다르게
        weatherLayer.appendChild(cloud);
        startCloudCycle(cloud, rand(2000, 4000), rand(0, 3000));
      }
    } else if (type === 'rain') {
      // 2026-08-14 피드백: "goal이 70% 이상 안 보이게"는 장막이 아니라 "떨어지는 빗방울들
      // 자체가 goal을 가리는 것" — 장막 없이 낱개 빗방울 개수/크기로 가림. 실측(캔버스에 실제
      // 모양+겹침 그려서 픽셀 비율 측정)해보니 기존 개수/크기론 평균 25% 안팎이라 목표(80%)에
      // 한참 못 미쳐 크기를 크게 키움. --drop-left도 (100-크기) 범위로 제한해 오른쪽 밖으로
      // 튀어나가 박스에 잘리는 일이 없게 한다.
      // 2026-08-14 피드백: 방울을 크게 키워서 개수를 줄이니 겹쳐서 파란 덩어리 하나처럼
      // 보이는 문제가 생김 — 낱개 빗방울 모양이 보이게 크기는 다시 줄이고, 대신 개수를
      // 훨씬 늘려서(실측 기반) 커버리지를 채운다.
      const count = 150 + Math.floor(Math.random() * 31); // 150~180개
      for (let i = 0; i < count; i++) {
        const drop = document.createElement('span');
        drop.className = 'challenge-raindrop';
        const size = rand(14, 26); // width%
        const height = size * 4 / 3; // aspect-ratio 3/4(width:height)라 세로가 더 큼
        const startTop = -(height + rand(2, 60)) + '%'; // 자기 높이만큼(+무작위 여유) 완전히 박스 밖에서 시작
        drop.style.setProperty('--drop-size', size + '%');
        drop.style.setProperty('--drop-left', rand(0, 100 - size) + '%'); // 오른쪽 밖으로 안 튀어나가게 범위 제한
        drop.style.top = startTop; // 생성 시점부터 완전히 박스 밖(구름과 동일한 원칙)
        drop.style.filter = `brightness(${rand(85, 115)}%)`; // 2026-08-15 피드백: 낱개마다 음영 살짝 다르게
        weatherLayer.appendChild(drop);
        startRaindropCycle(drop, rand(800, 1600), rand(0, 1500), startTop);
      }
    } else {
      // 2026-08-14 피드백: 비와 동일하게 goal을 80% 가리도록 크기/개수 확대, --flake-left도
      // (100-크기) 범위로 제한해 박스에 안 잘리게 하고, 시작 화면엔 안 보이게 함.
      // 2026-08-14 피드백: 눈도 마찬가지로 너무 커서 낱개 눈송이가 안 보이고 흰 덩어리처럼
      // 보임 — 크기는 줄이고 개수를 대폭 늘려서 커버리지를 채운다.
      const count = 140 + Math.floor(Math.random() * 41); // 140~180개
      for (let i = 0; i < count; i++) {
        const flake = document.createElement('span');
        flake.className = 'challenge-snowflake';
        const size = rand(10, 20); // 원(1:1)이라 height=width
        const startTop = -(size + rand(2, 60)) + '%';
        flake.style.setProperty('--flake-size', size + '%');
        flake.style.setProperty('--flake-left', rand(0, 100 - size) + '%');
        flake.style.top = startTop;
        flake.style.filter = `brightness(${rand(85, 115)}%)`; // 2026-08-15 피드백: 낱개마다 음영 살짝 다르게
        weatherLayer.appendChild(flake);
        startSnowflakeCycle(flake, rand(2000, 4000), rand(0, 3500), startTop);
      }
    }
    weatherLayer.hidden = false;
    run.level3OccludeClass = type;
  }

  function stopLevel3Occlusion() {
    weatherLayer.hidden = true;
    weatherLayer.innerHTML = '';
    (run.level3ParticleTimerIds || []).forEach((id) => clearTimeout(id));
    run.level3ParticleTimerIds = [];
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
  // 2026-08-14 피드백: "회전하면서 경계선과 만난다" — perspective+rotateY로 도는 평면은 세로
  // 중심에서 먼 지점(머리가 높이 있는 그림 등)일수록 회전 중 원근 투영 때문에 실제로 살짝
  // 위/옆으로 튀어나온다(순수 Y축 회전이라도 perspective 투영식 특성상 중심에서 먼 점은 회전
  // 중 세로 위치도 미세하게 밀림). goalCanvasWrap에 overflow:hidden을 걸어 박스 밖으로 튀어나온
  // 부분을 깔끔하게 잘라낸다(LEVEL3/LEVEL7과 같은 방식).
  // 2026-08-15 피드백: 그래도 여전히 잘려 보인다는 재확인 — LEVEL5_ROTATE_PERSPECTIVE_PX/SCALE
  // 튜닝으로 애초에 튀어나오는 양 자체를 0으로 만듦(실측 기반, config 주석 참고). overflow:hidden은
  // 안전망으로 유지.
  function startLevel5Rotation() {
    goalCanvasWrap.style.overflow = 'hidden';
    const startTime = Date.now();
    function tick() {
      const elapsed = Date.now() - startTime;
      const deg = (elapsed % CFG.LEVEL5_ROTATION_MS) / CFG.LEVEL5_ROTATION_MS * 360;
      goalCanvas.style.transform = `perspective(${CFG.LEVEL5_ROTATE_PERSPECTIVE_PX}px) rotateY(${deg}deg) scale(${CFG.LEVEL5_ROTATE_SCALE})`;
      run.level5AnimFrame = requestAnimationFrame(tick);
    }
    tick();
  }

  function stopLevel5Rotation() {
    if (run.level5AnimFrame) cancelAnimationFrame(run.level5AnimFrame);
    run.level5AnimFrame = null;
    goalCanvasWrap.style.overflow = '';
    goalCanvas.style.transform = '';
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

  // 2026-08-14 피드백: 문제당 한 번만 지나가고 끝이 아니라, 60초 안에서 0초(첫 통과)/15초/
  // 30초/45초 — 총 4번 왼->오->퇴장 슬라이드가 나타났다 사라지게 고정 스케줄로 반복한다
  // (기존의 "15초마다 계속 반복" 방식 대체).
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
      run.level7TimerIds.push(setTimeout(() => {
        goalCanvas.style.transform = 'translateX(' + outPct + '%)'; // OUT — 다음 스케줄까지 화면 밖에 머무름
      }, sweepMs));
    }
    run.level7TimerIds = [];
    CFG.LEVEL7_PASS_TIMES_MS.forEach((delayMs) => {
      run.level7TimerIds.push(setTimeout(runOneSweep, delayMs));
    });
  }

  function stopLevel7Slide() {
    (run.level7TimerIds || []).forEach((id) => clearTimeout(id));
    run.level7TimerIds = [];
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

  // 2026-08-14 피드백: "9/10번은 영역 수도 늘어나고 속도도 빨라져서 진행이 안 된다" — 문제
  // 번호대별로 빨라지던 걸 없애고 7초 고정으로.
  function startLevel9Vanish() {
    const intervalMs = CFG.LEVEL9_INTERVAL_MS;
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

  // 2026-08-14 피드백: LEVEL9와 동일하게 문제 번호대별로 빨라지던 걸 없애고 7초 고정으로.
  function startLevel10Chaos() {
    const intervalMs = CFG.LEVEL10_INTERVAL_MS;
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
      // 2026-08-25(4): "버튼 눌렀는지 인지 안 됨" 요청으로 전 버튼에 진동 추가 — 여기서 막아버린
      // app.js 쪽 vibrate(15)를 대신 호출(stopImmediatePropagation이라 app.js 핸들러는 아예 안 돈다).
      vibrate(15);
      submitCurrentProblem();
    }
  }, true); // capture:true로 등록해 app.js의 버블 단계 리스너보다 먼저 가로챈다

  // 2026-08-15 피드백: 챌린지 모드에서는 완료 버튼을 누르기 전에, 탭으로 색칠해서 이미 100%
  // 다 맞았으면 자동으로 클리어 처리 — 완료 버튼을 누르는 반응속도만큼 시간 보너스가 깎이는
  // 걸 방지. 완료 버튼 자체는 그대로 유지(미완성 상태를 수동으로 빨리 넘기고 싶을 때 용도).
  // app.js의 handleTap(#tap-layer, pointerdown, 버블 단계)이 먼저 등록돼 칠하기를 끝내고,
  // 같은 엘리먼트·같은 단계에 나중에 등록된 이 리스너가 그 직후에 실행되는 걸 이용한다
  // (capture 아님 — btn-save/btn-home 가로채기와 달리 여기서는 app.js가 먼저 실행돼야 함).
  document.getElementById('tap-layer').addEventListener('pointerdown', () => {
    if (hud.root.hidden || run.submitting) return; // Child 모드이거나 이미 채점 중이면 무시
    const { matched, total } = computeCompletion(CFG.COLOR_TOLERANCE);
    if (total > 0 && matched === total) submitCurrentProblem();
  });

  // 2026-08-14: "챌린지 모드에서 첫화면으로 돌아가는 버튼 필요" 요청 — 예전엔 챌린지 중 🏠을
  // 눌러도 challenge run만 정리하고 app.js의 goHome()(Child용, 갤러리/맵 화면으로 이동)이 그대로
  // 이어져서 챌린지 도중에 엉뚱한 Child 화면으로 튀는 버그가 있었다. 이제 여기서 전파를 막고
  // 챌린지 선택 화면으로 직접 돌려보낸다.
  // 2026-08-24: 링의 #btn-back이 되돌리기(undo)로 바뀌면서, 여기서 가로챌 버튼은 헤더의
  // #btn-home(뒤로가기) 하나뿐 — 되돌리기는 챌린지 중에도 그냥 undoLastFill()이 정상 동작해야
  // 하므로 더 이상 가로채지 않는다.
  document.getElementById('btn-home').addEventListener('click', (e) => {
    if (!hud.root.hidden) {
      e.stopImmediatePropagation();
      vibrate(15); // 2026-08-25(4): 위 btn-save와 같은 이유
      endRun();
      coloringScreen.hidden = true;
      selectScreen.hidden = false;
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

  // 임시 디버그용(확인 후 제거 예정): 특정 문제 번호로 강제 이동(레벨3처럼 문제 번호별로
  // 연출이 바뀌는 레벨 검증용)
  window.__debugChallengeGotoProblem = (idx) => {
    const effect = LEVEL_EFFECTS[run.level];
    if (effect && effect.stop) effect.stop();
    run.index = idx;
    loadNextProblem();
  };

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
  // 2026-08-14 피드백: "레벨4가 엄청 어려워, 4랑 8이 바뀌어야함" — 사라짐(옛 LEVEL4)과
  // 실루엣(옛 LEVEL8) 자리를 맞바꿈. 내부 함수/설정명(startLevel4Vanish가 CFG.LEVEL4_*를
  // 계속 읽는 등)은 안 건드리고 이 디스패치 자리만 바꾼다 — LEVEL1↔8 교체 때와 같은 방식.
  LEVEL_EFFECTS[4] = { start: startLevel8Silhouette, stop: stopLevel8Silhouette };
  LEVEL_EFFECTS[5] = { start: startLevel5Rotation, stop: stopLevel5Rotation };
  LEVEL_EFFECTS[6] = { start: startLevel6Flicker, stop: stopLevel6Flicker };
  LEVEL_EFFECTS[7] = { start: startLevel7Slide, stop: stopLevel7Slide };
  LEVEL_EFFECTS[8] = { start: startLevel4Vanish, stop: null };
  LEVEL_EFFECTS[9] = { start: startLevel9Vanish, stop: stopLevel9Vanish };
  LEVEL_EFFECTS[10] = { start: startLevel10Chaos, stop: stopLevel10Chaos };

  window.Challenge = { state, openSelectScreen, closeSelectScreen, startLevel, getBestScore };
})();
