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
