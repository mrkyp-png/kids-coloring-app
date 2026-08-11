// 색칠놀이 도안 데이터 (이모지 기반)
// 각 도안은 이모지 글리프에서 어두운 선 + 색상 경계를 자동으로 벽(선)으로 인식해
// 색칠 가능한 영역을 뽑아낸다 (app.js의 loadTemplateSource 'emoji' 모드).
// 레벨(difficulty)은 주제별로 10개씩 묶는다.

const COLORING_TEMPLATES = [
  // ===== Level 1: 하늘 / 간단한 모양 =====
  { id: 'sun', name: 'Sun', emoji: '☀️', difficulty: 7, renderMode: 'emoji', overlaySvg: '<circle cx="200" cy="200" r="78"/>' },
  { id: 'moon', name: 'Moon', emoji: '🌙', difficulty: 3, renderMode: 'emoji' },
  { id: 'star', name: 'Star', emoji: '⭐', difficulty: 1, renderMode: 'emoji' },
  { id: 'cloud', name: 'Cloud', emoji: '☁️', difficulty: 1, renderMode: 'emoji' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', difficulty: 4, renderMode: 'emoji' },
  { id: 'heart', name: 'Heart', emoji: '❤️', difficulty: 1, renderMode: 'emoji' },
  { id: 'drop', name: 'Water Drop', emoji: '💧', difficulty: 1, renderMode: 'emoji' },
  { id: 'balloon', name: 'Balloon', emoji: '🎈', difficulty: 3, renderMode: 'emoji' },
  { id: 'umbrella', name: 'Umbrella', emoji: '☂️', difficulty: 6, renderMode: 'emoji', keepThinParts: true }, // 손잡이(18px)가 얇아서 자동으로 검은 선에 흡수되던 것을 막고 색칠 가능하게 유지
  { id: 'egg', name: 'Egg', emoji: '🥚', difficulty: 1, renderMode: 'emoji' },

  // ===== Level 2: 과일 =====
  { id: 'apple', name: 'Apple', emoji: '🍎', difficulty: 2, renderMode: 'emoji' },
  { id: 'banana', name: 'Banana', emoji: '🍌', difficulty: 6, renderMode: 'emoji' },
  { id: 'orange', name: 'Orange', emoji: '🍊', difficulty: 2, renderMode: 'emoji' },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', difficulty: 2, renderMode: 'emoji' },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍', difficulty: 9, renderMode: 'emoji' },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', difficulty: 2, renderMode: 'emoji' },
  { id: 'peach', name: 'Peach', emoji: '🍑', difficulty: 3, renderMode: 'emoji' },
  { id: 'pear', name: 'Pear', emoji: '🍐', difficulty: 1, renderMode: 'emoji' },
  { id: 'cherry', name: 'Cherries', emoji: '🍒', difficulty: 3, renderMode: 'emoji' },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', difficulty: 8, renderMode: 'emoji' },

  // ===== Level 3: 육상동물 =====
  { id: 'cat', name: 'Cat', emoji: '🐱', difficulty: 8, renderMode: 'emoji' },
  { id: 'dog', name: 'Dog', emoji: '🐶', difficulty: 6, renderMode: 'emoji' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', difficulty: 4, renderMode: 'emoji' },
  { id: 'bear', name: 'Bear', emoji: '🐻', difficulty: 4, renderMode: 'emoji' },
  { id: 'lion', name: 'Lion', emoji: '🦁', difficulty: 6, renderMode: 'emoji' },
  { id: 'pig', name: 'Pig', emoji: '🐷', difficulty: 4, renderMode: 'emoji' },
  { id: 'sheep', name: 'Sheep', emoji: '🐑', difficulty: 1, renderMode: 'emoji' },
  { id: 'mouse', name: 'Mouse', emoji: '🐭', difficulty: 5, renderMode: 'emoji' },
  { id: 'elephant', name: 'Elephant', emoji: '🐘', difficulty: 2, renderMode: 'emoji' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯', difficulty: 5, renderMode: 'emoji' },

  // ===== Level 4: 새 / 농장동물 =====
  { id: 'duck', name: 'Duck', emoji: '🦆', difficulty: 5, renderMode: 'emoji' },
  { id: 'chicken', name: 'Chicken', emoji: '🐔', difficulty: 3, renderMode: 'emoji' },
  { id: 'penguin', name: 'Penguin', emoji: '🐧', difficulty: 6, renderMode: 'emoji' },
  { id: 'owl', name: 'Owl', emoji: '🦉', difficulty: 8, renderMode: 'emoji' },
  { id: 'bird', name: 'Bird', emoji: '🐦', difficulty: 4, renderMode: 'emoji' },
  { id: 'peacock', name: 'Peacock', emoji: '🦚', difficulty: 10, renderMode: 'emoji' },
  { id: 'turkey', name: 'Turkey', emoji: '🦃', difficulty: 9, renderMode: 'emoji' },
  { id: 'rooster', name: 'Rooster', emoji: '🐓', difficulty: 5, renderMode: 'emoji' },
  { id: 'swan', name: 'Swan', emoji: '🦢', difficulty: 2, renderMode: 'emoji' },
  { id: 'frog', name: 'Frog', emoji: '🐸', difficulty: 5, renderMode: 'emoji' },

  // ===== Level 5: 바다생물 =====
  { id: 'fish', name: 'Fish', emoji: '🐟', difficulty: 4, renderMode: 'emoji' },
  { id: 'whale', name: 'Whale', emoji: '🐳', difficulty: 2, renderMode: 'emoji' },
  { id: 'turtle', name: 'Turtle', emoji: '🐢', difficulty: 7, renderMode: 'emoji' },
  { id: 'octopus', name: 'Octopus', emoji: '🐙', difficulty: 4, renderMode: 'emoji' },
  { id: 'crab', name: 'Crab', emoji: '🦀', difficulty: 10, renderMode: 'emoji' },
  { id: 'dolphin', name: 'Dolphin', emoji: '🐬', difficulty: 2, renderMode: 'emoji' },
  { id: 'shark', name: 'Shark', emoji: '🦈', difficulty: 5, renderMode: 'emoji' },
  { id: 'lobster', name: 'Lobster', emoji: '🦞', difficulty: 10, renderMode: 'emoji' },
  { id: 'shrimp', name: 'Shrimp', emoji: '🦐', difficulty: 3, renderMode: 'emoji' },
  { id: 'squid', name: 'Squid', emoji: '🦑', difficulty: 6, renderMode: 'emoji' },

  // ===== Level 6: 곤충 =====
  { id: 'butterfly', name: 'Butterfly', emoji: '🦋', difficulty: 10, renderMode: 'emoji' },
  { id: 'ladybug', name: 'Ladybug', emoji: '🐞', difficulty: 2, renderMode: 'emoji' },
  { id: 'bee', name: 'Bee', emoji: '🐝', difficulty: 8, renderMode: 'emoji' },
  { id: 'ant', name: 'Ant', emoji: '🐜', difficulty: 1, renderMode: 'emoji' },
  { id: 'spider', name: 'Spider', emoji: '🕷️', difficulty: 1, renderMode: 'emoji' },
  { id: 'snail', name: 'Snail', emoji: '🐌', difficulty: 4, renderMode: 'emoji' },
  { id: 'caterpillar', name: 'Caterpillar', emoji: '🐛', difficulty: 10, renderMode: 'emoji' },
  { id: 'cricket', name: 'Cricket', emoji: '🦗', difficulty: 7, renderMode: 'emoji' },
  { id: 'scorpion', name: 'Scorpion', emoji: '🦂', difficulty: 7, renderMode: 'emoji' },
  { id: 'mosquito', name: 'Mosquito', emoji: '🦟', difficulty: 3, renderMode: 'emoji' },

  // ===== Level 7: 탈것 =====
  { id: 'car', name: 'Car', emoji: '🚗', difficulty: 4, renderMode: 'emoji' },
  { id: 'bus', name: 'Bus', emoji: '🚌', difficulty: 7, renderMode: 'emoji' },
  { id: 'truck', name: 'Truck', emoji: '🚚', difficulty: 5, renderMode: 'emoji' },
  { id: 'train', name: 'Train', emoji: '🚂', difficulty: 10, renderMode: 'emoji' },
  { id: 'airplane', name: 'Airplane', emoji: '✈️', difficulty: 6, renderMode: 'emoji' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', difficulty: 5, renderMode: 'emoji' },
  { id: 'boat', name: 'Sailboat', emoji: '⛵', difficulty: 5, renderMode: 'emoji' },
  { id: 'bicycle', name: 'Bicycle', emoji: '🚲', difficulty: 7, renderMode: 'emoji' },
  { id: 'helicopter', name: 'Helicopter', emoji: '🚁', difficulty: 9, renderMode: 'emoji' },
  { id: 'motorcycle', name: 'Motorcycle', emoji: '🏍️', difficulty: 9, renderMode: 'emoji' },

  // ===== Level 8: 디저트 / 간식 =====
  { id: 'donut', name: 'Donut', emoji: '🍩', difficulty: 9, renderMode: 'emoji' },
  { id: 'cookie', name: 'Cookie', emoji: '🍪', difficulty: 7, renderMode: 'emoji' },
  { id: 'icecream', name: 'Ice Cream', emoji: '🍦', difficulty: 8, renderMode: 'emoji' },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', difficulty: 10, renderMode: 'emoji' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', difficulty: 7, renderMode: 'emoji' },
  { id: 'candy', name: 'Candy', emoji: '🍬', difficulty: 8, renderMode: 'emoji' },
  { id: 'lollipop', name: 'Lollipop', emoji: '🍭', difficulty: 5, renderMode: 'emoji' },
  { id: 'pretzel', name: 'Pretzel', emoji: '🥨', difficulty: 9, renderMode: 'emoji' },
  { id: 'cake', name: 'Cake', emoji: '🎂', difficulty: 8, renderMode: 'emoji' },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', difficulty: 7, renderMode: 'emoji' },

  // ===== Level 9: 식물 / 자연 =====
  { id: 'tree', name: 'Tree', emoji: '🌳', difficulty: 9, renderMode: 'emoji' },
  { id: 'flower', name: 'Flower', emoji: '🌸', difficulty: 10, renderMode: 'emoji' },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', difficulty: 9, renderMode: 'emoji' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', difficulty: 6, renderMode: 'emoji' },
  { id: 'leaf', name: 'Leaf', emoji: '🍃', difficulty: 8, renderMode: 'emoji' },
  { id: 'palmtree', name: 'Palm Tree', emoji: '🌴', difficulty: 8, renderMode: 'emoji' },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', difficulty: 3, renderMode: 'emoji' },
  { id: 'fourleafclover', name: 'Clover', emoji: '🍀', difficulty: 1, renderMode: 'emoji' },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', difficulty: 6, renderMode: 'emoji' },
  { id: 'tulip', name: 'Tulip', emoji: '🌷', difficulty: 3, renderMode: 'emoji' },

  // ===== Level 10: 생활용품 =====
  { id: 'house', name: 'House', emoji: '🏠', difficulty: 8, renderMode: 'emoji' },
  { id: 'clock', name: 'Clock', emoji: '🕐', difficulty: 3, renderMode: 'emoji' },
  { id: 'giftbox', name: 'Gift Box', emoji: '🎁', difficulty: 6, renderMode: 'emoji' },
  { id: 'crown', name: 'Crown', emoji: '👑', difficulty: 9, renderMode: 'emoji' },
  { id: 'robot', name: 'Robot', emoji: '🤖', difficulty: 10, renderMode: 'emoji' },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', difficulty: 7, renderMode: 'emoji' },
  { id: 'kite', name: 'Kite', emoji: '🪁', difficulty: 9, renderMode: 'emoji' },
  { id: 'bell', name: 'Bell', emoji: '🔔', difficulty: 2, renderMode: 'emoji' },
  { id: 'envelope', name: 'Envelope', emoji: '✉️', difficulty: 4, renderMode: 'emoji' },
  { id: 'soccerball', name: 'Soccer Ball', emoji: '⚽', difficulty: 10, renderMode: 'emoji' }
];

// ================= 파이널 보스 (모드별 10레벨 완주 보상) =================
// 2026-08-10: 기존엔 손으로 그린 오리지널 일러스트(renderMode:'svgArt', 동화 모티프 캐릭터 4종 —
// 백설공주/신데렐라/피노키오/인어공주에서 영감받은 오리지널 디자인)였는데, 일반 도안 100개가 전부
// 진짜 Twemoji라 나란히 보면 보스만 품질이 티가 난다는 피드백으로, 다른 도안들과 완전히 같은
// 방식(Twemoji 기반 'emoji' 모드)으로 교체했다. 그 대신 동화 캐릭터 모티프는 포기하고, Twemoji에
// 실제로 있는 "판타지 소녀" 캐릭터 이모지로 컨셉을 바꿨다 — 요정 → 인어(그대로) → 마법사 → 히어로
// (난이도가 오를수록 더 강력해지는 캐릭터 순서). paletteOverride/difficulty를 안 줘도 app.js의
// 기본값(level||10)이 알아서 최대 11색 팔레트를 골라준다 — 일반 도안과 완전히 동일한 파이프라인.
const BOSS_TEMPLATES = {
  // colorOverrideRects: "머리색이 얼굴색과 같이 나온다" 피드백(2026-08-11) — 금발 머리와 피부색이
  // 실제로 너무 비슷해서 app.js의 같은-이미지 색 클러스터링이 둘을 하나로 합쳐버림. 머리 영역
  // 좌표(seed 기준)만 짚어서 갈색(팔레트의 #7F5539)으로 강제 지정 — 인어/마법사 보스는 머리색이
  // 원래 피부색과 확실히 달라서(청록/회색) 이 문제가 없음(확인 완료, 그대로 둠).
  // 2026-08-11 추가: 위쪽 머리(앞머리) 말고 볼 옆으로 늘어진 옆머리 두 가닥(좌/우, 귀 앞쪽)도
  // 별도 영역이라 같은 문제가 있었음 — "머리 위만 바뀌고 옆에꺼는 안 바뀜" 피드백으로 추가.
  easy: {
    id: 'boss-fairygirl', name: 'Fairy Girl', emoji: '🧚‍♀️', mode: 'easy', isBoss: true, renderMode: 'emoji',
    colorOverrideRects: [
      { x: 200, y: 130, w: 250, h: 93, hex: '#7F5539' },
      { x: 190, y: 300, w: 70, h: 60, hex: '#7F5539' },
      { x: 380, y: 300, w: 70, h: 60, hex: '#7F5539' }
    ]
  },
  // simplifyRects: 든 손(손가락) 부분이 얇아서 통째로 검게 뒤덮이는 문제(2026-08-11) — 그 부분만
  // 내부 색상-경계 감지를 건너뛰게 함.
  normal: {
    id: 'boss-mermaidgirl', name: 'Mermaid Girl', emoji: '🧜‍♀️', mode: 'normal', isBoss: true, renderMode: 'emoji',
    simplifyRects: [
      { x: 380, y: 225, w: 80, h: 70 }
    ]
  },
  // simplifyRects: 마법구슬(좌상단)/박쥐(우상단) 장식이 명암 차이 때문에 통째로 검게 뒤덮여
  // 색칠 공간이 안 남는 문제(2026-08-11) — 두 장식 영역만 내부 색상-경계 감지를 건너뛰게 함.
  hard: {
    id: 'boss-witchgirl', name: 'Witch Girl', emoji: '🧙‍♀️', mode: 'hard', isBoss: true, renderMode: 'emoji',
    simplifyRects: [
      { x: 10, y: 10, w: 130, h: 130 },
      { x: 495, y: 10, w: 130, h: 130 }
    ]
  },
  veryhard: {
    id: 'boss-herogirl', name: 'Hero Girl', emoji: '🦸‍♀️', mode: 'veryhard', isBoss: true, renderMode: 'emoji',
    // 히어로걸도 요정과 같은 금발머리=피부색 문제라 동일하게 처리(위 easy 항목 주석 참고).
    colorOverrideRects: [
      { x: 200, y: 130, w: 280, h: 128, hex: '#7F5539' }
    ]
  }
};

if (typeof module !== 'undefined') {
  module.exports = COLORING_TEMPLATES;
  module.exports.BOSS_TEMPLATES = BOSS_TEMPLATES;
} else {
  window.BOSS_TEMPLATES = BOSS_TEMPLATES;
}
