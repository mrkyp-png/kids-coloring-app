(function () {
  'use strict';

  const WORK_SIZE = 640;           // 내부 작업 해상도(정사각형)
  const STROKE_COLOR = '#2b2b2b';
  const ALPHA_WALL_THRESHOLD = 20; // 이 값 이상 알파면 "선"으로 취급 (번짐 방지)
  const MIN_REGION_SIZE = 10;      // 이보다 작은 조각은 탭 불가능한 슬리버로 보고 채점 대상에서 제외
  const MAX_UNDO = 15;

  // 2026-08-10 색맹 시뮬레이션(OKLab ΔE) 기준으로 검증해서 교체 — 기존 팔레트는 보라↔파랑이
  // 정상 시력 기준으로도 구분 어려웠고(ΔE 9.5, 기준 15 미달), 핑크↔보라는 적록색맹 기준
  // 거의 동일(ΔE 2.9)했음. 이 순서는 인접한 색끼리 최악 쌍이 정상 시력 ΔE 19.6 / 색맹 ΔE 9.1로
  // 기준(정상 15 / 색맹 8)을 통과함 — 순서 자체가 안전장치라 임의로 섞지 말 것.
  // (11색 전부를 동시에 놓고 봤을 때 "모든 쌍"까지 완벽히 구분되게 하는 건 색 인지의 물리적
  // 한계로 불가능 — 4~5번째 색(주황↔노랑) 정도가 그나마 약한 지점, 그래도 지금보다는 나음.)
  const COLORS = [
    '#2a78d6', '#7F5539', '#eb6834', '#1baf7a',
    '#eda100', '#e87ba4', '#008300', '#4a3aa7',
    '#e34948', '#2E2E2E', '#F2C879'
  ];
  const WHITE_SUBSTITUTE = '#F2C879'; // 흰색은 배경(캔버스)과 구분이 안 돼서 크림색으로 대체

  // label은 i18n 도입(2026-08-11) 전 기본값(영어) — 실제 표시는 ratingLabel()이 I18N.t('rating.N')로 가져온다.
  const RATING_LEVELS = [
    { level: 1, emoji: '🌟', label: 'Perfect! Color Master!' },
    { level: 2, emoji: '😄', label: 'Great job!' },
    { level: 3, emoji: '🙂', label: 'Good job!' },
    { level: 4, emoji: '💪', label: 'Keep trying!' },
    { level: 5, emoji: '🌱', label: 'Try again!' }
  ];
  function ratingLabel(level) {
    return (window.I18N && I18N.t('rating.' + level)) || (RATING_LEVELS[level - 1] || {}).label || '';
  }

  const TOTAL_LEVELS = 10;
  const CLEARED_KEY = 'clearedTemplates';
  const SCORES_KEY = 'templateScores';

  // ---------- 난이도(타이머) 모드 — 레벨 하나(그 레벨의 10개 그림 전부)를 이 시간 안에 다 색칠해야 함 ----------
  // label은 i18n 도입(2026-08-11) 전 기본값(영어) — 실제 표시는 modeLabel()이 I18N.t('mode.'+key)로 가져온다.
  const MODES = {
    easy: { label: 'Easy', minutes: 20 },
    normal: { label: 'Normal', minutes: 15 },
    hard: { label: 'Hard', minutes: 10 },
    veryhard: { label: 'Very Hard', minutes: 5 }
  };
  function modeLabel(m) {
    return (window.I18N && I18N.t('mode.' + m)) || (MODES[m] || {}).label || m;
  }
  // 2026-08-11: 보스는 예전엔 그 모드의 레벨 타이머를 그대로 물려썼는데(쉬움 보스도 20분), 도안이
  // 훨씬 어려워진(약 50영역) 지금은 모드가 올라갈수록 더 빠듯하게 줄어드는 시간으로 통일했다
  // (요청: 보통 4분/어려움 3분/매우어려움 2분). easy는 그대로 5분 유지.
  const BOSS_MINUTES = { easy: 5, normal: 4, hard: 3, veryhard: 2 };
  function getBossBudgetSeconds(mode) {
    return (BOSS_MINUTES[mode] || 5) * 60;
  }
  const MODE_KEY = 'gameMode';
  const LEVEL_ATTEMPTS_KEY = 'levelAttempts'; // { [level]: 시작한 시각(ms) } — 타임어택 진행 중인 레벨
  const LEVEL_TIMES_KEY = 'levelClearTimes'; // { [mode]: { [level]: seconds } } — 모드별로 완전히 분리 저장(아래 참고)
  const PLAYER_KEY = 'playerProfile'; // {nickname, flag} — Start 버튼 직후 1회 입력, 이후 랭킹 등록 시 재사용

  // 2026-08-11: "랭킹은 경쟁심 유도가 목적이라 로컬만이면 의미없다"는 피드백으로 기기별 로컬
  // 랭킹(RANKING_KEY)을 없애고 전 세계 공용 랭킹으로 전환. 단, 실명/자유입력 국가 대신
  // 닉네임+국기 이모지만 공개로 올려서 개인정보 노출 없이 경쟁심만 살림(privacy.html 문구와
  // 계속 맞으려면 "실제 개인정보"는 여전히 어디에도 안 올라가야 함).
  // 백엔드: Firebase Realtime Database — 서버 코드 없이 REST(fetch)만으로 읽고 쓸 수 있어서
  // SDK/빌드 도구 없는 이 프로젝트 구조에 제일 가벼움. 아래 URL은 실제 프로젝트 만들고 나서
  // Firebase 콘솔의 Realtime Database URL로 바꿔 넣어야 동작한다(그 전까진 랭킹 기능이
  // "설정 전" 상태로 안내만 뜨고 조용히 비활성화됨).
  const FIREBASE_DB_URL = 'https://REPLACE-ME.firebaseio.com';
  function isRankingBackendConfigured() {
    return FIREBASE_DB_URL.indexOf('REPLACE-ME') === -1;
  }

  // 국가 자유입력 대신 고정 목록에서 국기만 고르게 해서(1) 입력 실수/욕설 삽입 여지를 줄이고
  // (2) 실제 거주지 특정으로 이어질 수 있는 자유 텍스트를 안 받는다.
  const FLAG_OPTIONS = [
    ['🇰🇷', 'Korea'], ['🇺🇸', 'USA'], ['🇯🇵', 'Japan'], ['🇨🇳', 'China'], ['🇬🇧', 'UK'],
    ['🇫🇷', 'France'], ['🇩🇪', 'Germany'], ['🇮🇳', 'India'], ['🇧🇷', 'Brazil'], ['🇨🇦', 'Canada'],
    ['🇦🇺', 'Australia'], ['🇪🇸', 'Spain'], ['🇮🇹', 'Italy'], ['🇲🇽', 'Mexico'], ['🇷🇺', 'Russia'],
    ['🇻🇳', 'Vietnam'], ['🇵🇭', 'Philippines'], ['🇮🇩', 'Indonesia'], ['🇹🇭', 'Thailand'], ['🇸🇬', 'Singapore'],
    ['🌍', 'Other']
  ];
  function populateFlagSelect(selectEl) {
    if (selectEl.options.length) return; // 이미 채워져 있으면 다시 안 함
    FLAG_OPTIONS.forEach(([flag, label]) => {
      const opt = document.createElement('option');
      opt.value = flag;
      opt.textContent = flag + ' ' + (window.I18N ? I18N.countryName(label) : label);
      selectEl.appendChild(opt);
    });
  }

  migrateLegacyProgress(); // 모드별 분리 저장 도입 전 기존 기록을 easy 모드로 1회 이관

  // ---------- 상태 ----------
  let currentTemplate = null;
  let currentLevel = null;
  let currentBossMode = null; // null이 아니면 지금 파이널 보스를 색칠 중(그 모드 값 'easy'|'normal'|'hard'|'veryhard')
  let selectedColor = COLORS[0];
  let undoStack = [];
  let soundOn = true;
  let levelTimerInterval = null;
  let audioCtx = null;

  // ---------- DOM ----------
  const loadingScreen = document.getElementById('loading-screen');
  const onboardingModal = document.getElementById('onboarding-modal');
  const onboardingGateStep = document.getElementById('onboarding-gate-step');
  const onboardingConsentStep = document.getElementById('onboarding-consent-step');
  const onboardingGateQuestion = document.getElementById('onboarding-gate-question');
  const onboardingGateChoices = document.getElementById('onboarding-gate-choices');
  const onboardingGateRetry = document.getElementById('onboarding-gate-retry');
  const onboardingConsentAgree = document.getElementById('onboarding-consent-agree');
  const coverScreen = document.getElementById('cover-screen');
  const coverBosses = document.getElementById('cover-bosses');
  const btnCoverStart = document.getElementById('btn-cover-start');
  const playerEntryModal = document.getElementById('player-entry-modal');
  const playerInputName = document.getElementById('player-input-name');
  const playerInputFlag = document.getElementById('player-input-flag');
  const playerEntrySubmit = document.getElementById('player-entry-submit');
  const playerEntrySkip = document.getElementById('player-entry-skip');
  const mapScreen = document.getElementById('map-screen');
  const mapGrid = document.getElementById('map-grid');
  const galleryScreen = document.getElementById('gallery-screen');
  const coloringScreen = document.getElementById('coloring-screen');
  const galleryGrid = document.getElementById('gallery-grid');
  const btnMapBack = document.getElementById('btn-map-back');
  const levelTitle = document.getElementById('level-title');
  const levelProgress = document.getElementById('level-progress');
  const levelNextBanner = document.getElementById('level-next-banner');
  const levelNextText = document.getElementById('level-next-text');
  const btnLevelNext = document.getElementById('btn-level-next');
  const btnLevelBack = document.getElementById('btn-level-back');
  const btnResetAll = document.getElementById('btn-reset-all');
  const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
  const coloringTimerText = document.getElementById('coloring-timer-text');
  const statLine = document.getElementById('stat-line');
  const coloringTitle = document.getElementById('coloring-title');
  const fillCanvas = document.getElementById('fill-canvas');
  const lineCanvas = document.getElementById('line-canvas');
  const maskCanvas = document.getElementById('mask-canvas');
  const goalCanvas = document.getElementById('goal-canvas');
  const goalEmoji = document.getElementById('goal-emoji');
  const goalCanvasWrap = document.getElementById('goal-canvas-wrap');
  const goalPanelEl = document.querySelector('.goal-panel');
  // 2026-08-11: "지렁이 위치를 남은 시간 비율로" 요청 — goal/캔버스 경계선을 기어가는 지렁이
  // (CSS ::after)의 좌우 위치를 실제 타이머 진행률(0=시작, 1=시간 종료)에 맞춰 옮긴다.
  function setWormProgress(p) {
    goalPanelEl.style.setProperty('--worm-progress', Math.max(0, Math.min(1, p)));
  }
  const goalZoomModal = document.getElementById('goal-zoom-modal');
  const goalZoomCanvas = document.getElementById('goal-zoom-canvas');
  const tapLayer = document.getElementById('tap-layer');
  const palette = document.getElementById('palette');
  const btnHome = document.getElementById('btn-home');
  const btnSound = document.getElementById('btn-sound');
  const btnMusic = document.getElementById('btn-music');
  const btnUndo = document.getElementById('btn-undo');
  const btnClear = document.getElementById('btn-clear');
  const btnSave = document.getElementById('btn-save');
  const praiseOverlay = document.getElementById('praise-overlay');
  const praiseEmoji = document.getElementById('praise-emoji');
  const praiseText = document.getElementById('praise-text');
  const praiseCount = document.getElementById('praise-count');

  const btnRanking = document.getElementById('btn-ranking');
  const rankingEntryModal = document.getElementById('ranking-entry-modal');
  const rankingEntryTime = document.getElementById('ranking-entry-time');
  const rankingInputName = document.getElementById('ranking-input-name');
  const rankingInputFlag = document.getElementById('ranking-input-flag');
  const rankingEntryLockedNote = document.getElementById('ranking-entry-locked-note');
  const rankingEntryStatus = document.getElementById('ranking-entry-status');
  const rankingEntrySubmit = document.getElementById('ranking-entry-submit');
  const rankingEntrySkip = document.getElementById('ranking-entry-skip');
  const rankingBoardModal = document.getElementById('ranking-board-modal');
  const rankingTabs = document.getElementById('ranking-tabs');
  const rankingList = document.getElementById('ranking-list');
  const rankingBoardClose = document.getElementById('ranking-board-close');

  const levelsLeftLine = document.getElementById('levels-left-line');
  const bossGrid = document.getElementById('boss-grid');
  const bossFanfareModal = document.getElementById('boss-fanfare-modal');
  const bossFanfareSub = document.getElementById('boss-fanfare-sub');
  const confettiLayer = document.getElementById('confetti-layer');
  const bossFanfareClose = document.getElementById('boss-fanfare-close');

  const fillCtx = fillCanvas.getContext('2d', { willReadFrequently: true });
  const lineCtx = lineCanvas.getContext('2d');
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const goalCtx = goalCanvas.getContext('2d');
  const goalZoomCtx = goalZoomCanvas.getContext('2d');

  [fillCanvas, lineCanvas, maskCanvas, goalCanvas, goalZoomCanvas].forEach((c) => {
    c.width = WORK_SIZE;
    c.height = WORK_SIZE;
  });

  // ================= goal 이미지 확대(2026-08-11) — 탭하면 같은 그림을 화면 꽉 차게 보여준다.
  // 내부 해상도가 이미 WORK_SIZE(640)라 그냥 더 크게 그리기만 해도 화질 손실이 없다. =================
  goalCanvasWrap.addEventListener('click', () => {
    goalZoomCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    goalZoomCtx.drawImage(goalCanvas, 0, 0);
    goalZoomModal.hidden = false;
  });
  goalZoomModal.addEventListener('click', () => {
    goalZoomModal.hidden = true;
  });

  let wallMask = null; // Uint8Array WORK_SIZE*WORK_SIZE, 1 = 벽(선), 0 = 칠할 수 있음
  let currentLabelMap = null; // Int32Array WORK_SIZE*WORK_SIZE, 픽셀 -> 영역 라벨(없으면 -1)
  let currentGradableRegions = []; // [{seed, size, label}] 채점 대상 영역(배경 제외)
  let currentGradableLabelSet = new Set(); // currentGradableRegions의 label만 모아둔 Set(탭 보정용 빠른 조회)
  let currentLabelToColor = null; // Map<label, hex> 영역별 정답색(컬러바이넘버)
  let currentSampledColors = null; // Map<label, hex> 이모지 원본에서 뽑은 실제 색(있으면 우선 사용)
  let lastScore = 0;

  // 목표 이미지용 고정 팔레트("안 칠함"과 헷갈리는 흰색 대체 베이지는 제외)
  const TARGET_PALETTE = COLORS.filter((c) => c !== WHITE_SUBSTITUTE);

  // ================= 진행 상황(시도/만점) =================
  // 점수/클리어 기록은 모드별로 완전히 분리 저장한다 — { [mode]: { ...기존 형태... } }.
  // (쉬움 모드에서 만점 찍은 도안이 보통/어려움 모드로 넘어가도 그대로 "클리어됨"으로 보이는 걸 막기 위함)
  function getAllScores() {
    try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveAllScores(all) {
    try { localStorage.setItem(SCORES_KEY, JSON.stringify(all)); } catch (e) { /* 저장 공간 부족 시 무시 */ }
  }
  function getAllCleared() {
    try { return JSON.parse(localStorage.getItem(CLEARED_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveAllCleared(all) {
    try { localStorage.setItem(CLEARED_KEY, JSON.stringify(all)); } catch (e) { /* 저장 공간 부족 시 무시 */ }
  }

  // 예전 버전은 templateScores/clearedTemplates가 모드 구분 없이 저장됐다 — 최초 실행 시
  // 그 기존 기록을 easy 모드 소유로 한 번만 옮겨준다(기존 유저 진행 상황 보존).
  function migrateLegacyProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || '{}');
      const keys = Object.keys(raw);
      const looksLegacy = keys.length > 0 && !keys.some((k) => k in MODES);
      if (looksLegacy) localStorage.setItem(SCORES_KEY, JSON.stringify({ easy: raw }));
    } catch (e) { /* 무시 */ }
    try {
      const raw = JSON.parse(localStorage.getItem(CLEARED_KEY) || '[]');
      if (Array.isArray(raw) && raw.length > 0) {
        localStorage.setItem(CLEARED_KEY, JSON.stringify({ easy: raw }));
      }
    } catch (e) { /* 무시 */ }
    // levelClearTimes도 예전엔 { [level]: {seconds, mode} } 하나로 모든 모드가 뒤섞여 저장됐다 —
    // 이 때문에 나중 모드에서 레벨 1~10을 다 깨면 그 항목들이 전부 그 모드로 덮어써져서,
    // 이미 깬 이전 모드 보스의 isBossUnlocked()가 갑자기 false로 뒤집혀 "클리어했는데 자물쇠가
    // 잠긴 것처럼" 보이는 버그가 있었다(2026-08-11 발견). { [mode]: { [level]: seconds } }로
    // 모드별 분리하고, 기존 기록은 각 항목에 남아있던 mode 값(없으면 easy로 간주)에 맞게 이관.
    try {
      const raw = JSON.parse(localStorage.getItem(LEVEL_TIMES_KEY) || '{}');
      const keys = Object.keys(raw);
      const looksLegacy = keys.length > 0 && !keys.some((k) => k in MODES);
      if (looksLegacy) {
        const byMode = {};
        keys.forEach((lv) => {
          const entry = raw[lv];
          const secs = typeof entry === 'number' ? entry : (entry && entry.seconds);
          const mode = (entry && typeof entry === 'object' && entry.mode) || 'easy';
          if (secs == null) return;
          if (!byMode[mode]) byMode[mode] = {};
          byMode[mode][lv] = secs;
        });
        localStorage.setItem(LEVEL_TIMES_KEY, JSON.stringify(byMode));
      }
    } catch (e) { /* 무시 */ }
  }

  // clearedTemplates: "한 번이라도 시도해서 저장한" 도안(만점 여부와 무관 — X 표시용)
  function getClearedSet(mode) {
    const all = getAllCleared();
    return new Set(all[mode || getMode()] || []);
  }

  function markCleared(tplId) {
    const mode = getMode();
    const all = getAllCleared();
    const set = new Set(all[mode] || []);
    set.add(tplId);
    all[mode] = Array.from(set);
    saveAllCleared(all);
  }

  function getTemplatesForLevel(level) {
    return COLORING_TEMPLATES.filter((t) => t.difficulty === level);
  }

  // 도안별 "가장 잘 한" 점수(재도전해도 낮은 점수로 안 떨어지게 최고점 유지) — 현재 모드 기준
  function getScores(mode) {
    const all = getAllScores();
    return all[mode || getMode()] || {};
  }

  function saveScoreIfBest(tplId, score) {
    const mode = getMode();
    const all = getAllScores();
    const scores = all[mode] || (all[mode] = {});
    if (!(tplId in scores) || score > scores[tplId]) {
      scores[tplId] = score;
      saveAllScores(all);
    }
  }

  // 만점(100점)을 받은 적이 있어야 "완료"로 인정 — 다음 레벨은 그 레벨 전부 만점이어야 열림
  function isMastered(tplId, scores) {
    const map = scores || getScores();
    return map[tplId] === 100;
  }

  function isLevelCleared(level, scores) {
    const map = scores || getScores();
    const list = getTemplatesForLevel(level);
    return list.length > 0 && list.every((t) => isMastered(t.id, map));
  }

  function isLevelUnlocked(level, scores) {
    if (level <= 1) return true;
    return isLevelCleared(level - 1, scores);
  }

  // 특정 레벨의 도안 점수/시도 기록만 지운다(그 레벨과 그 이후 레벨의 진행 상황이 초기화됨) — 현재 모드만.
  function resetLevelProgress(level) {
    const mode = getMode();
    const list = getTemplatesForLevel(level);
    const ids = new Set(list.map((t) => t.id));

    const allScores = getAllScores();
    const scores = allScores[mode] || {};
    ids.forEach((id) => { delete scores[id]; });
    allScores[mode] = scores;
    saveAllScores(allScores);

    const allCleared = getAllCleared();
    const cleared = new Set(allCleared[mode] || []);
    ids.forEach((id) => cleared.delete(id));
    allCleared[mode] = Array.from(cleared);
    saveAllCleared(allCleared);

    const allTimes = getAllLevelTimes();
    const times = allTimes[mode] || {};
    if (level in times) { delete times[level]; allTimes[mode] = times; saveAllLevelTimes(allTimes); }
  }

  // 그 모드의 진행 상황(점수/클리어/보스)만 지우고 그 모드를 처음부터 다시 시작할 수 있게 한다.
  // (다른 모드의 기록은 건드리지 않음 — 레벨별 리셋은 없애고 모드 단위로만 리셋 가능하게 통합함, 2026-08-10)
  function resetModeProgress(mode) {
    const allScores = getAllScores();
    delete allScores[mode];
    saveAllScores(allScores);

    const allCleared = getAllCleared();
    delete allCleared[mode];
    saveAllCleared(allCleared);

    const allTimes = getAllLevelTimes();
    delete allTimes[mode];
    saveAllLevelTimes(allTimes);

    clearBossAttempt(mode);
    const bc = getBossClearedMap();
    delete bc[mode];
    try { localStorage.setItem(BOSS_CLEARED_KEY, JSON.stringify(bc)); } catch (e) { /* 무시 */ }

    try { localStorage.removeItem(LEVEL_ATTEMPTS_KEY); } catch (e) { /* 무시 */ } // 진행 중이던 타임어택도 함께 정리
  }

  // 레벨 10개를 다 완료하는 데 걸린 시간(초) 기록 — 메인 화면 레벨 블록 아래에 표시한다.
  // 점수/클리어와 마찬가지로 모드별로 완전히 분리 저장(위 migrateLegacyProgress 참고).
  function getAllLevelTimes() {
    try { return JSON.parse(localStorage.getItem(LEVEL_TIMES_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveAllLevelTimes(all) {
    try { localStorage.setItem(LEVEL_TIMES_KEY, JSON.stringify(all)); } catch (e) { /* 무시 */ }
  }
  function getLevelTimes(mode) {
    const all = getAllLevelTimes();
    return all[mode || getMode()] || {};
  }

  function recordLevelClearTime(level, seconds) {
    const mode = getMode();
    const all = getAllLevelTimes();
    const times = all[mode] || (all[mode] = {});
    times[level] = Math.round(seconds);
    saveAllLevelTimes(all);
  }

  // 예전 버전은 levelClearTimes 값이 {seconds, mode} 객체였다 — 옛 기록(마이그레이션 누락 케이스)도
  // 안 깨지게 숫자/객체 둘 다 받아준다.
  function getLevelTimeSeconds(entry) {
    if (entry == null) return null;
    return typeof entry === 'number' ? entry : entry.seconds;
  }

  function formatClearTime(totalSeconds) {
    const sec = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ================= 랭킹(10레벨 전부, 같은 모드로 클리어한 완주 기록 — 전 세계 공용) =================
  // Firebase Realtime Database REST API를 fetch만으로 직접 호출(SDK 없음). 문서: 각 mode 아래에
  // 자동생성 키로 { nickname, flag, seconds, date } 하나씩 쌓임.
  function rankingUrl(mode, extra) {
    return FIREBASE_DB_URL + '/rankings/' + mode + '.json' + (extra || '');
  }

  function getPlayerProfile() {
    try { return JSON.parse(localStorage.getItem(PLAYER_KEY) || 'null'); } catch (e) { return null; }
  }

  function savePlayerProfile(profile) {
    try { localStorage.setItem(PLAYER_KEY, JSON.stringify(profile)); } catch (e) { /* 무시 */ }
  }

  // 방금 레벨 10을 클리어한 시점에 호출 — 1~10레벨이 전부 "같은 모드"로 클리어된 기록이 남아있으면
  // (중간에 모드를 바꿔가며 깬 경우는 제외) 완주로 인정하고 이름/나이/나라 입력 모달을 띄운다.
  function checkFullRunClear() {
    const mode = getMode();
    const times = getLevelTimes(mode);
    let total = 0;
    for (let lv = 1; lv <= TOTAL_LEVELS; lv++) {
      const secs = getLevelTimeSeconds(times[lv]);
      if (secs == null) return; // 하나라도 이 모드로 클리어한 기록이 없으면 완주로 안 침
      total += secs;
    }
    openRankingEntryModal(mode, total);
  }

  let pendingRunMode = null;
  let pendingRunSeconds = 0;

  function setRankingEntryStatus(text, kind) {
    rankingEntryStatus.textContent = text || '';
    rankingEntryStatus.hidden = !text;
    rankingEntryStatus.classList.toggle('is-error', kind === 'error');
    rankingEntryStatus.classList.toggle('is-ok', kind === 'ok');
  }

  function openRankingEntryModal(mode, totalSeconds) {
    pendingRunMode = mode;
    pendingRunSeconds = totalSeconds;
    rankingEntryTime.textContent = I18N.t('ranking.entryTime', { mode: modeLabel(mode), time: formatClearTime(totalSeconds) });
    setRankingEntryStatus('');
    const profile = getPlayerProfile() || {};
    populateFlagSelect(rankingInputFlag);
    // 2026-08-11: "한 번 등록한 닉네임/국가는 수정 불가" 요청 — 이미 정해진 닉네임이 있으면
    // (Start 화면에서 등록했거나, 예전에 여기서 등록했거나) 그 값을 그대로 잠가서 보여주고,
    // 아직 한 번도 정한 적 없으면(Start에서 Skip한 경우) 여기서 처음이자 마지막으로 정하게 한다.
    const alreadySet = !!(profile && profile.nickname);
    rankingInputName.value = alreadySet ? profile.nickname : '';
    rankingInputFlag.value = alreadySet ? (profile.flag || '🌍') : rankingInputFlag.options[0].value;
    rankingInputName.disabled = alreadySet;
    rankingInputFlag.disabled = alreadySet;
    rankingEntryLockedNote.hidden = !alreadySet;
    rankingEntryModal.hidden = false;
  }

  function closeRankingEntryModal() {
    rankingEntryModal.hidden = true;
  }

  rankingEntrySubmit.addEventListener('click', () => {
    if (!isRankingBackendConfigured()) {
      setRankingEntryStatus(I18N.t('ranking.setupNeeded'), 'error');
      return;
    }
    let profile = getPlayerProfile() || {};
    if (!profile.nickname) {
      // 여기서 처음 정하는 경우에만 저장 — 그 뒤로는 절대 다시 안 바뀐다.
      profile = {
        nickname: rankingInputName.value.trim() || I18N.t('anonymous'),
        flag: rankingInputFlag.value || '🌍'
      };
      savePlayerProfile(profile);
    }
    rankingEntrySubmit.disabled = true;
    setRankingEntryStatus(I18N.t('ranking.saving'));
    fetch(rankingUrl(pendingRunMode), {
      method: 'POST',
      body: JSON.stringify({
        nickname: profile.nickname,
        flag: profile.flag,
        seconds: Math.round(pendingRunSeconds),
        date: new Date().toISOString()
      })
    })
      .then((res) => { if (!res.ok) throw new Error('bad status'); })
      .then(() => {
        closeRankingEntryModal();
        openRankingBoard(pendingRunMode);
      })
      .catch(() => {
        setRankingEntryStatus(I18N.t('ranking.saveError'), 'error');
      })
      .finally(() => { rankingEntrySubmit.disabled = false; });
  });

  rankingEntrySkip.addEventListener('click', closeRankingEntryModal);

  const MODE_ORDER = ['easy', 'normal', 'hard', 'veryhard'];
  let currentRankingTab = 'easy';

  function openRankingBoard(mode) {
    currentRankingTab = mode && MODES[mode] ? mode : getMode();
    rankingTabs.innerHTML = '';
    MODE_ORDER.forEach((m) => {
      const tab = document.createElement('button');
      tab.className = 'ranking-tab';
      tab.textContent = modeLabel(m);
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => renderRankingTab(m));
      tab.dataset.mode = m;
      rankingTabs.appendChild(tab);
    });
    renderRankingTab(currentRankingTab);
    rankingBoardModal.hidden = false;
  }

  // 2026-08-11: 로컬 저장 대신 Firebase Realtime Database에서 그 모드의 상위 기록을 가져온다.
  // 탭을 빠르게 여러 번 누르면 먼저 보낸 요청이 나중에 도착해서 엉뚱한 탭에 그려질 수 있어
  // (네트워크 응답 순서는 요청 순서와 다를 수 있음) currentRankingTab과 비교해서 이미 다른 탭으로
  // 넘어갔으면 그 응답은 버린다.
  function renderRankingTab(mode) {
    currentRankingTab = mode;
    Array.from(rankingTabs.children).forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    if (!isRankingBackendConfigured()) {
      rankingList.innerHTML = '<p class="ranking-empty">' + escapeHtml(I18N.t('ranking.notSetup')) + '</p>';
      return;
    }
    rankingList.innerHTML = '<p class="ranking-empty">' + escapeHtml(I18N.t('ranking.loading')) + '</p>';
    fetch(rankingUrl(mode, '?orderBy="seconds"&limitToFirst=20'))
      .then((res) => { if (!res.ok) throw new Error('bad status'); return res.json(); })
      .then((data) => {
        if (currentRankingTab !== mode) return;
        const entries = data ? Object.values(data) : [];
        entries.sort((a, b) => a.seconds - b.seconds);
        rankingList.innerHTML = '';
        if (!entries.length) {
          rankingList.innerHTML = '<p class="ranking-empty">' + escapeHtml(I18N.t('ranking.emptyMode')) + '</p>';
          return;
        }
        entries.forEach((e, i) => {
          const row = document.createElement('div');
          row.className = 'ranking-row';
          row.innerHTML =
            '<span class="r-rank">' + (i + 1) + '</span>' +
            '<span class="r-info"><span class="r-name">' + (e.flag || '') + ' ' + escapeHtml(e.nickname || I18N.t('anonymous')) + '</span></span>' +
            '<span class="r-time">⏱ ' + formatClearTime(e.seconds) + '</span>';
          rankingList.appendChild(row);
        });
      })
      .catch(() => {
        if (currentRankingTab !== mode) return;
        rankingList.innerHTML = '<p class="ranking-empty">' + escapeHtml(I18N.t('ranking.loadError')) + '</p>';
      });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  btnRanking.addEventListener('click', () => openRankingBoard(getMode()));
  rankingBoardClose.addEventListener('click', () => { rankingBoardModal.hidden = true; });

  // ================= 난이도(타이머) 모드 =================
  // 모드별 진행 순서 — 이전 모드의 파이널 보스를 이겨야 다음 모드가 열린다(easy는 항상 열려 있음).
  function isModeUnlocked(mode) {
    const idx = MODE_ORDER.indexOf(mode);
    if (idx <= 0) return true;
    return isBossCleared(MODE_ORDER[idx - 1]);
  }

  function getMode() {
    const m = localStorage.getItem(MODE_KEY);
    const stored = MODES[m] ? m : 'easy';
    // 예전에 골라둔 모드가 그 사이 다시 잠긴 상태로 판정되면(비정상 데이터 등) easy로 안전하게 되돌린다.
    return isModeUnlocked(stored) ? stored : 'easy';
  }

  // 진행 중(시작했지만 아직 클리어도, 시간초과도 안 된)인 레벨/보스가 하나라도 있는지 —
  // 있으면 모드를 못 바꾸게 잠근다(모드를 바꾸면 그 레벨의 남은 시간이 바뀌어버리는 걸 방지).
  // 보스는 지금 선택된 모드가 아니라도(예: easy 보스에 도전 중인데 normal이 선택돼 있는 경우) 걸려야 하므로
  // 모드 하나만 보지 않고 전체 모드를 다 확인한다.
  function hasAnyActiveAttempt() {
    const attempts = getLevelAttempts();
    const budget = getLevelBudgetSeconds();
    const levelActive = Object.keys(attempts).some((lvl) => {
      const start = attempts[lvl];
      return start && (Date.now() - start) / 1000 < budget && !isLevelCleared(Number(lvl));
    });
    if (levelActive) return true;
    return MODE_ORDER.some((m) => hasActiveBossAttempt(m));
  }

  function setMode(m) {
    if (!MODES[m] || m === getMode()) return;
    if (!isModeUnlocked(m)) {
      const prevMode = MODE_ORDER[MODE_ORDER.indexOf(m) - 1];
      window.alert(I18N.t('alert.modeLocked', { mode: prevMode ? modeLabel(prevMode) : '' }));
      return;
    }
    if (hasAnyActiveAttempt()) {
      window.alert(I18N.t('alert.modeInProgress'));
      return;
    }
    try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* 무시 */ }
    renderMap(); // 모드가 바뀌면 레벨 진행 상황(점수/잠금)도 그 모드 것으로 다시 그려야 함
    updateLevelTimerDisplay();
  }

  function renderModeButtons() {
    const cur = getMode();
    const activeAttemptLocked = hasAnyActiveAttempt();
    modeButtons.forEach((btn) => {
      const mode = btn.dataset.mode;
      const isActive = mode === cur;
      const bossLocked = !isModeUnlocked(mode);
      btn.classList.toggle('active', isActive);
      btn.disabled = bossLocked || (activeAttemptLocked && !isActive);
      btn.classList.toggle('mode-locked', !bossLocked && activeAttemptLocked && !isActive);
      btn.classList.toggle('mode-boss-locked', bossLocked);
    });
  }

  function getLevelBudgetSeconds() {
    return MODES[getMode()].minutes * 60;
  }

  function getLevelAttempts() {
    try { return JSON.parse(localStorage.getItem(LEVEL_ATTEMPTS_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveLevelAttempts(obj) {
    try { localStorage.setItem(LEVEL_ATTEMPTS_KEY, JSON.stringify(obj)); } catch (e) { /* 무시 */ }
  }

  function clearLevelAttempt(level) {
    const attempts = getLevelAttempts();
    if (level in attempts) {
      delete attempts[level];
      saveLevelAttempts(attempts);
    }
  }

  // 레벨에 들어갈 때 호출 — 이미 진행 중(만료 전)인 타임어택이 있으면 이어서, 없거나 만료됐으면 새로 시작
  // (그 레벨이 이미 만점 클리어된 경우는 타이머가 필요 없으므로 호출하지 않는다).
  function startOrResumeLevelAttempt(level) {
    const attempts = getLevelAttempts();
    const budget = getLevelBudgetSeconds();
    const start = attempts[level];
    if (start && (Date.now() - start) / 1000 < budget) return; // 아직 유효 — 그대로 이어감
    if (start) resetLevelProgress(level); // 만료된 이전 시도가 남아있었다면 그 레벨 점수를 초기화
    attempts[level] = Date.now();
    saveLevelAttempts(attempts);
  }

  // ================= 파이널 보스(모드별 10레벨 완주 보상) =================
  const BOSS_ATTEMPTS_KEY = 'bossAttempts'; // { [mode]: 시작한 시각(ms) }
  const BOSS_CLEARED_KEY = 'bossCleared'; // { [mode]: true } — 그 모드 보스를 100점으로 이긴 적 있음

  function getBossTemplate(mode) {
    return (window.BOSS_TEMPLATES || {})[mode] || null;
  }

  // 그 모드로 레벨 1~10이 전부(모드 안 섞고) 클리어돼 있어야 보스가 열린다 — checkFullRunClear와 같은 조건.
  function isBossUnlocked(mode) {
    const times = getLevelTimes(mode);
    for (let lv = 1; lv <= TOTAL_LEVELS; lv++) {
      if (getLevelTimeSeconds(times[lv]) == null) return false;
    }
    return true;
  }

  function getBossAttempts() {
    try { return JSON.parse(localStorage.getItem(BOSS_ATTEMPTS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveBossAttempts(obj) {
    try { localStorage.setItem(BOSS_ATTEMPTS_KEY, JSON.stringify(obj)); } catch (e) { /* 무시 */ }
  }
  function clearBossAttempt(mode) {
    const attempts = getBossAttempts();
    if (mode in attempts) { delete attempts[mode]; saveBossAttempts(attempts); }
  }
  function getBossClearedMap() {
    try { return JSON.parse(localStorage.getItem(BOSS_CLEARED_KEY) || '{}'); } catch (e) { return {}; }
  }
  function isBossCleared(mode) {
    return !!getBossClearedMap()[mode];
  }
  function markBossCleared(mode) {
    const map = getBossClearedMap();
    map[mode] = true;
    try { localStorage.setItem(BOSS_CLEARED_KEY, JSON.stringify(map)); } catch (e) { /* 무시 */ }
  }
  // 레벨과 동일한 규칙: 시간 초과 시 그 보스의 점수만 초기화(완주 기록 자체는 안 건드림 — 다시 도전 가능).
  function resetBossProgress(mode) {
    const tpl = getBossTemplate(mode);
    if (!tpl) return;
    const allScores = getAllScores();
    const scores = allScores[mode] || {};
    delete scores[tpl.id];
    allScores[mode] = scores;
    saveAllScores(allScores);

    const allCleared = getAllCleared();
    const cleared = new Set(allCleared[mode] || []);
    cleared.delete(tpl.id);
    allCleared[mode] = Array.from(cleared);
    saveAllCleared(allCleared);

    const bc = getBossClearedMap();
    delete bc[mode];
    try { localStorage.setItem(BOSS_CLEARED_KEY, JSON.stringify(bc)); } catch (e) { /* 무시 */ }
  }
  function startOrResumeBossAttempt(mode) {
    const attempts = getBossAttempts();
    const budget = getBossBudgetSeconds(mode);
    const start = attempts[mode];
    if (start && (Date.now() - start) / 1000 < budget) return; // 아직 유효
    if (start) resetBossProgress(mode); // 만료된 이전 시도 — 점수 초기화
    attempts[mode] = Date.now();
    saveBossAttempts(attempts);
  }
  function hasActiveBossAttempt(mode) {
    const attempts = getBossAttempts();
    const start = attempts[mode];
    return !!(start && (Date.now() - start) / 1000 < getBossBudgetSeconds(mode) && !isBossCleared(mode));
  }

  function formatMMSS(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function stopLevelTimer() {
    if (levelTimerInterval) { clearInterval(levelTimerInterval); levelTimerInterval = null; }
    coloringTimerText.hidden = true;
  }

  function startLevelTimer() {
    stopLevelTimer();
    levelTimerInterval = setInterval(updateLevelTimerDisplay, 1000);
    updateLevelTimerDisplay();
  }

  // 시간 초과 처리: 그 레벨 점수 초기화 + 안내 + 갤러리로
  function handleLevelTimeUp(level) {
    stopLevelTimer();
    clearLevelAttempt(level);
    resetLevelProgress(level);
    window.alert(I18N.t('alert.levelTimeout', { level: level }));
    if (currentLevel === level) {
      // 색칠 화면에 있었더라도 갤러리로 돌려보낸다
      coloringScreen.hidden = true;
      galleryScreen.hidden = false;
      renderLevelGallery();
    }
  }

  // 시간 초과 처리(보스): 그 보스 점수 초기화 + 안내 + 맵으로 (완주 기록 자체는 안 지워지므로 다시 도전 가능)
  function handleBossTimeUp(mode) {
    stopLevelTimer();
    clearBossAttempt(mode);
    resetBossProgress(mode);
    const tpl = getBossTemplate(mode);
    window.alert(I18N.t('alert.bossTimeout', { name: tpl ? I18N.templateName(tpl) : I18N.t('boss.fallback') }));
    if (currentBossMode === mode) {
      currentBossMode = null;
      setBgmTrack(MUSIC_SRC);
      coloringScreen.hidden = true;
      mapScreen.hidden = false;
      renderMap();
    }
  }

  // 카운트다운 표시 위치: 갤러리(그림 목록) 화면에서는 Back/Next 버튼 사이(가운데)에,
  // 색칠 화면에서는 제목 밑 서브타이틀 자리(홈/사운드 아이콘과 안 겹침)에 보여준다.
  function updateLevelTimerDisplay() {
    coloringTimerText.hidden = true;
    setWormProgress(0);
    if (currentBossMode) {
      const mode = currentBossMode;
      if (isBossCleared(mode)) return;
      const attempts = getBossAttempts();
      const start = attempts[mode];
      if (!start) return;
      const budget = getBossBudgetSeconds(mode);
      const remaining = budget - (Date.now() - start) / 1000;
      if (remaining <= 0) { handleBossTimeUp(mode); return; }
      setWormProgress(1 - remaining / budget);
      coloringTimerText.hidden = false;
      coloringTimerText.textContent = '⏱ ' + formatMMSS(remaining);
      coloringTimerText.classList.toggle('warn', remaining <= 30);
      return;
    }
    if (currentLevel == null) return;
    if (isLevelCleared(currentLevel)) return;
    const attempts = getLevelAttempts();
    const start = attempts[currentLevel];
    if (!start) return;
    const budget = getLevelBudgetSeconds();
    const remaining = budget - (Date.now() - start) / 1000;
    if (remaining <= 0) {
      handleLevelTimeUp(currentLevel);
      return;
    }
    setWormProgress(1 - remaining / budget);
    const text = '⏱ ' + formatMMSS(remaining);
    const warn = remaining <= 30;
    if (!galleryScreen.hidden) {
      levelNextBanner.hidden = false;
      levelNextText.textContent = text;
      levelNextText.classList.toggle('timer-warn', warn);
    } else {
      coloringTimerText.hidden = false;
      coloringTimerText.textContent = text;
      coloringTimerText.classList.toggle('warn', warn);
    }
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('coloringHistory') || '[]');
    } catch (e) {
      return [];
    }
  }

  function updateStatLine() {
    const cleared = getClearedSet();
    const total = COLORING_TEMPLATES.length;
    let doneCount = 0;
    COLORING_TEMPLATES.forEach((t) => { if (cleared.has(t.id)) doneCount++; });
    if (doneCount > 0) {
      statLine.hidden = false;
      statLine.textContent = I18N.t('stat.finished', { done: doneCount, total: total });
    } else {
      statLine.hidden = true;
    }
    // 이 모드로 뭔가 한 번이라도 진행한 게 있을 때만 "이 모드 초기화" 버튼을 보여준다.
    // 2026-08-11: "reset easy progress => 모드 리셋으로 변경" 요청 — 모드 이름을 매번 붙이던
    // 긴 문구 대신 짧게 "Reset Mode"로 통일(어떤 모드든 지금 선택된 모드를 리셋한다는 의미는
    // Ranking 바로 밑 위치+ 모드 선택 버튼과의 맥락으로 충분히 전달됨).
    btnResetAll.hidden = doneCount === 0;
    btnResetAll.textContent = I18N.t('resetMode.btn');

    // 2026-08-11: "🚀 N more levels to go!" 문구 삭제 요청 — levelsLeftLine 자체는 index.html에
    // 남아있지만 항상 숨김 처리만 한다(엘리먼트를 지우는 것보다 안전).
    levelsLeftLine.hidden = true;
  }

  // ================= 도안 카드 렌더 =================
  function buildSvgMarkup(tpl) {
    return (
      '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="none" stroke="' + STROKE_COLOR + '" stroke-width="9" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + tpl.svg + '</g></svg>'
    );
  }

  // ================= 레벨 지도(맵) =================
  function renderMap() {
    const scores = getScores();
    const times = getLevelTimes();
    mapGrid.innerHTML = '';
    for (let lv = 1; lv <= TOTAL_LEVELS; lv++) {
      const list = getTemplatesForLevel(lv);
      const doneCount = list.filter((t) => isMastered(t.id, scores)).length;
      const isClear = isLevelCleared(lv, scores);
      const unlocked = isLevelUnlocked(lv, scores);

      const wrap = document.createElement('div');
      wrap.className = 'level-node-wrap';

      const node = document.createElement('button');
      node.className = 'level-node' + (unlocked ? '' : ' locked') + (isClear ? ' cleared' : '');
      node.setAttribute('role', 'listitem');
      node.disabled = !unlocked;
      node.setAttribute('aria-label', 'Level ' + lv + (isClear ? ' (cleared)' : unlocked ? '' : ' (locked)'));

      // 2026-08-11: "레벨 박스안에 이모지 넣어도 좋아" 요청 — 그 레벨 첫 도안의 이모지를 코너에
      // 살짝 얹어서 숫자만 있던 밋밋한 카드에 그 레벨에 뭐가 들었는지 살짝 예고해준다(잠긴
      // 레벨도 동일하게 보여줘서 궁금증 유발 — 미리보기일 뿐 실제 색은 안 보여줌).
      const previewEmoji = list.length ? list[0].emoji : '';
      let inner = '<span class="lv-preview-emoji">' + previewEmoji + '</span>' +
        '<span class="lv-num">' + lv + '</span><span class="lv-label">' + escapeHtml(I18N.t('level.label')) + '</span>';
      if (!unlocked) {
        inner += '<span class="lv-lock">🔒</span>';
      } else if (isClear) {
        inner += '<span class="lv-clear-badge">✓ ' + escapeHtml(I18N.t('level.clearBadge')) + '</span><span class="lv-progress">' + doneCount + ' / ' + list.length + '</span>';
      } else {
        inner += '<span class="lv-progress">' + doneCount + ' / ' + list.length + '</span>';
      }
      node.innerHTML = inner;

      if (unlocked) node.addEventListener('click', () => openLevel(lv));
      wrap.appendChild(node);

      // 완료(클리어)까지 걸린 시간 — 카드 바로 아래에 별도로 표시
      const lvSeconds = getLevelTimeSeconds(times[lv]);
      if (isClear && lvSeconds != null) {
        const timeEl = document.createElement('div');
        timeEl.className = 'lv-time';
        timeEl.textContent = '⏱ ' + formatClearTime(lvSeconds);
        wrap.appendChild(timeEl);
      }

      mapGrid.appendChild(wrap);
    }
    updateStatLine();
    renderModeButtons();
    renderBossSection();
  }

  // ================= 파이널 보스 카드(모드별) =================
  function renderBossSection() {
    bossGrid.innerHTML = '';
    MODE_ORDER.forEach((mode) => {
      const tpl = getBossTemplate(mode);
      if (!tpl) return;
      const unlocked = isBossUnlocked(mode);
      const cleared = isBossCleared(mode);
      // cleared(실제로 한 번이라도 깬 기록)가 있으면 unlocked 재계산 결과와 무관하게 항상
      // 열린 자물쇠로 보여준다 — isBossUnlocked()는 레벨 10개의 시간기록에 의존하는 별도 체크라
      // 다른 이유로 그 기록이 흔들려도 "이미 깬 보스"가 다시 잠긴 것처럼 보이면 안 됨
      // (2026-08-11, 보스 클리어 직후에도 🔒로 보이는 버그 리포트로 우선순위 변경).
      const showAsOpen = cleared || unlocked;
      const card = document.createElement('button');
      card.className = 'boss-card' + (showAsOpen ? '' : ' locked') + (cleared ? ' boss-cleared' : '');
      card.setAttribute('role', 'listitem');
      card.disabled = !showAsOpen;
      const bossName = I18N.templateName(tpl);
      card.setAttribute('aria-label', bossName + (showAsOpen ? (cleared ? ' (defeated)' : '') : ' (locked)'));

      let inner = '<span class="boss-mode-label">' + escapeHtml(modeLabel(mode)) + '</span>';
      if (!showAsOpen) {
        inner += '<span class="boss-lock">🔒</span><span class="boss-name">' + escapeHtml(bossName) + '</span>';
      } else if (cleared) {
        // 이 보스를 깨면 실제로 다음 모드 잠금이 풀리므로, 그 의미를 그대로 열린 자물쇠로 보여줌
        // (2026-08-11, "노란색→분홍색, 자물쇠는 열린 이미지로" 요청).
        inner += '<span class="boss-crown">🔓</span><span class="boss-name">' + escapeHtml(bossName) + '</span>' +
          '<span class="boss-cleared-badge">✓ ' + escapeHtml(I18N.t('boss.defeatedBadge')) + '</span>';
      } else {
        inner += '<span class="boss-crown pulse">👑</span><span class="boss-name">' + escapeHtml(bossName) + '</span>' +
          '<span class="boss-cta">' + escapeHtml(I18N.t('boss.tapToChallenge')) + '</span>';
      }
      card.innerHTML = inner;
      if (showAsOpen) card.addEventListener('click', () => openBoss(mode));
      bossGrid.appendChild(card);
    });
  }

  function openBoss(mode) {
    const tpl = getBossTemplate(mode);
    // isBossUnlocked()뿐 아니라 이미 깬 기록(isBossCleared)도 인정 — 위 renderBossSection의
    // showAsOpen과 같은 이유(클리어 기록이 있으면 다른 체크와 무관하게 항상 재도전 가능해야 함).
    if (!tpl || !(isBossUnlocked(mode) || isBossCleared(mode))) return;
    currentLevel = null;
    mapScreen.hidden = true;
    galleryScreen.hidden = true;
    openTemplate(tpl);
  }

  function goToMap() {
    stopLevelTimer();
    coloringScreen.hidden = true;
    galleryScreen.hidden = true;
    mapScreen.hidden = false;
    renderMap();
  }

  btnMapBack.addEventListener('click', goToMap);

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  renderModeButtons();

  btnResetAll.addEventListener('click', () => {
    const mode = getMode();
    if (!window.confirm(I18N.t('confirm.resetMode', { mode: modeLabel(mode) }))) return;
    resetModeProgress(mode);
    renderMap();
  });

  btnLevelNext.addEventListener('click', () => {
    speakPraise('Next!');
    const nextLevel = currentLevel + 1;
    if (nextLevel <= TOTAL_LEVELS && isLevelUnlocked(nextLevel)) {
      openLevel(nextLevel);
    } else {
      goToMap();
    }
  });

  btnLevelBack.addEventListener('click', () => {
    speakPraise('Back!');
    if (currentLevel > 1) openLevel(currentLevel - 1);
  });

  // ================= 레벨별 도안 갤러리 =================
  function openLevel(level) {
    currentBossMode = null;
    currentLevel = level;
    if (isLevelCleared(level)) clearLevelAttempt(level); // 이미 클리어된 레벨은 타이머 불필요
    // 주의: 그림 목록만 구경하는 걸로는 시간이 소모되면 안 되므로, 여기서는 타임어택을 시작하지
    // 않는다 — 실제로 그림 하나를 열 때(openTemplate)가 되어서야 처음 시작한다.
    renderLevelGallery();
    mapScreen.hidden = true;
    galleryScreen.hidden = false;
    startLevelTimer();
  }

  function renderLevelGallery() {
    // 2026-08-11: "시간초과 확인 눌러도 체크표시 남음" 재현/원인 확인 — 아래에서 scores를 미리
    // 캡처해두는데, 그 뒤 이 함수 안에서 updateLevelTimerDisplay()가 시간초과를 감지하면 점수를
    // 리셋하고 이 함수를 재귀 호출해 일단 올바르게(체크표시 없이) 그리지만, 재귀 호출이 끝나고
    // 돌아온 "바깥쪽" 호출이 리셋 전에 캡처해둔 옛 scores로 카드 목록을 다시 덮어써버리는 순서
    // 문제였음(실제 localStorage 데이터 자체는 정상적으로 지워지고 있어서 새로고침하면 맞게
    // 나왔던 것). scores를 읽기 전에 먼저 한 번 호출해서, 리셋이 있다면 여기서 먼저 끝낸다.
    updateLevelTimerDisplay();
    const scores = getScores();
    const list = getTemplatesForLevel(currentLevel);
    const doneCount = list.filter((t) => isMastered(t.id, scores)).length;

    levelTitle.textContent = I18N.t('level.title', { n: currentLevel });
    levelProgress.textContent = I18N.t('level.progress', { done: doneCount, total: list.length });

    const isClear = doneCount >= list.length;
    const hasBack = currentLevel > 1;
    btnLevelBack.hidden = !hasBack;
    if (isClear) {
      // 아직 지우기 전, 진행 중이던 타임어택이 있었으면 그 시작 시각 기준으로 걸린 시간을 기록해둔다
      // (완전히 클리어할 때까지 걸린 시간 — 메인 화면 레벨 블록 아래에 표시됨).
      const attemptStart = getLevelAttempts()[currentLevel];
      if (attemptStart) recordLevelClearTime(currentLevel, (Date.now() - attemptStart) / 1000);
      clearLevelAttempt(currentLevel); // 클리어했으니 이 레벨의 타임어택은 끝 — 더 이상 시간 잴 필요 없음
      if (currentLevel === TOTAL_LEVELS) checkFullRunClear(); // 마지막 레벨까지 깼으면 완주 기록 확인
      const hasNext = currentLevel < TOTAL_LEVELS;
      levelNextText.textContent = hasNext ? I18N.t('level.clear', { n: currentLevel }) : I18N.t('level.allClear');
      btnLevelNext.textContent = hasNext ? I18N.t('level.next') : I18N.t('level.map');
      btnLevelNext.hidden = false;
    } else {
      levelNextText.textContent = '';
      btnLevelNext.hidden = true;
    }
    const hasTimer = !isClear && currentLevel in getLevelAttempts();
    levelNextBanner.hidden = !(isClear || hasBack || hasTimer);
    updateLevelTimerDisplay();

    galleryGrid.innerHTML = '';
    list.forEach((tpl) => {
      const card = document.createElement('button');
      card.className = 'tpl-card';
      card.setAttribute('role', 'listitem');
      const displayName = I18N.templateName(tpl);
      card.setAttribute('aria-label', 'Color the ' + displayName);
      const score = scores[tpl.id];
      const attempted = score !== undefined;
      const mastered = score === 100;
      let badge = '';
      if (attempted) {
        badge = mastered
          ? '<span class="tpl-done-badge tpl-badge-good">✓</span>'
          : '<span class="tpl-done-badge tpl-badge-bad">✗</span>';
      }
      card.innerHTML =
        '<span class="tpl-emoji">' + tpl.emoji + '</span>' +
        '<span class="tpl-label">' + escapeHtml(displayName) + '</span>' +
        badge;
      card.addEventListener('click', () => openTemplate(tpl));
      galleryGrid.appendChild(card);
    });
  }

  // ================= 색칠 화면 진입 =================
  function openTemplate(tpl, onReady, opts) {
    opts = opts || {};
    // 이전 그림의 "축하 후 자동으로 홈으로" 타이머가 아직 안 끝났는데 다음 그림을 벌써 열었다면
    // 그 타이머는 이제 의미가 없다 — 안 지우면 몇 초 뒤 엉뚱한 시점에 goHome()이 몰래 또 불려서
    // (지금 보고 있는 그림이 보스든 뭐든) 상태를 헝클어뜨림. praiseOverlay 클릭/showPraise 재호출
    // 경로 말고도 놓친 경로가 있을까봐 여기서도 한 번 더 방어.
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    currentTemplate = tpl;
    // 실제로 그림을 열어서 색칠을 시작하는 이 순간에 그 레벨(또는 보스)의 타임어택을 시작(또는 이어감).
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
    // 2026-08-11: "한 캐릭터 색칠 후 다음 물체 색칠 전에 이전 그림이 보인다" 제보 — loadTemplateSource가
    // 이미지 로딩 때문에 비동기라서, 콜백이 오기 전까지는 아래 캔버스들이 방금 전 그림 내용을 그대로
    // 들고 있어서 화면 전환 직후 잠깐 이전 캐릭터가 그대로 보였음. 화면 전환하는 이 시점에 바로
    // 지워서 새 도안이 실제로 로드될 때까지는 빈 화면으로 보이게 한다.
    lineCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    fillCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    goalCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);

    loadTemplateSource(tpl, (wall, lineSource, sampledColors) => {
      // 선(윤곽선) 레이어
      lineCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
      lineCtx.drawImage(lineSource, 0, 0, WORK_SIZE, WORK_SIZE);

      wallMask = wall;
      currentSampledColors = sampledColors;

      // 채점 대상 영역(선으로 닫힌 칸) 자동 인식 — 가장 큰 영역(배경)은 채점에서 제외
      currentGradableRegions = computeGradableRegions();
      currentGradableLabelSet = new Set(currentGradableRegions.map((r) => r.label));

      // 목표(정답) 이미지 렌더링 + 영역별 정답색 배정
      renderGoalPreview(lineSource);

      // 정답색이 정해진 뒤에 팔레트 구성(그 도안에 실제 필요한 색이 반드시 포함되게)
      renderPalette();

      // 채우기 레이어 초기화
      fillCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
      undoStack = [];
      pushUndo();
      updateUndoButton();

      if (onReady) onReady();
    });
  }

  // 도안 소스 로딩: 기존 손그림 SVG(tpl.svg) 또는 이모지 글자(tpl.renderMode==='emoji')
  // callback(wallMask: Uint8Array, lineSource: <img|canvas> 검은 선만 있는 레이어)
  const EMOJI_DARK_THRESHOLD = 70; // 이보다 어두운(RGB 최대값 기준) 픽셀만 "선(벽)"으로 취급

  function loadTemplateSource(tpl, callback) {
    if (tpl.renderMode === 'emoji' || tpl.renderMode === 'svgArt') {
      // 'svgArt'(파이널 보스 등 손으로 그린 오리지널 일러스트)는 tpl.svgArt 마크업을 그대로 그린다.
      // 'emoji'는 기기 시스템 폰트로 이모지 글자를 그리던 예전 방식 대신, 미리 내려받아 둔 Twemoji
      // SVG 파일(assets/emoji/<id>.svg)을 직접 불러온다 — 시스템 폰트에 맡기면 기기마다(Windows
      // Segoe UI Emoji vs 안드로이드 Noto/제조사 이모지) 그림 모양이 달라져서 선/색칠영역 자동 인식
      // 결과가 기기별로 어긋나는 문제가 있었다(2026-08-09 발견). Twemoji 파일을 앱에 내장해두면
      // 어떤 기기에서 열어도 항상 동일한 소스 이미지로 렌더링된다.
      const img = new Image();
      img.onerror = (e) => {
        // 예전엔 이미지 로딩이 실패하면 콜백이 영영 안 불려서 화면이 그냥 멈춘 것처럼 보였다
        // (2026-08-09, 로컬 미리보기에서 원인 불명으로 화면 전환이 안 되던 문제 조사 중 발견).
        console.error('[loadTemplateSource] 도안 이미지 로딩 실패:', tpl.id, img.src, e);
        alert(I18N.t('alert.loadFail', { id: tpl.id }));
      };
      img.onload = () => {
        const rawC = document.createElement('canvas');
        rawC.width = WORK_SIZE; rawC.height = WORK_SIZE;
        const rawCtx = rawC.getContext('2d', { willReadFrequently: true });
        rawCtx.drawImage(img, 0, 0, WORK_SIZE, WORK_SIZE);
        const data = rawCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
        const W = WORK_SIZE, H = WORK_SIZE;

        // 1단계: 원래 검은 선(어두운 픽셀) + 색상 경계(옆/아래 픽셀과 색이 크게 다른 곳)를 벽 후보로 표시
        const rawWall = new Uint8Array(W * H);
        const EDGE_THRESHOLD = 35; // RGB 유클리드 거리 기준
        // tpl.simplifyRects: 미세한 명암 차이가 여러 개 겹쳐 있어(마법구슬 반짝임, 박쥐 몸통 음영 등)
        // 색상-경계 비교만으로는 그 작은 도형 전체가 벽으로 뒤덮여 색칠할 공간이 안 남는 부위를 지정.
        // 이 구역 안에서는 색상 경계 비교를 건너뛰어 내부를 하나의 칠할 수 있는 영역으로 남긴다
        // (실루엣 바깥 테두리는 1.5단계 알파 기준 처리가 별도로 그대로 만들어준다).
        // 2026-08-11: 마법사 보스 마법구슬/박쥐가 색칠영역 없이 통째로 검게 나오는 문제로 추가.
        const simplifyRects = tpl.simplifyRects || [];
        const inSimplifyZone = (x, y) => simplifyRects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const p = y * W + x;
            const i = p * 4;
            const a = data[i + 3];
            const maxCh = Math.max(data[i], data[i + 1], data[i + 2]);
            // 반투명(안티에일리어싱) 픽셀은 그 자체로 실루엣 경계라는 뜻이므로, 이웃과 색이 얼마나
            // 다른지 계산할 필요 없이 곧장 벽으로 취급한다 — 완만한(여러 픽셀에 걸친) 그라데이션
            // 경계는 이웃-비교 방식만으론 못 잡을 때가 있어서(2026-08-09, tree 몸통이 배경과 이어져
            // 안 잡히던 문제) 알파값만으로 판단하는 이 경로를 추가했다. emoji(Twemoji) 모드에만
            // 적용한다 — svgArt(보스 손그림)는 도형마다 이미 자체 테두리 선이 있어서, 겹치는 도형
            // 여러 개의 반투명 경계가 겹치는 지점(관절 등)에서 이 검사가 너무 넓은 검은 덩어리로
            // 잘못 뭉쳐버리는 부작용이 있었다(2026-08-10, 신데렐라 팔 안쪽 검은 부분 버그로 발견).
            const isPartialAlpha = tpl.renderMode === 'emoji' && a > ALPHA_WALL_THRESHOLD && a < 250;
            let isWall = isPartialAlpha || (a > ALPHA_WALL_THRESHOLD && maxCh < EMOJI_DARK_THRESHOLD);
            const skipColorEdge = inSimplifyZone(x, y); // 색상 경계만 무시, 알파(실루엣) 경계는 그대로 감지
            if (!isWall && a > ALPHA_WALL_THRESHOLD) {
              // 부드러운 그라데이션 경계는 바로 옆 픽셀 차이만으론 못 잡을 수 있어 2px 떨어진 픽셀과도 비교한다.
              // 오른쪽/아래쪽뿐 아니라 왼쪽/위쪽 이웃도 반드시 봐야 한다 — 검은 테두리 선이 없는(Twemoji
              // 같은 플랫 디자인) 도형은 오른쪽/아래쪽만 보면 실루엣의 위/왼쪽 변이 통째로 안 잡혀서
              // 배경과 하나로 뭉쳐버리는 문제가 있었다(2026-08-09, cactus에서 발견).
              const offsets = [1, 2, 4];
              for (let k = 0; k < offsets.length && !isWall; k++) {
                const o = offsets[k];
                if (x < W - o) {
                  const j = (p + o) * 4;
                  const dr = data[i] - data[j], dg = data[i + 1] - data[j + 1], db = data[i + 2] - data[j + 2];
                  const da = data[i + 3] - data[j + 3];
                  if ((!skipColorEdge && Math.sqrt(dr * dr + dg * dg + db * db) > EDGE_THRESHOLD) || Math.abs(da) > EDGE_THRESHOLD) isWall = true;
                }
                if (!isWall && x >= o) {
                  const j = (p - o) * 4;
                  const dr = data[i] - data[j], dg = data[i + 1] - data[j + 1], db = data[i + 2] - data[j + 2];
                  const da = data[i + 3] - data[j + 3];
                  if ((!skipColorEdge && Math.sqrt(dr * dr + dg * dg + db * db) > EDGE_THRESHOLD) || Math.abs(da) > EDGE_THRESHOLD) isWall = true;
                }
                if (!isWall && y < H - o) {
                  const j = (p + o * W) * 4;
                  const dr = data[i] - data[j], dg = data[i + 1] - data[j + 1], db = data[i + 2] - data[j + 2];
                  const da = data[i + 3] - data[j + 3];
                  if ((!skipColorEdge && Math.sqrt(dr * dr + dg * dg + db * db) > EDGE_THRESHOLD) || Math.abs(da) > EDGE_THRESHOLD) isWall = true;
                }
                if (!isWall && y >= o) {
                  const j = (p - o * W) * 4;
                  const dr = data[i] - data[j], dg = data[i + 1] - data[j + 1], db = data[i + 2] - data[j + 2];
                  const da = data[i + 3] - data[j + 3];
                  if ((!skipColorEdge && Math.sqrt(dr * dr + dg * dg + db * db) > EDGE_THRESHOLD) || Math.abs(da) > EDGE_THRESHOLD) isWall = true;
                }
              }
            }
            rawWall[p] = isWall ? 1 : 0;
          }
        }

        // 1.5단계: 실루엣 바깥 경계를 알파값만으로 별도 확정한다. 위의 색상-비교 방식은 그라데이션
        // 폭이 넓거나 미묘하면 틈을 놓칠 수 있어(2026-08-09, tree 도안에서 몸통이 배경과 이어져
        // 통째로 "배경"으로 오인되던 문제 — 나무 몸통이 색칠 영역에서 통째로 빠졌었다) 캔버스
        // 테두리에서부터 "불투명하지 않은(alpha<=threshold)" 픽셀만 타고 BFS로 퍼뜨려 진짜 배경을
        // 알파 마스크만으로(색 비교 없이) 확정하고, 그 배경과 맞닿은 불투명 픽셀은 전부 벽으로
        // 편입한다 — 그라데이션 폭에 상관없이 항상 실루엣이 완전히 막히는 것을 보장한다.
        {
          const outside = new Uint8Array(W * H);
          const q2 = new Int32Array(W * H);
          let qh2 = 0, qt2 = 0;
          const pushIfOutside = (idx) => {
            if (outside[idx]) return;
            if (data[idx * 4 + 3] <= ALPHA_WALL_THRESHOLD) {
              outside[idx] = 1;
              q2[qt2++] = idx;
            }
          };
          for (let x = 0; x < W; x++) { pushIfOutside(x); pushIfOutside((H - 1) * W + x); }
          for (let y = 0; y < H; y++) { pushIfOutside(y * W); pushIfOutside(y * W + W - 1); }
          while (qh2 < qt2) {
            const cur = q2[qh2++];
            const cx = cur % W, cy = (cur / W) | 0;
            if (cx > 0) pushIfOutside(cur - 1);
            if (cx < W - 1) pushIfOutside(cur + 1);
            if (cy > 0) pushIfOutside(cur - W);
            if (cy < H - 1) pushIfOutside(cur + W);
          }
          for (let p = 0; p < W * H; p++) {
            if (outside[p] || rawWall[p] === 1) continue;
            const x = p % W, y = (p / W) | 0;
            const touchesOutside =
              (x > 0 && outside[p - 1]) || (x < W - 1 && outside[p + 1]) ||
              (y > 0 && outside[p - W]) || (y < H - 1 && outside[p + W]);
            if (touchesOutside) rawWall[p] = 1;
          }
        }

        // 2단계: 선 두께를 손그림 도안과 비슷하게 통일한다.
        // 이모지 폰트의 원래 굵은 테두리는 "열린 칸에서 K px 이내"만 남기고 안쪽 깊은 부분은 깎아내고(얇게),
        // 이미 얇은 색 경계선은 K보다 훨씬 얇으므로 전혀 손대지 않고 그대로 유지한다.
        // 2026-08-11: 22px는 너무 굵어서 이모지 원본의 얇은 끝부분(날개 끝, 손가락 등)이 안팎 모두
        // 벽 판정 22px 이내에 들어가 통째로 잘려나가 보이는 문제가 있었다 — 50% 줄여서 완화.
        const LINE_THICKNESS_CAP = 3; // WORK_SIZE(640) 기준 픽셀 — 2026-08-11, 추가로 50% 더 축소 (전체 도안 공용값)
        const dist = new Int32Array(W * H).fill(-1);
        const queue = new Int32Array(W * H);
        let qHead = 0, qTail = 0;
        for (let p = 0; p < W * H; p++) {
          if (rawWall[p] === 0) { dist[p] = 0; queue[qTail++] = p; }
        }
        while (qHead < qTail) {
          const p = queue[qHead++];
          const d = dist[p];
          if (d >= LINE_THICKNESS_CAP) continue;
          const x = p % W, y = (p / W) | 0;
          if (x > 0 && dist[p - 1] === -1) { dist[p - 1] = d + 1; queue[qTail++] = p - 1; }
          if (x < W - 1 && dist[p + 1] === -1) { dist[p + 1] = d + 1; queue[qTail++] = p + 1; }
          if (y > 0 && dist[p - W] === -1) { dist[p - W] = d + 1; queue[qTail++] = p - W; }
          if (y < H - 1 && dist[p + W] === -1) { dist[p + W] = d + 1; queue[qTail++] = p + W; }
        }

        const wall = new Uint8Array(W * H);
        const lineData = new Uint8ClampedArray(W * H * 4);
        for (let p = 0; p < W * H; p++) {
          const isWall = rawWall[p] === 1 && dist[p] !== -1 && dist[p] <= LINE_THICKNESS_CAP;
          wall[p] = isWall ? 1 : 0;
          if (isWall) {
            const op = p * 4;
            lineData[op] = 0; lineData[op + 1] = 0; lineData[op + 2] = 0; lineData[op + 3] = 255;
          }
        }

        // 2.4단계: 이모지 추출만으로 구분이 안 되는 부분은 수동으로 선을 얹을 수 있다(tpl.overlaySvg).
        // 예: sun은 원래 뾰족한 부분과 안쪽 원이 같은 색이라 하나로 뭉치므로, 원을 하나 그려 넣어 나눈다.
        if (tpl.overlaySvg) {
          const overlayMarkup =
            '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">' +
            '<g fill="none" stroke="' + STROKE_COLOR + '" stroke-width="3">' + tpl.overlaySvg + '</g></svg>';
          const overlayUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(overlayMarkup);
          const overlayImg = new Image();
          overlayImg.onload = () => {
            const oC = document.createElement('canvas');
            oC.width = W; oC.height = H;
            const oCtx = oC.getContext('2d', { willReadFrequently: true });
            oCtx.drawImage(overlayImg, 0, 0, W, H);
            const oData = oCtx.getImageData(0, 0, W, H).data;
            for (let p = 0; p < W * H; p++) {
              if (oData[p * 4 + 3] > ALPHA_WALL_THRESHOLD) {
                wall[p] = 1;
                const op = p * 4;
                lineData[op] = 0; lineData[op + 1] = 0; lineData[op + 2] = 0; lineData[op + 3] = 255;
              }
            }
            continueProcessing();
          };
          overlayImg.src = overlayUrl;
        } else {
          continueProcessing();
        }

        function continueProcessing() {
        // 2.5단계: 하이라이트 같은 약한 색 경계는 군데군데 끊어진 채 벽으로 잡혀 점선처럼 보인다.
        // 닫힌 도형을 이루지 못할 만큼 작고 고립된 벽 조각은 노이즈로 보고 지운다(선 레이어에서도 제거).
        {
          const WALL_NOISE_MIN = window.__DEBUG_COLOR__ ? 0 : 6;
          const visited = new Uint8Array(W * H);
          const compSizes = [];
          for (let start = 0; start < W * H; start++) {
            if (wall[start] !== 1 || visited[start]) continue;
            const comp = [start];
            visited[start] = 1;
            let qi = 0;
            while (qi < comp.length) {
              const p = comp[qi++];
              const x = p % W, y = (p / W) | 0;
              if (x > 0 && wall[p - 1] === 1 && !visited[p - 1]) { visited[p - 1] = 1; comp.push(p - 1); }
              if (x < W - 1 && wall[p + 1] === 1 && !visited[p + 1]) { visited[p + 1] = 1; comp.push(p + 1); }
              if (y > 0 && wall[p - W] === 1 && !visited[p - W]) { visited[p - W] = 1; comp.push(p - W); }
              if (y < H - 1 && wall[p + W] === 1 && !visited[p + W]) { visited[p + W] = 1; comp.push(p + W); }
            }
            compSizes.push(comp.length);
            if (comp.length < WALL_NOISE_MIN) {
              comp.forEach((p) => {
                wall[p] = 0;
                lineData[p * 4 + 3] = 0;
              });
            }
          }
          if (window.__DEBUG_COLOR__) console.log('[wallcomp]', tpl.id, JSON.stringify(compSizes.sort((a, b) => a - b)));
        }

        // 2.6단계: 남은 약한 선이 군데군데 끊겨 보이지 않도록 2px 팽창으로 작은 틈을 이어붙인다.
        {
          const before = wall.slice();
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const p = y * W + x;
              if (before[p] === 1) continue;
              let hit = false;
              for (let dy = -2; dy <= 2 && !hit; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                  const nx = x + dx, ny = y + dy;
                  if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                  if (before[ny * W + nx] === 1) { hit = true; break; }
                }
              }
              if (hit) {
                wall[p] = 1;
                const op = p * 4;
                lineData[op] = 0; lineData[op + 1] = 0; lineData[op + 2] = 0; lineData[op + 3] = 255;
              }
            }
          }
        }

        // 3단계: 이모지 원본 색을 그대로 정답색으로 쓰기 위해, 각 영역의 실제 색을 뽑아
        // 가장 가까운 팔레트 색으로 스냅한다 (원본은 미세한 그라데이션이 있어 그대로 쓰면
        // 같은 부위인데 색이 조금씩 달라 매칭이 불가능해짐).
        // 잠정(provisional) 라벨링: 병합 대상(테두리 근처 얇고 어두운 조각)을 찾기 위한 1차 패스.
        let prov = labelRegions(wall);
        const provLabelSet = new Set(prov.gradable.map((r) => r.label));
        const sumR = new Map(), sumG = new Map(), sumB = new Map(), cnt = new Map();
        for (let p = 0; p < W * H; p++) {
          const lbl = prov.labelMap[p];
          if (lbl === -1 || !provLabelSet.has(lbl)) continue;
          const i = p * 4;
          sumR.set(lbl, (sumR.get(lbl) || 0) + data[i]);
          sumG.set(lbl, (sumG.get(lbl) || 0) + data[i + 1]);
          sumB.set(lbl, (sumB.get(lbl) || 0) + data[i + 2]);
          cnt.set(lbl, (cnt.get(lbl) || 0) + 1);
        }
        // 두께를 깎는 과정에서 생기는 "테두리 근처 얇고 어두운 조각"은 색칠 대상이 아니라
        // 원래 테두리의 일부이므로, 색을 매기는 대신 벽으로 흡수해서 안 보이게 한다.
        const DARK_MERGE_MAX = 90;
        const DARK_MERGE_SIZE = 4000;
        const mergeLabels = new Set();
        const rawColorBySeed = new Map(); // seed -> [r,g,b] 병합 판정 전 원본 평균색
        prov.gradable.forEach((r) => {
          const n = cnt.get(r.label) || 1;
          const rr = Math.round(sumR.get(r.label) / n);
          const gg = Math.round(sumG.get(r.label) / n);
          const bb = Math.round(sumB.get(r.label) / n);
          const maxCh = Math.max(rr, gg, bb);
          if (maxCh < DARK_MERGE_MAX && r.size < DARK_MERGE_SIZE) {
            mergeLabels.add(r.label);
          } else {
            rawColorBySeed.set(r.seed, [rr, gg, bb]);
          }
        });
        // 2026-08-11: "쉬움 모드 정답색이 원래 이모지 색과 동일하게" 요청 — 이 색은 쉬움
        // 모드/보스에서 그대로 정답색으로 쓰이는데(renderGoalPreview의 sampled 분기), 예전엔
        // 항상 앱 팔레트(COLORS)에서 가장 가까운 색으로 스냅해서 원본 이모지 색과 미묘하게
        // 달랐다. paletteOverride가 있는 도안(커스텀 팔레트를 일부러 지정한 경우)만 계속
        // 스냅하고, 그 외(현재 전부)는 실제 평균 색 기반으로 정답색을 정한다.
        // 그런데 그대로 다 쓰면 두 가지 부작용이 생겨서 같이 처리한다:
        // 1) "상어 이빨색이 배경과 같아 구분 안 됨" — 흰색(또는 거의 흰색)이 그대로 정답색이면
        //    칠한 흰색과 캔버스 배경(크림색, 안 칠한 상태)이 거의 똑같아 보인다. WHITE_SUBSTITUTE
        //    (기존엔 팔레트 패딩용으로만 쓰이던 상수)로 눈에 띄는 크림/탠 색으로 바꿔치기.
        // 2) "롤리팝 소용돌이의 주황 3단계처럼, 원래 이모지가 음영 표현용으로 쓴 미묘하게 다른
        //    같은 계열 색이 전부 별개의 정답색이 돼서 색칠 퍼즐이 과하게 잘게 쪼개짐" — 도안
        //    안에서 색끼리 비교해(snapToPaletteColor와 같은 가중치의 HSL 거리) 충분히 비슷하면
        //    먼저 나온 색 하나로 합친다.
        const SIMILAR_COLOR_DIST = 0.07;
        const paletteClusters = []; // [{hex, hsl:[h,s,l]}] — paletteOverride 없는 도안 전용
        const colorBySeed = new Map();
        rawColorBySeed.forEach(([rr, gg, bb], seed) => {
          if (tpl.paletteOverride) {
            colorBySeed.set(seed, snapToPaletteColor(rr, gg, bb, tpl.paletteOverride));
            return;
          }
          if (rr >= 245 && gg >= 245 && bb >= 245) {
            colorBySeed.set(seed, WHITE_SUBSTITUTE);
            return;
          }
          const hsl = rgbToHsl(rr, gg, bb);
          const [h, s, l] = hsl;
          let match = null;
          for (const c of paletteClusters) {
            let dh = Math.abs(h - c.hsl[0]);
            if (dh > 180) dh = 360 - dh;
            const hueWeight = 0.3 + 0.7 * Math.min(s, c.hsl[1]);
            const dist = (dh / 180) * (dh / 180) * hueWeight * 6 + (s - c.hsl[1]) * (s - c.hsl[1]) * 0.5 + (l - c.hsl[2]) * (l - c.hsl[2]) * 0.5;
            if (dist < SIMILAR_COLOR_DIST) { match = c; break; }
          }
          if (match) {
            colorBySeed.set(seed, match.hex);
          } else {
            const hex = rgbToHex(rr, gg, bb);
            paletteClusters.push({ hex, hsl });
            colorBySeed.set(seed, hex);
          }
        });
        if (mergeLabels.size) {
          for (let p = 0; p < W * H; p++) {
            if (mergeLabels.has(prov.labelMap[p])) {
              wall[p] = 1;
              const op = p * 4;
              lineData[op] = 0; lineData[op + 1] = 0; lineData[op + 2] = 0; lineData[op + 3] = 255;
            }
          }
        }

        // 3.5단계: 손가락으로 탭하기엔 너무 얇은 영역(벽에서 가장 먼 지점까지의 거리가 짧음)은
        // 색칠 대상에서 빼고 벽으로 흡수한다 — 특히 쉬운 레벨(1~3단계)에서 중요.
        if (tpl.difficulty && tpl.difficulty <= 3 && !tpl.keepThinParts) {
          const mid = labelRegions(wall);
          const distToWall2 = new Int32Array(W * H).fill(-1);
          const q2 = new Int32Array(W * H);
          let qh2 = 0, qt2 = 0;
          for (let p = 0; p < W * H; p++) {
            if (wall[p] === 1) { distToWall2[p] = 0; q2[qt2++] = p; }
          }
          while (qh2 < qt2) {
            const p = q2[qh2++];
            const d = distToWall2[p];
            const x = p % W, y = (p / W) | 0;
            if (x > 0 && distToWall2[p - 1] === -1) { distToWall2[p - 1] = d + 1; q2[qt2++] = p - 1; }
            if (x < W - 1 && distToWall2[p + 1] === -1) { distToWall2[p + 1] = d + 1; q2[qt2++] = p + 1; }
            if (y > 0 && distToWall2[p - W] === -1) { distToWall2[p - W] = d + 1; q2[qt2++] = p - W; }
            if (y < H - 1 && distToWall2[p + W] === -1) { distToWall2[p + W] = d + 1; q2[qt2++] = p + W; }
          }
          const maxDist = new Map();
          for (let p = 0; p < W * H; p++) {
            const lbl = mid.labelMap[p];
            if (lbl === -1) continue;
            const d = distToWall2[p];
            if (!maxDist.has(lbl) || d > maxDist.get(lbl)) maxDist.set(lbl, d);
          }
          const THIN_MERGE = 9; // WORK_SIZE(640) 기준 — 이보다 얇으면 탭하기 빡빡하다고 보고 병합
          const thinLabels = new Set();
          mid.gradable.forEach((r) => { if ((maxDist.get(r.label) || 0) < THIN_MERGE) thinLabels.add(r.label); });
          if (thinLabels.size) {
            for (let p = 0; p < W * H; p++) {
              if (thinLabels.has(mid.labelMap[p])) {
                wall[p] = 1;
                lineData[p * 4 + 3] = 255;
              }
            }
          }
        }

        // 3.55단계: 라인 안쪽의 미세한 명암 때문에, 배경/내부의 큰 흰 영역과 아주 가느다란 실금으로
        // 연결된 채 선 한가운데를 파고드는 흰 균열이 생길 수 있다(별 모양 꼭짓점 등). 이런 실금은
        // 전체 면적이 커서(큰 영역에 붙어있으므로) 면적 기준으로는 못 잡으므로, 아주 작은 반경(R)의
        // 모폴로지 열림으로 국소 폭만 보고 닫는다. 원래 잉크였던(rawWall===1) 자리만 다시 메워서,
        // 디자인상 원래 배경이었던 곳(벌레 다리 사이 등)은 절대 건드리지 않는다. 반경을 아주 작게 유지해
        // 뾰족한 꼭짓점에서 두께가 늘어나거나 돌기가 생기는 부작용을 피한다.
        {
          const CRACK_CLOSE_RADIUS = 4; // WORK_SIZE(640) 기준 — 아주 보수적인 값(실금 폭 몇 px 정도만 대상)
          const distToWall3 = new Int32Array(W * H).fill(-1);
          const qc1 = new Int32Array(W * H);
          let hc1 = 0, tc1 = 0;
          for (let p = 0; p < W * H; p++) {
            if (wall[p] === 1) { distToWall3[p] = 0; qc1[tc1++] = p; }
          }
          while (hc1 < tc1) {
            const p = qc1[hc1++];
            const d = distToWall3[p];
            if (d >= CRACK_CLOSE_RADIUS) continue;
            const x = p % W, y = (p / W) | 0;
            if (x > 0 && distToWall3[p - 1] === -1) { distToWall3[p - 1] = d + 1; qc1[tc1++] = p - 1; }
            if (x < W - 1 && distToWall3[p + 1] === -1) { distToWall3[p + 1] = d + 1; qc1[tc1++] = p + 1; }
            if (y > 0 && distToWall3[p - W] === -1) { distToWall3[p - W] = d + 1; qc1[tc1++] = p - W; }
            if (y < H - 1 && distToWall3[p + W] === -1) { distToWall3[p + W] = d + 1; qc1[tc1++] = p + W; }
          }
          const distToSurvivor3 = new Int32Array(W * H).fill(-1);
          const qc2 = new Int32Array(W * H);
          let hc2 = 0, tc2 = 0;
          for (let p = 0; p < W * H; p++) {
            if (wall[p] === 0 && (distToWall3[p] === -1 || distToWall3[p] >= CRACK_CLOSE_RADIUS)) { distToSurvivor3[p] = 0; qc2[tc2++] = p; }
          }
          while (hc2 < tc2) {
            const p = qc2[hc2++];
            const d = distToSurvivor3[p];
            if (d >= CRACK_CLOSE_RADIUS) continue;
            const x = p % W, y = (p / W) | 0;
            if (x > 0 && wall[p - 1] === 0 && distToSurvivor3[p - 1] === -1) { distToSurvivor3[p - 1] = d + 1; qc2[tc2++] = p - 1; }
            if (x < W - 1 && wall[p + 1] === 0 && distToSurvivor3[p + 1] === -1) { distToSurvivor3[p + 1] = d + 1; qc2[tc2++] = p + 1; }
            if (y > 0 && wall[p - W] === 0 && distToSurvivor3[p - W] === -1) { distToSurvivor3[p - W] = d + 1; qc2[tc2++] = p - W; }
            if (y < H - 1 && wall[p + W] === 0 && distToSurvivor3[p + W] === -1) { distToSurvivor3[p + W] = d + 1; qc2[tc2++] = p + W; }
          }
          for (let p = 0; p < W * H; p++) {
            if (wall[p] === 0 && distToSurvivor3[p] === -1 && rawWall[p] === 1) {
              wall[p] = 1;
              const op = p * 4;
              lineData[op] = 0; lineData[op + 1] = 0; lineData[op + 2] = 0; lineData[op + 3] = 255;
            }
          }
        }

        // 3.6단계: 지금까지의 모든 팽창/병합이 끝난 "최종" 벽 상태 기준으로, 선 안쪽 명암 때문에
        // 생기는 아주 작은 흰색 티끌(구멍)을 노이즈로 보고 메운다. 2.5단계(검은 티끌 제거)와 대칭인
        // 로직 — 면적만으로 판단하며 두께를 바꾸는 팽창/침식은 쓰지 않아 정상 색칠 점(항상 훨씬 큼)이나
        // 선 두께에는 영향이 없다. (이 단계보다 앞에서 하면, 뒤이은 팽창 단계가 새로 만들어내는 티끌을
        // 놓치므로 반드시 맨 마지막에 한다.)
        {
          const HOLE_NOISE_MAX = 120; // px² — 실측: 노이즈 티끌은 수십 px² 이하, 정상 색칠 점은 700px² 이상
          const visitedHole = new Uint8Array(W * H);
          for (let start = 0; start < W * H; start++) {
            if (wall[start] !== 0 || visitedHole[start]) continue;
            const comp = [start];
            visitedHole[start] = 1;
            let qi = 0;
            while (qi < comp.length) {
              const p = comp[qi++];
              const x = p % W, y = (p / W) | 0;
              if (x > 0 && wall[p - 1] === 0 && !visitedHole[p - 1]) { visitedHole[p - 1] = 1; comp.push(p - 1); }
              if (x < W - 1 && wall[p + 1] === 0 && !visitedHole[p + 1]) { visitedHole[p + 1] = 1; comp.push(p + 1); }
              if (y > 0 && wall[p - W] === 0 && !visitedHole[p - W]) { visitedHole[p - W] = 1; comp.push(p - W); }
              if (y < H - 1 && wall[p + W] === 0 && !visitedHole[p + W]) { visitedHole[p + W] = 1; comp.push(p + W); }
            }
            if (comp.length <= HOLE_NOISE_MAX) {
              comp.forEach((p) => {
                wall[p] = 1;
                const op = p * 4;
                lineData[op] = 0; lineData[op + 1] = 0; lineData[op + 2] = 0; lineData[op + 3] = 255;
              });
            }
          }
        }

        // 최종(final) 라벨링: 병합으로 벽이 늘어난 뒤 다시 매긴 라벨 — 이후 openTemplate이
        // 실제로 쓰는 라벨링과 반드시 동일해야 하므로, 여기서 미리 같은 라벨로 정답색을 맞춰둔다.
        const final = labelRegions(wall);
        const sampledColors = new Map();
        // 2026-08-11: "쉬움 보스 머리색이 얼굴색과 같이 나온다" 피드백 — 위 SIMILAR_COLOR_DIST
        // 클러스터링이 롤리팝처럼 "같은 부위의 미묘한 음영"을 하나로 합치는 데는 맞지만, 요정/히어로
        // 보스는 금발 머리와 피부색이 실제로 비슷한 색이라 서로 다른 부위인데도 합쳐져버렸다. 전체
        // 클러스터링 기준을 건드리면 다른 99개 도안에 영향이 가므로, 문제 있는 두 보스에만
        // tpl.colorOverrideRects(좌표 범위 → 강제 색)로 딱 그 부위만 예외 처리한다.
        const overrideRects = tpl.colorOverrideRects || [];
        final.gradable.forEach((r) => {
          let hex = colorBySeed.get(r.seed);
          if (overrideRects.length) {
            const sx = r.seed % W, sy = (r.seed / W) | 0;
            const ov = overrideRects.find((o) => sx >= o.x && sx < o.x + o.w && sy >= o.y && sy < o.y + o.h);
            if (ov) hex = ov.hex;
          }
          if (hex) sampledColors.set(r.label, hex);
        });

        const lineC = document.createElement('canvas');
        lineC.width = W; lineC.height = H;
        lineC.getContext('2d').putImageData(new ImageData(lineData, W, H), 0, 0);
        callback(wall, lineC, sampledColors);
        } // continueProcessing 끝
      };
      img.src = tpl.renderMode === 'svgArt'
        ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
            '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">' + tpl.svgArt + '</svg>'
          )
        : 'assets/emoji/' + tpl.id + '.svg';
    } else {
      const svgMarkup = buildSvgMarkup(tpl);
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
      const img = new Image();
      img.onload = () => {
        const maskC = document.createElement('canvas');
        maskC.width = WORK_SIZE; maskC.height = WORK_SIZE;
        const mCtx = maskC.getContext('2d', { willReadFrequently: true });
        mCtx.drawImage(img, 0, 0, WORK_SIZE, WORK_SIZE);
        const data = mCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
        const wall = new Uint8Array(WORK_SIZE * WORK_SIZE);
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          wall[p] = data[i + 3] > ALPHA_WALL_THRESHOLD ? 1 : 0;
        }
        callback(wall, img, null);
      };
      img.src = svgUrl;
    }
  }

  // 임의의 RGB를 COLORS 중 가장 가까운 색으로 스냅(유클리드 거리)
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  const PALETTE_HSL = COLORS.map((hex) => {
    const [r, g, b] = hexToRgba(hex);
    return { hex, hsl: rgbToHsl(r, g, b) };
  });

  // 단순 RGB 유클리드 거리는 채도 높은 색(진한 초록 등)이 회색/갈색으로 잘못 스냅되는 경우가 많아,
  // 색상(hue)을 우선 맞추고 채도·명도는 보조 기준으로 쓰는 HSL 기반 거리로 비교한다.
  // paletteOverride가 있으면(파이널 보스 전용 확장 팔레트) 그 색상 목록 안에서만 스냅한다 —
  // 기존 100개 도안의 스냅 결과에 전혀 영향을 주지 않기 위해 전역 COLORS는 그대로 둔다.
  function snapToPaletteColor(r, g, b, paletteOverride) {
    const hslList = paletteOverride
      ? paletteOverride.map((hex) => { const [rr, gg, bb] = hexToRgba(hex); return { hex, hsl: rgbToHsl(rr, gg, bb) }; })
      : PALETTE_HSL;
    const [h, s, l] = rgbToHsl(r, g, b);
    let best = hslList[0].hex;
    let bestDist = Infinity;
    hslList.forEach((entry) => {
      const [ph, ps, pl] = entry.hsl;
      let dh = Math.abs(h - ph);
      if (dh > 180) dh = 360 - dh;
      // 채도가 아예 없는(회색·흰색) 샘플이 아니면 색상(hue) 일치를 최우선으로 본다 —
      // 그래야 "탁한 초록"이 "밝은 갈색"보다 항상 초록 팔레트에 먼저 매칭된다.
      const hueWeight = 0.3 + 0.7 * Math.min(s, ps);
      const dist = (dh / 180) * (dh / 180) * hueWeight * 6 + (s - ps) * (s - ps) * 0.5 + (l - pl) * (l - pl) * 0.5;
      if (dist < bestDist) { bestDist = dist; best = entry.hex; }
    });
    return best;
  }

  // 문자열 시드 → 32비트 정수 해시 (FNV-1a) → mulberry32로 그 정수를 시드 삼아 재현 가능한 난수열 생성.
  // 같은 (도안, 모드) 조합이면 항상 같은 난수열이 나와서 "이 모드에서는 이 배치"가 유지되고,
  // 모드가 바뀌면 시드 문자열도 바뀌어 다른 배치가 나온다.
  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 서로 맞닿은 두 영역(라벨)이 같은 색으로 배정되면 경계가 안 보여서 하나로 뭉개져 보이므로,
  // 라벨맵에서 이웃 관계를 한 번 스캔해두고 색 배정 시 참고한다.
  function buildLabelAdjacency(labelMap) {
    const adj = new Map();
    const add = (a, b) => {
      if (a < 0 || b < 0 || a === b) return;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    };
    for (let y = 0; y < WORK_SIZE; y++) {
      const row = y * WORK_SIZE;
      for (let x = 0; x < WORK_SIZE; x++) {
        const i = row + x;
        const lab = labelMap[i];
        if (lab < 0) continue;
        if (x < WORK_SIZE - 1) add(lab, labelMap[i + 1]);
        if (y < WORK_SIZE - 1) add(lab, labelMap[i + WORK_SIZE]);
      }
    }
    return adj;
  }

  // 단순 RGB 유클리드 거리 — 팔레트 순서를 정할 때 검증했던 ΔE 기준(정상 시력 15 / 색맹 8)과
  // 같은 취지로, 이웃 영역끼리 "육안으로 구분되는 색"만 배정하기 위한 근사치.
  function colorDistance(hexA, hexB) {
    const [r1, g1, b1] = hexToRgba(hexA);
    const [r2, g2, b2] = hexToRgba(hexB);
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  // 2026-08-11: "5레벨부터 비슷한 색끼리 섞여 있어 구분이 어렵다" 피드백으로 추가 — 레벨이
  // 오르면 팔레트가 4→10색으로 늘어나는데(PALETTE_SIZE_BY_LEVEL), 기존엔 "이웃과 완전히 같은
  // 색만" 피했지 "이웃과 비슷해 보이는 색"까지는 못 걸렀음(예: 주황빛빨강↔주황, 거리 77).
  // 팔레트 최소 티어(4색)에서도 색 사이 최소 거리가 108이라 이 값으로 잡아도 후보가 마름.
  const MIN_NEIGHBOR_COLOR_DIST = 100;

  // 영역마다 팔레트에서 하나씩, 맞닿은 이웃과 육안으로 구분되는 색으로 시드 기반 랜덤 배정한다.
  function seededRegionColors(regions, labelMap, palette, seedStr) {
    const rand = mulberry32(hashSeed(seedStr));
    const adj = buildLabelAdjacency(labelMap);
    const colorByLabel = new Map();
    regions.forEach((r) => {
      const neighborHexes = [];
      (adj.get(r.label) || []).forEach((n) => {
        if (colorByLabel.has(n)) neighborHexes.push(colorByLabel.get(n));
      });
      let candidates = palette.filter((hex) =>
        neighborHexes.every((nh) => colorDistance(hex, nh) >= MIN_NEIGHBOR_COLOR_DIST));
      if (!candidates.length) {
        // 팔레트가 좁아서 기준을 통과하는 색이 하나도 없으면(어쩔 수 없는 경우), 그나마 이웃들과
        // 가장 멀리 떨어진(최소 거리가 가장 큰) 색을 고른다 — 완전 동일 색만은 최후까지 피함.
        const pool = palette.filter((hex) => !neighborHexes.includes(hex));
        const fallbackPool = pool.length ? pool : palette;
        let best = fallbackPool[0];
        let bestMinDist = -1;
        fallbackPool.forEach((hex) => {
          const minDist = neighborHexes.length
            ? Math.min(...neighborHexes.map((nh) => colorDistance(hex, nh)))
            : Infinity;
          if (minDist > bestMinDist) { bestMinDist = minDist; best = hex; }
        });
        colorByLabel.set(r.label, best);
        return;
      }
      colorByLabel.set(r.label, candidates[Math.floor(rand() * candidates.length)]);
    });
    return colorByLabel;
  }

  // ================= 목표(정답) 미리보기 =================
  // 보스도 2026-08-10부터 다른 도안들과 똑같이 Twemoji 기반(emoji 모드)이라 partColors는 더 이상
  // 없음 — custom 분기는 혹시 남아있을 손그림 도안 대비용 안전장치로만 유지.
  // 일반 도안(이모지)은: **쉬움 모드는 기존 그대로**(이모지 원본의 실제 색) 유지하고,
  // 보통/어려움/매우어려움 모드부터만 도안+모드 조합 시드로 랜덤 색 배치를 쓴다 — 처음 배우는
  // 쉬움 모드는 "진짜 사물 색"을 보여주고, 그 다음부터는 반복 방지용 색 퍼즐이 되는 구조.
  // (2026-08-10 추가 시점엔 전체 모드에 랜덤을 적용했다가, 같은 날 "쉬움은 그대로 둬야 한다"는
  // 피드백으로 쉬움 모드만 원래 방식으로 되돌림.)
  // 보스는 항상 자기 고유의 모드 하나에서만 등장하므로(다른 모드로 다시 칠할 일이 없음) 랜덤화가
  // 의미 없다 — currentTemplate.isBoss면 전역 getMode()가 뭐든 상관없이 항상 실제 색 그대로.
  function renderGoalPreview(lineImg) {
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

    const imgData = goalCtx.createImageData(WORK_SIZE, WORK_SIZE);
    const data = imgData.data;
    for (let i = 0; i < WORK_SIZE * WORK_SIZE; i++) {
      const label = currentLabelMap[i];
      const hex = label >= 0 ? currentLabelToColor.get(label) : undefined;
      if (hex) {
        const [r, g, b] = hexToRgba(hex);
        const p = i * 4;
        data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255;
      }
    }
    goalCtx.putImageData(imgData, 0, 0);
    goalCtx.drawImage(lineImg, 0, 0, WORK_SIZE, WORK_SIZE);
  }

  // ================= 색칠 영역 자동 인식(연결 요소 탐색) =================
  // 순수 함수: wall(벽 마스크)만 받아 라벨맵 + 채점 대상 영역을 계산 (전역 상태 안 건드림 — 갤러리 썸네일 생성에도 재사용)
  function labelRegions(wall) {
    const total = WORK_SIZE * WORK_SIZE;
    const visited = new Uint8Array(total);
    const labelMap = new Int32Array(total).fill(-1);
    const regions = [];
    let labelCounter = 0;

    for (let start = 0; start < total; start++) {
      if (wall[start] === 1 || visited[start]) continue;
      let size = 0;
      const stack = [start];
      visited[start] = 1;
      const myLabel = labelCounter++;
      while (stack.length) {
        const cur = stack.pop();
        size++;
        labelMap[cur] = myLabel;
        const cx = cur % WORK_SIZE;
        const cy = (cur / WORK_SIZE) | 0;
        if (cx > 0) tryVisit(cur - 1);
        if (cx < WORK_SIZE - 1) tryVisit(cur + 1);
        if (cy > 0) tryVisit(cur - WORK_SIZE);
        if (cy < WORK_SIZE - 1) tryVisit(cur + WORK_SIZE);
      }
      regions.push({ seed: start, size, label: myLabel });

      function tryVisit(n) {
        if (!visited[n] && wall[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }

    // 배경 식별: 예전엔 "가장 큰 영역 = 배경"으로 가정했지만, Twemoji처럼 그림이 캔버스 대부분을
    // 꽉 채우는 소스(예: cactus)에서는 그림 몸통 자체가 배경보다 커져서 이 가정이 깨진다(2026-08-09
    // 발견 — cactus 몸통이 배경으로 오인되어 목표 이미지에서 색이 빠지고 채점도 안 되던 버그).
    // 대신 "캔버스 테두리에 실제로 닿아있는 영역"을 배경으로 본다 — 그림은 항상 여백 안에 그려지므로
    // 크기와 무관하게 더 정확하다.
    const borderLabels = new Set();
    for (let x = 0; x < WORK_SIZE; x++) {
      const top = labelMap[x];
      const bottom = labelMap[(WORK_SIZE - 1) * WORK_SIZE + x];
      if (top !== -1) borderLabels.add(top);
      if (bottom !== -1) borderLabels.add(bottom);
    }
    for (let y = 0; y < WORK_SIZE; y++) {
      const left = labelMap[y * WORK_SIZE];
      const right = labelMap[y * WORK_SIZE + WORK_SIZE - 1];
      if (left !== -1) borderLabels.add(left);
      if (right !== -1) borderLabels.add(right);
    }
    let withoutBackground = regions.filter((r) => !borderLabels.has(r.label));
    // 안전장치: 그림이 캔버스 끝까지 꽉 채워서 테두리 판정으로 아무것도 못 거른 극단적인 경우엔
    // 예전 방식(가장 큰 영역 하나만 배경 취급)으로 폴백한다.
    if (withoutBackground.length === regions.length && regions.length > 1) {
      const sorted = regions.slice().sort((a, b) => b.size - a.size);
      const biggestLabel = sorted[0].label;
      withoutBackground = regions.filter((r) => r.label !== biggestLabel);
    }
    // 겹치는 도형 경계에서 생기는 눈에 안 보이는 미세 슬리버(탭 불가능)는 채점 대상에서 제외
    const gradable = withoutBackground.filter((r) => r.size >= MIN_REGION_SIZE);
    return { labelMap, gradable };
  }

  function computeGradableRegions() {
    const result = labelRegions(wallMask);
    currentLabelMap = result.labelMap;
    return result.gradable;
  }


  function goHome() {
    coloringScreen.hidden = true;
    if (currentBossMode) {
      stopLevelTimer();
      currentBossMode = null;
      setBgmTrack(MUSIC_SRC);
      galleryScreen.hidden = true;
      mapScreen.hidden = false;
      renderMap();
    } else {
      galleryScreen.hidden = false;
      renderLevelGallery();
    }
  }

  // ================= 팔레트 =================
  // 난이도(1~10단계)가 오를수록 고를 수 있는 색상 수가 늘어남(4색 → 10색), 10단계에서 흰색 보너스 추가
  const PALETTE_SIZE_BY_LEVEL = [4, 4, 5, 6, 7, 8, 9, 10, 10, 10];

  // 목표 이미지 자동 색 배정(순환)용 — 흰색 제외, 그 단계에서 실제로 고를 수 있는 색 범위 안에서만 순환
  function targetPaletteForLevel(level) {
    const idx = Math.min(Math.max(level || 10, 1), 10) - 1;
    return TARGET_PALETTE.slice(0, PALETTE_SIZE_BY_LEVEL[idx]);
  }

  function paletteColorsForLevel(level, requiredColors) {
    const idx = Math.min(Math.max(level || 10, 1), 10) - 1;
    const n = PALETTE_SIZE_BY_LEVEL[idx];
    const cols = TARGET_PALETTE.slice(0, n);
    if ((level || 10) >= 10 && !cols.includes(WHITE_SUBSTITUTE)) cols.push(WHITE_SUBSTITUTE);
    // 도안이 실사 색을 위해 이 단계 기본 팔레트 밖의 색을 쓰면(예: 흰색 달걀, 파란 물방울)
    // 그 색이 반드시 선택 가능하도록 팔레트에 추가한다.
    (requiredColors || []).forEach((c) => { if (!cols.includes(c)) cols.push(c); });
    return cols;
  }

  function renderPalette() {
    const level = currentTemplate ? currentTemplate.difficulty : 10;
    const usedColors = currentLabelToColor ? Array.from(new Set(currentLabelToColor.values())) : [];
    const required = usedColors.length ? usedColors : ((currentTemplate && currentTemplate.partColors) || []);
    let cols;
    if (currentTemplate && currentTemplate.paletteOverride) {
      cols = currentTemplate.paletteOverride.slice();
      required.forEach((c) => { if (!cols.includes(c)) cols.push(c); });
    } else {
      cols = paletteColorsForLevel(level, required);
    }
    selectedColor = cols[0];
    palette.innerHTML = '';
    cols.forEach((color, idx) => {
      const btn = document.createElement('button');
      btn.className = 'color-swatch' + (idx === 0 ? ' active' : '');
      btn.style.background = color;
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', 'Pick a color');
      btn.dataset.color = color;
      btn.addEventListener('click', () => {
        selectedColor = color;
        palette.querySelectorAll('.color-swatch').forEach((el) => el.classList.remove('active'));
        btn.classList.add('active');
      });
      palette.appendChild(btn);
    });
  }

  function rgbToHex(r, g, b) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  // ================= 플러드필 =================
  function hexToRgba(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return [r, g, b, 255];
  }

  function floodFill(startX, startY, hexColor) {
    if (startX < 0 || startY < 0 || startX >= WORK_SIZE || startY >= WORK_SIZE) return;
    const startIdx = startY * WORK_SIZE + startX;
    if (!wallMask || wallMask[startIdx] === 1) return; // 선을 눌렀으면 무시

    const imgData = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE);
    const data = imgData.data;
    const [r, g, b, a] = hexToRgba(hexColor);

    const startPixel = startIdx * 4;
    // 이미 같은 색이면 스킵
    if (data[startPixel] === r && data[startPixel + 1] === g &&
        data[startPixel + 2] === b && data[startPixel + 3] === a) {
      return;
    }

    const visited = new Uint8Array(WORK_SIZE * WORK_SIZE);
    const stack = [startIdx];
    visited[startIdx] = 1;

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
    pushUndo();
    updateUndoButton();
    playPop();
  }

  // ================= 실행 취소 =================
  function pushUndo() {
    undoStack.push(fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function updateUndoButton() {
    btnUndo.disabled = undoStack.length <= 1;
    btnUndo.style.opacity = undoStack.length <= 1 ? 0.4 : 1;
  }

  btnUndo.addEventListener('click', () => {
    if (undoStack.length <= 1) return;
    undoStack.pop();
    const prev = undoStack[undoStack.length - 1];
    fillCtx.putImageData(prev, 0, 0);
    updateUndoButton();
  });

  btnClear.addEventListener('click', () => {
    fillCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    undoStack = [];
    pushUndo();
    updateUndoButton();
  });

  // ================= 탭 → 채우기 =================
  // 수염/입/이마주름처럼 폭이 몇 픽셀 안 되는 아주 얇은 색칠 영역은 손가락으로 정확히
  // 맞추기 힘들다(2026-08-09, 사용자가 cat 레벨에서 제보). 그림 자체는 그대로 두고, 탭한
  // 지점이 선이거나 색칠 대상이 아니면 근처(반경 TAP_SNAP_RADIUS)를 나선형으로 뒤져서
  // 가장 가까운 색칠 가능 지점을 대신 찾아준다 — 모든 도안의 얇은 부분에 공통 적용됨.
  // 2026-08-11: "좁은 곳이 여전히 잘 안 된다"는 테스트 유저 피드백 — 16px(640 기준)이 실제
  // 폰 화면(캔버스가 640보다 훨씬 작게 표시됨)에서는 손가락 오차를 못 따라가는 경우가 있어 26으로 확대.
  const TAP_SNAP_RADIUS = 26; // WORK_SIZE(640) 기준 픽셀
  function isTappable(idx) {
    return wallMask && wallMask[idx] !== 1 && currentLabelMap && currentGradableLabelSet.has(currentLabelMap[idx]);
  }
  function findTapTarget(x, y) {
    const idx = y * WORK_SIZE + x;
    if (isTappable(idx)) return { x, y };
    for (let r = 1; r <= TAP_SNAP_RADIUS; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // 이번 반경의 테두리만 훑는다
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= WORK_SIZE || ny >= WORK_SIZE) continue;
          const nIdx = ny * WORK_SIZE + nx;
          if (isTappable(nIdx)) return { x: nx, y: ny };
        }
      }
    }
    return null; // 근처에 색칠 가능한 곳이 전혀 없으면 그냥 무시
  }
  function handleTap(clientX, clientY) {
    const rect = tapLayer.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * WORK_SIZE);
    const y = Math.floor(((clientY - rect.top) / rect.height) * WORK_SIZE);
    const target = findTapTarget(x, y);
    if (!target) return;
    floodFill(target.x, target.y, selectedColor);
  }

  tapLayer.addEventListener('pointerdown', (e) => {
    handleTap(e.clientX, e.clientY);
  });

  // ================= 성공률 자동 채점(컬러바이넘버: 정답색 일치 여부) =================
  function computeCompletion(tolerance) {
    tolerance = tolerance || 0; // 0(기본값) = 기존과 동일한 완전 일치 판정. Child 모드는 항상 이 경로.
    if (!currentGradableRegions || currentGradableRegions.length === 0) {
      return { matched: 0, total: 0 };
    }
    const data = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
    let matched = 0;
    currentGradableRegions.forEach((r) => {
      const p = r.seed * 4;
      if (data[p + 3] === 0) return; // 안 칠한 영역
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

  // ================= 완료(채점) =================
  // 2026-08-11: "제대로 칠했냐가 중요한거니" 피드백으로 중간 점수/등급 확인 모달("OK!" 버튼 누르는
  // 페이지, 부모님 직접 채점 포함)을 완전히 없애고, Done! 누르면 곧장 결과가 뜨는 이진 판정으로
  // 단순화했다: 전부 정확히 맞으면 축하 화면(진행 저장 + 다음으로), 하나라도 틀리면 "다시
  // 도전!" 화면을 잠깐 보여준 뒤(저장 없이) 그대로 색칠 화면에 머무른다 — 어차피 레벨 클리어는
  // 원래도 정확히 100점이어야만 인정됐어서, 5단계 등급 자체가 실질적인 의미가 없었음.
  // 예전엔 "Done!"을 누를 때마다 그림 파일이 자동으로 다운로드됐는데, 그림 하나 끝낼 때마다
  // 다운로드 창이 계속 뜨는 게 번거롭다는 피드백으로 자동 저장은 뺐다(채점/평가만 진행).
  btnSave.addEventListener('click', () => {
    const { matched, total } = computeCompletion();
    if (total > 0 && matched === total) {
      lastScore = 100;
      saveHistory(RATING_LEVELS[0]);
      showPraise(RATING_LEVELS[0], matched, total);
    } else {
      showTryAgain(matched, total);
    }
  });

  // 이번 제출로 그 레벨이 "방금 처음" 클리어됐는지(이미 클리어돼 있던 레벨을 다시 색칠한 게 아닌지) —
  // saveHistory에서 점수 저장 전/후 상태를 비교해 기록해두고, showPraise가 이 값으로만 축하를 띄운다.
  let justBecameLevelCleared = false;
  let justBecameBossCleared = false;

  function saveHistory(r) {
    const history = getHistory();
    history.push({
      date: new Date().toISOString(),
      template: currentTemplate ? currentTemplate.name : '',
      difficulty: currentTemplate ? currentTemplate.difficulty : null,
      score: lastScore,
      level: r.level,
      label: r.label
    });
    try {
      localStorage.setItem('coloringHistory', JSON.stringify(history));
    } catch (e) { /* 저장 공간 부족 시 무시 */ }
    justBecameLevelCleared = false;
    justBecameBossCleared = false;
    if (currentTemplate) {
      if (currentTemplate.isBoss) {
        const mode = currentTemplate.mode;
        const wasBossClearedBefore = isBossCleared(mode);
        markCleared(currentTemplate.id);
        saveScoreIfBest(currentTemplate.id, lastScore);
        if (lastScore === 100) {
          markBossCleared(mode);
          clearBossAttempt(mode); // 완주했으니 이 보스의 타임어택은 끝
        }
        justBecameBossCleared = !wasBossClearedBefore && lastScore === 100;
      } else {
        const wasClearedBefore = isLevelCleared(currentTemplate.difficulty);
        markCleared(currentTemplate.id);
        saveScoreIfBest(currentTemplate.id, lastScore);
        justBecameLevelCleared = !wasClearedBefore && isLevelCleared(currentTemplate.difficulty);
      }
    }
  }

  // 화면을 일찍 탭해서 닫아도(아래 praiseOverlay 클릭 핸들러) 이 타이머가 안 지워지고 남아있다가,
  // 1.8초 뒤 엉뚱한 시점(예: 다음 그림을 이미 열었거나 보스 도전 중)에 몰래 goHome()을 한 번 더
  // 불러서 상태를 헝클어뜨리는 버그가 있었음(보스 승리 직후 currentBossMode가 갑자기 null로
  // 리셋되는 원인 — 헤드리스 전체 클리어 검증 중 발견, 2026-08-10). 타이머 id를 들고 있다가
  // 조기 종료/재호출 시 반드시 지운다.
  let praiseHomeTimer = null;

  function showPraise(r, matched, total) {
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    if (justBecameBossCleared) {
      showBossFanfare();
      return;
    }
    praiseOverlay.classList.remove('fail');
    praiseEmoji.textContent = r.emoji;
    const justClearedLevel = justBecameLevelCleared;
    praiseText.textContent = justClearedLevel
      ? I18N.t('praise.clearSuffix', { label: ratingLabel(r.level) })
      : ratingLabel(r.level);
    praiseCount.textContent = I18N.t('praise.parts', { matched: matched, total: total });
    praiseOverlay.hidden = false;
    if (justClearedLevel) playExcellent();
    praiseHomeTimer = setTimeout(() => {
      praiseHomeTimer = null;
      praiseOverlay.hidden = true;
      goHome();
    }, 1800);
  }

  // 하나라도 틀리면 저장하지 않고 "다시 도전!"만 잠깐 보여준 뒤 색칠 화면에 그대로 머무른다
  // (색칠 화면을 떠난 적이 없으므로 별도 화면 전환 없이 오버레이만 닫으면 됨).
  function showTryAgain(matched, total) {
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    praiseOverlay.classList.add('fail');
    praiseEmoji.textContent = RATING_LEVELS[4].emoji;
    praiseText.textContent = ratingLabel(RATING_LEVELS[4].level);
    praiseCount.textContent = I18N.t('praise.partsRight', { matched: matched, total: total });
    praiseOverlay.hidden = false;
    praiseHomeTimer = setTimeout(() => {
      praiseHomeTimer = null;
      praiseOverlay.hidden = true;
      praiseOverlay.classList.remove('fail');
    }, 1800);
  }

  praiseOverlay.addEventListener('click', () => {
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    const wasFail = praiseOverlay.classList.contains('fail');
    praiseOverlay.hidden = true;
    if (wasFail) {
      praiseOverlay.classList.remove('fail');
    } else {
      goHome();
    }
  });

  // ================= 파이널 보스 축하(팡파레 + 컨페티 + 프린트 선물) =================
  const CONFETTI_COLORS = ['#FF5B5B', '#FFD166', '#8BD17C', '#4D96FF', '#8C7AE6', '#F368E0', '#F1C40F'];

  function spawnConfetti() {
    confettiLayer.innerHTML = '';
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('span');
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + '%';
      el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      el.style.animationDelay = (Math.random() * 0.6) + 's';
      el.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
      confettiLayer.appendChild(el);
    }
  }

  function showBossFanfare() {
    bossFanfareSub.textContent = I18N.t('bossFanfare.sub', {
      name: currentTemplate ? I18N.templateName(currentTemplate) : '',
      mode: currentBossMode ? modeLabel(currentBossMode) : ''
    });
    spawnConfetti();
    bossFanfareModal.hidden = false;
    playFirework();
    playBossVictory();
  }

  bossFanfareClose.addEventListener('click', () => {
    bossFanfareModal.hidden = true;
    goHome();
  });

  // 2026-08-11: 보스 클리어 화면의 "Print My Art / Print Blank Page" 버튼 삭제 요청 —
  // 그 버튼들만 쓰던 인쇄 기능(composePrintImage/doPrint)이라 통째로 제거.

  // ================= 효과음 =================
  function playPop() {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(760, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch (e) { /* 오디오 미지원 브라우저는 무시 */ }
  }

  // 보스 클리어 축하용 폭죽 소리 — 낮은 "펑"(발사) 한 번 + 높은 "반짝" 크래클 여러 번(피치를 살짝
  // 랜덤하게 섞어서 진짜 폭죽 터지는 느낌). 오디오 파일 없이 오실레이터로 합성(playPop과 같은 방식).
  function playFirework() {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const boom = audioCtx.createOscillator();
      const boomGain = audioCtx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(160, now);
      boom.frequency.exponentialRampToValueAtTime(60, now + 0.18);
      boomGain.gain.setValueAtTime(0.25, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      boom.connect(boomGain).connect(audioCtx.destination);
      boom.start(now);
      boom.stop(now + 0.22);
      for (let i = 0; i < 6; i++) {
        const t = now + 0.15 + i * 0.045 + Math.random() * 0.02;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const freq = 900 + Math.random() * 900;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.08);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      }
    } catch (e) { /* 오디오 미지원 브라우저는 무시 */ }
  }

  // 2026-08-11: "폰에 TTS 음성 자체가 안 깔려있어 음성 멘트가 전혀 안 들린다"는 제보 대응 —
  // 시스템에 TTS 음성이 하나도 없는 기기는 speak()를 불러봐야 에러 없이 조용히 실패하기만
  // 하므로, 그럴 땐 음성 대신 짧은 축하 차임(오실레이터 합성, 위 playPop/playFirework와 같은
  // 방식)을 대신 틀어서 최소한 반응하는 소리는 나게 한다.
  function playCheerChime() {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6, 신나는 상승 아르페지오
      notes.forEach((freq, i) => {
        const t = now + i * 0.09;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    } catch (e) { /* 오디오 미지원 브라우저는 무시 */ }
  }

  // 레벨을 클리어했을 때 "Excellent!"를 아이 목소리 느낌으로 읽어준다(브라우저 내장 음성합성 사용 —
  // 실제 아이 목소리 음원은 없으므로, 밝고 높은 톤(pitch/rate 상향)으로 흉내낸다).
  let cachedVoices = [];
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    cachedVoices = window.speechSynthesis.getVoices();
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  // 브라우저 내장 TTS엔 "나이" 파라미터가 없다 — 이름으로 추정해서 그나마 안 굵고 안 성인남성 같은
  // 목소리를 고르는 게 한계. child/kid/junior/young 표시가 있으면 최우선, 없으면 알려진 여성 계열
  // 이름(플랫폼별로 다 다름 — Windows/Android/iOS 흔한 이름 최대한 망라), 그것도 없으면 최소한
  // 남성으로 알려진 이름(david/mark/daniel/guy/alex 등)만이라도 피해서 고른다.
  function pickChildishVoice() {
    if (!cachedVoices.length) return null;
    const english = cachedVoices.filter((v) => /^en/i.test(v.lang));
    const pool = english.length ? english : cachedVoices;
    const knownMale = /david|mark|daniel|guy|alex\b|fred|ryan|christopher|eric|james/i;
    const knownYoungish = /female|zira|aria|jenny|samantha|karen|moira|tessa|susan|victoria|kate|allison|ava|serena|fiona|moira|salli|joanna|kendra|kimberly/i;
    return (
      pool.find((v) => /child|kid|junior|young/i.test(v.name)) ||
      pool.find((v) => knownYoungish.test(v.name)) ||
      pool.find((v) => !knownMale.test(v.name)) ||
      pool[0]
    );
  }

  // 2026-08-11: "Next/Back 누르면 소리가 1초 정도 뒤에 나온다" 제보 — 브라우저 TTS 엔진은 한동안
  // 안 쓰다가 처음 말할 때 엔진을 새로 띄우는 지연(콜드 스타트)이 있어서, 정작 Next/Back을 누른
  // 그 순간엔 이미 늦음. 맵 화면에 들어가는 시점(enterMapFromCover, 실제 버튼을 누르기 한참 전)에
  // 아무도 못 들을 만큼 작은 소리로 한 번 미리 말해서 엔진을 예열해두면, 그 뒤에 실제로 Next/Back을
  // 눌렀을 때는 엔진이 이미 켜져 있어 지연이 사라진다.
  let warmupUtterance = null;
  function warmUpSpeech() {
    if (!('speechSynthesis' in window)) return;
    try {
      const warm = new SpeechSynthesisUtterance('ready');
      warm.volume = 0.01;
      warm.rate = 10;
      warmupUtterance = warm; // GC 방지(위 pendingUtterance와 같은 이유)
      window.speechSynthesis.speak(warm);
    } catch (e) { /* 무시 */ }
  }

  // 레벨 클리어 때마다 매번 "Excellent!"만 나오면 금방 질리니 여러 문구 중 랜덤으로 고른다.
  // 감탄사(Wow/Yay/Woohoo)를 앞에 붙여서 그냥 단어 하나 읽는 것보다 "진짜 반응하는" 느낌이 나게 함
  // (2026-08-10, "대본 읽는 것처럼 들린다"는 피드백으로 추가 — Web Speech API는 SSML/억양 세부
  // 제어가 안 되니 톤(pitch)·속도(rate)를 매번 살짝 흔들고 감탄사로 흥을 더하는 정도가 현실적 한계).
  const LEVEL_CLEAR_PHRASES = [
    'Wow, excellent!', 'Yay, awesome!', 'Wow, great job!', 'Yay, amazing!', 'Woohoo, fantastic!',
    'Yes, you did it!', 'Woohoo, way to go!', 'Wow, wonderful!', 'Yay, you are a star!', 'Woohoo, super!'
  ];

  // opts.pitch/rate로 상황별 기본 톤을 다르게 줄 수 있음(칭찬은 더 신나게, 이름 안내는 차분하게).
  // 매번 완전히 똑같은 pitch/rate면 대본 읽듯 밋밋하게 들려서 호출마다 살짝 흔들어 자연스럽게 만든다.
  // 2026-08-11: 안드로이드 크롬은 배경음악/효과음(Web Audio)은 멀쩡히 나오는데 speechSynthesis만
  // 조용히 씹히는 경우가 있음 — 크롬의 알려진 버그로, speak()에 넘긴 SpeechSynthesisUtterance를
  // 다른 곳에서 아무도 참조하지 않으면 speak() 호출 직후 가비지컬렉터가 먼저 수거해버려서 실제
  // 재생 전에 사라진다(에러도 안 남). utter를 함수 스코프 밖의 변수에 붙잡아둬서 GC 대상에서
  // 빼는 게 알려진 우회법.
  let pendingUtterance = null;
  function speakPraise(phrase, opts) {
    if (!soundOn) return;
    if (!('speechSynthesis' in window) || !cachedVoices.length) {
      playCheerChime(); // 이 기기엔 TTS 음성이 없음 — 말 대신 차임으로 대체
      return;
    }
    opts = opts || {};
    try {
      const utter = new SpeechSynthesisUtterance(phrase);
      pendingUtterance = utter;
      const voice = pickChildishVoice();
      if (voice) utter.voice = voice;
      // 2026-08-10: "성인 목소리 같다"는 피드백으로 기본값을 API 상한(pitch 2.0)까지 밀어붙임 —
      // 이게 이 방식(성인 목소리 피치만 올리기)으로 갈 수 있는 진짜 한계치. 이걸로도 부족하면
      // 다음 단계는 파라미터 조정이 아니라 실제 아동 음성 AI로 고정 문구를 녹음해서 파일로 까는 것.
      const basePitch = opts.pitch != null ? opts.pitch : 2;
      const baseRate = opts.rate != null ? opts.rate : 1.15;
      utter.pitch = Math.min(2, Math.max(0.5, basePitch + (Math.random() - 0.5) * 0.3));
      utter.rate = Math.max(0.7, baseRate + (Math.random() - 0.5) * 0.15);
      utter.volume = 1;
      utter.onend = utter.onerror = () => {
        if (pendingUtterance === utter) pendingUtterance = null;
      };
      // 2026-08-11: "폰에서는 멘트가 안 나온다"는 제보로 발견 — 모바일(특히 iOS Safari, 안드로이드
      // 크롬도 유사)은 speak()를 사용자 탭 이벤트 호출 스택 안에서 완전히 동기적으로 불러야만
      // 소리가 나고, setTimeout으로 단 1틱만 늦춰도 "방금 사용자가 직접 눌렀다"는 트랜지언트
      // 액티베이션이 풀려서 조용히 무시된다. PC 크롬은 이 제약이 없어 지금까지 안 걸렸던 것뿐.
      // 그래서 speak()는 절대 지연 없이 바로 호출한다 — cancel()도 실제로 말하는 중일 때만
      // 그 자리에서 호출해서(평소엔 cancel 자체가 안 불림) "cancel 직후 바로 speak하면 씹히는"
      // 크롬 데스크톱 버그를 최대한 피한다.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.speak(utter);
    } catch (e) { /* 음성합성 미지원 브라우저는 무시 */ }
  }

  function playExcellent() {
    const phrase = LEVEL_CLEAR_PHRASES[Math.floor(Math.random() * LEVEL_CLEAR_PHRASES.length)];
    speakPraise(phrase, { pitch: 2, rate: 1.25 }); // 기본값보다도 더 빠르게 = 더 신난 느낌
  }

  function playBossVictory() {
    speakPraise('Woohoo! You defeated the final boss! You are a true champion!', { pitch: 2, rate: 1.2 });
  }

  btnSound.addEventListener('click', () => {
    soundOn = !soundOn;
    btnSound.textContent = soundOn ? '🔊' : '🔇';
  });

  // ================= 배경음악 =================
  // 2026-08-09에 레벨 구간별 3곡 전환 방식으로 만들었다가, 트랙 바뀔 때마다 몇 초씩 무음이
  // 생기는 문제가 나서(로딩 지연 — 프리로드로 완화는 했었음) 2026-08-10에 사용자 요청으로
  // "아기상어처럼 애들이 좋아할 만한 곡 하나"로 단순화. 트랙 전환 자체가 없어지니 그 무음 문제도
  // 근본적으로 사라짐. "Happy Adventure (Loop)" — TinyWorlds, opengameart.org, CC0(저작자 표시 불필요).
  const MUSIC_SRC = 'audio/bgm-happy-adventure.mp3';
  // 2026-08-11: 보스 화면에 들어가면 웅장한 느낌의 전용 곡으로 바뀌었다가, 나가면 원래 곡으로
  // 되돌아온다. "Battle RPG Theme" — Cleyton Kauffman(기존 배경음악과 같은 작곡가), CC0.
  const BOSS_MUSIC_SRC = 'audio/bgm-boss-battle.mp3';

  const MUSIC_KEY = 'musicOn';
  const bgm = document.getElementById('bgm');
  const BGM_VOLUME = 0.35;
  bgm.volume = BGM_VOLUME;
  bgm.src = MUSIC_SRC;
  bgm.loop = true;
  let currentBgmTrack = MUSIC_SRC;

  function isMusicOn() {
    const v = localStorage.getItem(MUSIC_KEY);
    return v === null ? true : v === '1'; // 기본값: 켜짐
  }

  function updateMusicButton() {
    btnMusic.textContent = isMusicOn() ? '🎵' : '🔇';
  }

  function tryPlayMusic() {
    if (!isMusicOn()) return;
    bgm.volume = BGM_VOLUME;
    bgm.play().catch(() => { /* 아직 사용자 상호작용 전이면 브라우저가 막음 — 다음 탭 때 다시 시도됨 */ });
  }

  // 보스 입장/퇴장 때 곡을 전환한다 — 이미 그 곡이면 아무것도 안 함(끊김/재시작 방지).
  function setBgmTrack(src) {
    if (currentBgmTrack === src) return;
    currentBgmTrack = src;
    const wasPlaying = !bgm.paused;
    bgm.src = src;
    bgm.volume = BGM_VOLUME;
    if (wasPlaying) tryPlayMusic();
  }

  btnMusic.addEventListener('click', () => {
    const next = !isMusicOn();
    try { localStorage.setItem(MUSIC_KEY, next ? '1' : '0'); } catch (e) { /* 무시 */ }
    updateMusicButton();
    if (next) tryPlayMusic(); else bgm.pause();
  });

  updateMusicButton();

  // ================= 네비게이션 =================
  btnHome.addEventListener('click', goHome);

  // ================= 표지 화면 =================
  // 2026-08-10: 보스가 손그림(svgArt, 이미 완성된 정답색이 마크업에 그대로 박혀있던 방식)에서
  // 다른 도안들과 같은 Twemoji 파일(assets/emoji/<id>.svg) 기반으로 바뀌면서, 표지 얼굴 아이콘도
  // 인라인 마크업 대신 그 파일을 <img>로 직접 불러오는 방식으로 바꿈 — 캐릭터 전체가 이미
  // 36x36 안에 알맞게 그려져 있어서(Twemoji 특유의 반신 구도) 예전처럼 얼굴만 잘라낼 필요가 없다.
  function renderCoverBosses() {
    coverBosses.innerHTML = '';
    MODE_ORDER.forEach((mode) => {
      const tpl = getBossTemplate(mode);
      if (!tpl) return;
      const item = document.createElement('div');
      // 모드별로 다른 CSS 애니메이션(요정=날개 퍼덕임, 인어=꼬리 흔들기, 마법사=지팡이 흔들기+
      // 반짝임)을 걸기 위한 클래스 — SVG 내부는 안 건드리고 컨테이너 transform + 오버레이 이펙트로
      // 흉내만 낸다(2026-08-11, "10분 안에 되는 방법" 요청). 히어로걸(veryhard)의 좌우 광선은
      // 요청으로 삭제(2026-08-11).
      item.className = 'cover-boss-item cover-boss-' + mode;
      const img = document.createElement('img');
      // 시작 화면은 소품(반짝이/조개 등) 없이 캐릭터만 있는 깔끔한 아이콘을 그대로 유지
      // (실제 색칠 화면의 boss-<id>.svg는 영역 수를 늘리려고 소품이 붙어서 따로 둠).
      img.src = 'assets/emoji/' + tpl.id + '-icon.svg';
      img.alt = I18N.templateName(tpl);
      item.appendChild(img);
      if (mode === 'hard') {
        const sparkle1 = document.createElement('span');
        sparkle1.className = 'boss-sparkle boss-sparkle-a';
        sparkle1.textContent = '✨';
        const sparkle2 = document.createElement('span');
        sparkle2.className = 'boss-sparkle boss-sparkle-b';
        sparkle2.textContent = '✨';
        item.appendChild(sparkle1);
        item.appendChild(sparkle2);
      }
      coverBosses.appendChild(item);
    });
  }

  function enterMapFromCover() {
    coverScreen.hidden = true;
    mapScreen.hidden = false;
    renderMap();
    // 2026-08-11: "스타트 화면에서 스타트 버튼 외 다른 곳 눌러도 음악 나옴" 제보 — 이전엔 화면
    // 아무 데나 처음 탭하면(document 전체에 pointerdown) 바로 배경음악이 시작돼서, 시작 화면을
    // 구경만 해도 음악이 나오고 있었음. Start를 눌러 다음(맵) 화면으로 넘어가는 이 시점에만
    // 음악을 시작하도록 변경(이 클릭 자체가 브라우저 자동재생 정책이 요구하는 "사용자 상호작용"도
    // 충족시킴).
    tryPlayMusic();
    warmUpSpeech();
  }

  btnCoverStart.addEventListener('click', () => {
    // 프로필(닉네임/국기)이 아직 없으면 맵으로 넘어가기 전에 딱 한 번만 물어본다.
    if (getPlayerProfile()) {
      enterMapFromCover();
    } else {
      playerInputName.value = '';
      populateFlagSelect(playerInputFlag);
      playerEntryModal.hidden = false;
    }
  });

  playerEntrySubmit.addEventListener('click', () => {
    // 2026-08-11: "닉네임/국가는 한 번 등록하면 수정 불가" 요청 — 여기서 저장하면 그 뒤로는
    // (getPlayerProfile()이 항상 truthy 객체를 반환하므로) 이 모달도, 랭킹 등록 모달의 입력칸도
    // 다시는 안 뜨고 표시만 된다.
    savePlayerProfile({
      nickname: playerInputName.value.trim() || I18N.t('anonymous'),
      flag: playerInputFlag.value || '🌍'
    });
    playerEntryModal.hidden = true;
    enterMapFromCover();
  });

  playerEntrySkip.addEventListener('click', () => {
    savePlayerProfile({ nickname: '', flag: '' }); // 다시 묻지 않도록 빈 프로필이라도 저장
    playerEntryModal.hidden = true;
    enterMapFromCover();
  });

  // 모바일 브라우저는 백그라운드에 있는 동안 setInterval을 최대한 늦게 돌린다(스로틀링) —
  // 그래서 레벨/보스 타임어택이 백그라운드 중에 실제로 만료돼도, 앱으로 돌아온 시점과 그
  // 만료 판정(updateLevelTimerDisplay 틱)이 실행되는 시점 사이에 잠깐 텀이 생겨서, 그 사이엔
  // 화면이 리셋 전 상태(예: ✓ 배지가 남은 갤러리)를 그대로 보여줄 수 있다. 다시 보이는 즉시
  // 지금 떠 있는 화면을 최신 localStorage 기준으로 강제로 다시 그려서 이 텀을 없앤다
  // (2026-08-11, "시간초과 확인 화면에 체크표시 남음" 리포트 대응).
  // 2026-08-11: "폰 화면 꺼도(백그라운드로 가도) 음악이 계속 나온다"는 제보 — 위 핸들러는
  // visible로 돌아올 때만 처리하고 hidden(화면 꺼짐/다른 앱 전환)될 때는 아무것도 안 해서,
  // <audio> 재생이 안 끊기고 배터리만 계속 소모하고 있었음. hidden이 되는 순간 직접 pause하고,
  // 다시 visible이 됐을 때(그리고 음악 설정이 켜져 있을 때만) 이어서 재생한다.
  let bgmWasPlayingBeforeHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      bgmWasPlayingBeforeHidden = !bgm.paused;
      bgm.pause();
      return;
    }
    updateLevelTimerDisplay(); // 만료됐으면 즉시 handleLevelTimeUp/handleBossTimeUp을 트리거
    if (!mapScreen.hidden) renderMap();
    else if (!galleryScreen.hidden) renderLevelGallery();
    if (bgmWasPlayingBeforeHidden) {
      bgmWasPlayingBeforeHidden = false;
      tryPlayMusic();
    }
  });

  // ================= 최초 실행 온보딩(보호자 확인 게이트 + 이용 안내 동의) =================
  // 2026-08-11: 앱스토어 출시(특히 어린이용 카테고리) 대비 추가. 최초 1회만 뜨고, 통과/동의하면
  // localStorage에 기록해서 다음부터는 바로 표지 화면으로 간다.
  const ONBOARDING_KEY = 'onboardingDone';

  function renderGateQuestion() {
    const a = 10 + Math.floor(Math.random() * 10); // 10~19
    const b = 10 + Math.floor(Math.random() * 10); // 10~19
    const correct = a + b;
    onboardingGateQuestion.textContent = a + ' + ' + b + ' = ?';
    const wrongPool = new Set();
    while (wrongPool.size < 3) {
      const delta = (1 + Math.floor(Math.random() * 5)) * (Math.random() < 0.5 ? -1 : 1);
      const wrong = correct + delta;
      if (wrong !== correct && wrong > 0) wrongPool.add(wrong);
    }
    const choices = [correct, ...wrongPool];
    for (let i = choices.length - 1; i > 0; i--) { // 셔플
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    onboardingGateChoices.innerHTML = '';
    choices.forEach((n) => {
      const btn = document.createElement('button');
      btn.textContent = n;
      btn.addEventListener('click', () => {
        if (n === correct) {
          onboardingGateRetry.hidden = true;
          onboardingGateStep.hidden = true;
          onboardingConsentStep.hidden = false;
        } else {
          onboardingGateRetry.hidden = false;
          renderGateQuestion(); // 새 문제로 다시(정답 외워서 통과하는 것 방지)
        }
      });
      onboardingGateChoices.appendChild(btn);
    });
  }

  onboardingConsentAgree.addEventListener('click', () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch (e) { /* 무시 */ }
    onboardingModal.hidden = true;
  });

  let onboardingDone = false;
  try { onboardingDone = localStorage.getItem(ONBOARDING_KEY) === '1'; } catch (e) { /* 무시 */ }
  if (!onboardingDone) {
    renderGateQuestion();
    onboardingModal.hidden = false;
  }

  // ================= 초기화 =================
  renderCoverBosses();
  renderMap();
  renderPalette();

  // 2026-08-11: 로딩 화면(마스코트) 추가 — 초기화는 사실 거의 즉시 끝나지만, 뜬 즉시 사라지면
  // 그냥 화면이 깜빡이는 것처럼 보여서 브랜딩 효과가 없다. 최소 노출시간(600ms)을 보장한 뒤
  // 페이드아웃하고 완전히 지운다(그 아래 온보딩/표지 화면은 이미 다 그려진 상태로 대기 중).
  const LOADING_MIN_MS = 600;
  const pageLoadStart = Date.now();
  function hideLoadingScreen() {
    const elapsed = Date.now() - pageLoadStart;
    const wait = Math.max(0, LOADING_MIN_MS - elapsed);
    setTimeout(() => {
      loadingScreen.classList.add('is-hiding');
      setTimeout(() => { loadingScreen.hidden = true; }, 400); // transition(0.35s)이 끝난 뒤 완전히 제거
    }, wait);
  }
  if (document.readyState === 'complete') hideLoadingScreen();
  else window.addEventListener('load', hideLoadingScreen);

  // 디버그/테스트용: 현재 도안의 채점 대상 영역 개수 확인
  window.__debugRegionCount = () => (currentGradableRegions ? currentGradableRegions.length : 0);

  // 디버그/테스트용: 현재 도안의 영역별 정답색(label -> hex) 확인 — 쉬움모드 실사색 정확도 검증용.
  window.__debugLabelColors = () => (currentLabelToColor ? Array.from(currentLabelToColor.entries()) : []);

  // 디버그/테스트용: 실제 openLevel(lv)을 그대로 호출 — __debugOpenTemplate만으로는 currentLevel이
  // 갱신되지 않아 레벨 클리어 시간 기록(recordLevelClearTime)/완주 체크(checkFullRunClear)가 전혀
  // 발동하지 않는다(2026-08-11 확인). 이 경로를 실제로 검증하려면 레벨 진입은 반드시 이 훅으로.
  window.__debugOpenLevel = (lv) => openLevel(lv);

  // 디버그/테스트용: 10레벨 완주 없이 랭킹 등록 모달을 바로 띄운다(잠금 상태/제출 흐름 검증용).
  window.__debugOpenRankingEntry = (mode, seconds) => openRankingEntryModal(mode, seconds);

  // 디버그/테스트용: id로 도안을 열고 영역 수/난이도/팔레트 크기/정답색 목록을 반환
  window.__debugOpenTemplate = (tplId) => new Promise((resolve) => {
    const bossTpl = Object.keys(window.BOSS_TEMPLATES || {}).map((m) => window.BOSS_TEMPLATES[m]).find((t) => t.id === tplId);
    const tpl = bossTpl || COLORING_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return resolve(null);
    openTemplate(tpl, () => {
      // 실제 화면에 그려진 팔레트 스와치를 그대로 읽는다(렌더팔레트가 currentLabelToColor 기반으로 동적 구성하므로)
      const paletteColors = Array.from(palette.querySelectorAll('.color-swatch')).map((el) => el.dataset.color);
      // 각 영역에서 "벽으로부터 가장 먼(가장 안전하게 탭할 수 있는) 지점"을 계산한다.
      // seed(첫 발견 픽셀)나 centroid(평균 좌표)는 곡선/오목한 모양에서 벽 위나 바깥에 걸릴 수 있어 부적합.
      const W = WORK_SIZE, H = WORK_SIZE;
      const distToWall = new Int32Array(W * H).fill(-1);
      {
        const q = new Int32Array(W * H);
        let qh = 0, qt = 0;
        for (let p = 0; p < W * H; p++) {
          if (wallMask[p] === 1) { distToWall[p] = 0; q[qt++] = p; }
        }
        while (qh < qt) {
          const p = q[qh++];
          const d = distToWall[p];
          const x = p % W, y = (p / W) | 0;
          if (x > 0 && distToWall[p - 1] === -1) { distToWall[p - 1] = d + 1; q[qt++] = p - 1; }
          if (x < W - 1 && distToWall[p + 1] === -1) { distToWall[p + 1] = d + 1; q[qt++] = p + 1; }
          if (y > 0 && distToWall[p - W] === -1) { distToWall[p - W] = d + 1; q[qt++] = p - W; }
          if (y < H - 1 && distToWall[p + W] === -1) { distToWall[p + W] = d + 1; q[qt++] = p + W; }
        }
      }
      const bestP = new Map(), bestD = new Map();
      for (let p = 0; p < W * H; p++) {
        const lbl = currentLabelMap[p];
        if (lbl === -1) continue;
        const d = distToWall[p];
        if (!bestD.has(lbl) || d > bestD.get(lbl)) { bestD.set(lbl, d); bestP.set(lbl, p); }
      }
      const centroids = currentGradableRegions.map((r) => bestP.get(r.label));
      const tapMargins = currentGradableRegions.map((r) => bestD.get(r.label)); // 640기준 px, 작을수록 탭하기 어려움
      resolve({
        id: tpl.id,
        difficulty: tpl.difficulty,
        regionCount: currentGradableRegions.length,
        paletteSize: paletteColors.length,
        targetColors: currentGradableRegions.map((r) => currentLabelToColor.get(r.label)),
        sizes: currentGradableRegions.map((r) => r.size),
        seeds: currentGradableRegions.map((r) => r.seed),
        centroids: centroids,
        tapMargins: tapMargins,
        paletteColors: paletteColors
      });
    });
  });

  // 디버그/테스트용: 챌린지 모드로 도안을 열어서(opts.challenge=true) 영역 수 확인
  window.__debugChallengeOpenTemplate = (tplId) => new Promise((resolve) => {
    const tpl = COLORING_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return resolve(null);
    openTemplate(tpl, () => resolve({ regionCount: currentGradableRegions.length }), { challenge: true });
  });

  // 디버그/테스트용: tolerance 값으로 computeCompletion 직접 호출(ColorTolerance 검증용)
  window.__debugComputeCompletion = (tolerance) => computeCompletion(tolerance);

  // challenge.js(app.js와 별도 스크립트/클로저)가 필요로 하는 DOM 참조·함수를 최소한으로 export.
  // app.js 전체가 하나의 IIFE라 goalCanvas/coloringScreen 같은 const는 물론, openTemplate/
  // computeCompletion/getTemplatesForLevel 같은 함수 선언도 스크립트 밖에서는 안 보인다
  // (2026-08-14 확인 — 계획 문서상 "전역 함수 선언이라 그대로 보인다"는 전제는 틀렸음). Task 4가
  // 쓸 것으로 예상되는 항목만 최소로 올린다.
  window.__challengeInternals = {
    goalCanvas,
    coloringScreen,
    openTemplate,
    computeCompletion,
    getTemplatesForLevel
  };

  // 디버그/테스트용: 열려 있는 도안의 모든 영역을 정답색으로 채운 뒤 성공률 계산(검증용)
  window.__debugSimulatePerfect = () => {
    if (!currentGradableRegions) return null;
    currentGradableRegions.forEach((r) => {
      const hex = currentLabelToColor.get(r.label);
      if (hex) floodFill(r.seed % WORK_SIZE, (r.seed / WORK_SIZE) | 0, hex);
    });
    const { matched, total } = computeCompletion();
    return { matched, total, score: total > 0 ? Math.round((matched / total) * 100) : 0 };
  };

  // localhost 로컬 미리보기에서는 서비스워커를 등록하지 않는다 — 한번 등록되면 서버/파일을
  // 아무리 새로 고쳐도 예전 캐시를 계속 우선해서 보여줘서 로컬 테스트할 때마다 혼란을 준다
  // (2026-08-09, 사용자가 로컬 미리보기에서 계속 옛날 버전만 보이던 문제로 발견). 실제 배포
  // 사이트(localhost가 아닌 진짜 도메인)에서는 그대로 정상 등록된다.
  const isLocalPreview = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && !isLocalPreview) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
