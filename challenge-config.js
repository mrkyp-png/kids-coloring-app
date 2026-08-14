// challenge-config.js
// 챌린지 모드(MODE_CHALLENGE) 밸런스 수치. 명세서 45번 "Config 원칙" — 게임 로직은
// 이 값을 참조만 하고, 숫자 자체는 여기서만 바꾼다.
(function () {
  'use strict';

  window.CHALLENGE_CONFIG = {
    // ---- 2026-08-14 최종 리뷰(I7): Phase 1은 미완성 상태(레벨 8개 잠김, 결과창 alert)로
    // 배포되므로 진입 버튼을 숨겨둔다. Phase 4에서 true로 전환. ----
    // 개발 중에는 사용자가 미리보기로 직접 확인해야 해서 true로 켜둠 — 실서비스에 push하기
    // 직전에 반드시 false로 되돌릴 것.
    ENABLED: true,

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
  };
})();
