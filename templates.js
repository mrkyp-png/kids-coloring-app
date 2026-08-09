// 색칠놀이 도안 데이터 (이모지 기반)
// 각 도안은 이모지 글리프에서 어두운 선 + 색상 경계를 자동으로 벽(선)으로 인식해
// 색칠 가능한 영역을 뽑아낸다 (app.js의 loadTemplateSource 'emoji' 모드).
// 레벨(difficulty)은 주제별로 10개씩 묶는다.

const COLORING_TEMPLATES = [
  // ===== Level 1: 하늘 / 간단한 모양 =====
  { id: 'sun', name: 'Sun', emoji: '☀️', difficulty: 1, renderMode: 'emoji', overlaySvg: '<circle cx="200" cy="200" r="78"/>' },
  { id: 'moon', name: 'Moon', emoji: '🌙', difficulty: 1, renderMode: 'emoji' },
  { id: 'star', name: 'Star', emoji: '⭐', difficulty: 1, renderMode: 'emoji' },
  { id: 'cloud', name: 'Cloud', emoji: '☁️', difficulty: 1, renderMode: 'emoji' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', difficulty: 1, renderMode: 'emoji' },
  { id: 'heart', name: 'Heart', emoji: '❤️', difficulty: 1, renderMode: 'emoji' },
  { id: 'drop', name: 'Water Drop', emoji: '💧', difficulty: 1, renderMode: 'emoji' },
  { id: 'balloon', name: 'Balloon', emoji: '🎈', difficulty: 1, renderMode: 'emoji' },
  { id: 'umbrella', name: 'Umbrella', emoji: '☂️', difficulty: 1, renderMode: 'emoji', keepThinParts: true }, // 손잡이(18px)가 얇아서 자동으로 검은 선에 흡수되던 것을 막고 색칠 가능하게 유지
  { id: 'egg', name: 'Egg', emoji: '🥚', difficulty: 1, renderMode: 'emoji' },

  // ===== Level 2: 과일 =====
  { id: 'apple', name: 'Apple', emoji: '🍎', difficulty: 2, renderMode: 'emoji' },
  { id: 'banana', name: 'Banana', emoji: '🍌', difficulty: 2, renderMode: 'emoji' },
  { id: 'orange', name: 'Orange', emoji: '🍊', difficulty: 2, renderMode: 'emoji' },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', difficulty: 2, renderMode: 'emoji' },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍', difficulty: 2, renderMode: 'emoji' },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', difficulty: 2, renderMode: 'emoji' },
  { id: 'peach', name: 'Peach', emoji: '🍑', difficulty: 2, renderMode: 'emoji' },
  { id: 'pear', name: 'Pear', emoji: '🍐', difficulty: 2, renderMode: 'emoji' },
  { id: 'cherry', name: 'Cherries', emoji: '🍒', difficulty: 2, renderMode: 'emoji' },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', difficulty: 2, renderMode: 'emoji' },

  // ===== Level 3: 육상동물 =====
  { id: 'cat', name: 'Cat', emoji: '🐱', difficulty: 3, renderMode: 'emoji' },
  { id: 'dog', name: 'Dog', emoji: '🐶', difficulty: 3, renderMode: 'emoji' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', difficulty: 3, renderMode: 'emoji' },
  { id: 'bear', name: 'Bear', emoji: '🐻', difficulty: 3, renderMode: 'emoji' },
  { id: 'lion', name: 'Lion', emoji: '🦁', difficulty: 3, renderMode: 'emoji' },
  { id: 'pig', name: 'Pig', emoji: '🐷', difficulty: 3, renderMode: 'emoji' },
  { id: 'sheep', name: 'Sheep', emoji: '🐑', difficulty: 3, renderMode: 'emoji' },
  { id: 'mouse', name: 'Mouse', emoji: '🐭', difficulty: 3, renderMode: 'emoji' },
  { id: 'elephant', name: 'Elephant', emoji: '🐘', difficulty: 3, renderMode: 'emoji' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯', difficulty: 3, renderMode: 'emoji' },

  // ===== Level 4: 새 / 농장동물 =====
  { id: 'duck', name: 'Duck', emoji: '🦆', difficulty: 4, renderMode: 'emoji' },
  { id: 'chicken', name: 'Chicken', emoji: '🐔', difficulty: 4, renderMode: 'emoji' },
  { id: 'penguin', name: 'Penguin', emoji: '🐧', difficulty: 4, renderMode: 'emoji' },
  { id: 'owl', name: 'Owl', emoji: '🦉', difficulty: 4, renderMode: 'emoji' },
  { id: 'bird', name: 'Bird', emoji: '🐦', difficulty: 4, renderMode: 'emoji' },
  { id: 'peacock', name: 'Peacock', emoji: '🦚', difficulty: 4, renderMode: 'emoji' },
  { id: 'turkey', name: 'Turkey', emoji: '🦃', difficulty: 4, renderMode: 'emoji' },
  { id: 'rooster', name: 'Rooster', emoji: '🐓', difficulty: 4, renderMode: 'emoji' },
  { id: 'swan', name: 'Swan', emoji: '🦢', difficulty: 4, renderMode: 'emoji' },
  { id: 'frog', name: 'Frog', emoji: '🐸', difficulty: 4, renderMode: 'emoji' },

  // ===== Level 5: 바다생물 =====
  { id: 'fish', name: 'Fish', emoji: '🐟', difficulty: 5, renderMode: 'emoji' },
  { id: 'whale', name: 'Whale', emoji: '🐳', difficulty: 5, renderMode: 'emoji' },
  { id: 'turtle', name: 'Turtle', emoji: '🐢', difficulty: 5, renderMode: 'emoji' },
  { id: 'octopus', name: 'Octopus', emoji: '🐙', difficulty: 5, renderMode: 'emoji' },
  { id: 'crab', name: 'Crab', emoji: '🦀', difficulty: 5, renderMode: 'emoji' },
  { id: 'dolphin', name: 'Dolphin', emoji: '🐬', difficulty: 5, renderMode: 'emoji' },
  { id: 'shark', name: 'Shark', emoji: '🦈', difficulty: 5, renderMode: 'emoji' },
  { id: 'lobster', name: 'Lobster', emoji: '🦞', difficulty: 5, renderMode: 'emoji' },
  { id: 'shrimp', name: 'Shrimp', emoji: '🦐', difficulty: 5, renderMode: 'emoji' },
  { id: 'squid', name: 'Squid', emoji: '🦑', difficulty: 5, renderMode: 'emoji' },

  // ===== Level 6: 곤충 =====
  { id: 'butterfly', name: 'Butterfly', emoji: '🦋', difficulty: 6, renderMode: 'emoji' },
  { id: 'ladybug', name: 'Ladybug', emoji: '🐞', difficulty: 6, renderMode: 'emoji' },
  { id: 'bee', name: 'Bee', emoji: '🐝', difficulty: 6, renderMode: 'emoji' },
  { id: 'ant', name: 'Ant', emoji: '🐜', difficulty: 6, renderMode: 'emoji' },
  { id: 'spider', name: 'Spider', emoji: '🕷️', difficulty: 6, renderMode: 'emoji' },
  { id: 'snail', name: 'Snail', emoji: '🐌', difficulty: 6, renderMode: 'emoji' },
  { id: 'caterpillar', name: 'Caterpillar', emoji: '🐛', difficulty: 6, renderMode: 'emoji' },
  { id: 'cricket', name: 'Cricket', emoji: '🦗', difficulty: 6, renderMode: 'emoji' },
  { id: 'scorpion', name: 'Scorpion', emoji: '🦂', difficulty: 6, renderMode: 'emoji' },
  { id: 'mosquito', name: 'Mosquito', emoji: '🦟', difficulty: 6, renderMode: 'emoji' },

  // ===== Level 7: 탈것 =====
  { id: 'car', name: 'Car', emoji: '🚗', difficulty: 7, renderMode: 'emoji' },
  { id: 'bus', name: 'Bus', emoji: '🚌', difficulty: 7, renderMode: 'emoji' },
  { id: 'truck', name: 'Truck', emoji: '🚚', difficulty: 7, renderMode: 'emoji' },
  { id: 'train', name: 'Train', emoji: '🚂', difficulty: 7, renderMode: 'emoji' },
  { id: 'airplane', name: 'Airplane', emoji: '✈️', difficulty: 7, renderMode: 'emoji' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', difficulty: 7, renderMode: 'emoji' },
  { id: 'boat', name: 'Sailboat', emoji: '⛵', difficulty: 7, renderMode: 'emoji' },
  { id: 'bicycle', name: 'Bicycle', emoji: '🚲', difficulty: 7, renderMode: 'emoji' },
  { id: 'helicopter', name: 'Helicopter', emoji: '🚁', difficulty: 7, renderMode: 'emoji' },
  { id: 'motorcycle', name: 'Motorcycle', emoji: '🏍️', difficulty: 7, renderMode: 'emoji' },

  // ===== Level 8: 디저트 / 간식 =====
  { id: 'donut', name: 'Donut', emoji: '🍩', difficulty: 8, renderMode: 'emoji' },
  { id: 'cookie', name: 'Cookie', emoji: '🍪', difficulty: 8, renderMode: 'emoji' },
  { id: 'icecream', name: 'Ice Cream', emoji: '🍦', difficulty: 8, renderMode: 'emoji' },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', difficulty: 8, renderMode: 'emoji' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', difficulty: 8, renderMode: 'emoji' },
  { id: 'candy', name: 'Candy', emoji: '🍬', difficulty: 8, renderMode: 'emoji' },
  { id: 'lollipop', name: 'Lollipop', emoji: '🍭', difficulty: 8, renderMode: 'emoji' },
  { id: 'pretzel', name: 'Pretzel', emoji: '🥨', difficulty: 8, renderMode: 'emoji' },
  { id: 'cake', name: 'Cake', emoji: '🎂', difficulty: 8, renderMode: 'emoji' },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', difficulty: 8, renderMode: 'emoji' },

  // ===== Level 9: 식물 / 자연 =====
  { id: 'tree', name: 'Tree', emoji: '🌳', difficulty: 9, renderMode: 'emoji' },
  { id: 'flower', name: 'Flower', emoji: '🌸', difficulty: 9, renderMode: 'emoji' },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', difficulty: 9, renderMode: 'emoji' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', difficulty: 9, renderMode: 'emoji' },
  { id: 'leaf', name: 'Leaf', emoji: '🍃', difficulty: 9, renderMode: 'emoji' },
  { id: 'palmtree', name: 'Palm Tree', emoji: '🌴', difficulty: 9, renderMode: 'emoji' },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', difficulty: 9, renderMode: 'emoji' },
  { id: 'fourleafclover', name: 'Clover', emoji: '🍀', difficulty: 9, renderMode: 'emoji' },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', difficulty: 9, renderMode: 'emoji' },
  { id: 'tulip', name: 'Tulip', emoji: '🌷', difficulty: 9, renderMode: 'emoji' },

  // ===== Level 10: 생활용품 =====
  { id: 'house', name: 'House', emoji: '🏠', difficulty: 10, renderMode: 'emoji' },
  { id: 'clock', name: 'Clock', emoji: '🕐', difficulty: 10, renderMode: 'emoji' },
  { id: 'giftbox', name: 'Gift Box', emoji: '🎁', difficulty: 10, renderMode: 'emoji' },
  { id: 'crown', name: 'Crown', emoji: '👑', difficulty: 10, renderMode: 'emoji' },
  { id: 'robot', name: 'Robot', emoji: '🤖', difficulty: 10, renderMode: 'emoji' },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', difficulty: 10, renderMode: 'emoji' },
  { id: 'kite', name: 'Kite', emoji: '🪁', difficulty: 10, renderMode: 'emoji' },
  { id: 'bell', name: 'Bell', emoji: '🔔', difficulty: 10, renderMode: 'emoji' },
  { id: 'envelope', name: 'Envelope', emoji: '✉️', difficulty: 10, renderMode: 'emoji' },
  { id: 'soccerball', name: 'Soccer Ball', emoji: '⚽', difficulty: 10, renderMode: 'emoji' }
];

// ================= 파이널 보스 (모드별 10레벨 완주 보상) =================
// 일반 도안(이모지 자동추출)과 달리 손으로 그린 오리지널 일러스트(renderMode:'svgArt') —
// 영역을 훨씬 잘게 쪼개고 색상 수도 훨씬 많이 써서 "엄청 어려움"을 구현한다.
// 디즈니 등 실제 저작권 캐릭터 디자인이 아니라, 같은 동화 모티프에서 영감만 받은 오리지널 캐릭터다.
(function () {
  var STROKE = '#2b2b2b';

  function r(tag, attrs, fill, strokeW) {
    var parts = [];
    for (var k in attrs) parts.push(k + '="' + attrs[k] + '"');
    parts.push('fill="' + fill + '"');
    if (strokeW !== 0) parts.push('stroke="' + STROKE + '" stroke-width="' + (strokeW || 7) + '"');
    return '<' + tag + ' ' + parts.join(' ') + '/>';
  }
  // 눈/입처럼 자동으로 "선(벽)"으로 인식돼야 하는 어두운 디테일(채점 대상 아님)
  function wall(tag, attrs, fill) {
    var parts = [];
    for (var k in attrs) parts.push(k + '="' + attrs[k] + '"');
    parts.push('fill="' + (fill || '#241f1a') + '"');
    return '<' + tag + ' ' + parts.join(' ') + '/>';
  }
  function wallStroke(d, strokeW) {
    return '<path d="' + d + '" fill="none" stroke="#241f1a" stroke-width="' + (strokeW || 5) + '" stroke-linecap="round"/>';
  }

  // ---------- 공통 몸통(소녀) — 백설공주/신데렐라가 공유, 색상·머리장식·손에 든 아이템만 다름 ----------
  function girlBody(c, headpiece, handItem) {
    return [
      r('ellipse', { cx: 200, cy: 148, rx: 94, ry: 100 }, c.hairBack),      // 뒷머리(헤어 백 — 얼굴보다 먼저 그려서 테두리에 둥글게 남음)
      r('circle', { cx: 200, cy: 140, r: 66 }, c.skin),                    // 얼굴
      r('rect', { x: 182, y: 196, width: 36, height: 30 }, c.skin),        // 목
      r('ellipse', { cx: 163, cy: 98, rx: 26, ry: 20 }, c.hairFront),      // 앞머리(뱅) 왼쪽
      r('ellipse', { cx: 200, cy: 90, rx: 28, ry: 22 }, c.hairFront),      // 앞머리(뱅) 가운데
      r('ellipse', { cx: 237, cy: 98, rx: 26, ry: 20 }, c.hairFront),      // 앞머리(뱅) 오른쪽
      headpiece,
      r('circle', { cx: 158, cy: 160, r: 12 }, c.blush, 4),                // 볼터치
      r('circle', { cx: 242, cy: 160, r: 12 }, c.blush, 4),
      wall('circle', { cx: 178, cy: 138, r: 7 }),                          // 눈
      wall('circle', { cx: 222, cy: 138, r: 7 }),
      wallStroke('M188,163 Q200,171 212,163'),                             // 입
      r('polygon', { points: '145,222 255,222 228,278 172,278' }, c.bodice), // 보디스
      r('circle', { cx: 138, cy: 232, r: 24 }, c.sleeve),                  // 소매
      r('circle', { cx: 262, cy: 232, r: 24 }, c.sleeve),
      r('rect', { x: 122, y: 248, width: 18, height: 52, rx: 9 }, c.skin), // 팔
      r('rect', { x: 260, y: 248, width: 18, height: 52, rx: 9 }, c.skin),
      r('circle', { cx: 131, cy: 306, r: 13 }, c.skin),                    // 손
      r('circle', { cx: 269, cy: 306, r: 13 }, c.skin),
      handItem,
      r('polygon', { points: '172,278 228,278 300,352 100,352' }, c.skirtBase), // 치마
      // 치마 무늬(점) — 너무 작으면 선 인식 파이프라인의 두께 보정/틈 메우기 단계에서 통째로
      // 벽(검은색)으로 먹혀버리므로(확인된 버그) 테두리 없이 + 충분히 크게 그린다.
      r('circle', { cx: 150, cy: 300, r: 13 }, c.dot, 0),
      r('circle', { cx: 200, cy: 296, r: 13 }, c.dot, 0),
      r('circle', { cx: 250, cy: 304, r: 13 }, c.dot, 0),
      r('circle', { cx: 175, cy: 330, r: 13 }, c.dot, 0),
      r('circle', { cx: 225, cy: 332, r: 13 }, c.dot, 0),
      r('polygon', { points: '100,352 300,352 300,368 100,368' }, c.hemTrim), // 밑단 트림
      r('rect', { x: 150, y: 368, width: 22, height: 20 }, c.sock),        // 양말
      r('rect', { x: 228, y: 368, width: 22, height: 20 }, c.sock),
      r('ellipse', { cx: 161, cy: 386, rx: 22, ry: 13 }, c.shoe),          // 신발
      r('ellipse', { cx: 239, cy: 386, rx: 22, ry: 13 }, c.shoe)
    ].join('');
  }

  // ---------- Easy: 눈처럼 하얀 소녀 (백설공주 모티프, 오리지널 디자인) ----------
  var snowGirl = girlBody({
    skin: '#FFDCC0', hairBack: '#5C4433', hairFront: '#8B6547', blush: '#FFB6C1',
    bodice: '#2A6F6F', sleeve: '#3D8B8B', skirtBase: '#FFF3D6', dot: '#F1C40F',
    hemTrim: '#E63946', sock: '#FDF6EC', shoe: '#4A3F6B'
  },
    r('path', { d: 'M120,116 Q200,78 280,116 L280,130 Q200,94 120,130 Z' }, '#E63946', 5), // 머리띠
    [
      r('circle', { cx: 273, cy: 300, r: 22 }, '#D62839', 0),           // 사과
      r('ellipse', { cx: 278, cy: 282, rx: 10, ry: 6 }, '#4C9A54', 0)   // 잎
    ].join('')
  );

  // ---------- Normal: 유리구두 소녀 (신데렐라 모티프, 오리지널 디자인) ----------
  var glassSlipperGirl = girlBody({
    // dot은 skirtBase(아주 연한 하늘색)와 대비가 뚜렷한 진한 남색으로 — 너무 비슷한 색이면
    // 벽 인식이 점선처럼 끊겨서 도트가 스커트에 반쯤 먹혀버린다(확인된 버그).
    skin: '#FFE3CC', hairBack: '#B08A5A', hairFront: '#D4B483', blush: '#FFC1CC',
    bodice: '#4D6FE6', sleeve: '#6E8CF2', skirtBase: '#E8ECFF', dot: '#3A4A8C',
    hemTrim: '#4D6FE6', sock: '#F3F0FF', shoe: '#8ED8E8'
  },
    [
      r('polygon', { points: '178,72 200,50 222,72' }, '#F1C40F', 4),  // 티아라
      r('circle', { cx: 200, cy: 66, r: 10 }, '#8ED8E8', 0)            // 보석
    ].join(''),
    // 반짝이(별) — 손 바깥 빈 배경에 떠 있어서 색 경계만으로는 벽이 안 닫힐 수 있으므로
    // (확인된 버그) 테두리를 다시 넣어 확실히 닫힌 영역으로 만든다.
    [
      r('circle', { cx: 279, cy: 292, r: 13 }, '#F1C40F', 4),
      r('circle', { cx: 296, cy: 310, r: 10 }, '#8ED8E8', 4),
      r('circle', { cx: 264, cy: 318, r: 9 }, '#F1C40F', 4)
    ].join('')
  );

  // ---------- Hard: 나무인형 소년 (피노키오 모티프, 오리지널 디자인) ----------
  var woodenBoy = [
    r('ellipse', { cx: 200, cy: 80, rx: 58, ry: 15 }, '#3B6EA5'),               // 모자 챙
    r('polygon', { points: '160,80 240,80 200,28' }, '#3B6EA5'),                // 모자 콘
    r('ellipse', { cx: 222, cy: 34, rx: 6, ry: 14, transform: 'rotate(20 222 34)' }, '#D62839'), // 깃털
    r('ellipse', { cx: 200, cy: 148, rx: 94, ry: 96 }, '#B97D4B'),              // 뒷머리(나무결)
    r('circle', { cx: 200, cy: 140, r: 66 }, '#E8B77E'),                       // 얼굴(나무)
    r('rect', { x: 182, y: 196, width: 36, height: 26 }, '#E8B77E'),           // 목 이음관절
    wall('circle', { cx: 178, cy: 138, r: 7 }),
    wall('circle', { cx: 222, cy: 138, r: 7 }),
    r('polygon', { points: '200,138 200,160 326,128' }, '#B97D4B'),            // 나무 코(나뭇가지처럼 길게)
    r('circle', { cx: 262, cy: 141, r: 9 }, '#8C5A2B', 3),                     // 코 마디(나뭇가지 옹이)
    r('ellipse', { cx: 338, cy: 110, rx: 16, ry: 8, transform: 'rotate(-25 338 110)' }, '#4C9A54'), // 나뭇가지 끝 새싹잎(왼쪽)
    r('ellipse', { cx: 346, cy: 133, rx: 14, ry: 7, transform: 'rotate(15 346 133)' }, '#4C9A54'),  // 나뭇가지 끝 새싹잎(오른쪽)
    wallStroke('M186,164 Q200,170 214,164'),
    r('circle', { cx: 156, cy: 160, r: 10 }, '#E8998D', 4),                    // 볼터치
    r('circle', { cx: 244, cy: 160, r: 10 }, '#E8998D', 4),
    r('rect', { x: 154, y: 214, width: 92, height: 88, rx: 16 }, '#4C9A54'),   // 몸통(셔츠)
    // 단추 — 너무 작으면 선 인식 파이프라인에서 통째로 벽(검은색)으로 먹히므로(확인된 버그)
    // 테두리 없이 + 충분히 크게 그린다.
    r('circle', { cx: 178, cy: 246, r: 12 }, '#D62839', 0),                    // 단추
    r('circle', { cx: 200, cy: 260, r: 12 }, '#D62839', 0),
    r('circle', { cx: 222, cy: 274, r: 12 }, '#D62839', 0),
    // 관절점 — 팔/다리 사각형과 겹치는 위치에 따라 빈 배경 쪽으로 살짝 걸치는 경우가 있어
    // (확인된 버그: 그 부분이 흰색으로 뚫려 보임) 테두리를 넣어 항상 닫힌 영역이 되게 한다.
    r('circle', { cx: 150, cy: 220, r: 14 }, '#8C5A2B', 4),                    // 어깨 관절
    r('circle', { cx: 250, cy: 220, r: 14 }, '#8C5A2B', 4),
    r('rect', { x: 108, y: 216, width: 24, height: 56, rx: 12, transform: 'rotate(-18 120 244)' }, '#D9A66C'), // 왼쪽 위팔
    r('rect', { x: 268, y: 216, width: 24, height: 56, rx: 12, transform: 'rotate(18 280 244)' }, '#D9A66C'),  // 오른쪽 위팔
    r('circle', { cx: 104, cy: 272, r: 13 }, '#8C5A2B', 4),                    // 팔꿈치 관절
    r('circle', { cx: 296, cy: 272, r: 13 }, '#8C5A2B', 4),
    r('rect', { x: 92, y: 274, width: 22, height: 50, rx: 11, transform: 'rotate(-10 103 299)' }, '#B97D4B'),  // 왼쪽 아래팔
    r('rect', { x: 286, y: 274, width: 22, height: 50, rx: 11, transform: 'rotate(10 297 299)' }, '#B97D4B'),  // 오른쪽 아래팔
    r('circle', { cx: 100, cy: 328, r: 12 }, '#D9A66C'),                       // 손
    r('circle', { cx: 300, cy: 328, r: 12 }, '#D9A66C'),
    r('circle', { cx: 200, cy: 306, r: 14 }, '#8C5A2B', 4),                    // 골반 관절
    r('polygon', { points: '165,306 235,306 246,340 154,340' }, '#7A4B2A'),    // 반바지
    r('circle', { cx: 168, cy: 344, r: 13 }, '#8C5A2B', 4),                    // 무릎 관절
    r('circle', { cx: 232, cy: 344, r: 13 }, '#8C5A2B', 4),
    r('rect', { x: 150, y: 306, width: 24, height: 42, rx: 12 }, '#D9A66C'),   // 왼쪽 위다리
    r('rect', { x: 226, y: 306, width: 24, height: 42, rx: 12 }, '#D9A66C'),   // 오른쪽 위다리
    r('rect', { x: 150, y: 348, width: 24, height: 44, rx: 12 }, '#B97D4B'),   // 왼쪽 아래다리
    r('rect', { x: 226, y: 348, width: 24, height: 44, rx: 12 }, '#B97D4B'),   // 오른쪽 아래다리
    r('ellipse', { cx: 162, cy: 388, rx: 22, ry: 12 }, '#5C3A21'),             // 신발
    r('ellipse', { cx: 238, cy: 388, rx: 22, ry: 12 }, '#5C3A21')
  ].join('');

  // ---------- Very Hard: 인어 소녀 (인어공주 모티프, 오리지널 디자인) ----------
  var mermaidGirl = [
    r('ellipse', { cx: 200, cy: 138, rx: 98, ry: 104 }, '#C9455B'),            // 뒷머리
    r('circle', { cx: 200, cy: 130, r: 62 }, '#FFD9B3'),                       // 얼굴
    r('rect', { x: 184, y: 184, width: 32, height: 26 }, '#FFD9B3'),           // 목
    r('ellipse', { cx: 165, cy: 90, rx: 24, ry: 18 }, '#E8798C'),              // 앞머리
    r('ellipse', { cx: 200, cy: 82, rx: 26, ry: 20 }, '#E8798C'),
    r('ellipse', { cx: 235, cy: 90, rx: 24, ry: 18 }, '#E8798C'),
    r('circle', { cx: 214, cy: 76, r: 13 }, '#E85D75', 0),                     // 머리 꽃 장식
    r('circle', { cx: 155, cy: 148, r: 11 }, '#FFC1CC', 4),                    // 볼터치
    r('circle', { cx: 245, cy: 148, r: 11 }, '#FFC1CC', 4),
    wall('circle', { cx: 178, cy: 128, r: 7 }),
    wall('circle', { cx: 222, cy: 128, r: 7 }),
    wallStroke('M188,152 Q200,159 212,152'),
    r('ellipse', { cx: 172, cy: 214, rx: 26, ry: 18 }, '#F4A6B7'),             // 조개 브라(왼)
    r('ellipse', { cx: 228, cy: 214, rx: 26, ry: 18 }, '#F4A6B7'),             // 조개 브라(오)
    r('rect', { x: 118, y: 200, width: 18, height: 46, rx: 9, transform: 'rotate(-12 127 223)' }, '#FFD9B3'), // 팔
    r('rect', { x: 264, y: 200, width: 18, height: 46, rx: 9, transform: 'rotate(12 273 223)' }, '#FFD9B3'),
    r('circle', { cx: 122, cy: 250, r: 12 }, '#FFD9B3'),                       // 손
    r('circle', { cx: 278, cy: 250, r: 12 }, '#FFD9B3'),
    r('polygon', { points: '166,228 234,228 210,240 190,240' }, '#FFD9B3'),    // 허리(살짝 보이는 배)
    r('polygon', { points: '150,236 250,236 292,330 108,330' }, '#2E8B7A'),    // 꼬리 몸통
    r('polygon', { points: '150,236 250,236 236,270 164,270' }, '#1F6F5C'),    // 꼬리 상단 밴드
    r('polygon', { points: '128,300 272,300 292,330 108,330' }, '#1F6F5C'),    // 꼬리 하단 밴드
    // 비늘 무늬(반짝이는 작은 타원들) — 너무 작으면 선 인식 파이프라인에서 통째로
    // 벽(검은색)으로 먹혀버리므로(확인된 버그) 테두리 없이 + 충분히 크게 그린다.
    r('ellipse', { cx: 170, cy: 252, rx: 13, ry: 9 }, '#8CE0D1', 0),
    r('ellipse', { cx: 200, cy: 258, rx: 13, ry: 9 }, '#8CE0D1', 0),
    r('ellipse', { cx: 230, cy: 252, rx: 13, ry: 9 }, '#8CE0D1', 0),
    r('ellipse', { cx: 155, cy: 286, rx: 13, ry: 9 }, '#8CE0D1', 0),
    r('ellipse', { cx: 185, cy: 292, rx: 13, ry: 9 }, '#8CE0D1', 0),
    r('ellipse', { cx: 215, cy: 292, rx: 13, ry: 9 }, '#8CE0D1', 0),
    r('ellipse', { cx: 245, cy: 286, rx: 13, ry: 9 }, '#8CE0D1', 0),
    r('ellipse', { cx: 170, cy: 314, rx: 13, ry: 9 }, '#3FB8A0', 0),
    r('ellipse', { cx: 200, cy: 318, rx: 13, ry: 9 }, '#3FB8A0', 0),
    r('ellipse', { cx: 230, cy: 314, rx: 13, ry: 9 }, '#3FB8A0', 0),
    // 지느러미를 좌우 두 조각으로 나누면 가운데 틈이 다리처럼 보이므로(확인된 버그),
    // 하나로 이어진 폴리곤(부채꼴, 가운데는 얕은 홈만) 하나로 그려 다리처럼 보이지 않게 한다.
    r('polygon', { points: '108,330 292,330 320,354 200,344 80,354' }, '#3FB8A0'), // 꼬리지느러미(하나로 이어짐)
    // 물방울(거품) — 인물 바깥의 빈(투명) 배경 위에 떠 있어서, 테두리 없이는 색 경계만으로
    // 벽이 사방으로 안 닫혀 초승달 모양으로 깨진다(확인된 버그) — 반드시 테두리를 넣는다.
    r('circle', { cx: 70, cy: 200, r: 13 }, '#CFEFFF', 4),
    r('circle', { cx: 90, cy: 170, r: 11 }, '#CFEFFF', 4),
    r('circle', { cx: 320, cy: 190, r: 12 }, '#CFEFFF', 4),
    r('circle', { cx: 335, cy: 220, r: 10 }, '#CFEFFF', 4),
    r('circle', { cx: 60, cy: 240, r: 10 }, '#CFEFFF', 4)
  ].join('');

  var BOSS_TEMPLATES = {
    easy: {
      id: 'boss-snowgirl', name: 'Snow Girl', emoji: '👑', mode: 'easy', isBoss: true,
      renderMode: 'svgArt', svgArt: snowGirl,
      paletteOverride: ['#FFDCC0', '#5C4433', '#8B6547', '#FFB6C1', '#E63946', '#2A6F6F', '#3D8B8B', '#FFF3D6', '#F1C40F', '#FDF6EC', '#4A3F6B', '#D62839', '#4C9A54']
    },
    normal: {
      id: 'boss-cindergirl', name: 'Glass Slipper Girl', emoji: '👑', mode: 'normal', isBoss: true,
      renderMode: 'svgArt', svgArt: glassSlipperGirl,
      paletteOverride: ['#FFE3CC', '#B08A5A', '#D4B483', '#FFC1CC', '#4D6FE6', '#6E8CF2', '#E8ECFF', '#3A4A8C', '#F3F0FF', '#8ED8E8', '#F1C40F']
    },
    hard: {
      id: 'boss-woodboy', name: 'Wooden Boy', emoji: '👑', mode: 'hard', isBoss: true,
      renderMode: 'svgArt', svgArt: woodenBoy,
      paletteOverride: ['#3B6EA5', '#D62839', '#B97D4B', '#E8B77E', '#8C5A2B', '#E8998D', '#4C9A54', '#D9A66C', '#7A4B2A', '#5C3A21']
    },
    veryhard: {
      id: 'boss-mergirl', name: 'Mermaid Girl', emoji: '👑', mode: 'veryhard', isBoss: true,
      renderMode: 'svgArt', svgArt: mermaidGirl,
      paletteOverride: ['#C9455B', '#FFD9B3', '#E8798C', '#E85D75', '#FFC1CC', '#F4A6B7', '#2E8B7A', '#1F6F5C', '#8CE0D1', '#3FB8A0', '#CFEFFF']
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = COLORING_TEMPLATES;
    module.exports.BOSS_TEMPLATES = BOSS_TEMPLATES;
  } else {
    window.BOSS_TEMPLATES = BOSS_TEMPLATES;
  }
})();
