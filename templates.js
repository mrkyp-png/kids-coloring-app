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
// 일반 도안(이모지 자동추출)과 달리 손으로 그린 오리지널 일러스트(renderMode:'svgArt') —
// 영역을 훨씬 잘게 쪼개고 색상 수도 훨씬 많이 써서 "엄청 어려움"을 구현한다.
// 디즈니 등 실제 저작권 캐릭터 디자인이 아니라, 같은 동화 모티프에서 영감만 받은 오리지널 캐릭터다.
(function () {
  var STROKE = '#2b2b2b';

  // 보스 옆에 곁들이는 꽃/벌/나비 — 이미 검증된 일반 도안용 Twemoji 파일(assets/emoji/*.svg)을
  // 그대로 재사용한다(2026-08-09, "얼굴이 허접해 보인다"는 피드백에 "몸통에 디테일을 더 채우기보다
  // 꽃/벌/나비를 캐릭터 옆에 같이 그리자"는 사용자 아이디어로 추가) — 손으로 하나하나 그리지 않고도
  // 색칠 영역을 자연스럽게 늘릴 수 있고, 그 자체로 이미 Twemoji 품질이라 별도 손질이 필요 없다.
  var FLOWER_SVG = '<path fill="#F4ABBA" d="M31.298 20.807c4.197-1.363 5.027-3.182 4.191-6.416-.952.308-2.105-.001-2.272-.518-.168-.513.581-1.443 1.533-1.753-1.223-3.107-2.964-4.089-7.161-2.727-1.606.522-3.238 1.492-4.655 2.635C23.582 10.327 24 8.475 24 6.786c0-4.412-1.473-5.765-4.807-5.968 0 1-.652 2-1.193 2s-1.194-1-1.194-2C13.472 1.021 12 2.374 12 6.786c0 1.689.417 3.541 1.066 5.241-1.416-1.142-3.049-2.111-4.655-2.633-4.197-1.364-5.938-.381-7.162 2.727.951.31 1.701 1.238 1.534 1.753-.167.515-1.32.826-2.271.518-.837 3.233-.005 5.052 4.19 6.415 1.606.521 3.497.697 5.314.605-1.524.994-2.95 2.247-3.943 3.613-2.594 3.57-2.197 5.53.381 7.654.588-.809 1.703-1.235 2.142-.917.438.317.378 1.511-.21 2.32 2.816 1.795 4.803 1.565 7.396-2.003.993-1.366 1.743-3.111 2.218-4.867.475 1.757 1.226 3.501 2.218 4.867 2.594 3.57 4.58 3.798 7.397 2.003-.587-.81-.649-2.002-.21-2.321.437-.317 1.553.107 2.142.917 2.577-2.123 2.973-4.083.381-7.653-.993-1.366-2.42-2.619-3.943-3.613 1.816.092 3.706-.084 5.313-.605zM18 20.337c-.162-.292-.353-.538-.588-.709-.234-.171-.528-.276-.856-.341.228-.244.403-.502.493-.778.09-.275.1-.587.059-.919.302.141.602.228.892.228s.59-.087.894-.229c-.041.332-.031.644.059.919.09.276.265.534.492.778-.327.065-.621.17-.855.341-.236.172-.428.418-.59.71z"/><g fill="#FFF"><path d="M16.795 18.685c-.12.54-.653.88-1.193.76l-5.858-1.302c-.539-.12-.879-.653-.759-1.193.12-.539.654-.879 1.193-.759l5.857 1.302c.54.12.88.653.76 1.192zm.976.218c.12-.54.654-.88 1.193-.76l5.857 1.302c.54.12.879.653.76 1.193-.12.538-.654.879-1.193.759l-5.857-1.302c-.54-.118-.88-.654-.76-1.192z"/><path d="M17.771 18.903c-.466.296-1.083.159-1.38-.308l-3.221-5.061c-.296-.466-.16-1.084.307-1.38.466-.297 1.084-.159 1.38.307l3.222 5.062c.295.466.158 1.083-.308 1.38zm.797 1.252c.466-.296 1.084-.159 1.38.307l3.223 5.062c.296.467.159 1.083-.308 1.381-.466.296-1.084.159-1.381-.307l-3.221-5.062c-.296-.466-.157-1.084.307-1.381z"/><path d="M17.988 17.927c-.539-.12-.879-.654-.759-1.193l1.302-5.857c.119-.539.652-.879 1.192-.759.54.12.879.654.759 1.193l-1.301 5.857c-.119.538-.654.879-1.193.759zm-.217.976c.539.119.879.653.759 1.192l-1.3 5.857c-.121.54-.654.88-1.194.76-.538-.12-.878-.654-.76-1.193l1.303-5.857c.119-.539.653-.879 1.192-.759z"/><path d="M17.771 18.902c-.297-.466-.159-1.083.307-1.38l5.062-3.221c.466-.296 1.084-.16 1.38.307.297.466.159 1.083-.307 1.38l-5.062 3.221c-.466.297-1.084.16-1.38-.307z"/><path d="M17.771 18.902c.296.467.159 1.084-.307 1.381l-5.062 3.222c-.466.296-1.083.16-1.381-.308-.296-.465-.159-1.083.307-1.38l5.062-3.222c.467-.296 1.085-.158 1.381.307z"/></g><path d="M22.012 25.566c.932-.592 2.168-.317 2.762.614.593.932.318 2.168-.614 2.762-.932.593-2.168.318-2.762-.614-.592-.932-.318-2.168.614-2.762zM14.55 13.841c-.932.593-2.168.319-2.761-.613-.593-.932-.318-2.168.614-2.761.932-.593 2.168-.318 2.761.613.593.932.318 2.168-.614 2.761zm1.92 10.918c1.078.241 1.758 1.31 1.52 2.388-.24 1.078-1.308 1.758-2.387 1.519-1.079-.24-1.758-1.309-1.519-2.387.239-1.079 1.308-1.758 2.386-1.52zm3.037-13.665c-1.078-.239-1.758-1.308-1.518-2.386.239-1.078 1.308-1.758 2.386-1.519 1.078.24 1.759 1.308 1.519 2.386-.241 1.079-1.309 1.758-2.387 1.519zm-6.013 10.53c.592.933.317 2.169-.614 2.763-.932.593-2.168.318-2.762-.615-.593-.931-.318-2.167.613-2.761.933-.592 2.169-.318 2.763.613zm9.339-5.943c-.593-.932-.317-2.168.614-2.761.932-.593 2.168-.318 2.761.614s.317 2.168-.613 2.761c-.933.593-2.169.318-2.762-.614zm.795 4.524c.24-1.079 1.309-1.759 2.387-1.52 1.078.24 1.758 1.309 1.519 2.387-.24 1.078-1.309 1.758-2.387 1.518-1.079-.238-1.758-1.307-1.519-2.385zm-12.69-2.821c-.24 1.079-1.308 1.758-2.386 1.519-1.078-.24-1.758-1.309-1.519-2.387.239-1.078 1.308-1.758 2.386-1.519 1.079.241 1.758 1.309 1.519 2.387z" fill="#EA596E"/><circle fill="#FFCC4D" cx="18" cy="18.818" r="4"/>';
  var BEE_SVG = '<path fill="#31373D" d="M27.816 23.464c.299-1.148.465-2.318.465-3.464 0-4.161-2.122-6.779-5.258-8.035.417-1.008.665-2.108.665-3.2 0-1.581-.495-2.498-1.315-3.032 1.091-.482 2.517-1.5 3.027-2.011.781-.781.94-1.889.354-2.475-.586-.586-1.693-.428-2.475.354-.611.611-1.948 2.53-2.223 3.619C20.172 5.025 19.126 5 18 5c-1.125 0-2.172.025-3.055.219-.275-1.089-1.612-3.007-2.223-3.619-.781-.781-1.889-.94-2.475-.354-.585.587-.427 1.694.354 2.476.511.511 1.937 1.529 3.027 2.011-.821.533-1.316 1.451-1.316 3.032 0 1.093.248 2.192.665 3.2C9.841 13.221 7.719 15.839 7.719 20c0 1.146.167 2.317.465 3.464v.023l.006-.003c1.209 4.621 4.643 8.847 8.812 9.44L17 33c0 1.657.448 3 1 3 .553 0 1-1.343 1-3 0-.026-.002-.049-.003-.075 4.169-.593 7.604-4.819 8.813-9.44l.006.003v-.024z"/><path d="M14.624 19h6.752c-1.462-1.424-2.615-2.881-3.106-4h-.54c-.491 1.119-1.644 2.576-3.106 4zm-5.378 4c-.361.187-.715.349-1.062.488.32 1.219.799 2.407 1.401 3.512h16.83c.602-1.105 1.082-2.293 1.401-3.512-.347-.139-.701-.301-1.063-.488H9.246zm3.593 8c1.518 1.234 3.278 2 5.161 2 1.884 0 3.643-.766 5.162-2H12.839z" fill="#FFCC4D"/><path fill="#CCD6DD" d="M18 13.505c0 2.647-7.858 8.584-12 8.584s-6-2.443-6-5.09c0-2.646 1.858-4.495 6-4.495 4.143.001 12-1.644 12 1.001zm0 0c0 2.647 7.857 8.584 12 8.584s6-2.443 6-5.09c0-2.646-1.857-4.495-6-4.495s-12-1.644-12 1.001z"/><path fill="#99AAB5" d="M2 19c-.552 0-1-.447-1-1 0-.551.446-.999.998-1 .048 0 4.949-.07 13.596-3.914.505-.227 1.096.002 1.32.507.225.505-.003 1.096-.507 1.32C7.317 18.953 2.213 19 2 19zm32 0c-.213 0-5.316-.047-14.406-4.086-.505-.224-.731-.815-.508-1.32.225-.504.817-.732 1.32-.507C29.054 16.93 33.954 17 34.003 17c.551.003.997.452.996 1.003-.002.551-.448.997-.999.997z"/>';
  var BUTTERFLY_SVG = '<path fill="#1C6399" d="M20.004 20.243c-.426 0-.858.01-1.294.031-.436 1.268-.468 2.747 0 5.097.328 1.646 2.659 6.299 4.584 7.933.683.58 1.638.884 2.69.884 2.144 0 4.691-1.265 6.157-4.034 3.001-5.671-3.474-9.911-12.137-9.911z"/><path fill="#1C6399" d="M33.666 1.973c-.204 0-.425.021-.663.066-3.182.601-9.302 5.126-14.287 11.771 0 0-.789 5.16-.789 6.194 0 .336 1.264.5 3.058.5 3.717 0 9.709-.705 11.424-2.041 1.898-1.479 3.65-9.804 3.488-14.079-.046-1.175-.662-2.411-2.231-2.411z"/><path fill="#55ACEE" d="M27.098 13.936l6.629-.436s-1.055 3.619-3.102 4.656-7.719 1.5-7.719 1.5 2.33-4.261 3.286-5.29c.237-.256.559-.408.906-.43zm.52-1.952l7.526-8.151s.002 5.365-1.206 8.635c0 0-5.383.379-5.914.391-.703.016-.969-.265-.406-.875zm-6.068 7.672l5.5-8.547c.188-.22.253-.52.171-.798l-.968-3.233-6.722 6.609-.844 6.031 2.863-.062zM27.862 8.88c.172.406.516.5.938.125s6.074-6.094 6-6.218c0 0-2.832-1.194-7.8 3.463 0 0 .69 2.224.862 2.63zm-8.925 12.099l5.373 5.228c.203.178.255.473.125.709L22.06 31.25s-4.187-5.479-3.123-10.271zm7.282 6.301l5.549.741s-1.058 3.845-3.394 4.854c-3.906 1.688-5.312-.625-5.312-.625l2.352-4.562c.151-.298.477-.463.805-.408zm-5.95-6.426l5.375 4.958c.077.066.169.11.269.129l6.119.903s-1.219-3.031-4.429-4.531c-3.71-1.733-7.334-1.459-7.334-1.459z"/><path fill="#292F33" d="M20.004 20.243c-.426 0-.858.01-1.294.031-.436 1.268-.468 2.747 0 5.097.328 1.646 2.659 6.299 4.584 7.933.683.58 1.638.884 2.69.884 2.144 0 4.691-1.265 6.157-4.034 3.001-5.671-3.474-9.911-12.137-9.911zm10.537 9.326c-1.316 2.486-3.05 3.473-4.558 3.473-.767 0-1.704-.313-2.15-.691-1.695-1.439-3.437-4.58-4.25-7.224-.465-1.513-.354-4.022-.354-4.022l.667-.021c5.168 0 9.249 2.058 10.726 4.512.714 1.186.687 2.523-.081 3.973z"/><path fill="#292F33" d="M33.666 3.223c.231 0 .935 0 .981 1.208.102 2.681-.594 6.061-1.397 8.882-.541 1.901-1.586 3.292-2.094 3.687-.56.436-1.863 1.238-3.719 1.563-2.03.355-4.207.833-6.456.833-.827 0-1.433.019-1.794-.021.131-1.218.489-3.551.717-5.064 3.768-4.94 9.711-10.361 13.331-11.044.155-.029.3-.044.431-.044m0-1.25c-.204 0-.425.021-.663.066-3.182.601-9.302 5.126-14.287 11.771 0 0-.789 5.16-.789 6.194 0 .336 1.264.5 3.058.5 3.717 0 9.709-.705 11.424-2.041 1.898-1.479 3.65-9.804 3.488-14.079-.046-1.175-.662-2.411-2.231-2.411z"/><path fill="#1C6399" d="M3.902 30.154c1.466 2.769 4.012 4.034 6.157 4.034 1.052 0 2.007-.304 2.69-.884 1.925-1.633 4.256-6.286 4.584-7.933.468-2.35.436-3.828 0-5.097-.436-.021-.868-.031-1.294-.031-8.665 0-15.139 4.24-12.137 9.911z"/><path fill="#1C6399" d="M2.376 1.973C.807 1.973.19 3.209.146 4.383c-.162 4.275 1.59 12.601 3.488 14.079 1.715 1.336 7.706 2.041 11.424 2.041 1.794 0 3.058-.164 3.058-.5 0-1.033-.789-6.194-.789-6.194C12.341 7.165 6.22 2.64 3.039 2.039c-.238-.045-.459-.066-.663-.066z"/><path fill="#55ACEE" d="M8.943 13.936L2.315 13.5s1.055 3.619 3.102 4.656 7.719 1.5 7.719 1.5-2.33-4.261-3.286-5.29c-.237-.256-.559-.408-.907-.43zm-.519-1.952L.898 3.833s-.002 5.365 1.206 8.635c0 0 5.383.379 5.914.391.703.016.969-.265.406-.875zm6.068 7.672l-5.5-8.547c-.188-.22-.253-.52-.171-.798l.968-3.233 6.722 6.609.844 6.031-2.863-.062zM8.179 8.88c-.172.406-.516.5-.938.125s-6.074-6.094-6-6.218c0 0 2.832-1.194 7.8 3.463.001 0-.69 2.224-.862 2.63zm8.926 12.099l-5.373 5.228c-.203.178-.255.473-.125.709l2.375 4.333c-.001.001 4.187-5.478 3.123-10.27zM9.822 27.28l-5.549.741s1.058 3.845 3.394 4.854c3.906 1.688 5.312-.625 5.312-.625l-2.352-4.562c-.15-.298-.476-.463-.805-.408zm5.951-6.426l-5.375 4.958c-.077.066-.169.11-.269.129l-6.119.903s1.219-3.031 4.429-4.531c3.709-1.733 7.334-1.459 7.334-1.459z"/><path fill="#292F33" d="M3.902 30.154c1.466 2.769 4.012 4.034 6.157 4.034 1.052 0 2.007-.304 2.69-.884 1.925-1.633 4.256-6.286 4.584-7.933.468-2.35.436-3.828 0-5.097-.436-.021-.868-.031-1.294-.031-8.665 0-15.139 4.24-12.137 9.911zm1.518-4.559c1.477-2.454 5.558-4.512 10.726-4.512l.667.021s.111 2.51-.354 4.022c-.813 2.644-2.555 5.785-4.25 7.224-.446.379-1.383.691-2.15.691-1.508 0-3.242-.986-4.558-3.473-.768-1.449-.795-2.786-.081-3.973z"/><path fill="#292F33" d="M2.376 3.223c.131 0 .276.015.431.044 3.619.683 9.563 6.104 13.331 11.044.228 1.513.586 3.846.717 5.064-.361.04-.967.021-1.794.021-2.249 0-4.426-.478-6.456-.833-1.856-.325-3.159-1.127-3.719-1.563-.508-.396-1.553-1.786-2.094-3.687-.803-2.821-1.499-6.201-1.397-8.882.046-1.208.749-1.208.981-1.208m0-1.25C.807 1.973.19 3.209.146 4.383c-.162 4.275 1.59 12.601 3.488 14.079 1.715 1.336 7.706 2.041 11.424 2.041 1.794 0 3.058-.164 3.058-.5 0-1.033-.789-6.194-.789-6.194C12.341 7.165 6.22 2.64 3.039 2.039c-.238-.045-.459-.066-.663-.066z"/><path fill="#292F33" d="M21.887 4.762c-.25-.138-.563-.047-.701.203l-2.74 4.98c-.018.033-.022.068-.032.102-.127-.007-.244-.018-.393-.018-.148 0-.266.01-.392.018-.01-.034-.014-.069-.032-.102l-2.74-4.98c-.138-.25-.452-.341-.702-.203-.25.137-.341.451-.203.701l2.655 4.826c-1.179.784 1.15 3.438.381 9.204-1.033 7.75 1.033 9.817 1.033 9.817s2.067-2.067 1.033-9.817c-.769-5.766 1.56-8.42.381-9.204l2.656-4.826c.137-.25.046-.564-.204-.701z"/>';

  // Twemoji 원본 viewBox가 "-3.6 -3.6 43.2 43.2"(2026-08-09 여백 패딩 추가분 포함)이므로,
  // 그 원점을 (0,0)으로 옮긴 뒤 원하는 크기로 스케일하고 최종 위치로 옮기는 순서로 배치한다.
  var COMPANION_SVGS = { flower: FLOWER_SVG, bee: BEE_SVG, butterfly: BUTTERFLY_SVG };
  function companion(id, x, y, size) {
    var scale = size / 43.2;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ') translate(3.6,3.6)">' +
      COMPANION_SVGS[id] + '</g>';
  }

  function r(tag, attrs, fill, strokeW) {
    var parts = [];
    for (var k in attrs) { if (attrs[k] !== undefined) parts.push(k + '="' + attrs[k] + '"'); }
    parts.push('fill="' + fill + '"');
    if (strokeW !== 0) parts.push('stroke="' + STROKE + '" stroke-width="' + (strokeW || 5) + '"'); // 기본 굵기 30% 감소(7→5, 2026-08-10)
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
    return '<path d="' + d + '" fill="none" stroke="#241f1a" stroke-width="' + (strokeW || 3.5) + '" stroke-linecap="round"/>'; // 기본 굵기 30% 감소(5→3.5, 2026-08-10)
  }

  // ---------- 공통 몸통(소녀) — 백설공주/신데렐라가 공유하되, 얼굴형·앞머리 스타일은
  // face 파라미터로 서로 다르게 지정해서 둘이 색만 다른 쌍둥이로 안 보이게 한다(2026-08-10,
  // "얼굴을 차별화해달라"는 피드백으로 추가). 몸통/의상 구조는 계속 공유(효율적 재사용).
  function girlBody(c, headpiece, handItem, face) {
    face = face || {};
    var frx = face.rx || 66, fry = face.ry || 66;                          // 얼굴 가로/세로 반지름
    var faceCx = 200, faceCy = 140;
    var eyeDx = Math.round(frx * 0.33);                                    // 눈 좌우 간격은 얼굴 폭에 비례
    var hair = face.hairStyle === 'sweep'
      // 사이드로 넘긴 웨이브 머리(신데렐라풍) — 이마 한쪽이 더 드러나 보이도록 비대칭으로 배치
      ? [
          r('ellipse', { cx: 170 - (frx - 66), cy: 92, rx: 34, ry: 24, transform: 'rotate(-12 170 92)' }, c.hairFront),
          r('ellipse', { cx: 226 + (frx - 66), cy: 100, rx: 20, ry: 16, transform: 'rotate(18 226 100)' }, c.hairFront)
        ].join('')
      // 가운데 가르마 + 좌우 대칭 뱅(백설공주풍)
      : [
          r('ellipse', { cx: faceCx - frx + 26, cy: 98, rx: 26, ry: 20 }, c.hairFront),
          r('ellipse', { cx: faceCx, cy: 90, rx: 28, ry: 22 }, c.hairFront),
          r('ellipse', { cx: faceCx + frx - 26, cy: 98, rx: 26, ry: 20 }, c.hairFront)
        ].join('');
    // 뒷머리 실루엣도 얼굴형처럼 서로 다르게(2026-08-10, "다 원형이다" 피드백) — 백설공주는
    // 양갈래 땋은머리, 신데렐라는 위로 틀어올린 업스타일 번(둥근 실루엣에서 확실히 벗어나게).
    var hairAccent = face.hairBackShape === 'buns'
      ? [
          r('circle', { cx: faceCx - frx - 24, cy: faceCy - 8, r: 26 }, c.hairBack), // 왼쪽 양갈래
          r('circle', { cx: faceCx + frx + 24, cy: faceCy - 8, r: 26 }, c.hairBack)  // 오른쪽 양갈래
        ].join('')
      : face.hairBackShape === 'updo'
      ? r('ellipse', { cx: faceCx, cy: faceCy - fry - 26, rx: 34, ry: 28 }, c.hairBack) // 위로 틀어올린 번
      : '';
    return [
      r('ellipse', { cx: 200, cy: 148, rx: frx + 28, ry: fry + 34 }, c.hairBack), // 뒷머리(얼굴보다 먼저 그려서 테두리에 둥글게 남음)
      hairAccent,
      r('ellipse', { cx: faceCx, cy: faceCy, rx: frx, ry: fry }, c.skin),   // 얼굴
      r('rect', { x: 182, y: 196, width: 36, height: 30 }, c.skin),        // 목
      hair,
      headpiece,
      r('circle', { cx: faceCx - eyeDx - 20, cy: 160, r: 12 }, c.blush, 4), // 볼터치
      r('circle', { cx: faceCx + eyeDx + 20, cy: 160, r: 12 }, c.blush, 4),
      wall('circle', { cx: faceCx - eyeDx, cy: 138, r: 7 }),               // 눈
      wall('circle', { cx: faceCx + eyeDx, cy: 138, r: 7 }),
      wallStroke('M188,163 Q200,171 212,163'),                             // 입
      r('polygon', { points: '145,222 255,222 228,278 172,278' }, c.bodice), // 보디스
      r('circle', { cx: 138, cy: 232, r: 24 }, c.sleeve),                  // 소매
      r('circle', { cx: 262, cy: 232, r: 24 }, c.sleeve),
      // 팔: armSpread가 있으면 어깨(소매 중심)를 축으로 바깥쪽으로 벌어진 포즈, 없으면 기존처럼 아래로 늘어뜨림
      r('rect', { x: 122, y: 248, width: 18, height: 52, rx: 9,
        transform: face.armSpread ? 'rotate(38 138 232)' : undefined }, c.skin), // 왼팔
      r('rect', { x: 260, y: 248, width: 18, height: 52, rx: 9,
        transform: face.armSpread ? 'rotate(-38 262 232)' : undefined }, c.skin),  // 오른팔
      r('circle', { cx: 131, cy: 306, r: 13,
        transform: face.armSpread ? 'rotate(38 138 232)' : undefined }, c.skin), // 왼손
      r('circle', { cx: 269, cy: 306, r: 13,
        transform: face.armSpread ? 'rotate(-38 262 232)' : undefined }, c.skin),  // 오른손
      handItem,
      r('polygon', { points: '172,278 228,278 300,352 100,352' }, c.skirtBase), // 치마
      // 치마 무늬(점) — 너무 작으면 선 인식 파이프라인의 두께 보정/틈 메우기 단계에서 통째로
      // 벽(검은색)으로 먹혀버리므로(확인된 버그) 테두리 없이 + 충분히 크게 그린다. 좌표는 치마
      // 사다리꼴(위 172~228, 아래 100~300) 안쪽으로 여유 있게 들어오도록 계산됨(2026-08-10,
      // 기존 점 2개가 치마 밖으로 살짝 삐져나와 있던 것을 발견해 수정).
      r('circle', { cx: 165, cy: 302, r: 13 }, c.dot, 0),
      r('circle', { cx: 200, cy: 296, r: 13 }, c.dot, 0),
      r('circle', { cx: 235, cy: 302, r: 13 }, c.dot, 0),
      r('circle', { cx: 178, cy: 332, r: 13 }, c.dot, 0),
      r('circle', { cx: 222, cy: 332, r: 13 }, c.dot, 0),
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
    r('path', { d: 'M120,116 Q200,78 280,116 L280,130 Q200,94 120,130 Z' }, '#E63946', 3.5), // 머리띠
    [
      // 사과 위치는 팔을 벌린 새 오른손 위치(약 313,286)에 맞춰 옮김(2026-08-10, "팔을 벌리게"
      // 피드백으로 팔 포즈가 바뀌면서 손 위치도 같이 이동함)
      r('circle', { cx: 317, cy: 280, r: 22 }, '#D62839', 0),           // 사과
      r('ellipse', { cx: 322, cy: 262, rx: 10, ry: 6 }, '#4C9A54', 0)   // 잎
    ].join(''),
    { armSpread: true, hairBackShape: 'buns' } // 팔 벌린 포즈 + 양갈래 땋은머리(2026-08-10 피드백)
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
      r('polygon', { points: '178,72 200,50 222,72' }, '#F1C40F', 2.8),  // 티아라
      r('circle', { cx: 200, cy: 66, r: 10 }, '#8ED8E8', 0)            // 보석
    ].join(''),
    // 반짝이(별) — 손 바깥 빈 배경에 떠 있어서 색 경계만으로는 벽이 안 닫힐 수 있으므로
    // (확인된 버그) 테두리를 다시 넣어 확실히 닫힌 영역으로 만든다. 손 근처에 너무 다닥다닥
    // 붙어있으면 작게 봤을 때 테두리선들이 겹쳐 보여 뭉친 검은 덩어리처럼 보인다(2026-08-10,
    // "팔 안쪽 검은 부분" 피드백으로 발견 — 감지 버그가 아니라 장식이 너무 촘촘했던 것) — 서로
    // 더 떨어뜨려 배치.
    [
      r('circle', { cx: 306, cy: 268, r: 13 }, '#F1C40F', 2.8),
      r('circle', { cx: 322, cy: 296, r: 10 }, '#8ED8E8', 2.8),
      r('circle', { cx: 292, cy: 322, r: 9 }, '#F1C40F', 2.8)
    ].join(''),
    { rx: 58, ry: 74, hairStyle: 'sweep', hairBackShape: 'updo' } // 갸름한 얼굴 + 업스타일 번 — 백설공주와 확실히 다른 인상
  );

  // ---------- Hard: 나무인형 소년 (피노키오 모티프, 오리지널 디자인) ----------
  var woodenBoy = [
    r('ellipse', { cx: 200, cy: 80, rx: 58, ry: 15 }, '#3B6EA5'),               // 모자 챙
    r('polygon', { points: '160,80 240,80 200,28' }, '#3B6EA5'),                // 모자 콘
    r('ellipse', { cx: 222, cy: 34, rx: 6, ry: 14, transform: 'rotate(20 222 34)' }, '#D62839'), // 깃털
    // 뒷머리(헤어) 없앰(2026-08-10, "헤어 없애고 네모난 머리만 남겨" 피드백) — 네모난 나무 얼굴만 남김
    r('rect', { x: 134, y: 74, width: 132, height: 132, rx: 14 }, '#E8B77E'),  // 얼굴(나무 각목처럼 네모로 — 소녀들의 동그란/계란형 얼굴과 확실히 다르게)
    r('rect', { x: 182, y: 196, width: 36, height: 26 }, '#E8B77E'),           // 목 이음관절
    wall('circle', { cx: 178, cy: 138, r: 7 }),
    wall('circle', { cx: 222, cy: 138, r: 7 }),
    // 나무 코 — 원래 눈 높이(y138)에서 시작해서 오른쪽 눈을 가려버렸다(확인된 버그, 2026-08-10
    // "양쪽 눈이 다 보이게" 피드백으로 발견) — 눈(바닥 y145)과 입(꼭대기 y164) 사이 좁은 틈에
    // 딱 맞게 배치(2026-08-10, "눈과 입 사이에 있어야" 피드백으로 폭을 좁혀 재조정).
    r('polygon', { points: '200,146 200,163 326,152' }, '#B97D4B'),            // 나무 코(나뭇가지처럼 길게)
    r('circle', { cx: 262, cy: 154, r: 9 }, '#8C5A2B', 2.1),                     // 코 마디(나뭇가지 옹이)
    r('ellipse', { cx: 338, cy: 133, rx: 16, ry: 8, transform: 'rotate(-25 338 133)' }, '#4C9A54'), // 나뭇가지 끝 새싹잎(왼쪽)
    r('ellipse', { cx: 346, cy: 152, rx: 14, ry: 7, transform: 'rotate(15 346 152)' }, '#4C9A54'),  // 나뭇가지 끝 새싹잎(오른쪽)
    wallStroke('M186,164 Q200,170 214,164'),
    // 오른쪽 볼터치는 나무 코 경로 아래로 옮김(2026-08-10, "분홍색이 코에 보인다" 피드백 —
    // 원래 위치(244,160)가 코 삼각형과 겹쳐서 분홍색이 나무 코 위에 비쳐 보이던 문제)
    r('circle', { cx: 156, cy: 160, r: 10 }, '#E8998D', 2.8),                    // 볼터치
    r('circle', { cx: 252, cy: 178, r: 10 }, '#E8998D', 2.8),
    r('rect', { x: 154, y: 214, width: 92, height: 88, rx: 16 }, '#4C9A54'),   // 몸통(셔츠)
    // 단추 — 너무 작으면 선 인식 파이프라인에서 통째로 벽(검은색)으로 먹히므로(확인된 버그)
    // 테두리 없이 + 충분히 크게 그린다.
    r('circle', { cx: 178, cy: 246, r: 12 }, '#D62839', 0),                    // 단추
    r('circle', { cx: 200, cy: 260, r: 12 }, '#D62839', 0),
    r('circle', { cx: 222, cy: 274, r: 12 }, '#D62839', 0),
    // 관절점 — 어깨/팔꿈치 관절 좌표가 실제 회전된 팔 사각형의 끝점과 어긋나서 팔이 몸통에서
    // 떨어져 보이던 버그(2026-08-10, "팔이 떨어져 있다" 피드백으로 발견)를 고쳤다 — 위팔은
    // 어깨 관절점을 축으로, 아래팔은 팔꿈치 관절점을 축으로 정확히 이어지도록 좌표를 다시 계산함
    // (회전 전 사각형의 위쪽 중심이 관절점과 정확히 일치하도록 배치).
    r('circle', { cx: 150, cy: 222, r: 13 }, '#8C5A2B', 2.8),                    // 왼쪽 어깨 관절
    r('circle', { cx: 250, cy: 222, r: 13 }, '#8C5A2B', 2.8),                    // 오른쪽 어깨 관절
    r('rect', { x: 138, y: 222, width: 24, height: 56, rx: 12, transform: 'rotate(30 150 222)' }, '#D9A66C'),  // 왼쪽 위팔
    r('rect', { x: 238, y: 222, width: 24, height: 56, rx: 12, transform: 'rotate(-30 250 222)' }, '#D9A66C'), // 오른쪽 위팔
    r('circle', { cx: 122, cy: 270.5, r: 12 }, '#8C5A2B', 2.8),                  // 왼쪽 팔꿈치 관절
    r('circle', { cx: 278, cy: 270.5, r: 12 }, '#8C5A2B', 2.8),                  // 오른쪽 팔꿈치 관절
    r('rect', { x: 111, y: 270.5, width: 22, height: 50, rx: 11, transform: 'rotate(18 122 270.5)' }, '#B97D4B'),  // 왼쪽 아래팔
    r('rect', { x: 267, y: 270.5, width: 22, height: 50, rx: 11, transform: 'rotate(-18 278 270.5)' }, '#B97D4B'), // 오른쪽 아래팔
    r('circle', { cx: 106.5, cy: 318, r: 12 }, '#D9A66C'),                     // 왼손
    r('circle', { cx: 293.5, cy: 318, r: 12 }, '#D9A66C'),                     // 오른손
    r('circle', { cx: 200, cy: 306, r: 14 }, '#8C5A2B', 2.8),                    // 골반 관절
    r('polygon', { points: '165,306 235,306 246,340 154,340' }, '#7A4B2A'),    // 반바지
    r('circle', { cx: 168, cy: 344, r: 13 }, '#8C5A2B', 2.8),                    // 무릎 관절
    r('circle', { cx: 232, cy: 344, r: 13 }, '#8C5A2B', 2.8),
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
    // 웨이브 진 머리끝(2026-08-10, "다 원형이다" 피드백 — 다른 보스들과 실루엣이 겹치지 않게
    // 아래쪽에 물결치는 머리카락 뭉치를 추가)
    r('circle', { cx: 130, cy: 222, r: 22 }, '#C9455B'),
    r('circle', { cx: 200, cy: 234, r: 24 }, '#C9455B'),
    r('circle', { cx: 270, cy: 222, r: 22 }, '#C9455B'),
    r('ellipse', { cx: 200, cy: 130, rx: 66, ry: 58 }, '#FFD9B3'),             // 얼굴(가로로 통통한 계란형 — 다른 보스들과 다른 얼굴형)
    r('rect', { x: 184, y: 184, width: 32, height: 26 }, '#FFD9B3'),           // 목
    r('ellipse', { cx: 165, cy: 90, rx: 24, ry: 18 }, '#E8798C'),              // 앞머리
    r('ellipse', { cx: 200, cy: 82, rx: 26, ry: 20 }, '#E8798C'),
    r('ellipse', { cx: 235, cy: 90, rx: 24, ry: 18 }, '#E8798C'),
    r('circle', { cx: 214, cy: 76, r: 13 }, '#E85D75', 0),                     // 머리 꽃 장식
    r('circle', { cx: 155, cy: 148, r: 11 }, '#FFC1CC', 2.8),                    // 볼터치
    r('circle', { cx: 245, cy: 148, r: 11 }, '#FFC1CC', 2.8),
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
    r('circle', { cx: 70, cy: 200, r: 13 }, '#CFEFFF', 2.8),
    r('circle', { cx: 90, cy: 170, r: 11 }, '#CFEFFF', 2.8),
    r('circle', { cx: 320, cy: 190, r: 12 }, '#CFEFFF', 2.8),
    r('circle', { cx: 335, cy: 220, r: 10 }, '#CFEFFF', 2.8),
    r('circle', { cx: 60, cy: 240, r: 10 }, '#CFEFFF', 2.8)
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
