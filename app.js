(function () {
  'use strict';

  const WORK_SIZE = 640;           // 내부 작업 해상도(정사각형)
  const STROKE_COLOR = '#2b2b2b';
  const ALPHA_WALL_THRESHOLD = 20; // 이 값 이상 알파면 "선"으로 취급 (번짐 방지)
  const MIN_REGION_SIZE = 10;      // 이보다 작은 조각은 탭 불가능한 슬리버로 보고 채점 대상에서 제외

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
  // 2026-08-20: "챌린지 모드는 팔레트에 하늘색·회색도" 요청 — 팔레트 프레임 UI 전용 추가 색상
  // (기존 파랑 #2a78d6·검정 #2E2E2E과 헷갈리지 않게 톤 차이를 둠). 챌린지 모드 스와치 렌더링에서만 씀.
  const CHALLENGE_EXTRA_COLORS = ['#5BC8F2', '#9B9B9B'];
  // 2026-08-20: "위/아래/좌/우 사각 링 배치 — 유아 12개(색10+뒤로가기+완료), 챌린지 16개(색12+
  // 스킬1·2+뒤로가기+완료)" 요청 — 링 한 면당 개수가 딱 맞아떨어지려면 기본 스와치가 정확히 10개
  // 여야 한다. COLORS(11 = 10색+흰)는 targetPaletteForLevel 등 절차생성 로직이 그대로 쓰므로 안
  // 건드리고, 팔레트 UI 기본 표시용으로만 초록 계열 하나(teal, #1baf7a)를 뺀 10색 세트를 따로 둔다
  // (해당 색이 실제로 필요한 도안은 required 병합으로 여전히 자동 노출됨).
  const SWATCH_BASE_PALETTE = COLORS.filter((c) => c !== '#1baf7a');

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
  const REWARD_PUZZLE_SOLVED_KEY = 'rewardPuzzleSolved'; // { [mode]: { [level]: true } } — 한 번 푼 레벨은 다시 안 보여줌(아래 maybeShowRewardPuzzle 참고)
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
  // 2026-08-14: "인접 영역 다른 색" 원칙은 챌린지 모드 전용 — 유아모드는 실물에 최대한 가까운
  // 색을 보여줘야 해서 색을 임의로 바꾸면 안 됨(openTemplate opts.challenge로 판단).
  let currentIsChallenge = false;
  // 2026-08-17: "이미 클리어한 그림을 다시 열면 완성본만 보여달라" 요청 — true면 openTemplate이
  // 정답색으로 채워서 열고, 탭 채색/팔레트/완료 등 편집은 전부 막는다(보기 전용).
  let currentIsViewOnly = false;
  let selectedColor = COLORS[0];
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
  const btnCoverStartChallenge = document.getElementById('btn-cover-start-challenge');
  const playerEntryModal = document.getElementById('player-entry-modal');
  const playerInputName = document.getElementById('player-input-name');
  const playerInputFlag = document.getElementById('player-input-flag');
  const playerEntrySubmit = document.getElementById('player-entry-submit');
  const playerEntrySkip = document.getElementById('player-entry-skip');
  const mapScreen = document.getElementById('map-screen');
  const btnMapToCover = document.getElementById('btn-map-to-cover');
  const mapGrid = document.getElementById('map-grid');
  const galleryScreen = document.getElementById('gallery-screen');
  const coloringScreen = document.getElementById('coloring-screen');
  const galleryGrid = document.getElementById('gallery-grid');
  const levelReward = document.getElementById('level-reward');
  const levelRewardArt = document.getElementById('level-reward-art');
  const levelRewardPraise = document.getElementById('level-reward-praise');
  const rewardPuzzleTrayTop = document.getElementById('reward-puzzle-tray-top');
  const rewardPuzzleTrayBottom = document.getElementById('reward-puzzle-tray-bottom');
  const rewardPuzzleTargetGrid = document.getElementById('reward-puzzle-target-grid');
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
  // 2026-08-14 챌린지 모드 피드백: "60초 끝나면 지렁이가 오른쪽으로 사라지고, 다음 문제는
  // 다른 색 지렁이" — setWormExit()이 진행률을 1 밖으로 밀어서(overflow:hidden에 가려짐)
  // 오른쪽으로 빠져나가는 것처럼 보이게 하고, resetWormForNewProblem()이 새 색을 입힌 뒤
  // transition 없이 순간이동으로 왼쪽 끝(0)에 다시 세운다.
  function setWormExit() {
    goalPanelEl.style.setProperty('--worm-progress', 1.6);
  }
  function resetWormForNewProblem(dot, a, b) {
    goalPanelEl.style.setProperty('--worm-color-dot', dot);
    goalPanelEl.style.setProperty('--worm-color-a', a);
    goalPanelEl.style.setProperty('--worm-color-b', b);
    goalPanelEl.classList.add('worm-no-transition');
    goalPanelEl.style.setProperty('--worm-progress', 0);
    void goalPanelEl.offsetWidth; // 강제 리플로우 — transition 없이 이 위치로 순간이동
    goalPanelEl.classList.remove('worm-no-transition');
  }
  const goalZoomModal = document.getElementById('goal-zoom-modal');
  const goalZoomCanvas = document.getElementById('goal-zoom-canvas');
  const tapLayer = document.getElementById('tap-layer');
  const regionStagePraise = document.getElementById('region-stage-praise');
  const pictureCompletePraise = document.getElementById('picture-complete-praise');
  const paletteTop = document.getElementById('palette-top');
  const paletteBottom = document.getElementById('palette-bottom');
  const paletteLeft = document.getElementById('palette-left');
  const paletteRight = document.getElementById('palette-right');
  const cornerTR = document.getElementById('corner-tr');
  const cornerBL = document.getElementById('corner-bl');
  const frameTop = document.getElementById('frame-top');
  const btnSkill1 = document.getElementById('btn-skill1');
  const btnSkill2 = document.getElementById('btn-skill2');
  const btnHome = document.getElementById('btn-home');
  const btnBack = document.getElementById('btn-back');
  const btnSound = document.getElementById('btn-sound');
  const btnMusic = document.getElementById('btn-music');
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
  let lastRegionStageShown = 0; // 지금 도안에서 마지막으로 보여준 구역별 칭찬 단계(openTemplate에서 리셋)
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

  // 2026-08-14: "영역 수 적은 도안부터 나와야 한다" — 유아모드 갤러리/챌린지모드 문제 순서
  // 둘 다 이 함수 하나를 쓰므로, 여기서 한 번만 TEMPLATE_REGION_COUNTS 기준 오름차순 정렬하면
  // 두 모드 모두에 적용된다.
  function getTemplatesForLevel(level) {
    return COLORING_TEMPLATES
      .filter((t) => t.difficulty === level)
      .slice()
      .sort((a, b) => (TEMPLATE_REGION_COUNTS[a.id] || 0) - (TEMPLATE_REGION_COUNTS[b.id] || 0));
  }

  // 2026-08-14: "챌린지모드 보통/어려움/매우어려움은 유아모드와 다른 이미지" 요청 — 별도
  // 배열(CHALLENGE_TIER_TEMPLATES, templates.js)에서 티어+레벨로 10개를 가져온다. 유아모드가
  // 쓰는 COLORING_TEMPLATES/getTemplatesForLevel과는 완전히 분리돼 있어 서로 안 섞인다.
  function getChallengeTierTemplates(tier, level) {
    return CHALLENGE_TIER_TEMPLATES
      .filter((t) => t.challengeTier === tier && t.challengeLevel === level)
      .slice()
      .sort((a, b) => (CHALLENGE_TIER_REGION_COUNTS[a.id] || 0) - (CHALLENGE_TIER_REGION_COUNTS[b.id] || 0));
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

    // 2026-08-17: "초기화하면 처음부터 다시 진행해야 한다" — 보상 퍼즐 영구기록도 그 모드만 지운다.
    // 안 지우면 초기화 후 레벨을 처음부터 다시 깨도 예전에 풀어놨던 기록 때문에 보상 퍼즐이 다시는 안 뜬다.
    try {
      const solved = JSON.parse(localStorage.getItem(REWARD_PUZZLE_SOLVED_KEY) || '{}');
      delete solved[mode];
      localStorage.setItem(REWARD_PUZZLE_SOLVED_KEY, JSON.stringify(solved));
    } catch (e) { /* 무시 */ }

    // 2026-08-16: "리셋하고 레벨1 들어가니 아래 박스가 안나와" 버그 — renderQueue()가 세션 중
    // "지금 화면에 보이는 2개"를 queueByLevel에 캐싱해두는데, 리셋 전에 그 레벨을 이미 100%
    // 클리어한 적이 있으면 캐시가 빈 배열([])로 남아있다. 빈 배열도 truthy라 renderQueue의
    // "최초 진입" 분기를 안 타고 그 빈 캐시를 그대로 다시 그려서 대기열이 계속 비어 보였다.
    // 리셋 시 이 캐시를 통째로 지워서 다음 진입 때 새로 계산하게 한다.
    Object.keys(queueByLevel).forEach((k) => delete queueByLevel[k]);
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

  // 2026-08-17: "Back으로 예전에 클리어한 레벨에 다시 들어가면 보상 퍼즐이 또 뜬다" 버그 수정 —
  // 예전엔 "이번 세션에 이미 풂"만 메모리(rewardPuzzleSolvedLevels)로 기억해서, 새로고침하거나
  // 다른 세션에서 다시 들어가면 매번 재생됐다. localStorage에 영구 기록해서 한 번 풀면 다신
  // 안 뜨게 한다.
  function isRewardPuzzleSolvedPersisted(level) {
    try {
      const all = JSON.parse(localStorage.getItem(REWARD_PUZZLE_SOLVED_KEY) || '{}');
      return !!(all[getMode()] || {})[level];
    } catch (e) { return false; }
  }
  function markRewardPuzzleSolvedPersisted(level) {
    try {
      const all = JSON.parse(localStorage.getItem(REWARD_PUZZLE_SOLVED_KEY) || '{}');
      const mode = getMode();
      const solved = all[mode] || (all[mode] = {});
      solved[level] = true;
      localStorage.setItem(REWARD_PUZZLE_SOLVED_KEY, JSON.stringify(all));
    } catch (e) { /* 무시 */ }
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
  // 2026-08-14: "유아용 모드는 시간 압박 없이" 요청 — 시간초과로 진행상황을 몰래 리셋하던
  // budget 만료 판정을 제거. 이제 이 시작 시각은 오직 경과시간 표시(카운트업)용으로만 쓰인다.
  function startOrResumeLevelAttempt(level) {
    const attempts = getLevelAttempts();
    if (attempts[level]) return; // 이미 시작 시각이 있으면 그대로 이어감
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
    // 2026-08-14: "시간 압박 없이, 완료시간만 표기" 요청 — 남은시간 카운트다운 대신
    // 경과시간 카운트업만 보여준다. 시간초과 리셋 없음.
    const text = '⏱ ' + formatMMSS((Date.now() - start) / 1000);
    if (!galleryScreen.hidden) {
      levelNextBanner.hidden = false;
      levelNextText.textContent = text;
    } else {
      coloringTimerText.hidden = false;
      coloringTimerText.textContent = text;
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
    // 2026-08-16: 아이콘 전용 버튼(🔄)으로 바뀌면서 텍스트는 aria-label로만 남음(data-i18n-aria-label,
    // applyStatic()이 처리).
    btnResetAll.hidden = doneCount === 0;

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
      // 2026-08-16: "스크롤 없이 한 화면에" 요청으로 카드가 작아지면서, 10개 카드마다 매번
      // 반복되던 "레벨" 글자 줄은 뺐다(숫자만으로도 어떤 카드인지 충분히 구분됨).
      let inner = '<span class="lv-preview-emoji">' + previewEmoji + '</span>' +
        '<span class="lv-num">' + lv + '</span>';
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
    // 2026-08-14: 난이도 selector를 없애서 유아용 모드는 이제 easy 하나만 실제로 도달 가능하다.
    // MODE_ORDER(4개) 그대로 돌리면 normal/hard/veryhard 보스 카드가 영원히 잠긴 채로만 보여서
    // easy만 순회하도록 범위를 좁힌다(표지 화면의 장식용 보스 4종 로우는 순수 장식이라 그대로 둠).
    ['easy'].forEach((mode) => {
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
    clearPendingCelebrationOverlays();
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

  // 2026-08-14: "유아모드에서 첫화면으로 돌아가는 버튼 필요" 요청
  btnMapToCover.addEventListener('click', () => {
    mapScreen.hidden = true;
    coverScreen.hidden = false;
  });

  btnResetAll.addEventListener('click', () => {
    const mode = getMode();
    if (!window.confirm(I18N.t('confirm.resetMode'))) return;
    resetModeProgress(mode);
    renderMap();
  });

  btnLevelNext.addEventListener('click', () => {
    playPop();
    const nextLevel = currentLevel + 1;
    if (nextLevel <= TOTAL_LEVELS && isLevelUnlocked(nextLevel)) {
      openLevel(nextLevel);
    } else {
      goToMap();
    }
  });

  btnLevelBack.addEventListener('click', () => {
    playPop();
    if (currentLevel > 1) openLevel(currentLevel - 1);
  });

  // ================= 레벨별 도안 갤러리 =================
  function openLevel(level) {
    clearPendingCelebrationOverlays();
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

  // 2026-08-16: 레벨별 "퍼즐 조각 보상" 그래픽 — 실제 트위모지 이모지 그림을 그 레벨의 그림
  // 개수만큼(1/10레벨=12칸, 2~9레벨=10칸) 격자로 나눠서 씌워놓고, 그림을 완료할 때마다 칸이
  // 하나씩 열리며 안의 실제 이모지가 드러난다. 정원이 다 채워지면 완성 연출이 재생된다.
  function gridDims(n) {
    return n === 12 ? { cols: 4, rows: 3 } : { cols: 5, rows: 2 };
  }

  // 2026-08-16: "날아가서 사라지는 로켓/풍선/기차는 효과가 큰데 나머지는 밋밋하다" 피드백으로
  // 화면에 남는 7개 레벨(2/3/5/6/7/9/10)에도 그림마다 다른 완성 연출을 추가. 별/색종이/꽃잎처럼
  // 여러 조각을 흩뿌리는 효과는 매번 마크업을 새로 안 쓰고 좌표 배열만 넘기면 되도록 작은
  // 헬퍼로 만들어둠.
  // 2026-08-16: "반짝임이 위치가 다 뭉쳐서 한 점에 찍힌다" 버그 — SVG 요소에 위치용
  // transform="translate(...)" 속성을 걸어두고 그 위에 CSS 애니메이션으로도 transform(scale/
  // translate 등)을 주면, CSS 쪽이 속성을 완전히 덮어써서(합쳐지지 않음) 위치가 통째로
  // 사라지고 전부 원점 부근에 겹쳐버림. 그래서 각 조각을 "위치만 잡는 바깥 <g>"와 "애니메이션만
  // 받는 안쪽 도형"으로 분리 — 바깥 transform 속성과 안쪽 CSS transform 애니메이션이 서로 다른
  // 요소에 있으면 정상적으로 합쳐짐(부모 좌표계 위에서 자식이 움직임).
  const SPARKLE_PATH = 'M0,-4 L1,-1 L4,0 L1,1 L0,4 L-1,1 L-4,0 L-1,-1 Z';
  // points: [x, y, scale]
  function sparkleGroup(cls, points) {
    return '<g class="' + cls + '" aria-hidden="true">' +
      points.map(([x, y, s]) =>
        '<g transform="translate(' + x + ',' + y + ') scale(' + (s || 1) + ')">' +
        '<path class="reward-sparkle" d="' + SPARKLE_PATH + '"/>' +
        '</g>'
      ).join('') +
      '</g>';
  }
  // 로켓(레벨1) 전용 — 완성 후 꼬리(화염) 쪽에서 반짝이는 별빛. 불꽃 자체가 노란색이라
  // 반짝이(금색)를 불꽃 위에 얹으면 색이 묻혀 안 보이므로, 불꽃 바로 옆 크림색 배경 쪽
  // (화면 왼쪽 가장자리)에 배치해서 대비가 나게 함.
  const ROCKET_SPARKLES = sparkleGroup('reward-sparkles', [[6, 55, 0.9], [3, 74, 1], [9, 90, 0.8]]);

  // 2026-08-17: "레벨1 불꽃 반짝임처럼 나머지 레벨에도 그 탈것다운 장식 넣어줘" 요청 —
  // 원마다 다른 작은 포인트 장식(연기/물방울/구름/스피드선 등)을 완성 시 재생.
  // points: [x, y, r] — 연기/구름/물방울처럼 둥근 뭉치용.
  function puffGroup(cls, points) {
    return '<g class="' + cls + '" aria-hidden="true">' +
      points.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>').join('') +
      '</g>';
  }
  // points: [x1, y1, x2, y2] — 스피드선/바람 소용돌이처럼 짧은 선용.
  function lineGroup(cls, points) {
    return '<g class="' + cls + '" aria-hidden="true">' +
      points.map(([x1, y1, x2, y2]) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>').join('') +
      '</g>';
  }
  const DECOR_BY_EMOJI = {
    motorcycle: () => lineGroup('reward-decor-lines', [[62, 30, 82, 26], [64, 40, 86, 38], [60, 50, 80, 52]]),
    canoe: () => puffGroup('reward-decor-drops', [[68, 62, 2.2], [74, 70, 1.6], [64, 72, 1.8]]),
    balloon: () => sparkleGroup('reward-decor-hearts', [[38, 56, 0.8], [62, 53, 0.9]]),
    bicycle: () => lineGroup('reward-decor-lines', [[62, 32, 84, 28], [64, 42, 86, 40], [60, 52, 80, 54]]),
    helicopter: () => puffGroup('reward-decor-swirl', [[30, 78, 3], [46, 82, 2.2], [62, 78, 2.6]]),
    // 2026-08-17: "비행기는 뭉게구름 말고 일직선 잔상(비행운), 각각 엔진 뒤에" 요청 —
    // airplane.svg의 회색 사각 엔진 마크 2개(원본 좌표 약 (30,21)/(15,6)) 바로 뒤에서
    // 대각선(꼬리 방향, 진행 반대)으로 뻗는 곧은 선.
    airplane: () => lineGroup('reward-decor-contrail', [[75, 55, 50, 80], [42, 20, 18, 44]]),
    train: () => puffGroup('reward-decor-smoke', [[26, 14, 3.2], [20, 6, 2.6], [32, 4, 2.2]]),
    racingcar: () => lineGroup('reward-decor-lines', [[62, 30, 84, 26], [64, 40, 86, 38], [60, 50, 80, 52]]),
    scooter: () => lineGroup('reward-decor-lines', [[62, 34, 84, 30], [64, 44, 86, 42], [60, 54, 80, 56]]),
  };

  // 카누(레벨3) 전용 — "노젓는 애니메이션" 요청. canoe.svg를 <image href>로 통째로 박으면
  // 노만 따로 움직일 수 없어서, 원본 path를 배(선체+물)와 노(대각선 주황/노랑 두 조각)로
  // 나눠 인라인으로 그린다. 좌표계 변환은 다른 인라인 이모지(관람차 등)와 같은 방식
  // (원본 padded viewBox -3.6~39.6을 0~100으로 맞춤: scale 2.3148, offset 8.333).
  const CANOE_HULL =
    '<path fill="#DD2E44" d="M33.793 17S32.476 20 18 20C3.523 20 1.973 17 1.973 17S-1 22.117 4.802 25c4.238 2.105 10.916-.131 12.723-.814 1.991.683 9.274 2.824 13.557.814 5.862-2.751 2.711-8 2.711-8z"/>' +
    '<path fill="#55ACEE" d="M0 24h36v12H0z"/>';
  const CANOE_PADDLE =
    '<path fill="#FFAC33" d="M27.005 25.389c.206 0 .412-.079.569-.236.315-.315.315-.824 0-1.139l-8.861-8.86c-.315-.315-.824-.315-1.139 0-.315.315-.315.824 0 1.139l8.861 8.86c.158.157.364.236.57.236z"/>' +
    '<path fill="#FFCC4D" d="M29.316 28.505c.412 0 .825-.157 1.139-.472.629-.629.629-1.649 0-2.278l-2.416-2.416c-.629-.629-1.65-.629-2.278 0-.629.629-.629 1.649 0 2.278l2.416 2.416c.314.315.727.472 1.139.472z"/>';
  const CANOE_INLINE =
    '<g class="reward-emoji-img" transform="translate(8.333,8.333) scale(2.3148)">' +
    '<g>' + CANOE_HULL + '</g>' +
    '<g class="reward-paddle">' + CANOE_PADDLE + '</g>' +
    '</g>';

  // 바퀴 달린 탈것들(자전거/오토바이/기차/경주차/스쿠터) 전용 — "바퀴가 돌아가는 애니메이션"
  // 요청. 각 원본 SVG의 바퀴(원 2개짜리 쌍, 좌우 대칭)만 따로 묶어 자기 중심(fill-box)으로
  // 계속 회전시킨다. wheelGroup(d들)로 바퀴 하나를 감싸는 헬퍼.
  function wheelGroup(inner) {
    return '<g class="reward-bike-wheel">' + inner + '</g>';
  }

  // 자전거(레벨5) — 원본 bicycle.svg의 바퀴 path(검정, 원 2개 x 좌우 2쌍)를 바퀴 하나씩
  // 분리. 나머지(빨간 프레임/분홍 페달암/안장)는 고정.
  const BICYCLE_WHEEL_L = wheelGroup('<path fill="#292F33" d="M7 22c-3.866 0-7 3.134-7 7s3.134 7 7 7 7-3.134 7-7-3.133-7-7-7zM7 34c-2.761 0-5-2.238-5-5s2.239-5 5-5 5 2.238 5 5-2.238 5-5 5z"/>');
  const BICYCLE_WHEEL_R = wheelGroup('<path fill="#292F33" d="M29 22c-3.865 0-7 3.134-7 7s3.135 7 7 7c3.867 0 7-3.134 7-7s-3.133-7-7-7zM29 34c-2.761 0-5-2.238-5-5s2.239-5 5-5c2.762 0 5 2.238 5 5s-2.238 5-5 5z"/>');
  const BICYCLE_INLINE =
    '<g class="reward-emoji-img" transform="translate(8.333,8.333) scale(2.3148)">' +
    '<path fill="#EA596E" d="M7 24c1.957 0 3.633 1.135 4.455 2.772l3.477-1.739C13.488 22.058 10.446 20 6.916 20c-1.301 0-2.534.285-3.649.787l1.668 3.67C5.566 24.17 6.262 24 7 24zm22 0c1.467 0 2.772.643 3.688 1.648l2.897-2.635C33.952 21.169 31.573 20 28.916 20c-3.576 0-6.652 2.111-8.073 5.15l3.648 1.722C25.293 25.18 27.003 24 29 24z"/>' +
    BICYCLE_WHEEL_L + BICYCLE_WHEEL_R +
    '<path fill="#DD2E44" d="M29.984 28.922c-.005-.067-.021-.132-.04-.198-.019-.065-.04-.126-.071-.186-.013-.024-.015-.052-.029-.075l-7-11c-.297-.466-.914-.604-1.381-.307-.299.19-.444.513-.445.843H12c-.552 0-1 .447-1 1 0 .553.448 1 1 1h10c.027 0 .05-.014.077-.016L27.178 28H18c-.552 0-1 .447-1 1s.448 1 1 1h11.001c.116 0 .23-.028.343-.069.034-.013.064-.027.097-.043.031-.017.066-.024.097-.044.03-.02.048-.051.075-.072.055-.044.103-.089.147-.143.041-.049.074-.099.104-.154.03-.056.055-.11.075-.172.021-.066.033-.132.04-.201.004-.036.021-.066.021-.102 0-.027-.014-.051-.016-.078z"/>' +
    '<path fill="#DD2E44" d="M21.581 16l-2.899 8.117-5.929-6.775c-.364-.415-.996-.459-1.411-.094-.415.364-.457.995-.094 1.411l6.664 7.615-.854 2.39c-.185.519.086 1.092.606 1.277.111.04.224.059.336.059.411 0 .796-.255.942-.664L23.705 16h-2.124z"/>' +
    '<path fill="#DD2E44" d="M7 30c-.15 0-.303-.034-.446-.105-.494-.247-.694-.848-.447-1.342l3.062-6.106C9.186 22.419 11 19.651 11 17c0-3.242-2.293-4.043-2.316-4.051-.524-.175-.807-.741-.632-1.265.174-.524.739-.81 1.265-.632C9.467 11.102 13 12.333 13 17c0 3.068-1.836 6.042-2.131 6.497l-2.974 5.949C7.72 29.798 7.367 30 7 30z"/>' +
    '<path fill="#292F33" d="M14.612 13.663c-.054 0-.11-.004-.165-.014l-6-1c-.544-.091-.913-.606-.822-1.151.091-.544.601-.913 1.151-.822l6 1c.544.091.913.606.822 1.151-.082.489-.506.836-.986.836zM26.383 17c-.03 0-.059-.002-.089-.006l-5.672-.708c-.372-.046-.644-.374-.62-.748.023-.374.333-.665.707-.665.041 0 4.067-.018 5.989-1.299.25-.167.582-.157.824.026.239.185.337.501.241.788l-.709 2.127c-.096.293-.369.485-.671.485z"/>' +
    '<path fill="#66757F" d="M20 29c0 1.104-.895 2-2 2-1.104 0-2-.896-2-2s.896-2 2-2c1.105 0 2 .896 2 2z"/>' +
    '</g>';

  // 오토바이(레벨2) — 원본 motorcycle.svg의 바퀴(테두리+타이어 각 2쌍)를 바퀴 하나씩 분리.
  const MOTO_WHEEL_L = wheelGroup(
    '<path fill="#99AAB5" d="M6.5 24C3.462 24 1 26.463 1 29.5S3.462 35 6.5 35s5.5-2.463 5.5-5.5S9.538 24 6.5 24zM6.5 33C4.567 33 3 31.433 3 29.5S4.567 26 6.5 26s3.5 1.567 3.5 3.5S8.433 33 6.5 33z"/>' +
    '<path fill="#292F33" d="M6.5 22.914c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5 6.5-2.91 6.5-6.5-2.91-6.5-6.5-6.5zM6.5 33.914c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5z"/>'
  );
  const MOTO_WHEEL_R = wheelGroup(
    '<path fill="#99AAB5" d="M29.5 24c-3.037 0-5.5 2.463-5.5 5.5s2.463 5.5 5.5 5.5 5.5-2.463 5.5-5.5-2.463-5.5-5.5-5.5zM29.5 33c-1.934 0-3.5-1.567-3.5-3.5s1.566-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.566 3.5-3.5 3.5z"/>' +
    '<path fill="#292F33" d="M29.5 22.914c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5 6.5-2.91 6.5-6.5-2.91-6.5-6.5-6.5zM29.5 33.914c-2.485 0-4.5-2.015-4.5-4.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5z"/>'
  );
  const MOTORCYCLE_INLINE =
    '<g class="reward-emoji-img" transform="translate(8.333,8.333) scale(2.3148)">' +
    MOTO_WHEEL_L + MOTO_WHEEL_R +
    '<path fill="#77B255" d="M7.001 27.051c-2 4 .999 2.587 1.999.587.905-1.811 3.444-2.429 4.66-.375C12.708 24.213 9.863 22 6.5 22c-1.374 0-2.657.375-3.764 1.02 2.833.165 5.366 1.831 4.265 4.031z"/>' +
    '<path fill="#99AAB5" d="M30 29c0 .553-.447 1-1 1h-9c-.553 0-1-.447-1-1 0-.553.447-1 1-1h9c.553 0 1 .447 1 1z"/>' +
    '<path fill="#99AAB5" d="M29.923 30.306c-.433.344-1.062.272-1.405-.161L22.917 23.1c-.344-.433-.271-1.062.16-1.405.433-.344 1.062-.272 1.405.161l5.601 7.045c.344.432.271 1.061-.16 1.405z"/>' +
    '<path fill="#CCD6DD" d="M12.463 20.367c.466.297.602.915.304 1.381L7.918 29.33c-.298.465-.916.602-1.381.303-.466-.297-.602-.915-.304-1.381l4.849-7.582c.298-.465.916-.602 1.381-.303z"/>' +
    '<path fill="#77B255" d="M10.529 17.368C9.718 17.953 6 19 9 21s5.094 4.125 5.094 6c0 2.665-.656 4 .906 4h7s-1-4 2-7 5-2 8-3c1.897-.633 4-2 4-3s0-2-2-1-1 1.551-3 .551-3.16.449-4.16.449-7.614 1.68-8.62-.049C17.667 17 16.434 16 14.616 16c-1.318 0-3.116.667-4.087 1.368z"/>' +
    '<path fill="#66757F" d="M21 29c0 1.104-.895 2-2 2-1.104 0-2-.896-2-2s.896-2 2-2c1.105 0 2 .896 2 2z"/>' +
    '<path fill="#CCD6DD" d="M25.8 27.975l9.277-3.732 1.12 2.783-9.278 3.732z"/>' +
    '<path fill="#FFF" d="M26.173 28.902l9.277-3.732.373.928-9.277 3.732z"/>' +
    '<path fill="#66757F" d="M26.546 29.83l9.277-3.731.373.927-9.277 3.732z"/>' +
    '<path fill="#292F33" d="M19 18.137c1.366.385 5.645-.007 6.802-.098 1.157-.09 1.594.451 0 1.25C24 20.19 20.188 22.45 19 22.914c-.998.391-4.5-1.211-4.917-1.696-.416-.486 3.745-3.411 4.917-3.081zM34 17c-1.549.04-3 0-4 0s-1.158 1.102 1.549 1.102S34 17 34 17z"/>' +
    '<path fill="#77B255" d="M3.736 16.958c0-1.465 4.456-5.134 3.975-4.476-1.15 1.573-.489 3.476 1.487 3.476S11.907 22.477 9 21c-2.907-1.477-5.264-3.323-5.264-4.042z"/>' +
    '<path fill="#CCD6DD" d="M8.606 10.569c.704.61.345 1.692-1.045 3.485-1.391 1.793-3.583 2.521-2.359.542s3.404-4.027 3.404-4.027z"/>' +
    '<path fill="#66757F" d="M10.529 17.368c-.19.476-.73.706-1.206.516l-.134-.054c-.476-.19-.707-.73-.516-1.206l.798-1.992c.19-.476.73-.707 1.206-.516l.135.054c.476.19.707.73.516 1.206l-.799 1.992z"/>' +
    '<path fill="#292F33" d="M12.911 13.991c.094.26-.04.546-.3.64l-1.881.679c-.26.094-.546-.041-.64-.301-.094-.26.04-.546.3-.64l1.881-.679c.26-.094.546.041.64.301z"/>' +
    '</g>';

  // 기차(레벨8) — train.svg는 바퀴가 이미 개별 <circle>이라 그대로 묶기만 하면 됨(앞바퀴 2개
  // + 뒷바퀴 2개, 4개 전부 회전).
  const TRAIN_WHEELS = [
    wheelGroup('<circle fill="#58595B" cx="6.999" cy="32" r="3"/><circle fill="#A0041E" cx="6.999" cy="32" r="1.5"/>'),
    wheelGroup('<circle fill="#58595B" cx="12.999" cy="32" r="3"/><circle fill="#A0041E" cx="12.999" cy="32" r="1.5"/>'),
  ];
  const TRAIN_WHEELS2 = [
    wheelGroup('<circle fill="#58595B" cx="29.999" cy="31" r="4"/><circle fill="#A0041E" cx="29.999" cy="31" r="2"/>'),
    wheelGroup('<circle fill="#58595B" cx="21.999" cy="31" r="4"/><circle fill="#A0041E" cx="21.999" cy="31" r="2"/>'),
  ];
  const TRAIN_INLINE =
    '<g class="reward-emoji-img" transform="translate(8.333,8.333) scale(2.3148)">' +
    '<path fill="#939598" d="M0 34h36v2H0z"/>' +
    '<path fill="#231F20" d="M6 27h29v5H6z"/>' +
    TRAIN_WHEELS.join('') +
    '<path fill="#DD2E44" d="M5 33H1c-1 0-1.5-.5 0-2l4-4c1-1 2-2.001 2 0v4c0 2-.001 2-2 2z"/>' +
    '<path fill="#231F20" d="M8 20c0 3.313-1.343 6-3 6s-3-2.687-3-6c0-3.314 1.343-6 3-6s3 2.686 3 6z"/>' +
    '<path fill="#6D6E71" d="M11 15H7L5 7h8z"/>' +
    '<path fill="#414042" d="M26 25c0 1.104-.896 2-2 2H6c-1.104 0-2-.896-2-2V15c0-1.104.896-2 2-2h18c1.104 0 2 .896 2 2v10z"/>' +
    '<path fill="#C1694F" d="M13 26c0 .553-.448 1-1 1s-1-.447-1-1V13c0-.552.448-1 1-1s1 .448 1 1v13zm6 0c0 .553-.447 1-1 1-.553 0-1-.447-1-1V13c0-.552.447-1 1-1 .553 0 1 .448 1 1v13z"/>' +
    '<path fill="#808285" d="M36 26c0 .553-.447 1-1 1H7c-.552 0-1-.447-1-1 0-.553.448-1 1-1h28c.553 0 1 .447 1 1z"/>' +
    TRAIN_WHEELS2.join('') +
    '<path fill="#414042" d="M12 3H6c-.552 0-1 .448-1 1v3h8V4c0-.552-.448-1-1-1z"/>' +
    '<path fill="#BE1931" d="M23 7h12v18H23z"/>' +
    '<path fill="#A0041E" d="M36 6c0 .552-.447 1-1 1H23c-.553 0-1-.448-1-1s.447-1 1-1h12c.553 0 1 .448 1 1z"/>' +
    '<path fill="#EA596E" d="M25 18h8v5h-8z"/>' +
    '<path fill="#F4900C" d="M30 32h-8c-.127 0-.253-.024-.371-.071L16.807 30H10c-.552 0-1-.447-1-1s.448-1 1-1h7c.128 0 .253.024.372.071L22.192 30H30c.553 0 1 .447 1 1s-.447 1-1 1z"/>' +
    '<path fill="#55ACEE" d="M33 10c0-.552-.447-1-1-1h-6c-.553 0-1 .448-1 1v5c0 .552.447 1 1 1h6c.553 0 1-.448 1-1v-5z"/>' +
    '</g>';

  // 경주차(레벨9) — racingcar.svg도 바퀴가 개별 <circle>.
  const RACINGCAR_WHEEL_L = wheelGroup('<circle fill="#292F33" cx="8" cy="31" r="4"/><circle fill="#58595B" cx="8" cy="31" r="2"/>');
  const RACINGCAR_WHEEL_R = wheelGroup('<circle fill="#292F33" cx="29" cy="31" r="4"/><circle fill="#58595B" cx="29" cy="31" r="2"/>');
  const RACINGCAR_INLINE =
    '<g class="reward-emoji-img" transform="translate(8.333,8.333) scale(2.3148)">' +
    '<path fill="#414042" d="M30 23h3l2-6h-3z"/>' +
    '<path fill="#F4900C" d="M29 19s-3-4-4-4h-9l-6 5-6.081 1.77c-.62.217-1.45.636-1.56 1.23L0 33c-.125.646.448 1 1 1h34c.553 0 1-.447 1-1V21c0-2-7-2-7-2z"/>' +
    '<path fill="#3B88C3" d="M16.094 20L11 34h12l5-14z"/>' +
    RACINGCAR_WHEEL_L + RACINGCAR_WHEEL_R +
    '<circle fill="#FFF" cx="19.5" cy="26.5" r="3.5"/>' +
    '<path fill="#231F20" d="M21.055 25.242c0 .441-.19.826-.574 1.072.504.23.854.699.854 1.254 0 .84-.769 1.547-1.764 1.547-1.037 0-1.682-.764-1.682-1.316 0-.273.287-.469.539-.469.477 0 .364.818 1.156.818.363 0 .658-.279.658-.65 0-.98-1.191-.26-1.191-1.086 0-.734.995-.238.995-1.016 0-.266-.188-.469-.505-.469-.665 0-.574.686-1.05.686-.288 0-.456-.258-.456-.518 0-.547.75-1.135 1.527-1.135 1.009.001 1.493.737 1.493 1.282z"/>' +
    '<path fill="#F4900C" d="M30 18l1-1 5-1v2z"/>' +
    '<path fill="#88C9F9" d="M17 16h8v4H12z"/>' +
    '<path fill="#FFCC4D" d="M6 24c0 .553-.448 1-1 1H3c-.552 0-1-.447-1-1 0-.553.448-1 1-1h2c.552 0 1 .447 1 1z"/>' +
    '<path fill="#DD2E44" d="M36 22h-1c-.553 0-1 .447-1 1v1c0 .553.447 1 1 1h1v-3z"/>' +
    '</g>';

  // 스쿠터(레벨10) — 원본 scooter.svg의 바퀴(타이어+허브 각 2쌍)를 바퀴 하나씩 분리.
  const SCOOTER_WHEEL_L = wheelGroup(
    '<path fill="#292F33" d="M10 31.5c0 2.485-2.015 4.5-4.5 4.5S1 33.985 1 31.5 3.015 27 5.5 27s4.5 2.015 4.5 4.5z"/>' +
    '<path fill="#99AAB5" d="M8 31.5C8 32.881 6.881 34 5.5 34S3 32.881 3 31.5 4.119 29 5.5 29 8 30.119 8 31.5z"/>'
  );
  const SCOOTER_WHEEL_R = wheelGroup(
    '<path fill="#292F33" d="M34 31.5c0 2.485-2.015 4.5-4.5 4.5S25 33.985 25 31.5s2.015-4.5 4.5-4.5 4.5 2.015 4.5 4.5z"/>' +
    '<path fill="#99AAB5" d="M32 31.5c0 1.381-1.119 2.5-2.5 2.5S27 32.881 27 31.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5z"/>'
  );
  const SCOOTER_INLINE =
    '<g class="reward-emoji-img" transform="translate(8.333,8.333) scale(2.3148)">' +
    '<path fill="#F4900C" d="M32 24h-1c-.55 0-1-.45-1-1s.45-1 1-1h1c.55 0 1 .45 1 1s-.45 1-1 1"/>' +
    SCOOTER_WHEEL_L + SCOOTER_WHEEL_R +
    '<path fill="#DD2E44" d="M5.854 24.082l2.615-6.989L8 16s-.916.008-1-1c-.083-1.007 2.408-3.079 3-3 .593.08 0 2 0 2s2.32.557 2 2c-.319 1.444-2.375 8.688-2.375 8.688S11.375 25.563 12 27c.449 1.032 1.681 1.018 3 1 1.319-.016 4.393-.007 5-2 .606-1.991 1-3 1-3l-1-1 10-2s-.891 1.982 1 3c2.168 1.169 2.86 2.669 4 5 .749 1.534.448 1.897-1 2-1.941.14-4.44.386-5.79.535-1.197.134-2.284 1.65-4.164 1.65s-10.052.049-12.046-.186c-3.496-.409-4.758-3-10-3-2.072 0-1.06-1.563.028-2.665 1.209-1.226 3.801-2.4 3.826-2.252"/>' +
    '<path fill="#BE1931" d="M22 33h-3c-1.1 0-2-.9-2-2s.9-2 2-2h3c1.1 0 2 .9 2 2s-.9 2-2 2"/>' +
    '<path fill="#BE1931" d="M19 33h-5c-.55 0-1-.45-1-1s.45-1 1-1h5c.55 0 1 .45 1 1s-.45 1-1 1"/>' +
    '<path fill="#292F33" d="M22 22c-1.618 0-2.431.306-3-1s-.02-2 1-2 5.728-.181 8-1c2.272-.819 3.053-.831 3 0s-1 2-1 2-1.254 2-8 2m-8-6h-3.251c-.55 0-1-.45-1-1s.45-1 1-1H14c.55 0 1 .45 1 1s-.45 1-1 1"/>' +
    '<path fill="#F4900C" d="M7.5 16c-.275 0-.5-.225-.5-.5v-1c0-.275.225-.5.5-.5s.5.225.5.5v1c0 .275-.225.5-.5.5"/>' +
    '<path fill="#292F33" d="M13.062 13h-.125c-.516 0-.937-.422-.937-.937V9.937c0-.515.421-.937.938-.937h.125c.516 0 .937.422.937.937v2.126c0 .515-.421.937-.938.937"/>' +
    '<path fill="#292F33" d="M9.982 15.066l-.022-.022c-.188-.188-.188-.497 0-.685l2.85-2.851c.189-.188.497-.188.685 0l.023.022c.188.189.188.497 0 .685l-2.851 2.851c-.188.188-.497.188-.685 0"/>' +
    '</g>';

  // 헬리콥터(레벨6) — helicopter.svg 원본 두 타원(위 회전날개)만 따로 묶어 회전.
  const HELICOPTER_INLINE =
    '<g class="reward-emoji-img" transform="translate(8.333,8.333) scale(2.3148)">' +
    '<path fill="#66757F" d="M16.26 26h2v5h-2zm-8 0h2v5h-2z"/>' +
    '<g class="reward-heli-rotor"><ellipse fill="#99AAB5" cx="6.259" cy="3" rx="6" ry="1"/><ellipse fill="#99AAB5" cx="20.259" cy="3" rx="6" ry="1"/></g>' +
    '<path fill="#99AAB5" d="M12.26 3h2v6h-2z"/>' +
    '<ellipse fill="#66757F" cx="13.259" cy="3" rx="2" ry="1"/>' +
    '<path fill="#FFCC4D" d="M34.259 10c0-3 0-7-1-7s-3 4-4 6 5 1 5 1z"/>' +
    '<path fill="#FFCC4D" d="M34.259 10c0-2.209-8-3-19-3h-2C6.632 7 .509 12.451.509 18.25S4.259 28 13.259 28s12-4.701 12-10.5c0-.881-.138-1.731-.371-2.549C29.259 14 34.259 12.006 34.259 10z"/>' +
    '<path fill="#3B88C3" d="M4.259 13c-2.091 2.918-3.068 7.589 1.213 7.784 4.787.216 6.787.216 7.85-2.372 1.364-3.32.937-7.413-.276-8.195-2.32-1.497-6.695-.135-8.787 2.783zm16.841-.465C23.259 16 23.17 18.696 19.259 20c-3 1-4-2-3.841-5.535.112-2.483.206-4.195 1.841-4.465 1.447-.24 2.526.426 3.841 2.535z"/>' +
    // 2026-08-17: "뒤쪽 프로펠러(꼬리 로터)도 돌아가야" 요청 — 위 메인 로터와 같은 방식으로,
    // 꼬리 날개 2개만 따로 묶어서 회전시킨다(허브 조각은 고정).
    '<g class="reward-heli-rotor">' +
    '<path fill="#99AAB5" d="M31.441 7.114c.903 1.273 1.271 2.564.82 2.884-.45.32-1.548-.454-2.451-1.726-.903-1.273-1.271-2.564-.82-2.884.45-.321 1.547.453 2.451 1.726z"/>' +
    '<path fill="#99AAB5" d="M34.72 11.735c.909 1.279 1.28 2.575.83 2.894-.45.32-1.553-.458-2.46-1.737-.909-1.279-1.279-2.576-.829-2.896.45-.318 1.551.46 2.459 1.739z"/>' +
    '</g>' +
    '<path fill="#66757F" d="M33.076 9.419c.319.45.214 1.074-.236 1.394-.45.32-1.074.214-1.395-.236-.319-.45-.214-1.074.237-1.394.451-.321 1.075-.214 1.394.236z"/>' +
    '<path fill="#99AAB5" d="M25.26 32c0 1.104-.896 2-2 2h-20c-1.104 0-2-.896-2-2s.896-2 2-2h20c1.104 0 2 .896 2 2z"/>' +
    '</g>';

  function buildRewardSvg(art, cols, rows) {
    let cells = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c * 100 / cols).toFixed(2);
        const y = (r * 100 / rows).toFixed(2);
        const w = (100 / cols).toFixed(2);
        const h = (100 / rows).toFixed(2);
        cells += '<rect class="reward-piece reward-cell" data-piece="cell-' + (r * cols + c) + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
      }
    }
    // sparkles(로켓 전용)이거나, DECOR_BY_EMOJI에 등록된 탈것이면 그 탈것다운 포인트 장식.
    const decorFn = DECOR_BY_EMOJI[art.emoji];
    const extra = art.sparkles ? ROCKET_SPARKLES : (decorFn ? decorFn() : '');
    const INLINE_BY_EMOJI = {
      canoe: CANOE_INLINE, bicycle: BICYCLE_INLINE, motorcycle: MOTORCYCLE_INLINE,
      train: TRAIN_INLINE, racingcar: RACINGCAR_INLINE, scooter: SCOOTER_INLINE,
      helicopter: HELICOPTER_INLINE,
    };
    const base = INLINE_BY_EMOJI[art.emoji] ||
      '<image class="reward-emoji-img" href="assets/emoji/' + art.emoji + '.svg" x="0" y="0" width="100" height="100"/>';
    // 2026-08-17: "스피드선은 이미지 뒤에 나와야" 요청 — 스피드선류(바퀴 달린 탈것)는 차체보다
    // 먼저(=아래) 그려서 차체가 그 위에 겹쳐 보이게 한다. 나머지 장식은 원래대로 위에.
    const decorBehind = ['motorcycle', 'bicycle', 'racingcar', 'scooter'].includes(art.emoji);
    return decorBehind ? (extra + base + cells) : (base + cells + extra);
  }

  // flyDirection이 있는 레벨은 완성 후 그 방향으로 화면 밖으로 날아가며 사라진다(로켓=대각선,
  // 풍선=위, 기차=왼쪽 — 로켓은 이모지 그림 자체가 오른쪽 위 대각선을 향하고 있어(코 방향)
  // 그 방향 그대로 날아감).
  // 2026-08-17: "정적인 보상이미지가 밋밋하다" 피드백 — 제자리 이펙트만 있던 7개를 전부
  // 로켓/풍선/기차처럼 날아가며 퇴장하는 탈것/교통수단(그림 자체를 교체)으로 바꿈. 이제
  // 10개 전부 flyDirection을 가짐. 카누(노)/자전거·오토바이·기차·경주차·스쿠터(바퀴)/헬리콥터
  // (프로펠러)는 emoji 이름이 INLINE_BY_EMOJI(buildRewardSvg 참고)에 있으면 자동으로 해당
  // 부위만 따로 움직이는 인라인 SVG를 쓴다.
  const LEVEL_REWARD_ART = {
    1: { emoji: 'rocket', flyDirection: 'diagonal', sparkles: true }, // 동물
    2: { emoji: 'motorcycle', flyDirection: 'left' },   // 음식
    3: { emoji: 'canoe', flyDirection: 'left' },        // 자연
    4: { emoji: 'balloon', flyDirection: 'up' },        // 하늘
    5: { emoji: 'bicycle', flyDirection: 'left' },      // 사람
    6: { emoji: 'helicopter', flyDirection: 'up' },     // 생활용품
    7: { emoji: 'airplane', flyDirection: 'diagonal' }, // 놀이
    8: { emoji: 'train', flyDirection: 'left' },        // 탈것/장소
    9: { emoji: 'racingcar', flyDirection: 'left' },    // 기호/기타
    10: { emoji: 'scooter', flyDirection: 'left' },     // 시계
  };

  // 2026-08-16: 흡수되는 순간 짧은 "휙" 효과음(별도 음원 파일 없이 WebAudio로 직접 합성) +
  // 진동. 효과음은 기존 배경음악 음소거 설정(🎵/🔇)을 그대로 따른다.
  let sfxCtx = null;
  function playAbsorbSfx() {
    if (!isMusicOn()) return;
    try {
      if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (sfxCtx.state === 'suspended') sfxCtx.resume();
      const t0 = sfxCtx.currentTime;
      const osc = sfxCtx.createOscillator();
      const gain = sfxCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, t0);
      osc.frequency.exponentialRampToValueAtTime(1100, t0 + 0.12);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain).connect(sfxCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    } catch (e) { /* 효과음은 부가 기능이라 실패해도 무시 */ }
    if (navigator.vibrate) {
      try { navigator.vibrate(35); } catch (e) { /* 무시 */ }
    }
  }

  // 2026-08-16: "완료한 그림이 보상 이미지로 흡수되는" 연출 — 완료된 줄의 이모지 복제본이
  // 보상 이미지의 해당 칸 위치로 날아가 사라지는 잔상을 만든다. 실제 줄 제거/대기열 교체는
  // renderQueue()가 담당.
  function flyToReward(cardEl, pieceEl) {
    const fromImg = cardEl && cardEl.querySelector('.tpl-emoji');
    if (!fromImg || !pieceEl) return;
    const fromRect = fromImg.getBoundingClientRect();
    const toRect = pieceEl.getBoundingClientRect();
    if (!fromRect.width || !toRect.width) return; // 화면 밖(스크롤 아웃 등)이면 건너뜀
    const ghost = fromImg.cloneNode(true);
    ghost.className = 'reward-absorb-ghost';
    ghost.style.left = fromRect.left + 'px';
    ghost.style.top = fromRect.top + 'px';
    ghost.style.width = fromRect.width + 'px';
    ghost.style.height = fromRect.height + 'px';
    document.body.appendChild(ghost);
    const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
    const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);
    requestAnimationFrame(() => {
      ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(0.2)';
      ghost.style.opacity = '0';
    });
    setTimeout(() => ghost.remove(), 1200);
  }

  function updateLevelReward(level, clearedCount, total) {
    const art = LEVEL_REWARD_ART[level];
    levelReward.hidden = !art;
    if (!art) return;
    if (levelRewardArt.dataset.level !== String(level)) {
      const { cols, rows } = gridDims(total);
      levelRewardArt.innerHTML = buildRewardSvg(art, cols, rows);
      levelRewardArt.setAttribute('viewBox', '0 0 100 100');
      levelRewardArt.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      levelRewardArt.dataset.level = String(level);
      // 2026-08-16: SVGElement.className은 HTML과 달리 읽기 전용(SVGAnimatedString)이라
      // 대입하면 예외가 남 — class 속성은 setAttribute로 바꿔야 함.
      levelRewardArt.setAttribute('class', 'level-reward-art' + (art.flyDirection ? ' reward-fly-' + art.flyDirection : ''));
    }
    levelRewardArt.querySelectorAll('.reward-cell').forEach((el, i) => {
      el.classList.toggle('is-active', i < clearedCount);
    });
    // 2026-08-16: 조각 맞추기 미니게임이 진행 중인 동안은(레벨1 테스트) 이 함수가 다시
    // 불려도 launched를 건드리지 않는다 — 그림이 다 채워졌다고 여기서 자동으로 날아가거나
    // 바운스 연출이 끼어들면 안 되고, 퍼즐을 다 풀었을 때 finishRewardPuzzle()이 직접
    // 관리한다.
    // 2026-08-17: "Back으로 이미 완성한 레벨에 재진입하면 로켓이 매번 다시 날아간다" 버그 수정 —
    // 예전엔 재렌더링될 때마다 무조건 .launched를 다시 붙여서 CSS 발사 애니메이션이 매번 새로
    // 재생됐다. 이미 퍼즐까지 다 푼(=발사 연출을 한 번 봤던) 레벨이면 다시 붙이지 않고, 12칸이
    // 전부 채워진 완성 그림이 날아가지 않고 그 자리에 정지된 채로 보이게 한다.
    if (!isRewardPuzzleBlocking(level)) {
      const alreadySolved = rewardPuzzleSolvedLevels.has(level) || isRewardPuzzleSolvedPersisted(level);
      levelRewardArt.classList.toggle('launched', clearedCount >= total && !alreadySolved);
      // reward-puzzle-clean: launched와 별개로 칸 사이 흰 구분선만 지워서, 정지된 완성본이
      // 격자무늬가 아니라 깔끔한 그림 한 장으로 보이게 한다(퍼즐 미니게임이 이미 쓰던 것과 같은 클래스).
      levelRewardArt.classList.toggle('reward-puzzle-clean', clearedCount >= total && alreadySolved);
    }
  }

  // 2026-08-16: 레벨을 다 깨면(레벨1만 테스트하다 2026-08-17부터 전체 레벨로 확장) 보상
  // 이미지가 흩어진 조각을 드래그해서 원래 자리에 맞추면 완성되는 미니게임이 재생된다.
  // 다 맞추기 전엔 "다음" 버튼을 막아둔다.
  // 조각 4개(2x2 격자 — 원본 100x100 정사각 이미지를 2등분씩 나누면 칸 자체가 정확히
  // 정사각형이라 letterbox 여백 없이 꽉 채울 수 있음). "8조각은 유아에게 너무 어렵고,
  // 조각끼리 비슷해 보인다"는 피드백으로 10 -> 8 -> 4로 줄임. 위 2개/아래 2개로 나눠
  // 보상 이미지를 감싼다.
  const PUZZLE_COLS = 2;
  const PUZZLE_ROWS = 2;
  const PUZZLE_TOTAL = PUZZLE_COLS * PUZZLE_ROWS;
  let rewardPuzzle = null; // { level, solved: Set<number> }
  // 이번 세션에 이미 다 맞춘 레벨(다시 들어가도 매번 또 안 뜨게) — 세션 한정 캐시일 뿐, 진짜
  // 영구 기록은 REWARD_PUZZLE_SOLVED_KEY(localStorage)에 있다(아래 maybeShowRewardPuzzle 참고).
  const rewardPuzzleSolvedLevels = new Set();

  function isRewardPuzzleBlocking(level) {
    return !!(rewardPuzzle && rewardPuzzle.level === level && rewardPuzzle.solved.size < PUZZLE_TOTAL);
  }

  // 2026-08-16: "안 나온다" 제보로 원인 파악 — 예전엔 "방금 막 클리어한 순간"(justBecameLevelCleared)
  // 이벤트에만 걸려있어서, 이미 예전에 클리어해둔 레벨1을 다시 들어가는 경우엔 그 이벤트 자체가
  // 안 나서 미니게임이 절대 안 떴다. renderLevelGallery가 호출될 때마다(레벨 진입/재진입 포함)
  // "지금 다 깼는데 아직 안 풀었으면" 조건으로 다시 판단하도록 바꿈 — 여러 번 호출돼도
  // rewardPuzzle/rewardPuzzleSolvedLevels로 중복 시작은 막는다.
  // 2026-08-17: "Back으로 예전에 클리어한 레벨에 재진입하면 매번 다시 뜬다" 버그 수정 —
  // isRewardPuzzleSolvedPersisted(영구 기록)도 같이 확인한다.
  function maybeShowRewardPuzzle(level) {
    if (rewardPuzzle && rewardPuzzle.level === level) return; // 이미 진행 중
    if (rewardPuzzleSolvedLevels.has(level) || isRewardPuzzleSolvedPersisted(level)) return; // 이미 다 품(이번 세션 또는 예전에)
    const list = getTemplatesForLevel(level);
    const scores = getScores();
    const doneCount = list.filter((t) => isMastered(t.id, scores)).length;
    if (doneCount < list.length) return; // 아직 다 안 깼음
    rewardPuzzle = { level: level, solved: new Set() };
    // 완성된 그림이 위에서 살짝 내려오며 가운데 자리잡는 연출(0.4s) → 칸 구분선이 지워져
    // 깔끔한 한 장의 그림이 됨 → 퍼즐 트레이 크기로 줄어들며 살짝 아래로 자리잡음(0.5s) →
    // 그 자리에서 조각 4개로 터뜨린다.
    levelRewardArt.classList.add('reward-drop-in');
    setTimeout(() => {
      levelRewardArt.classList.remove('reward-drop-in');
      levelRewardArt.classList.add('reward-puzzle-clean');
    }, 450);
    setTimeout(() => levelRewardArt.classList.add('reward-puzzle-shrink'), 700);
    setTimeout(() => explodeIntoPuzzle(level), 1300);
  }

  function puzzleCellRect(i) {
    const c = i % PUZZLE_COLS, r = Math.floor(i / PUZZLE_COLS);
    return {
      x: (c * 100 / PUZZLE_COLS).toFixed(2), y: (r * 100 / PUZZLE_ROWS).toFixed(2),
      w: (100 / PUZZLE_COLS).toFixed(2), h: (100 / PUZZLE_ROWS).toFixed(2),
    };
  }

  // 2026-08-17: "정사각형 타일 유지 + 진짜 직소퍼즐 모양(가장자리 돌출부/홈)" 요청 — 2x2라
  // 딱 떨어지는 표준 배치로 그림: 0(좌상)-1(우상)은 세로 경계에서, 0-2(좌하)는 가로 경계에서,
  // 1·2-3(우하)은 각각 만나는 변에서 돌출부(out)/홈(in)이 서로 맞물린다. 바깥쪽 변(그림
  // 테두리와 닿는 변)은 반듯한 직선(straight) 그대로 둔다.
  //   0(TL): 오른쪽=out, 아래=out           1(TR): 왼쪽=in, 아래=out
  //   2(BL): 위=in, 오른쪽=out              3(BR): 위=in, 왼쪽=in
  const PUZZLE_EDGES = [
    { top: 'straight', right: 'out', bottom: 'out', left: 'straight' },
    { top: 'straight', right: 'straight', bottom: 'out', left: 'in' },
    { top: 'in', right: 'out', bottom: 'straight', left: 'straight' },
    { top: 'in', right: 'straight', bottom: 'straight', left: 'in' },
  ];
  const JIG = 100; // 조각 하나의 "본체" 크기(로컬 단위, 정사각형)
  const JIG_R = 16; // 돌출부/홈 반지름(로컬 단위)
  const JIG_PAD = 20; // 바깥 여백(돌출부가 이 안쪽에 다 들어오게) — viewBox에 사방으로 더함

  // 한 변(직선 A->B)을 그리는 path 조각. type이 'out'/'in'이면 중점에 반원 돌기를 그린다.
  // 항상 시계방향으로 변을 도는 걸 기준으로, 진행방향의 오른쪽이 조각 "바깥쪽"이 되도록
  // 법선 부호를 맞춰서 sweep-flag를 정함(직접 렌더해서 방향 확인 후 조정함).
  function jigEdge(x1, y1, x2, y2, type) {
    if (type === 'straight') return 'L' + x2 + ',' + y2;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const p1x = mx - ux * JIG_R, p1y = my - uy * JIG_R;
    const p2x = mx + ux * JIG_R, p2y = my + uy * JIG_R;
    const sweep = type === 'out' ? 1 : 0;
    return 'L' + p1x + ',' + p1y + ' A' + JIG_R + ',' + JIG_R + ' 0 1 ' + sweep + ' ' + p2x + ',' + p2y + ' L' + x2 + ',' + y2;
  }

  function jigsawPathD(edges) {
    let d = 'M0,0 ';
    d += jigEdge(0, 0, JIG, 0, edges.top) + ' ';
    d += jigEdge(JIG, 0, JIG, JIG, edges.right) + ' ';
    d += jigEdge(JIG, JIG, 0, JIG, edges.bottom) + ' ';
    d += jigEdge(0, JIG, 0, 0, edges.left) + ' Z';
    return d;
  }

  // 완성된 그림이 잠깐 사라지는 듯하다가 조각 4개로 나뉘어 위/아래 트레이의 각자 자리로
  // 순서대로(팝콘 터지듯 살짝 시간차) 튀어나간다. FLIP 기법: 조각을 최종 위치(트레이)에
  // 먼저 심어서 실제 좌표를 잰 뒤, 중앙(보상 이미지 자리)에서 막 튀어나온 것처럼 보이도록
  // 역방향 이동+축소+회전 값을 transform으로 씌웠다가 다음 틱에 원위치로 트랜지션시킨다.
  // 조각 하나가 화면에 그리는 내용 — 원본 칸(50x50, 정사각형)을 직소 모양(clipPath)으로
  // 잘라서 표시. 돌출부가 이웃 칸 영역까지 살짝 걸치므로, 이미지 자체는 그 칸보다 넉넉히
  // (JIG_PAD만큼) 확대해서 깔아둔 뒤 클립한다 — 돌출부 안에도 실제 그림이 채워지게.
  function puzzleTileInnerSvg(emoji, cellIndex) {
    const c = puzzleCellRect(cellIndex);
    const cellW = Number(c.w);
    const scale = JIG / cellW; // 로컬 100단위 = 실제 칸 cellW 단위
    const clipId = 'jig-clip-' + cellIndex + '-' + Math.random().toString(36).slice(2, 8);
    const imgX = (-Number(c.x) * scale).toFixed(2);
    const imgY = (-Number(c.y) * scale).toFixed(2);
    const imgSize = (100 * scale).toFixed(2);
    const outline = jigsawPathD(PUZZLE_EDGES[cellIndex]);
    return '<svg viewBox="' + (-JIG_PAD) + ' ' + (-JIG_PAD) + ' ' + (JIG + JIG_PAD * 2) + ' ' + (JIG + JIG_PAD * 2) + '">' +
      '<defs><clipPath id="' + clipId + '"><path d="' + outline + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + clipId + ')">' +
      '<image href="assets/emoji/' + emoji + '.svg" x="' + imgX + '" y="' + imgY + '" width="' + imgSize + '" height="' + imgSize + '"/>' +
      '</g>' +
      '<path class="reward-puzzle-outline" d="' + outline + '" fill="none" stroke="#000" stroke-width="3"/>' +
      '</svg>';
  }

  // 정답 칸(가운데)이 아직 안 채워졌을 때 — 조각과 똑같은 직소 윤곽을 옅은 보라색으로 채워서
  // "이 모양 조각이 여기 들어가야 함"을 보여준다.
  function puzzleEmptySlotSvg(cellIndex) {
    const outline = jigsawPathD(PUZZLE_EDGES[cellIndex]);
    return '<svg viewBox="' + (-JIG_PAD) + ' ' + (-JIG_PAD) + ' ' + (JIG + JIG_PAD * 2) + ' ' + (JIG + JIG_PAD * 2) + '">' +
      '<path d="' + outline + '" fill="#EDEBF9" stroke="#FFF8ED" stroke-width="2"/>' +
      '</svg>';
  }

  function explodeIntoPuzzle(level) {
    if (currentLevel !== level) return; // 그 사이 다른 레벨로 이동했으면 건너뜀
    const art = LEVEL_REWARD_ART[level];
    const centerRect = levelRewardArt.getBoundingClientRect();
    const centerX = centerRect.left + centerRect.width / 2;
    const centerY = centerRect.top + centerRect.height / 2;

    levelRewardArt.style.transition = 'opacity 0.25s ease';
    levelRewardArt.style.opacity = '0';
    setTimeout(() => {
      // 2026-08-16: SVG 요소는 .hidden 프로퍼티를 true로 줘도 실제 hidden 속성에 반영이
      // 안 돼서([hidden]{display:none} 규칙이 안 먹음) 그대로 보이는 버그가 있었음 —
      // setAttribute로 직접 속성을 건드려야 함(다른 div 기반 hidden 토글은 문제없음).
      levelRewardArt.setAttribute('hidden', '');
      levelRewardArt.style.opacity = '';
      levelRewardArt.style.transition = '';

      // 정답 칸(가운데) — 트레이 조각과 완전히 같은 타일 클래스를 씀(크기 통일), 해당
      // 조각과 정확히 같은 직소 윤곽을 옅은 색으로 미리 보여줌.
      rewardPuzzleTargetGrid.innerHTML = '';
      for (let i = 0; i < PUZZLE_TOTAL; i++) {
        const slot = document.createElement('div');
        slot.className = 'reward-puzzle-tile reward-puzzle-target';
        slot.dataset.piece = 'cell-' + i;
        slot.innerHTML = puzzleEmptySlotSvg(i);
        rewardPuzzleTargetGrid.appendChild(slot);
      }
      rewardPuzzleTargetGrid.hidden = false;
      levelReward.hidden = false;

      const order = Array.from({ length: PUZZLE_TOTAL }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { // 셔플
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      // 요청대로 보상 이미지를 가운데 두고 조각을 위/아래 트레이에 4개씩 나눠 배치.
      rewardPuzzleTrayTop.innerHTML = '';
      rewardPuzzleTrayBottom.innerHTML = '';
      rewardPuzzleTrayTop.hidden = false;
      rewardPuzzleTrayBottom.hidden = false;
      const half = PUZZLE_TOTAL / 2;
      order.forEach((cellIndex, i) => {
        const piece = document.createElement('div');
        piece.className = 'reward-puzzle-tile reward-puzzle-piece';
        piece.dataset.cell = String(cellIndex);
        piece.innerHTML = puzzleTileInnerSvg(art.emoji, cellIndex);
        wirePuzzlePieceDrag(piece, cellIndex);
        (i < half ? rewardPuzzleTrayTop : rewardPuzzleTrayBottom).appendChild(piece);

        const finalRect = piece.getBoundingClientRect();
        const dx = centerX - (finalRect.left + finalRect.width / 2);
        const dy = centerY - (finalRect.top + finalRect.height / 2);
        const rot = (Math.random() - 0.5) * 60;
        piece.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(0.3) rotate(' + rot + 'deg)';
        piece.style.opacity = '0';
        setTimeout(() => {
          piece.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease';
          piece.style.transform = '';
          piece.style.opacity = '1';
        }, i * 90); // 팝콘처럼 하나씩 순서대로
      });

      renderLevelGallery(); // "다음" 버튼 막힘 상태 반영
    }, 250);
  }

  // 조각을 다 맞추면(로켓 완성) ①조각들이 서서히 사라지며 완성된 그림이 서서히 나타나는
  // 크로스페이드(조각이 "천천히 붙어 하나가 되는" 느낌) → ②그 자리에서 천천히 커짐 →
  // ③원래 정해진 방향으로 날아가며 사라지는 기존 연출 + 칭찬 문구(다국어+음성, 기존
  // playExcellent/showLevelClearPraise 재활용)를 재생. "다음" 버튼은 애니메이션을 기다리지
  // 않고 즉시 열림(다른 레벨들과 동일).
  function finishRewardPuzzle(level) {
    const art = LEVEL_REWARD_ART[level];
    const total = getTemplatesForLevel(level).length;
    const { cols, rows } = gridDims(total);

    // "다음" 버튼을 여는 재렌더링은 맨 먼저 해둔다 — updateLevelReward가 이 시점부터는
    // isRewardPuzzleBlocking이 false라 판단해 levelRewardArt에 .launched를 미리 붙여버리는데,
    // 뒤에서(아래) class를 통째로 다시 지정하므로 어차피 덮어써짐. 순서가 바뀌면(맨 뒤에서
    // 호출) 그 미리 붙은 .launched 때문에 원치 않는 축하 연출(reward-celebrate)이 우리 크로스
    // 페이드/축소 연출을 덮어써버리는 버그가 있었음.
    renderLevelGallery();

    // ① 조각들의 흰 윤곽선만 먼저 슬쩍 지운다(칸 사이 빈틈은 이미 0이라, 이것만으로 그림이
    // 거의 다 붙어 보임 — 이 상태에서 완성 그림으로 바꿔치기하면 두 그림이 어긋난 채 겹쳐
    // 보이는 이중노출 없이 훨씬 자연스럽다).
    rewardPuzzleTargetGrid.classList.add('reward-puzzle-seams-clean');

    setTimeout(() => {
      if (currentLevel !== level) return; // 그 사이 다른 레벨로 이동했으면 건너뜀
      // ② 완성 이미지를 정답 칸과 같은 자리(둘 다 CSS grid-area:1/1 — .level-reward의 grid가
      // 자동으로 겹쳐줌)에 투명하게 깔아둔 뒤, 정답 칸은 페이드아웃시키고 완성 이미지는
      // 페이드인시킨다. ①에서 이미 거의 같은 그림이 됐으니 이 크로스페이드는 짧게.
      levelRewardArt.innerHTML = buildRewardSvg(art, cols, rows);
      levelRewardArt.querySelectorAll('.reward-cell').forEach((el) => el.classList.add('is-active'));
      // reward-puzzle-clean: 칸 구분선 없이 깔끔한 한 장의 그림으로 보이게(밑에서 커지는
      // 동안에도 계속 유지해야 해서 이후 class를 바꿀 때도 계속 같이 붙여줌).
      // reward-puzzle-shrunk: 조각이 있던 자리와 같은 축소 크기로 시작 — "분리되기 전 크기로
      // 합쳐진다"는 요청대로, 크로스페이드가 원본 크기가 아니라 이 축소 크기에서 시작됨.
      levelRewardArt.setAttribute('class', 'level-reward-art reward-puzzle-clean reward-puzzle-shrunk');
      levelRewardArt.removeAttribute('hidden');
      levelRewardArt.style.opacity = '0';
      levelRewardArt.style.transition = 'opacity 0.35s ease';
      rewardPuzzleTargetGrid.style.transition = 'opacity 0.35s ease';
      requestAnimationFrame(() => {
        levelRewardArt.style.opacity = '1';
        rewardPuzzleTargetGrid.style.opacity = '0';
      });

      setTimeout(() => {
        if (currentLevel !== level) return;
        // 임시로 씌웠던 크로스페이드용 인라인 스타일 정리.
        rewardPuzzleTargetGrid.hidden = true;
        rewardPuzzleTargetGrid.classList.remove('reward-puzzle-seams-clean');
        rewardPuzzleTargetGrid.style.opacity = '';
        rewardPuzzleTargetGrid.style.transition = '';
        levelRewardArt.style.opacity = '';
        levelRewardArt.style.transition = '';

        // ③ 축소 크기에서 원본 크기로 천천히 커지는 연출
        levelRewardArt.setAttribute('class', 'level-reward-art reward-puzzle-clean reward-puzzle-grow');
        setTimeout(() => {
          if (currentLevel !== level) return;
          // ④ 원본 크기 그대로(=1배) 정해진 방향으로 날아가며 사라짐 + 칭찬 — 위 확대가
          // 딱 원본 크기(scale 1)에서 끝나므로 공용 연출을 그대로 써도 크기 튐이 없음.
          levelRewardArt.setAttribute('class', 'level-reward-art' + (art.flyDirection ? ' reward-fly-' + art.flyDirection + ' launched' : ''));
          playExcellent();
          // 2026-08-17: "아래 뱃지 그리드는 뜨는데 위 완성 그림은 안 보인다" 피드백 — 날아가서
          // 사라진 채로(opacity 0, 화면 밖) 그대로 방치돼 있었다. 발사 연출(1.8s + 0.5s 지연)이
          // 끝나면 launched를 떼고 다시 제자리의 정지된 완성 그림으로 되돌려서, 아래 뱃지
          // 그리드와 같이 계속 보이게 한다(Back/Next로 재진입했을 때와 동일한 최종 모습).
          setTimeout(() => {
            if (currentLevel !== level) return;
            levelRewardArt.setAttribute('class', 'level-reward-art reward-puzzle-clean');
          }, 2300);
        }, 2000);
      }, 600);
    }, 400);
  }

  // 조각을 손가락/마우스로 끌어서 정답 칸 위에 놓으면 붙고(소리+짧은 진동), 아니면
  // 튕겨 돌아간다(긴 진동, 안 붙음).
  function wirePuzzlePieceDrag(piece, cellIndex) {
    let offsetX = 0, offsetY = 0;
    piece.addEventListener('pointerdown', (e) => {
      if (piece.classList.contains('placed')) return;
      piece.setPointerCapture(e.pointerId);
      const rect = piece.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      piece.classList.add('dragging');
      piece.style.width = rect.width + 'px';
      piece.style.height = rect.height + 'px';
      piece.style.left = rect.left + 'px';
      piece.style.top = rect.top + 'px';
    });
    piece.addEventListener('pointermove', (e) => {
      if (!piece.classList.contains('dragging')) return;
      // 손가락에 가려지지 않도록 살짝 위로 띄워서 따라다니게 함
      piece.style.left = (e.clientX - offsetX) + 'px';
      piece.style.top = (e.clientY - offsetY - 36) + 'px';
    });
    piece.addEventListener('pointerup', (e) => {
      if (!piece.classList.contains('dragging')) return;
      const dropX = e.clientX, dropY = e.clientY - 36;
      const target = rewardPuzzleTargetGrid.querySelector('[data-piece="cell-' + cellIndex + '"]');
      const targetRect = target ? target.getBoundingClientRect() : null;
      const isCorrect = !!targetRect &&
        dropX >= targetRect.left - 12 && dropX <= targetRect.right + 12 &&
        dropY >= targetRect.top - 12 && dropY <= targetRect.bottom + 12;
      if (isCorrect) {
        // 2026-08-17: "맞춰질 때 자연스러워야" 요청 — 드롭한 자리에서 바로 사라지고 정답
        // 그림이 뚝 나타나면(순간 교체) 부자연스러움. 정답 칸 자리/크기에 딱 맞게 슥
        // 미끄러져 들어가는 스냅 연출을 먼저 재생하고, 완전히 자리에 앉은 뒤에야
        // placePuzzlePiece로 정답 그림을 앉히고(이 시점엔 이미 같은 자리라 표시 안 남)
        // 조각을 페이드아웃시킨다.
        piece.style.transition = 'left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.2s ease, height 0.2s ease';
        piece.style.left = targetRect.left + 'px';
        piece.style.top = targetRect.top + 'px';
        piece.style.width = targetRect.width + 'px';
        piece.style.height = targetRect.height + 'px';
        setTimeout(() => {
          placePuzzlePiece(piece, cellIndex, target);
          setTimeout(() => {
            piece.classList.remove('dragging');
            piece.style.left = '';
            piece.style.top = '';
            piece.style.width = '';
            piece.style.height = '';
          }, 180);
        }, 200);
      } else {
        piece.classList.remove('dragging');
        piece.style.left = '';
        piece.style.top = '';
        piece.style.width = '';
        piece.style.height = '';
        rejectPuzzlePiece(piece);
      }
    });
  }

  function placePuzzlePiece(piece, cellIndex, targetSlotEl) {
    const art = LEVEL_REWARD_ART[currentLevel];
    if (targetSlotEl) {
      targetSlotEl.innerHTML = puzzleTileInnerSvg(art.emoji, cellIndex);
      targetSlotEl.classList.add('filled');
    }
    // 2026-08-17: "맞춰도 안 사라진다" 버그 원인 — 튀어나오는 연출(explodeIntoPuzzle)이
    // 인라인 style.opacity/transition을 남겨뒀는데, 인라인 스타일은 우선순위가 CSS 클래스
    // 규칙(.placed{opacity:0})보다 항상 높아서 클래스를 추가해도 그 인라인 값에 가려
    // 실제로는 안 사라지고 있었음. 여기서 인라인 값을 지워야 클래스 규칙이 다시 먹는다.
    piece.style.opacity = '';
    piece.style.transition = '';
    piece.classList.add('placed');
    if (rewardPuzzle) rewardPuzzle.solved.add(cellIndex);
    playPuzzleCorrectSfx();
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) { /* 무시 */ } }
    if (rewardPuzzle && rewardPuzzle.solved.size >= PUZZLE_TOTAL) {
      const solvedLevel = rewardPuzzle.level;
      rewardPuzzleSolvedLevels.add(solvedLevel);
      markRewardPuzzleSolvedPersisted(solvedLevel);
      rewardPuzzleTrayTop.hidden = true;
      rewardPuzzleTrayBottom.hidden = true;
      finishRewardPuzzle(solvedLevel);
    }
  }

  function rejectPuzzlePiece(piece) {
    piece.classList.add('reward-puzzle-reject');
    setTimeout(() => piece.classList.remove('reward-puzzle-reject'), 400);
    if (navigator.vibrate) { try { navigator.vibrate(400); } catch (e) { /* 무시 */ } }
  }

  // 정답 배치 효과음 — playAbsorbSfx와 같은 방식(별도 음원 없이 WebAudio로 합성), 더 밝은 2음 딩.
  let puzzleSfxCtx = null;
  function playPuzzleCorrectSfx() {
    if (!isMusicOn()) return;
    try {
      if (!puzzleSfxCtx) puzzleSfxCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (puzzleSfxCtx.state === 'suspended') puzzleSfxCtx.resume();
      const t0 = puzzleSfxCtx.currentTime;
      const osc = puzzleSfxCtx.createOscillator();
      const gain = puzzleSfxCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, t0);
      osc.frequency.setValueAtTime(1050, t0 + 0.09);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(gain).connect(puzzleSfxCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    } catch (e) { /* 효과음은 부가 기능이라 실패해도 무시 */ }
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
    // 2026-08-16: 순서 중요 — updateLevelReward보다 먼저 호출해야 한다. updateLevelReward가
    // "다 채워졌으면 launched(=자동으로 날아감/바운스)" 여부를 rewardPuzzle 상태를 보고
    // 판단하는데(isRewardPuzzleBlocking), 미니게임을 시작할지(rewardPuzzle 세팅)를 그보다
    // 늦게 정하면 막 클리어한 바로 그 순간엔 rewardPuzzle이 아직 null이라 원래 날아가는
    // 연출이 먼저 새치기해버린다.
    maybeShowRewardPuzzle(currentLevel);
    updateLevelReward(currentLevel, doneCount, list.length);

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
      // 2026-08-14: "유아용 모드는 랭킹 삭제" 요청 — 완주해도 랭킹 등록 모달을 띄우지 않는다.
      const hasNext = currentLevel < TOTAL_LEVELS;
      levelNextText.textContent = hasNext ? I18N.t('level.clear') : I18N.t('level.allClear');
      btnLevelNext.textContent = hasNext ? I18N.t('level.next') : I18N.t('level.map');
      // 2026-08-16: 실험 기능 — 조각 맞추기 미니게임이 아직 안 끝났으면 "다음"을 계속 숨겨둔다.
      btnLevelNext.hidden = isRewardPuzzleBlocking(currentLevel);
    } else {
      levelNextText.textContent = '';
      btnLevelNext.hidden = true;
    }
    const hasTimer = !isClear && currentLevel in getLevelAttempts();
    levelNextBanner.hidden = !(isClear || hasBack || hasTimer);
    updateLevelTimerDisplay();

    renderQueue(currentLevel, list, scores);
  }

  // 2026-08-16: "카드 그리드 대신 2개씩 대기열" 요청 — 한 번에 딱 2개(QUEUE_SIZE)만 보여주고,
  // 그림을 완료하면 그 줄이 보상 이미지로 흡수되며 사라진 뒤, 대기 중이던 다음 그림이 그 자리로
  // 올라온다. 레벨별로 "지금 화면에 보이는 두 그림의 id"를 기억해뒀다가(queueByLevel), 매
  // 렌더마다 그중 새로 클리어된 게 있는지 비교해서 흡수 애니메이션을 트리거한다.
  const QUEUE_SIZE = 2;
  const queueByLevel = {};

  function renderQueueRow(tpl) {
    // 2026-08-16: 배경 장식이 .tpl-row의 둥근 모서리 틈으로 비치는 걸 막으려고, 각진(둥글지
    // 않은) 래퍼로 한 겹 감싼다 — 래퍼 크기만큼만 장식을 가리고, 래퍼 바깥 여백엔 장식이 보임.
    const wrap = document.createElement('div');
    wrap.className = 'tpl-row-wrap';
    const row = document.createElement('button');
    row.className = 'tpl-row';
    row.dataset.tplId = tpl.id;
    const displayName = I18N.templateName(tpl);
    row.setAttribute('aria-label', 'Color the ' + displayName);
    row.innerHTML =
      '<img class="tpl-emoji" src="assets/emoji/' + tpl.id + (tpl.isBoss ? '-icon' : '') + '.svg" alt="">' +
      '<span class="tpl-label">' + escapeHtml(displayName) + '</span>';
    row.addEventListener('click', () => openTemplate(tpl));
    wrap.appendChild(row);
    return wrap;
  }

  function paintQueue(ids, byId, level) {
    galleryGrid.classList.remove('gallery-grid-cleared');
    galleryGrid.dataset.paintedLevel = String(level);
    galleryGrid.innerHTML = '';
    ids.forEach((id) => { if (byId[id]) galleryGrid.appendChild(renderQueueRow(byId[id])); });
  }

  // 2026-08-17: "다 깬 12개가 세로 카드로 늘어서 스크롤해야 보인다" 피드백 — 진행 중 대기열
  // 카드(.tpl-row)와 달리, 이미 다 깬 그림들은 이름표 없이 원형 아이콘(.tpl-row .tpl-emoji와
  // 같은 스타일)만 줄바꿈되는 그리드로 한 화면에 다 보이게 한다.
  function renderClearedBadge(tpl) {
    const badge = document.createElement('button');
    badge.className = 'tpl-badge';
    badge.dataset.tplId = tpl.id;
    const displayName = I18N.templateName(tpl);
    badge.setAttribute('aria-label', displayName);
    badge.innerHTML = '<img class="tpl-emoji" src="assets/emoji/' + tpl.id + (tpl.isBoss ? '-icon' : '') + '.svg" alt="">';
    badge.addEventListener('click', () => openTemplate(tpl));
    return badge;
  }

  function paintClearedGrid(ids, byId, level) {
    galleryGrid.classList.add('gallery-grid-cleared');
    galleryGrid.dataset.paintedLevel = String(level);
    // 위 보상 이미지 칸 배치와 같은 규칙(10개=5x2, 12개=4x3)을 그대로 써서 열 수를 정한다.
    galleryGrid.style.gridTemplateColumns = 'repeat(' + gridDims(ids.length).cols + ', 1fr)';
    galleryGrid.innerHTML = '';
    ids.forEach((id) => { if (byId[id]) galleryGrid.appendChild(renderClearedBadge(byId[id])); });
  }

  function renderQueue(level, list, scores) {
    const byId = {};
    list.forEach((t) => { byId[t.id] = t; });
    const pending = list.filter((t) => !isMastered(t.id, scores));
    const pendingIds = new Set(pending.map((t) => t.id));
    const prevIds = queueByLevel[level];
    const allIds = list.map((t) => t.id);
    // 2026-08-17(3차): "레벨3(안 깬 레벨)로 가도 레벨2 뱃지가 그대로 남는다" 버그 수정 —
    // #gallery-grid는 모든 레벨이 공유하는 하나의 DOM이라, "지금 화면에 뭔가 그려져 있다"는
    // 것만으로는 그게 이 레벨 것인지 알 수 없었다(children.length만 보던 아래 최적화들이 이걸
    // 놓쳤다). paintQueue/paintClearedGrid가 그릴 때마다 어느 레벨 것인지 dataset에 남겨두고,
    // 지금 레벨과 다르면 "새로 그려야 함"으로 확정한다.
    const domStale = galleryGrid.dataset.paintedLevel !== String(level);

    // "이미 다 깬 레벨에 다시 들어옴"(Back/Next로 재진입 등) — 새로 완료된 그림이 없으므로
    // 아래 "방금 클리어됨" 흡수 연출/1.1초 지연 없이 곧장 뱃지 그리드로 그린다.
    if (pending.length === 0 && prevIds && prevIds.length === allIds.length) {
      paintClearedGrid(allIds, byId, level);
      return;
    }

    if (!prevIds || domStale) {
      // 이 레벨을 이번 세션에서 처음 그리는 거면(또는 화면에 다른 레벨 것이 남아있으면)
      // 애니메이션 없이 바로 채운다. 이미 예전에 다 깬 레벨이면 대기열 대신 뱃지 그리드로.
      if (pending.length === 0) {
        queueByLevel[level] = allIds;
        paintClearedGrid(allIds, byId, level);
      } else {
        const initial = prevIds || pending.slice(0, QUEUE_SIZE).map((t) => t.id);
        queueByLevel[level] = initial;
        paintQueue(initial, byId, level);
      }
      return;
    }

    const justCleared = prevIds.filter((id) => !pendingIds.has(id));
    if (justCleared.length === 0) {
      return;
    }

    // 방금 클리어된 줄들을 보상 이미지 쪽으로 흡수시키고, 끝나면 다음 상태로 교체한다.
    const doneCountAfter = list.length - pending.length;
    const doneCountBefore = doneCountAfter - justCleared.length;
    const art = LEVEL_REWARD_ART[level];
    playAbsorbSfx();
    justCleared.forEach((id, k) => {
      const row = galleryGrid.querySelector('[data-tpl-id="' + id + '"]');
      if (!row) return;
      row.classList.add('tpl-row-absorbing');
      const pieceEl = art && levelRewardArt.querySelector('[data-piece="cell-' + (doneCountBefore + k) + '"]');
      flyToReward(row, pieceEl);
    });

    if (pending.length === 0) {
      // 방금 이 레벨의 마지막 그림까지 다 깼다 — 흡수 연출이 끝나면 전체를 뱃지 그리드로 바꾼다.
      queueByLevel[level] = allIds;
      setTimeout(() => {
        if (currentLevel !== level) return; // 2026-08-17: 그 사이 다른 레벨로 넘어갔으면 건너뜀
        paintClearedGrid(allIds, byId, level);
      }, 1100);
      return;
    }

    const remaining = prevIds.filter((id) => pendingIds.has(id));
    const used = new Set(remaining);
    for (const t of pending) {
      if (used.size >= QUEUE_SIZE) break;
      if (!used.has(t.id)) { remaining.push(t.id); used.add(t.id); }
    }
    queueByLevel[level] = remaining;

    setTimeout(() => {
      if (currentLevel !== level) return; // 2026-08-17: "Next를 빨리 누르면 다음 레벨 화면이
      // 이전 레벨 그림으로 덮어써진다" 버그 수정 — 이 타이머엔 레벨 전환 확인이 없어서, 예약된
      // 뒤 다른 레벨로 넘어가도 그대로 발동해 그 레벨의 #gallery-grid를 덮어쓰고 있었다.
      paintQueue(queueByLevel[level], byId, level);
    }, 1100);
  }

  // "다시 도전!"/레벨클리어/구역단계/그림완성 축하 중 어느 하나라도 아직 안 끝났는데 다른
  // 화면으로 넘어가면(Next/Back으로 레벨을 넘기거나 지도로 나가는 등) 그 타이머가 남아있다가
  // 엉뚱한 화면 위에 문구가 눌어붙어 있는 상태로 계속 보인다 — 화면을 옮기는 진입점마다
  // 여기서 한 번에 정리한다.
  // 2026-08-17: "완료 직후 바로 Next/Back 누르면 PERFECT! 문구가 다음 화면에 그대로 남아있음"
  // 제보로 추가 — openTemplate()만 정리하고 openLevel()/goToMap()은 안 하고 있었음.
  function clearPendingCelebrationOverlays() {
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    if (levelClearPraiseTimer) { clearTimeout(levelClearPraiseTimer); levelClearPraiseTimer = null; levelRewardPraise.hidden = true; levelRewardPraise.classList.remove('show'); }
    if (regionStageTimer) { clearTimeout(regionStageTimer); regionStageTimer = null; regionStagePraise.hidden = true; regionStagePraise.classList.remove('show'); }
    if (pictureCompleteTimer) { clearTimeout(pictureCompleteTimer); pictureCompleteTimer = null; pictureCompletePraise.hidden = true; pictureCompletePraise.classList.remove('show'); }
  }

  // ================= 색칠 화면 진입 =================
  function openTemplate(tpl, onReady, opts) {
    opts = opts || {};
    clearPendingCelebrationOverlays();
    currentTemplate = tpl;
    currentIsChallenge = !!opts.challenge;
    // 2026-08-17: 이미 클리어한 그림을 다시 열면 채색은 막고 정답 완성본만 보여준다(보기 전용).
    currentIsViewOnly = !opts.challenge && !tpl.isBoss && isMastered(tpl.id, getScores());
    // 2026-08-20: #frame-top 안에 #btn-back(뒤로가기)이 있다 — frame-top/bottom 전체를 hidden
    // 처리하면 보기전용 모드에서 탈출구인 뒤로가기까지 같이 사라지므로, 각 자식을 개별적으로
    // 숨긴다(btn-back·헤더의 btn-home은 절대 안 숨김).
    paletteTop.hidden = currentIsViewOnly;
    paletteBottom.hidden = currentIsViewOnly;
    paletteLeft.hidden = currentIsViewOnly;
    paletteRight.hidden = currentIsViewOnly;
    cornerTR.hidden = currentIsViewOnly;
    cornerBL.hidden = currentIsViewOnly;
    btnSave.hidden = currentIsViewOnly;
    // 2026-08-20: "챌린지 모드는 시간 내 클리어하면 자동으로 다음 문제로 넘어가서 완료 버튼이
    // 의미 없다 — LUCK 버튼으로 바꿔줘(기능은 추후 안내)" 요청 — 클릭 동작(challenge.js의 강제
    // 제출 가로채기)은 그대로 두고 아이콘/라벨만 모드별로 바꾼다.
    btnSave.textContent = opts.challenge ? '🍀' : '✅';
    btnSave.setAttribute('aria-label', opts.challenge ? 'Luck' : 'Done, save it');
    // 스킬1/2는 자리만 있는 챌린지 전용 장식 버튼 — 유아모드/보기전용에서는 항상 숨김.
    btnSkill1.hidden = !opts.challenge || currentIsViewOnly;
    btnSkill2.hidden = !opts.challenge || currentIsViewOnly;
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
      // 2026-08-14: "유아용 모드는 시간 압박 없이, 완료시간은 표기" 요청 — startLevelTimer()가
      // updateLevelTimerDisplay를 다시 돌리되, 그 함수 자체를 카운트업(경과시간)만 보여주고
      // 시간초과-리셋은 안 하도록 바꿔뒀다.
      if (!isLevelCleared(tpl.difficulty)) {
        startOrResumeLevelAttempt(tpl.difficulty);
        startLevelTimer();
      }
    }
    // 위와 같은 이유로, 타이머 진행률을 보여주던 지렁이(.goal-panel::after)는 일반 Child 레벨만
    // 숨긴다 — 보스는 원래도 유지, 챌린지 모드는 자체 문제별 타이머가 있으니 지렁이도 그대로 보여준다
    // (2026-08-14: "지렁이가 없어졌다" 피드백 — 챌린지 모드까지 같이 숨겨진 게 회귀였음).
    goalPanelEl.classList.toggle('no-timer', !tpl.isBoss && !opts.challenge);
    // 2026-08-15: "벨페퍼 이모지 안나옴" — 이 타이틀/배지는 tpl.emoji를 유니코드 텍스트 글리프로
    // 직접 찍어서 기기에 그 이모지 폰트가 없으면(특히 최근에 추가된 이모지) 빈 네모로 보였다.
    // 실제 그림 본체(캔버스)는 이미 Twemoji SVG 파일 기반이라 이 문제가 없으니, 여기도 같은
    // 방식(assets/emoji/<id>[-icon].svg)으로 통일 — 기기 폰트와 무관하게 항상 보인다.
    const titleIconSrc = 'assets/emoji/' + tpl.id + (tpl.isBoss ? '-icon' : '') + '.svg';
    coloringTitle.innerHTML = '<img class="title-emoji-icon" src="' + titleIconSrc + '" alt=""> ' + escapeHtml(I18N.templateName(tpl));
    goalEmoji.innerHTML = '<img class="title-emoji-icon" src="' + titleIconSrc + '" alt="">';
    galleryScreen.hidden = true;
    coloringScreen.hidden = false;
    syncRingSquareSize();
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
      lastRegionStageShown = 0;
      countedRegionLabels = new Set();

      // 목표(정답) 이미지 렌더링 + 영역별 정답색 배정(인접 영역 색 중복 보정 포함 — renderGoalPreview 내부)
      renderGoalPreview(lineSource);

      // 정답색이 정해진 뒤에 팔레트 구성(그 도안에 실제 필요한 색이 반드시 포함되게)
      renderPalette();
      syncRingGap();

      // 채우기 레이어 초기화 — 보기 전용이면 방금 그린 정답 이미지(goalCanvas)를 그대로 옮겨서
      // 처음부터 완성된 상태로 보여준다.
      fillCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
      if (currentIsViewOnly) fillCtx.drawImage(goalCanvas, 0, 0);

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
        // 2026-08-14 피드백: "선이 끊어진 게 많고 경계선과 만난다" + "이미지마다 크기가 들쭉날쭉하다"
        // — 챌린지 보통/어려움/매우어려움 전용 도안 300개는 기존 100개와 달리 사전 검수 없이
        // Twemoji에서 그대로 가져와서, 원본 SVG 자체가 자기 캔버스를 꽉 채워 그린 것(시계, 소파+램프
        // 등)과 여백이 많은 것이 섞여있어 단순 고정 배율(여백 %)만으로는 (a) 꽉 찬 것은 여전히 잘리고
        // (b) 여백 많은 것은 실제 그림이 작게 나와 눈에 보이는 크기가 도안마다 들쭉날쭉했다.
        // 실제 그림 내용(투명하지 않은 픽셀)의 경계 상자를 먼저 구해서, 그 상자의 큰 쪽 변이 항상
        // 캔버스의 TARGET_FILL 비율을 채우도록 배율/위치를 역산해 다시 그린다 — 원본 여백과
        // 무관하게 모든 새 도안의 그림 크기가 서로 비슷해짐. 기존 100개는 문제 없었으므로 그대로 둠.
        if (tpl.challengeTier) {
          const probeC = document.createElement('canvas');
          probeC.width = WORK_SIZE; probeC.height = WORK_SIZE;
          const probeCtx = probeC.getContext('2d', { willReadFrequently: true });
          probeCtx.drawImage(img, 0, 0, WORK_SIZE, WORK_SIZE);
          const probeData = probeCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
          let minX = WORK_SIZE, minY = WORK_SIZE, maxX = -1, maxY = -1;
          for (let y = 0; y < WORK_SIZE; y++) {
            for (let x = 0; x < WORK_SIZE; x++) {
              if (probeData[(y * WORK_SIZE + x) * 4 + 3] > 10) { // 실질적으로 보이는(거의 불투명한) 픽셀만
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX >= minX && maxY >= minY) {
            const TARGET_FILL = 0.98; // 그림 내용이 캔버스의 98%를 채우도록
            const contentW = maxX - minX + 1;
            const contentH = maxY - minY + 1;
            const scale = (WORK_SIZE * TARGET_FILL) / Math.max(contentW, contentH);
            const dx = WORK_SIZE / 2 - ((minX + maxX) / 2) * scale;
            const dy = WORK_SIZE / 2 - ((minY + maxY) / 2) * scale;
            rawCtx.drawImage(img, dx, dy, WORK_SIZE * scale, WORK_SIZE * scale);
          } else {
            rawCtx.drawImage(img, 0, 0, WORK_SIZE, WORK_SIZE); // 안전장치(투명 픽셀만 감지된 극단적 경우)
          }
        } else {
          rawCtx.drawImage(img, 0, 0, WORK_SIZE, WORK_SIZE);
        }
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
        // 2026-08-14 피드백: "칠할 영역이 2개 이상인데 색이 1개로 뭉쳐서 밋밋함" — 위
        // SIMILAR_COLOR_DIST 클러스터링이 색조가 비슷한 도안(회색 쥐, 베이지색 달 등)에서
        // 실제 채점 영역이 여러 개인데도 전부 한 색으로 합쳐버릴 수 있다. 칠할 영역이 진짜
        // 1개뿐인 도안은 그대로 두고, 2개 이상인데 색이 1개로 뭉쳐진 경우에만 원래(클러스터링
        // 전) 색이 그 클러스터에서 가장 멀었던 영역 하나를 원본 샘플색으로 되돌려 최소 2색을
        // 보장한다.
        if (!tpl.paletteOverride && paletteClusters.length === 1 && final.gradable.length >= 2) {
          let farthestSeed = null;
          let farthestDist = -1;
          const cluster = paletteClusters[0];
          final.gradable.forEach((r) => {
            const raw = rawColorBySeed.get(r.seed);
            if (!raw) return;
            const [rr, gg, bb] = raw;
            if (rr >= 245 && gg >= 245 && bb >= 245) return; // 흰색 대체 대상은 건드리지 않음
            const [h, s, l] = rgbToHsl(rr, gg, bb);
            let dh = Math.abs(h - cluster.hsl[0]);
            if (dh > 180) dh = 360 - dh;
            const hueWeight = 0.3 + 0.7 * Math.min(s, cluster.hsl[1]);
            const dist = (dh / 180) * (dh / 180) * hueWeight * 6
              + (s - cluster.hsl[1]) * (s - cluster.hsl[1]) * 0.5
              + (l - cluster.hsl[2]) * (l - cluster.hsl[2]) * 0.5;
            if (dist > farthestDist) { farthestDist = dist; farthestSeed = r.seed; }
          });
          if (farthestSeed != null && farthestDist > 0) {
            const [rr, gg, bb] = rawColorBySeed.get(farthestSeed);
            colorBySeed.set(farthestSeed, rgbToHex(rr, gg, bb));
          }
        }
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
  // 2026-08-14: labelRegions는 벽(윤곽선) 픽셀을 사이에 두고서만 영역을 나누므로, "두 색칠 영역이
  // 픽셀 한 칸을 사이에 두고 바로 붙어있는" 경우는 구조적으로 절대 발생하지 않는다(그랬다면애초에
  // 같은 영역으로 합쳐졌을 것) — 그래서 예전 버전(픽셀 직접 인접만 검사)은 항상 빈 인접 그래프만
  // 반환했다("태양/전갈/귀뚜라미 인접색 원칙 안 먹힘" 제보로 발견). 실제로는 두 영역 사이에 그려진
  // 윤곽선(벽)이 몇 픽셀 두께인지가 관건이므로, 벽 픽셀만 통과하는 BFS로 각 영역을 ADJACENCY_BRIDGE_PX
  // 만큼 확장해 서로 닿으면(=사이 윤곽선이 그 두께 이하면) 인접으로 본다.
  // 실측(전갈/귀뚜라미 등): 6px에선 대부분 못 잡고, 15~20px부터 인접 그래프가 안정됨(20→30에서
  // 더 안 늘어남) — 20px로 확정.
  const ADJACENCY_BRIDGE_PX = 20;
  function buildLabelAdjacency(labelMap) {
    const total = WORK_SIZE * WORK_SIZE;
    const reach = new Array(total); // 벽 픽셀마다 지금까지 도달한 라벨 Set(칠할 픽셀은 안 씀)
    const adj = new Map();
    const addAdj = (a, b) => {
      if (a === b) return;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    };
    const registerIfMulti = (set) => {
      if (set.size < 2) return;
      const arr = Array.from(set);
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) addAdj(arr[i], arr[j]);
      }
    };
    let queue = [];
    // 0단계: 영역과 맞닿은 벽 픽셀에 그 영역의 라벨을 등록
    for (let i = 0; i < total; i++) {
      const lab = labelMap[i];
      if (lab < 0) continue;
      const x = i % WORK_SIZE, y = (i / WORK_SIZE) | 0;
      const seed = (n) => {
        if (labelMap[n] !== -1) return;
        if (!reach[n]) { reach[n] = new Set(); queue.push(n); }
        if (!reach[n].has(lab)) { reach[n].add(lab); registerIfMulti(reach[n]); }
      };
      if (x > 0) seed(i - 1);
      if (x < WORK_SIZE - 1) seed(i + 1);
      if (y > 0) seed(i - WORK_SIZE);
      if (y < WORK_SIZE - 1) seed(i + WORK_SIZE);
    }
    // 1~(BRIDGE-1)단계: 벽 픽셀에서 벽 픽셀로만(칠할 픽셀은 침범하지 않고) 라벨 집합을 계속 퍼뜨림
    for (let step = 1; step < ADJACENCY_BRIDGE_PX; step++) {
      const nextQueue = [];
      queue.forEach((p) => {
        const set = reach[p];
        const x = p % WORK_SIZE, y = (p / WORK_SIZE) | 0;
        const spread = (n) => {
          if (labelMap[n] !== -1) return;
          if (!reach[n]) reach[n] = new Set();
          let grew = false;
          set.forEach((lab) => { if (!reach[n].has(lab)) { reach[n].add(lab); grew = true; } });
          if (grew) {
            nextQueue.push(n);
            registerIfMulti(reach[n]);
          }
        };
        if (x > 0) spread(p - 1);
        if (x < WORK_SIZE - 1) spread(p + 1);
        if (y > 0) spread(p - WORK_SIZE);
        if (y < WORK_SIZE - 1) spread(p + WORK_SIZE);
      });
      if (!nextQueue.length) break;
      queue = nextQueue;
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
    // 2026-08-14: "유아모드는 실물색 그대로, 챌린지 모드는 실물색 기반이되 인접 영역만 다른 색으로"
    // — 인접 보정은 챌린지 모드에서만 적용한다.
    if (currentIsChallenge) enforceAdjacentDistinctColors();
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

  // 2026-08-14: "인접한 색칠영역은 같은 색깔이 될 수 없다" — Goal 색 배정의 기본 원칙(전체
  // 도안/전체 레벨 공통). buildLabelAdjacency로 맞닿은 영역 쌍을 찾아, 같은 색인 쌍이 있으면
  // 한쪽을 이웃과 겹치지 않는 팔레트(COLORS) 색으로 바꾼다. 한 번 바꾸면 다른 이웃과 새로
  // 충돌할 수 있어(예: 3개 이상 서로 맞닿은 경우) 더 바뀌는 게 없어질 때까지 반복한다.
  function enforceAdjacentDistinctColors() {
    if (!currentGradableRegions || currentGradableRegions.length < 2) return;
    const adj = buildLabelAdjacency(currentLabelMap);
    let changed = true;
    let guard = 0;
    while (changed && guard < 5) {
      changed = false;
      guard++;
      currentGradableRegions.forEach((r) => {
        const neighbors = adj.get(r.label);
        if (!neighbors || neighbors.size === 0) return;
        const myHex = currentLabelToColor.get(r.label);
        const neighborHexes = new Set();
        neighbors.forEach((n) => {
          const nh = currentLabelToColor.get(n);
          if (nh) neighborHexes.add(nh);
        });
        if (neighborHexes.has(myHex)) {
          const free = COLORS.find((c) => !neighborHexes.has(c));
          if (free && free !== myHex) {
            currentLabelToColor.set(r.label, free);
            changed = true;
          }
        }
      });
    }
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


  // 2026-08-20: "버튼 링이 캔버스처럼 정사각형이어야" 요청 — CSS만으로는 안 풀림(위 style.css
  // #coloring-screen 주석의 1~2차 시도 참고: 팔레트 열의 스와치 내용물이 정사각형보다 커서
  // grid auto 트랙이 오히려 내용물 쪽에 맞춰 늘어나 버림). 가운데 열의 실제 폭(=이 화면에서
  // 정사각형이 되는 크기, min(그 폭, 420)과 동일한 값)을 계산해 --ring-square로 박아 넣어
  // goal-panel/canvas 행 높이를 강제로 고정한다 — 팔레트 열은 그 고정 높이에 맞춰 늘어나고,
  // 넘치는 스와치는 기존 overflow-y:auto로 스크롤된다. 색칠 화면을 열 때(화면이 보이기 직전)와
  // 리사이즈/회전 시 다시 계산한다.
  function syncRingSquareSize() {
    const middleColumnWidth = coloringScreen.clientWidth - 176; // 176 = 좌우 팔레트 열(88px×2)
    const size = Math.max(0, Math.min(middleColumnWidth, 420));
    document.documentElement.style.setProperty('--ring-square', size + 'px');
  }

  // 2026-08-20: "상하좌우 버튼 간 거리가 다 똑같아야"(뒤로가기→첫 색, 색↔색, 마지막 색→완료 전부
  // 포함) 요청 — 위/아래 줄(#frame-top)은 justify-content:space-between이라 렌더링된 실제 간격이
  // CSS 고정값이 아니라 도안·화면 크기마다 다르다. 그 값을 직접 측정해 --ring-gap으로 반영하면
  // 좌/우 열(.palette-col, style.css 참고)이 같은 값을 gap/padding에 그대로 써서 맞춘다.
  function syncRingGap() {
    const items = [...frameTop.querySelectorAll('.ring-circle, .color-swatch')]
      .filter((el) => el.offsetParent !== null)
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    if (items.length < 2) return;
    const r0 = items[0].getBoundingClientRect();
    const r1 = items[1].getBoundingClientRect();
    const gap = Math.max(0, Math.round((r1.left - r0.right) * 10) / 10);
    document.documentElement.style.setProperty('--ring-gap', gap + 'px');
  }
  window.addEventListener('resize', () => {
    if (!coloringScreen.hidden) { syncRingSquareSize(); syncRingGap(); }
  });

  // 2026-08-20: "링 안 뒤로가기는 한 단계만" 요청 — 이 함수는 원래도 그 동작이었다(일반 레벨은
  // 갤러리로, 보스전은 지도로 한 단계만 물러남). #btn-back(링)에 그대로 연결.
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

  // 2026-08-20: "헤더 홈버튼은 goal 이미지 좌상단, 끝까지(지도까지) 한번에" 요청 — goHome()과
  // 달리 갤러리를 안 거치고 항상 지도 화면으로 바로 나간다. #btn-home(헤더)에 연결.
  function goHomeToMap() {
    coloringScreen.hidden = true;
    stopLevelTimer();
    currentBossMode = null;
    setBgmTrack(MUSIC_SRC);
    galleryScreen.hidden = true;
    mapScreen.hidden = false;
    renderMap();
  }

  // ================= 팔레트 =================
  // 난이도(1~10단계)가 오를수록 고를 수 있는 색상 수가 늘어남(4색 → 10색), 10단계에서 흰색 보너스 추가
  const PALETTE_SIZE_BY_LEVEL = [4, 4, 5, 6, 7, 8, 9, 10, 10, 10];

  // 목표 이미지 자동 색 배정(순환)용 — 흰색 제외, 그 단계에서 실제로 고를 수 있는 색 범위 안에서만 순환
  function targetPaletteForLevel(level) {
    const idx = Math.min(Math.max(level || 10, 1), 10) - 1;
    return TARGET_PALETTE.slice(0, PALETTE_SIZE_BY_LEVEL[idx]);
  }

  // 2026-08-20: "팔레트는 항상 다 보여줘(레벨별 4→10색 증가 폐지)" 요청 — 실제 그림의 난이도(절차생성
  // 도안이 몇 색을 쓰는지, targetPaletteForLevel/PALETTE_SIZE_BY_LEVEL)는 그대로 두고, 고를 수 있는
  // 스와치 UI만 유아모드=COLORS 전체, 챌린지모드=+하늘색·회색까지 항상 다 보여준다.
  // 2026-08-20: "상/하/좌/우 정확히 4개씩(모서리는 인접한 두 변이 공유)" 요청 — 링 전체를 사각형
  // 둘레 하나로 보고 순서대로 배분한다. 챌린지(둘레 5칸, 네 모서리가 전부 뒤로가기/스킬/완료라
  // 색은 각 변에 3개씩=12색)와 유아(둘레 4칸, 모서리 중 뒤로가기·완료만 있고 나머지 두 모서리
  // 우상단·좌하단은 색으로 채워야 4개씩 맞음=변 2개+모서리색 2개=10색)가 갯수가 달라 표를 나눔.
  function renderPalette() {
    const usedColors = currentLabelToColor ? Array.from(new Set(currentLabelToColor.values())) : [];
    const required = usedColors.length ? usedColors : ((currentTemplate && currentTemplate.partColors) || []);
    let cols;
    if (currentTemplate && currentTemplate.paletteOverride) {
      cols = currentTemplate.paletteOverride.slice();
    } else {
      cols = currentIsChallenge ? SWATCH_BASE_PALETTE.concat(CHALLENGE_EXTRA_COLORS) : SWATCH_BASE_PALETTE.slice();
    }
    required.forEach((c) => { if (!cols.includes(c)) cols.push(c); });
    // 2026-08-20: "유아모드는 버튼이 반드시 12개(색10+뒤로가기+완료)로 구성돼야" 요청 — required
    // 병합으로 기본 팔레트 밖 색이 추가돼 12개를 넘기면, required가 아닌 기본색을 뒤에서부터
    // 잘라내 항상 정확히 10색(챌린지는 12색)으로 맞춘다. 도안 자체의 색 배정(어떤 그림이 어떤
    // 색을 쓰는지)은 안 건드리고 팔레트 UI 표시 개수만 강제로 캡한다.
    const swatchTarget = currentIsChallenge ? 12 : 10;
    if (cols.length > swatchTarget) {
      const requiredSet = new Set(required);
      for (let idx = cols.length - 1; idx >= 0 && cols.length > swatchTarget; idx--) {
        if (!requiredSet.has(cols[idx])) cols.splice(idx, 1);
      }
    }
    selectedColor = cols[0];
    [paletteTop, paletteBottom, paletteLeft, paletteRight, cornerTR, cornerBL].forEach((el) => {
      el.querySelectorAll('.color-swatch').forEach((sw) => sw.remove());
    });

    // 둘레를 위(왼쪽→오른쪽) → 우상단 모서리 → 오른쪽(위→아래) → 아래(왼쪽→오른쪽) → 좌하단
    // 모서리 → 왼쪽(위→아래) 순서로 한 바퀴 돌며 자른다. 챌린지는 모서리 칸이 0이라 그냥 건너뜀.
    const perSide = currentIsChallenge ? 3 : 2;
    const cornerColors = currentIsChallenge ? 0 : 1;
    let i = 0;
    const take = (n) => cols.slice(i, i += n);
    const plan = [
      [paletteTop, take(perSide)],
      [cornerTR, take(cornerColors)],
      [paletteRight, take(perSide)],
      [paletteBottom, take(perSide)],
      [cornerBL, take(cornerColors)],
      [paletteLeft, take(perSide)],
    ];
    const overflow = cols.slice(i); // required 병합으로 기본치보다 색이 많은 도안의 나머지(좌우에 번갈아)
    overflow.forEach((color, k) => plan.push([k % 2 === 0 ? paletteRight : paletteLeft, [color]]));

    let globalIdx = 0;
    plan.forEach(([container, colors]) => {
      colors.forEach((color) => {
        const btn = document.createElement('button');
        btn.className = 'ring-circle color-swatch' + (globalIdx === 0 ? ' active' : '');
        btn.style.background = color;
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('aria-label', 'Pick a color');
        btn.dataset.color = color;
        btn.addEventListener('click', () => {
          selectedColor = color;
          getPaletteSwatches().forEach((el) => el.classList.remove('active'));
          btn.classList.add('active');
        });
        container.appendChild(btn);
        globalIdx++;
      });
    });
  }

  function getPaletteSwatches() {
    return [paletteTop, paletteBottom, paletteLeft, paletteRight, cornerTR, cornerBL]
      .flatMap((el) => [...el.querySelectorAll('.color-swatch')]);
  }

  function rgbToHex(r, g, b) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  // ================= 구역별 단계 칭찬(GOOD~PERFECT) =================
  // 2026-08-17: "유아모드에서 색칠 1개 완료되면 칭찬" 요청 — 도안 안의 구역을 하나씩 채울 때마다
  // 텍스트+애니메이션+진동으로 단계가 올라간다(7단계 고정, 도안 구역 수가 그보다 적으면 그
  // 구역 수까지만 도달). 정답 색인지는 여기서 안 따진다 — 정답 채점은 완료 버튼 눌렀을 때만
  // (computeCompletion) 하고, 여긴 "빈 구역을 새로 칠했는지"만 본다.
  // 2026-08-17: "이 부분은 영어로만" 요청 — 언어 상관없이 항상 영어 단어로 고정.
  const REGION_STAGE_TEXT = ['GOOD!', 'GREAT!', 'AWESOME!', 'EXCELLENT!', 'AMAZING!', 'FANTASTIC!', 'PERFECT! ⭐'];
  function regionStageText(tier) {
    return REGION_STAGE_TEXT[Math.min(Math.max(tier, 1), REGION_STAGE_TEXT.length) - 1];
  }

  let regionStageTimer = null;
  // duration: 구역마다 자주 뜨니까 그림을 오래 가리지 않게 기본은 짧게(900ms) 잡는다.
  function showRegionStagePraise(tier, duration) {
    duration = duration || 900;
    if (regionStageTimer) { clearTimeout(regionStageTimer); regionStageTimer = null; }
    regionStagePraise.textContent = regionStageText(tier);
    regionStagePraise.style.setProperty('--tier', tier);
    regionStagePraise.hidden = false;
    regionStagePraise.classList.remove('show');
    void regionStagePraise.offsetWidth; // 리플로우 강제 — 같은 단계가 연달아 떠도 팝인이 다시 재생되게 함
    regionStagePraise.classList.add('show');
    // 진동 세기도 단계별로 키운다 — 기존 코드의 35~40ms(가벼운 반응)~400ms(보스 큰 승리) 범위를
    // 그대로 따라감. iOS(Safari/홈화면 PWA)는 Vibration API 자체가 없어서 조용히 무시됨.
    if (navigator.vibrate) { try { navigator.vibrate(tier >= 7 ? 400 : 20 + tier * 20); } catch (e) { /* 무시 */ } }
    regionStageTimer = setTimeout(() => {
      regionStageTimer = null;
      regionStagePraise.hidden = true;
      regionStagePraise.classList.remove('show');
    }, duration);
  }

  // 단계 카운트에 이미 반영된 구역 label 모음 — 도안을 새로 열 때(openTemplate) 비운다.
  // 2026-08-17: "틀린 색 고쳐도 메시지가 안 뜬다" 제보 — 한 번 칠한 구역은 다시 칠해도(재색칠)
  // 새로 안 세는 게 기본이지만, "다시 도전!"으로 되돌아왔을 때는 그때 틀려 있던 구역만
  // showTryAgain()이 이 Set에서 미리 빼둬서, 그 구역을 다시 건드리면 다음 단계로 이어서 올라간다
  // (처음부터 GOOD으로 리셋하지 않음 — 이미 꽤 진행된 그림에서 제일 약한 단계를 다시 보여주는
  // 건 부자연스럽고, 어차피 리셋해도 칠해진 구역 수 자체는 안 줄어서 다음 탭에 곧장 최고
  // 단계로 튀어버림).
  let countedRegionLabels = new Set();

  // 2026-08-17: "구역 7개 넘으면 다 PERFECT인데, 다른 색 칠해도 뜬다" 제보 — 예전엔 정답색인지
  // 상관없이 "새 구역을 칠했는지"만 셌다. 이제 정답색으로 칠했을 때만 단계가 올라간다.
  function isCorrectColorForLabel(label, hexColor) {
    if (label == null || !currentLabelToColor || !hexColor) return false;
    const targetHex = currentLabelToColor.get(label);
    if (!targetHex) return false;
    const [tr, tg, tb] = hexToRgba(targetHex);
    const [hr, hg, hb] = hexToRgba(hexColor);
    return tr === hr && tg === hg && tb === hb;
  }

  // 지금 화면에 칠해져 있지만(정답 여부와 무관하게 채색됨) 정답색과 다른 구역의 label 목록.
  // showTryAgain()이 이 구역들만 countedRegionLabels에서 빼서 "한 번 맞게 칠했다가 다시
  // 틀리게 덧칠한" 구역을 반영한다. computeCompletion()과 같은 판정 로직이지만 label을
  // 모아 돌려준다는 점만 다르다.
  function wrongPaintedLabels() {
    if (!currentGradableRegions || currentGradableRegions.length === 0) return [];
    const data = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
    const wrong = [];
    currentGradableRegions.forEach((r) => {
      const p = r.seed * 4;
      if (data[p + 3] === 0) return; // 안 칠한 구역 — 애초에 아직 카운트 안 됐을 것
      const targetHex = currentLabelToColor ? currentLabelToColor.get(r.label) : null;
      if (!targetHex) return;
      const [tr, tg, tb] = hexToRgba(targetHex);
      if (!(data[p] === tr && data[p + 1] === tg && data[p + 2] === tb)) wrong.push(r.label);
    });
    return wrong;
  }

  function maybeShowRegionStagePraise(label) {
    // 챌린지 모드는 자체 HUD(콤보/정확도) 피드백이 따로 있고, 보스는 팡파레가 따로 있어서 제외.
    if (currentIsChallenge || (currentTemplate && currentTemplate.isBoss)) return;
    if (label == null || countedRegionLabels.has(label)) return;
    countedRegionLabels.add(label);
    lastRegionStageShown = countedRegionLabels.size;
    showRegionStagePraise(Math.min(lastRegionStageShown, 7));
  }

  // ================= 플러드필 =================
  function hexToRgba(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return [r, g, b, 255];
  }

  // 실제로 픽셀을 채우는 부분만 뺀 것 — 소리/단계 칭찬 같은 "사용자가 지금 막 칠했다"는
  // 부수효과 없이, 캔버스에만 색을 채워야 할 때(2026-08-17: 이미 클리어된 그림을
  // 다시 열 때 자동으로 미리 다 칠해두는 용도, autoFillIfMastered 참고) 재사용한다.
  function fillRegionPixels(startIdx, hexColor) {
    if (!wallMask || wallMask[startIdx] === 1) return false; // 선을 눌렀으면 무시

    const imgData = fillCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE);
    const data = imgData.data;
    const [r, g, b, a] = hexToRgba(hexColor);

    const startPixel = startIdx * 4;
    // 이미 같은 색이면 스킵
    if (data[startPixel] === r && data[startPixel + 1] === g &&
        data[startPixel + 2] === b && data[startPixel + 3] === a) {
      return false;
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
    return true;
  }

  function floodFill(startX, startY, hexColor) {
    if (startX < 0 || startY < 0 || startX >= WORK_SIZE || startY >= WORK_SIZE) return;
    const startIdx = startY * WORK_SIZE + startX;
    if (!fillRegionPixels(startIdx, hexColor)) return;
    playPop();
    const label = currentLabelMap ? currentLabelMap[startIdx] : null;
    if (isCorrectColorForLabel(label, hexColor)) maybeShowRegionStagePraise(label);
  }

  // Task2(챌린지 Phase2): floodFill과 같은 벽(wallMask) 경계 연결 채우기지만, 시스템이 자동으로
  // 색을 바꾸는 용도(LEVEL 9/10)라 playPop()을 호출하지 않는다(플레이어가 직접 칠한 게 아니므로).
  // hexColor가 null이면 그 영역을 다시 미색칠(alpha 0) 상태로 되돌린다(LEVEL 9의 "랜덤 소멸").
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
    if (currentIsViewOnly) return; // 보기 전용 완성본은 채색 편집을 막는다.
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
      saveHistory(RATING_LEVELS[0]); // justBecameBossCleared/justBecameLevelCleared를 여기서 계산해서 세팅해둠
      if (justBecameBossCleared) {
        showBossFanfare(); // 보스는 그대로 팡파레 유지
      } else if (currentTemplate && currentTemplate.isBoss) {
        // 보스 재도전(이미 클리어했던 보스를 또 완료) — 팡파레도 아래 그림완성 칭찬도 없이 조용히.
        goHome();
      } else {
        // 2026-08-17: "마지막 색칠이 완료되면(=완료 버튼으로 100% 확인됐을 때) 음성+텍스트+
        // 애니메이션 후 흡수" 요청 — playPictureCompletePraise() 참고.
        // 레벨 전체를 다 클리어한 순간엔 그대로 조각 맞추기 미니게임 → finishRewardPuzzle()이
        // 별도로 축하한다(여기서 미리 축하하지 않음, renderLevelGallery()의 maybeShowRewardPuzzle() 참고).
        playPictureCompletePraise();
      }
    } else {
      showTryAgain(matched, total);
    }
  });

  // 이번 제출로 그 레벨이 "방금 처음" 클리어됐는지(이미 클리어돼 있던 레벨을 다시 색칠한 게 아닌지) —
  // saveHistory에서 점수 저장 전/후 상태를 비교해 기록해두고, btnSave 핸들러가 이 값으로만
  // 음성 축하(justBecameLevelCleared)/보스 팡파레(justBecameBossCleared)를 띄운다.
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

  // 하나라도 틀리면 저장하지 않고 "다시 도전!"만 잠깐 보여준 뒤 색칠 화면에 그대로 머무른다
  // (색칠 화면을 떠난 적이 없으므로 별도 화면 전환 없이 오버레이만 닫으면 됨).
  function showTryAgain(matched, total) {
    if (praiseHomeTimer) { clearTimeout(praiseHomeTimer); praiseHomeTimer = null; }
    // 2026-08-17: 구역별 단계 칭찬은 이제 정답색으로 칠한 순간에만 카운트되지만(위
    // isCorrectColorForLabel 참고), "한 번 맞게 칠했다가 다시 다른(틀린) 색으로 덧칠"한
    // 구역은 여전히 countedRegionLabels에 남아있을 수 있다(recolor 시점엔 그 카운트를
    // 건드리지 않으므로). 완료 실패 시점에 지금 화면 기준으로 다시 확인해서 그런 구역만
    // 빼준다 — 그래야 그 구역을 다시 맞게 고쳐 칠했을 때 다음 단계로 자연스럽게 이어진다.
    wrongPaintedLabels().forEach((lbl) => countedRegionLabels.delete(lbl));
    lastRegionStageShown = countedRegionLabels.size;
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
  function pickChildishVoice(langPrefix) {
    if (!cachedVoices.length) return null;
    const re = new RegExp('^' + (langPrefix || 'en'), 'i');
    const matched = cachedVoices.filter((v) => re.test(v.lang));
    const pool = matched.length ? matched : cachedVoices;
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

  // 레벨 클리어 때마다 매번 같은 말만 나오면 금방 질리니 여러 문구 중 랜덤으로 고른다.
  // 감탄사를 앞에 붙여서 그냥 단어 하나 읽는 것보다 "진짜 반응하는" 느낌이 나게 함
  // (2026-08-10, "대본 읽는 것처럼 들린다"는 피드백으로 추가 — Web Speech API는 SSML/억양 세부
  // 제어가 안 되니 톤(pitch)·속도(rate)를 매번 살짝 흔들고 감탄사로 흥을 더하는 정도가 현실적 한계).
  // 2026-08-17: "칭찬은 UI 언어와 무관하게 항상 영어로만" 요청 — 한국어 TTS 음성이 어색하게
  // 들린다는 피드백으로, 2026-08-16에 넣었던 언어별(ko/ja/zh/es) 문구를 다시 뺐다.
  const LEVEL_CLEAR_PRAISE = [
    'Wow, excellent!', 'Yay, awesome!', 'Wow, great job!', 'Yay, amazing!', 'Woohoo, fantastic!',
    'Yes, you did it!', 'Woohoo, way to go!', 'Wow, wonderful!', 'Yay, you are a star!', 'Woohoo, super!'
  ];

  // 보상 이미지(#level-reward) 바로 아래에 칭찬 문구를 잠깐 띄운다 — 2.8초 뒤 자동으로 사라짐
  // (praiseOverlay와 동일하게 페이드아웃 없이 바로 hidden 처리).
  let levelClearPraiseTimer = null;
  function showLevelClearPraise(text) {
    if (levelClearPraiseTimer) { clearTimeout(levelClearPraiseTimer); levelClearPraiseTimer = null; }
    levelRewardPraise.textContent = text;
    levelRewardPraise.hidden = false;
    levelRewardPraise.classList.remove('show');
    void levelRewardPraise.offsetWidth; // 리플로우 강제 — 같은 문구가 연달아 떠도 팝인 애니메이션이 다시 재생되게 함
    levelRewardPraise.classList.add('show');
    levelClearPraiseTimer = setTimeout(() => {
      levelClearPraiseTimer = null;
      levelRewardPraise.hidden = true;
      levelRewardPraise.classList.remove('show');
    }, 2800);
  }

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
      const voice = pickChildishVoice(opts.langPrefix);
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
    const phrase = LEVEL_CLEAR_PRAISE[Math.floor(Math.random() * LEVEL_CLEAR_PRAISE.length)];
    showLevelClearPraise(phrase);
    speakPraise(phrase, { pitch: 2, rate: 1.3, langPrefix: 'en' }); // 기본값보다도 더 빠르게 = 더 신난 느낌
  }

  // 2026-08-17: 그림 한 장이 완료 버튼으로 100% 확정된 순간 — 구역별 단계 칭찬의 마지막 단계
  // (PERFECT)와 같은 문구로 음성+텍스트+애니메이션을 보여준 뒤 흡수 애니메이션으로 이어간다.
  // #picture-complete-praise는 #coloring-screen 밖에 있는 고정(position:fixed) 오버레이라서
  // goHome()으로 화면이 갤러리로 바뀌어도 그 위에 계속 떠 있는다(#praise-overlay와 같은 방식).
  // 그래서 여기서는 goHome()을 지연 없이 그대로 바로 호출한다 — recordLevelClearTime 등 기존
  // 타이밍(완료 버튼 누른 그 순간 즉시 기록)을 하나도 안 건드림.
  let pictureCompleteTimer = null;
  function playPictureCompletePraise() {
    if (pictureCompleteTimer) { clearTimeout(pictureCompleteTimer); pictureCompleteTimer = null; }
    // 2026-08-17: "음성이랑 화면 문구가 다르다(화면은 항상 PERFECT, 음성은 랜덤)" 제보 — 같은
    // 문구를 뽑아서 화면 텍스트와 음성 둘 다에 쓴다(playExcellent와 동일한 방식).
    const phrase = LEVEL_CLEAR_PRAISE[Math.floor(Math.random() * LEVEL_CLEAR_PRAISE.length)];
    pictureCompletePraise.textContent = phrase;
    pictureCompletePraise.hidden = false;
    pictureCompletePraise.classList.remove('show');
    void pictureCompletePraise.offsetWidth; // 리플로우 강제 — 연달아 떠도 팝인이 다시 재생되게 함
    pictureCompletePraise.classList.add('show');
    if (navigator.vibrate) { try { navigator.vibrate(400); } catch (e) { /* 무시 */ } } // 기존 보스 큰 승리와 동일한 세기
    speakPraise(phrase, { pitch: 2, rate: 1.25, langPrefix: 'en' });
    goHome();
    pictureCompleteTimer = setTimeout(() => {
      pictureCompleteTimer = null;
      pictureCompletePraise.hidden = true;
      pictureCompletePraise.classList.remove('show');
    }, 2800);
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
  btnHome.addEventListener('click', goHomeToMap);
  btnBack.addEventListener('click', goHome);

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

  // 2026-08-14: 표지에서 유아모드/챌린지모드 두 갈래로 갈라짐 — 프로필 입력 모달은 공용이라,
  // 어느 버튼으로 열렸는지 기억해뒀다가 모달 완료 후 그 갈래로 이어준다.
  let coverEntryTarget = 'map';

  function enterChallengeFromCover() {
    window.Challenge.openSelectScreen(); // 표지 화면을 숨기고 챌린지 선택 화면을 여는 것까지 포함
    tryPlayMusic();
    warmUpSpeech();
  }

  function goCoverEntry() {
    if (coverEntryTarget === 'challenge') enterChallengeFromCover();
    else enterMapFromCover();
  }

  btnCoverStart.addEventListener('click', () => {
    coverEntryTarget = 'map';
    // 프로필(닉네임/국기)이 아직 없으면 맵으로 넘어가기 전에 딱 한 번만 물어본다.
    if (getPlayerProfile()) {
      enterMapFromCover();
    } else {
      playerInputName.value = '';
      populateFlagSelect(playerInputFlag);
      playerEntryModal.hidden = false;
    }
  });

  btnCoverStartChallenge.addEventListener('click', () => {
    coverEntryTarget = 'challenge';
    if (getPlayerProfile()) {
      enterChallengeFromCover();
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
    goCoverEntry();
  });

  playerEntrySkip.addEventListener('click', () => {
    savePlayerProfile({ nickname: '', flag: '' }); // 다시 묻지 않도록 빈 프로필이라도 저장
    playerEntryModal.hidden = true;
    goCoverEntry();
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

  // 디버그/테스트용(2026-08-14 새 도안 300개 "선 끊김/경계선 걸침" 문제로 추가): wallMask
  // (윤곽선 픽셀) 자체가 캔버스 테두리에 닿았는지 확인 — 닿았으면 그림(선 포함)이 캔버스 밖으로
  // 잘렸다는 뜻(닿은 지점에서 선이 캔버스 경계에 뚝 끊긴 것처럼 보이는 원인). 채점 대상 영역만
  // 보던 이전 버전은 "테두리에 닿은 조각은 배경으로 병합되어 애초에 채점 대상에서 빠짐" 케이스를
  // 못 잡아서 실제로는 항상 0을 반환했음 — wallMask 직접 검사로 수정.
  window.__debugBorderTouch = () => {
    if (!wallMask) return false;
    for (let x = 0; x < WORK_SIZE; x++) {
      if (wallMask[x] === 1) return true; // 윗줄
      if (wallMask[(WORK_SIZE - 1) * WORK_SIZE + x] === 1) return true; // 아랫줄
    }
    for (let y = 0; y < WORK_SIZE; y++) {
      if (wallMask[y * WORK_SIZE] === 1) return true; // 왼쪽줄
      if (wallMask[y * WORK_SIZE + WORK_SIZE - 1] === 1) return true; // 오른쪽줄
    }
    return false;
  };

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
      const paletteColors = getPaletteSwatches().map((el) => el.dataset.color);
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

  // 디버그/테스트용: 챌린지 모드로 도안을 열어서(opts.challenge=true) 영역 수/정답색 확인
  window.__debugChallengeOpenTemplate = (tplId) => new Promise((resolve) => {
    const tpl = COLORING_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return resolve(null);
    openTemplate(tpl, () => resolve({
      regionCount: currentGradableRegions.length,
      targetColors: currentGradableRegions.map((r) => currentLabelToColor.get(r.label)),
    }), { challenge: true });
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
    setWormProgress,
    setWormExit,
    resetWormForNewProblem,
    getTemplatesForLevel,
    getChallengeTierTemplates,
    repaintGoalWithColors,
    paintRegionPixels,
    getChallengeRegionInfo,
    colorDistance,
    COLORS
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
