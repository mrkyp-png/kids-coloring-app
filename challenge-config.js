// challenge-config.js
// 챌린지 모드(MODE_CHALLENGE) 밸런스 수치. 명세서 45번 "Config 원칙" — 게임 로직은
// 이 값을 참조만 하고, 숫자 자체는 여기서만 바꾼다.
(function () {
  'use strict';

  window.CHALLENGE_CONFIG = {
    // ---- 2026-08-14 최종 리뷰(I7): 미완성 상태로 전체 배포되는 걸 막기 위한 플래그.
    // 개발 중에는 사용자가 미리보기로 직접 확인해야 해서 true로 켜둠 — 실서비스에 push하기
    // 직전에 반드시 false로 되돌릴 것. ----
    ENABLED: true,

    // ---- DIFFICULTY: 문제 1개당 제한시간(초), 명세서 4번 ----
    // 2026-08-14 피드백: "보통부터 타임어택 들어가는데 너무 촉박함" — 20/15/10 -> 50/40/30
    // 2026-08-15: 유아용/챌린지 재구성으로 챌린지가 쉬움/보통/어려움 3단계로 축소(매우어려움 제거 —
    // 유아용이 예전 "가장 쉬운 100개" 역할을 흡수). 쉬움도 이제 유아용 풀이 아닌 별도 도안이라
    // 그대로 타임어택 대상.
    DIFFICULTY_TIME: { easy: 60, normal: 50, hard: 40 },
    // ---- DIFFICULTY: Ranking 점수 배율, 명세서 5번 ----
    DIFFICULTY_SCORE_MULTIPLIER: { easy: 1.0, normal: 1.5, hard: 2.0 },

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

    // ---- LEVEL 1, 명세서 8번: Goal 표시 시간(ms) — LEVEL4/8 스왑 후 지금은 LEVEL8(사라짐)이 사용 ----
    LEVEL1_GOAL_DISPLAY_MS: 5000, // 2026-08-14 피드백: "너무 짧다" — 1000 -> 5000

    // ---- LEVEL 2, 명세서 9번: 원형 가림 반경/이동 패턴 (명세서에 구체값 없음 - 임시값) ----
    // 2026-08-15 피드백: 나선형 등장·퇴장 방식을 "바운스 공" 방식으로 교체 — goal은 항상 다
    // 보이고, 원(공) 하나가 튕기면서 돌아다니는 자리만 안 보인다. 1~3은 좌우로 왕복하면서
    // 위아래로 튕기고(가로 방향이 주 이동축), 4~6은 그 반대(상하 왕복 + 좌우로 튕김).
    LEVEL2_REVEAL_RADIUS_PX: 199, // 2026-08-15 피드백: 5배(36->180) -> 30% 확대(180->234) -> 15% 축소(234->199, WORK_SIZE=640 기준)
    LEVEL2_BOUNCE_CYCLE_MS: 4000, // 임시값 - 주 이동축 왕복(끝->끝->끝) 1회 길이
    LEVEL2_BOUNCE_ARC_MS: 700, // 임시값 - 튕기는 원호(보조축) 1회 길이 — 짧을수록 자주 튕김
    // 문제 7~10번: 랜덤 위치에 순간적으로 나타났다 사라지는 "도장" 방식 (글라이드 없음)
    LEVEL2_STAMP_RADIUS_PX: 108, // 2026-08-15 피드백: 도장 원 크기를 3배로 (36 -> 108)
    LEVEL2_STAMP_HOLD_MS: 1200, // 임시값 - 한 번 나타나서 유지되는 시간
    LEVEL2_STAMP_GAP_MS: 500, // 임시값 - 완전히 사라져 있는 시간

    // ---- Perfect 조건, 명세서 28번 (구체값 없음 - 임시값) ----
    PERFECT_ACCURACY: 100, // 임시값 - 밸런스 테스트 후 조정 (%, 이 이상이어야 Perfect)
    PERFECT_BONUS: 200, // 임시값 - 밸런스 테스트 후 조정

    // ---- Score 부가 요소 (구체 공식 없음 - 임시값) ----
    TIME_BONUS_PER_SEC: 5, // 임시값 - 남은시간(초) x 이 값 = TimeBonus
    MISTAKE_PENALTY_PER_MISTAKE: 20, // 임시값 - MistakeCount x 이 값 = MistakePenalty

    // ---- 돋보기, 명세서 19번: LEVEL 1~6만 Level당 1회 ----
    MAGNIFIER_MAX_LEVEL: 6,

    // ---- LEVEL 3, 명세서 8번: Cloud/Rain/Snow 가림 불투명도 (Goal을 완전히 가리지 않음) ----
    LEVEL3_OCCLUSION_OPACITY: 1, // 2026-08-14 피드백: 반투명이면 구름인지 잘 안 보여서 완전 불투명으로

    // ---- LEVEL 4, 명세서 9번: Fade/Shrink/Fragment 사라짐 애니메이션 길이(ms) ----
    LEVEL4_TRANSITION_MS: 600, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 5, 명세서 10번: 360도 회전 1바퀴 시간 / Mirror 전환 간격(ms) ----
    LEVEL5_ROTATION_MS: 4000, // 임시값 - 밸런스 테스트 후 조정
    // 2026-08-15 피드백: "회전하면서 경계선과 겹치고 상단도 잘림" — perspective(800px)가 너무
    // 가까워서 rotateY 중 상하로 튀어나오는 양(실측: 최대 38px, 박스 313px 기준 약 12%)이
    // overflow:hidden에 잘려나갔음. perspective를 두 배로 키우고(원근 왜곡 자체를 줄임) 살짝
    // 축소(scale)해서 여유 공간을 만들면 튀어나오는 양이 0이 되는 조합을 실측으로 찾음
    // (1600px+90% 및 2200px+93%, 3000px+95% 등 여러 조합이 0px — 그 중 원래의 800px에 가장
    // 가까워 3D 느낌이 덜 밋밋한 1600px+90%로 선택). goalCanvasWrap의 overflow:hidden은 혹시
    // 모를 오차에 대비해 안전망으로 그대로 둠(정상 작동 시엔 아무것도 안 걸림).
    LEVEL5_ROTATE_PERSPECTIVE_PX: 1600,
    LEVEL5_ROTATE_SCALE: 0.9,

    // ---- LEVEL 6, 명세서 11번: 영역별 색상 랜덤 변경 주기 / 실제 정답과 일치 시 Pause 길이(ms) ----
    LEVEL6_COLOR_CHANGE_MS: 800, // 임시값 - 밸런스 테스트 후 조정 (랜덤 변경 구간에서 색 바뀌는 주기)
    // 2026-08-14 피드백으로 전면 교체: 15초 주기로 "3초간 진짜 정답 보여주기 -> 12초간 랜덤
    // 변경" 반복. 우연히 색이 다 맞아야 멈추는 방식(LEVEL6_MATCH_PAUSE_MS)은 폐기.
    LEVEL6_CYCLE_MS: 15000,
    LEVEL6_REAL_DISPLAY_MS: 3000,

    // ---- LEVEL 7, 명세서 12번: Goal이 LEFT->RIGHT로 쓸고 지나가는 시간(ms). 문제 1->10로 갈수록
    // SWEEP_START_MS에서 SWEEP_END_MS로 짧아진다(=속도 증가). ----
    LEVEL7_SWEEP_START_MS: 3000, // 임시값 - 밸런스 테스트 후 조정
    LEVEL7_SWEEP_END_MS: 900, // 임시값 - 밸런스 테스트 후 조정
    LEVEL7_PASS_TIMES_MS: [0, 15000, 30000, 45000], // 2026-08-14 피드백: 60초 문제 시간 내 0/15/30/45초에 왼->오->퇴장 슬라이드 반복(총 4회)

    // ---- (구)LEVEL 8 Blink Show/Hide 시간 — 지금은 LEVEL 1(깜빡임)이 씀. 문제 1->10로
    // 갈수록 START에서 END로 짧아짐(더 빨리 깜빡임) ----
    LEVEL8_SHOW_START_MS: 1500, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_SHOW_END_MS: 500, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_HIDE_START_MS: 500, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_HIDE_END_MS: 200, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 8, 2026-08-14 피드백으로 "실루엣 모드"로 교체(레벨4와 컨셉 겹침 해소).
    // 문제 1->10로 갈수록 실루엣 유지 시간은 길어지고(START->END 증가), 진짜 색 반짝이는
    // 시간은 짧아짐(START->END 감소) — 더 어려워짐 ----
    LEVEL8_SILHOUETTE_START_MS: 1000, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_SILHOUETTE_END_MS: 2200, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_FLASH_START_MS: 1200, // 임시값 - 밸런스 테스트 후 조정
    LEVEL8_FLASH_END_MS: 400, // 임시값 - 밸런스 테스트 후 조정

    // ---- LEVEL 9, 명세서 14번: 색칠 영역 랜덤 소멸 간격(ms) ----
    // 2026-08-14 피드백: "영역 수도 늘고 속도도 빨라지면 진행이 안 된다" — 문제 번호대별 차등을
    // 없애고 7초 고정으로.
    LEVEL9_INTERVAL_MS: 7000,

    // ---- LEVEL 10, 명세서 15번: 색상 변경 주기(ms) ----
    // 2026-08-14 피드백: LEVEL9와 동일하게 문제 번호대별 차등을 없애고 7초 고정으로.
    LEVEL10_INTERVAL_MS: 7000,
  };
})();
