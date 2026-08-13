// challenge-config.js
// 챌린지 모드(MODE_CHALLENGE) 밸런스 수치. 명세서 45번 "Config 원칙" — 게임 로직은
// 이 값을 참조만 하고, 숫자 자체는 여기서만 바꾼다.
(function () {
  'use strict';

  window.CHALLENGE_CONFIG = {
    // ---- 2026-08-14 최종 리뷰(I7): Phase 1은 미완성 상태(레벨 8개 잠김, 결과창 alert)로
    // 배포되므로 진입 버튼을 숨겨둔다. Phase 4에서 true로 전환. ----
    ENABLED: false,

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
