// 색칠놀이 도안 데이터 (이모지 기반)
// 각 도안은 이모지 글리프에서 어두운 선 + 색상 경계를 자동으로 벽(선)으로 인식해
// 색칠 가능한 영역을 뽑아낸다 (app.js의 loadTemplateSource 'emoji' 모드).
// 2026-08-15(4차): "카테고리 10개씩" 유지하되, 영역<=4로 10개가 안 채워지는 카테고리는
// (탈것/장소, 놀이, 동물, 하늘) 그 카테고리 안에서 다음으로 적은 영역개수부터 허용해서 10개를
// 채움(사용자 승인: "허용해서 삽입"). 영역<=4가 이미 10개 넘는 카테고리는 그대로 가장 적은
// 10개만 사용.

const COLORING_TEMPLATES = [
  // ===== Level 1: 동물 =====
  { id: "sheep", name: "Sheep", emoji: "🐑", difficulty: 1, renderMode: "emoji" },
  { id: "elephant", name: "Elephant", emoji: "🐘", difficulty: 1, renderMode: "emoji" },
  { id: "swan", name: "Swan", emoji: "🦢", difficulty: 1, renderMode: "emoji" },
  { id: "goat", name: "Goat", emoji: "🐐", renderMode: "emoji", difficulty: 1 },
  { id: "buffalo", name: "Water Buffalo", emoji: "🐃", renderMode: "emoji", difficulty: 1 },
  { id: "eagle2", name: "Eagle", emoji: "🦅", renderMode: "emoji", difficulty: 1 },
  { id: "koala", name: "Koala", emoji: "🐨", renderMode: "emoji", difficulty: 1 },
  { id: "chipmunk", name: "Chipmunk", emoji: "🐿️", renderMode: "emoji", difficulty: 1 },
  { id: "chicken", name: "Chicken", emoji: "🐔", renderMode: "emoji", difficulty: 1 },
  { id: "bird", name: "Bird", emoji: "🐦", renderMode: "emoji", difficulty: 1 },
  { id: "dolphin", name: "Dolphin", emoji: "🐬", difficulty: 1, renderMode: "emoji" },
  { id: "whale", name: "Whale", emoji: "🐳", difficulty: 1, renderMode: "emoji" },
  // 2026-08-21: "챌린지모드 동물 4개를 가지고 와서 레벨1을 16개로" 요청 — 이미 챌린지모드에
  // 있는 4종을 유아 모드 레벨1에도 그대로 추가(같은 id를 챌린지 배열에도 그대로 둠, 두 모드
  // 다 독립적으로 동작). 영역 개수는 안 따짐(사용자 확인: "부족하면 바탕화면에서 직접 추가").
  { id: "penguin", name: "Penguin", emoji: "🐧", difficulty: 1, renderMode: "emoji" },
  { id: "lion", name: "Lion", emoji: "🦁", difficulty: 1, renderMode: "emoji" },
  { id: "panda", name: "Panda", emoji: "🐼", difficulty: 1, renderMode: "emoji" },
  { id: "tiger", name: "Tiger", emoji: "🐯", difficulty: 1, renderMode: "emoji" },
  // ===== Level 2: 음식 =====
  { id: "ant", name: "Ant", emoji: "🐜", difficulty: 3, renderMode: "emoji" },
  { id: "spider", name: "Spider", emoji: "🕷️", difficulty: 3, renderMode: "emoji" },
  { id: "mosquito", name: "Mosquito", emoji: "🦟", difficulty: 3, renderMode: "emoji" },
  { id: "sunflower", name: "Sunflower", emoji: "🌻", difficulty: 3, renderMode: "emoji" },
  { id: "tulip", name: "Tulip", emoji: "🌷", difficulty: 3, renderMode: "emoji" },
  { id: "rose", name: "Rose", emoji: "🌹", renderMode: "emoji", difficulty: 3 },
  { id: "blossom", name: "Blossom", emoji: "🌼", renderMode: "emoji", difficulty: 3 },
  { id: "sheafrice", name: "Sheaf of Rice", emoji: "🌾", renderMode: "emoji", difficulty: 3 },
  { id: "hibiscus", name: "Hibiscus", emoji: "🌺", renderMode: "emoji", difficulty: 3 },
  { id: "wilted", name: "Wilted Flower", emoji: "🥀", renderMode: "emoji", difficulty: 3 },
  // ===== Level 3: 자연 =====
  { id: "mango", name: "Mango", emoji: "🥭", difficulty: 2, renderMode: "emoji" },
  { id: "pear", name: "Pear", emoji: "🍐", difficulty: 2, renderMode: "emoji" },
  { id: "apple", name: "Apple", emoji: "🍎", difficulty: 2, renderMode: "emoji" },
  { id: "orange", name: "Orange", emoji: "🍊", difficulty: 2, renderMode: "emoji" },
  { id: "watermelon", name: "Watermelon", emoji: "🍉", difficulty: 2, renderMode: "emoji" },
  { id: "lemon", name: "Lemon", emoji: "🍋", difficulty: 2, renderMode: "emoji" },
  { id: "greenapple", name: "Green Apple", emoji: "🍏", renderMode: "emoji", difficulty: 2 },
  { id: "melon", name: "Melon", emoji: "🍈", renderMode: "emoji", difficulty: 2 },
  { id: "coconut", name: "Coconut", emoji: "🥥", renderMode: "emoji", difficulty: 2 },
  { id: "peach", name: "Peach", emoji: "🍑", difficulty: 2, renderMode: "emoji" },
  // ===== Level 4: 하늘 =====
  { id: "star", name: "Star", emoji: "⭐", difficulty: 4, renderMode: "emoji" },
  { id: "cloud", name: "Cloud", emoji: "☁️", difficulty: 4, renderMode: "emoji" },
  { id: "drop", name: "Water Drop", emoji: "💧", difficulty: 4, renderMode: "emoji" },
  { id: "newmoon", name: "New Moon Face", emoji: "🌚", renderMode: "emoji", difficulty: 4 },
  { id: "earth", name: "Earth", emoji: "🌎", renderMode: "emoji", difficulty: 4 },
  { id: "moonshape", name: "Waning Moon", emoji: "🌘", renderMode: "emoji", difficulty: 4 },
  { id: "newmoon2", name: "New Moon", emoji: "🌑", renderMode: "emoji", difficulty: 4 },
  { id: "earth2", name: "Earth", emoji: "🌍", renderMode: "emoji", difficulty: 4 },
  { id: "moon", name: "Moon", emoji: "🌙", difficulty: 4, renderMode: "emoji" },
  { id: "sunface", name: "Sun with Face", emoji: "🌞", renderMode: "emoji", difficulty: 4 },
  // ===== Level 5: 사람 =====
  { id: "trafficlight", name: "Vertical Traffic Light", emoji: "🚦", renderMode: "emoji", difficulty: 8 },
  { id: "horizontallight", name: "Horizontal Traffic Light", emoji: "🚥", renderMode: "emoji", difficulty: 8 },
  { id: "canoe", name: "Canoe", emoji: "🛶", renderMode: "emoji", difficulty: 8 },
  { id: "tent", name: "Tent", emoji: "⛺", renderMode: "emoji", difficulty: 8 },
  { id: "motorboat", name: "Motor Boat", emoji: "🛥️", renderMode: "emoji", difficulty: 8 },
  { id: "boat", name: "Sailboat", emoji: "⛵", renderMode: "emoji", difficulty: 8 },
  { id: "stopsign", name: "Stop Sign", emoji: "🛑", renderMode: "emoji", difficulty: 8 },
  { id: "childrencrossing", name: "Children Crossing", emoji: "🚸", renderMode: "emoji", difficulty: 8 },
  { id: "scooter", name: "Motor Scooter", emoji: "🛵", renderMode: "emoji", difficulty: 8 },
  { id: "novehicles", name: "No Bicycles", emoji: "🚳", renderMode: "emoji", difficulty: 8 },
  // ===== Level 6: 생활용품 =====
  { id: "glasses", name: "Glasses", emoji: "👓", renderMode: "emoji", difficulty: 5 },
  { id: "tongue", name: "Tongue", emoji: "👅", renderMode: "emoji", difficulty: 5 },
  { id: "lips", name: "Mouth", emoji: "👄", renderMode: "emoji", difficulty: 5 },
  { id: "sweatdroplets", name: "Sweat Droplets", emoji: "💦", renderMode: "emoji", difficulty: 5 },
  { id: "thongsandal", name: "Thong Sandal", emoji: "🩴", renderMode: "emoji", difficulty: 5 },
  { id: "tshirt", name: "T-Shirt", emoji: "👕", renderMode: "emoji", difficulty: 5 },
  { id: "sandal", name: "Sandal", emoji: "👡", renderMode: "emoji", difficulty: 5 },
  { id: "tophat", name: "Top Hat", emoji: "🎩", renderMode: "emoji", difficulty: 5 },
  { id: "ghost", name: "Ghost", emoji: "👻", renderMode: "emoji", difficulty: 5 },
  { id: "handbag", name: "Handbag", emoji: "👜", renderMode: "emoji", difficulty: 5 },
  // ===== Level 7: 놀이 =====
  { id: "bell", name: "Bell", emoji: "🔔", difficulty: 6, renderMode: "emoji" },
  { id: "label2", name: "Label", emoji: "🏷️", renderMode: "emoji", difficulty: 6 },
  { id: "linkedbell", name: "Bellhop Bell", emoji: "🛎️", renderMode: "emoji", difficulty: 6 },
  { id: "candle", name: "Candle", emoji: "🕯️", renderMode: "emoji", difficulty: 6 },
  { id: "lockedkey", name: "Locked with Key", emoji: "🔐", renderMode: "emoji", difficulty: 6 },
  { id: "safetypin", name: "Safety Pin", emoji: "🧷", renderMode: "emoji", difficulty: 6 },
  { id: "tv", name: "TV", emoji: "📺", renderMode: "emoji", difficulty: 6 },
  { id: "linkedpaperclips", name: "Linked Paperclips", emoji: "🖇️", renderMode: "emoji", difficulty: 6 },
  { id: "pushpin", name: "Pushpin", emoji: "📌", renderMode: "emoji", difficulty: 6 },
  { id: "stethoscope", name: "Stethoscope", emoji: "🩺", renderMode: "emoji", difficulty: 6 },
  // ===== Level 8: 탈것/장소 =====
  { id: "rugbyfootball", name: "Rugby Football", emoji: "🏉", renderMode: "emoji", difficulty: 7 },
  { id: "runningshirt", name: "Running Shirt", emoji: "🎽", renderMode: "emoji", difficulty: 7 },
  { id: "balloon", name: "Balloon", emoji: "🎈", difficulty: 7, renderMode: "emoji" },
  { id: "flyingdisc", name: "Flying Disc", emoji: "🥏", renderMode: "emoji", difficulty: 7 },
  { id: "medal2", name: "1st Place Medal", emoji: "🥇", renderMode: "emoji", difficulty: 7 },
  { id: "tennis", name: "Tennis", emoji: "🎾", renderMode: "emoji", difficulty: 7 },
  { id: "sportsmedal", name: "Sports Medal", emoji: "🏅", renderMode: "emoji", difficulty: 7 },
  { id: "pingpong", name: "Ping Pong", emoji: "🏓", renderMode: "emoji", difficulty: 7 },
  { id: "pool8ball", name: "8 Ball", emoji: "🎱", renderMode: "emoji", difficulty: 7 },
  { id: "goalnet", name: "Goal Net", emoji: "🥅", renderMode: "emoji", difficulty: 7 },
  // ===== Level 9: 기호/기타 =====
  { id: "clock", name: "One O'Clock", emoji: "🕐", difficulty: 10, renderMode: "emoji" },
  { id: "clock2", name: "Two O'Clock", emoji: "🕑", renderMode: "emoji", difficulty: 10 },
  { id: "clock3", name: "Three O'Clock", emoji: "🕒", renderMode: "emoji", difficulty: 10 },
  { id: "clock4", name: "Four O'Clock", emoji: "🕓", renderMode: "emoji", difficulty: 10 },
  { id: "clock5", name: "Five O'Clock", emoji: "🕔", renderMode: "emoji", difficulty: 10 },
  { id: "clock6", name: "Six O'Clock", emoji: "🕕", renderMode: "emoji", difficulty: 10 },
  { id: "clock7", name: "Seven O'Clock", emoji: "🕖", renderMode: "emoji", difficulty: 10 },
  { id: "clock8", name: "Eight O'Clock", emoji: "🕗", renderMode: "emoji", difficulty: 10 },
  { id: "clock9", name: "Nine O'Clock", emoji: "🕘", renderMode: "emoji", difficulty: 10 },
  { id: "clock10", name: "Ten O'Clock", emoji: "🕙", renderMode: "emoji", difficulty: 10 },
  { id: "clock11", name: "Eleven O'Clock", emoji: "🕚", renderMode: "emoji", difficulty: 10 },
  { id: "clock12", name: "Twelve O'Clock", emoji: "🕛", renderMode: "emoji", difficulty: 10 },
  // ===== Level 10: 시계 =====
  { id: "heart", name: "Heart", emoji: "❤️", difficulty: 9, renderMode: "emoji" },
  { id: "sparkles", name: "Sparkles", emoji: "✨", renderMode: "emoji", difficulty: 9 },
  { id: "growingheart", name: "Growing Heart", emoji: "💗", renderMode: "emoji", difficulty: 9 },
  { id: "sparklingheart", name: "Sparkling Heart", emoji: "💖", renderMode: "emoji", difficulty: 9 },
  { id: "meatbone", name: "Meat on Bone", emoji: "🍖", renderMode: "emoji", difficulty: 9 },
  { id: "friedegg", name: "Fried Egg", emoji: "🍳", renderMode: "emoji", difficulty: 9 },
  { id: "blackflag", name: "Black Flag", emoji: "🏴", renderMode: "emoji", difficulty: 9 },
  { id: "whiteflag", name: "White Flag", emoji: "🏳️", renderMode: "emoji", difficulty: 9 },
  { id: "zzz", name: "Zzz", emoji: "💤", renderMode: "emoji", difficulty: 9 },
  { id: "collision", name: "Collision", emoji: "💥", renderMode: "emoji", difficulty: 9 },
];

// getTemplatesForLevel이 이 표로 오름차순 정렬한다(이미지 로딩이 비동기라 실행 중에는 못 구함).
const TEMPLATE_REGION_COUNTS = {"sheep":2,"elephant":2,"swan":2,"goat":2,"buffalo":2,"eagle2":3,"koala":4,"chipmunk":5,"chicken":5,"bird":5,"ant":1,"spider":1,"dolphin":2,"whale":3,"mosquito":3,"sunflower":3,"tulip":3,"rose":3,"blossom":3,"pear":2,"apple":3,"orange":3,"watermelon":3,"lemon":3,"greenapple":3,"mango":2,"melon":3,"coconut":5,"peach":4,"star":1,"cloud":1,"drop":1,"newmoon":4,"earth":4,"moonshape":4,"earth2":4,"moon":4,"newmoon2":7,"sunface":5,"trafficlight":4,"horizontallight":4,"canoe":5,"tent":5,"motorboat":5,"boat":6,"stopsign":2,"childrencrossing":5,"scooter":8,"novehicles":10,"glasses":3,"tongue":3,"lips":3,"sweatdroplets":3,"thongsandal":3,"tshirt":4,"sandal":4,"tophat":4,"ghost":4,"handbag":4,"bell":2,"label2":3,"linkedbell":3,"candle":4,"lockedkey":4,"safetypin":4,"tv":4,"linkedpaperclips":4,"pushpin":4,"stethoscope":4,"rugbyfootball":3,"runningshirt":4,"balloon":4,"flyingdisc":4,"medal2":4,"tennis":5,"sportsmedal":5,"pingpong":5,"pool8ball":5,"goalnet":5,"clock":3,"clock2":3,"clock3":3,"clock4":3,"clock5":3,"clock6":3,"clock7":3,"clock8":3,"clock9":3,"clock10":3,"heart":1,"sparkles":3,"growingheart":3,"sparklingheart":3,"blackflag":3,"whiteflag":3,"zzz":3,"collision":3,"clock11":3,"sheafrice":3,"clock12":3,"hibiscus":6,"wilted":6,"meatbone":4,"friedegg":4};

// 2026-08-15: 챌린지모드 쉬움/보통/어려움(아래 CHALLENGE_TIER_TEMPLATES) 300개의 영역 수 실측표.
const CHALLENGE_TIER_REGION_COUNTS = {"avocado":4,"bellpepper":4,"alien":4,"skull":4,"barchart":4,"paintbrush2":4,"moneybag":4,"megaphone":4,"bookmark":5,"ram":5,"chopsticks":4,"punch":4,"mahjong":4,"fish":5,"headphone":5,"laptop":5,"joystick":5,"admissiontickets":5,"rabbit":6,"babysymbol":4,"revolvinghearts":4,"cherry":5,"thumbsup":5,"thumbsdown":5,"musicalkeyboard":5,"closedmailbox":5,"doorobj":5,"pig":6,"jackolantern":6,"nobell":4,"octopus":5,"glassofmilk":5,"oden":5,"lipstick":5,"envelope":5,"computermouse":5,"trumpet":5,"penguin":6,"firstquartermoon":6,"axe2":4,"speechballoon":4,"dango":5,"starstruck":5,"loudspeaker":5,"mailbox":5,"radioactive":5,"frog":6,"lastquartermoon":6,"purse":5,"eye":5,"fountainpen":5,"cancer":5,"ladybug":6,"grapes":6,"radio":6,"saxophone":6,"deer":6,"ribbon":6,"hourglass2":4,"grinningface":5,"yinyang":5,"magnet":5,"tropicalfish":6,"potato":6,"carrot":6,"oldkey":6,"signaltower":6,"mobileoff":6,"mushroom":6,"hotdog":6,"briefs2":6,"ring":6,"nosmoking":6,"wheelchair":6,"sofa":6,"chick":6,"mortarboard":6,"shell":6,"wineglass":6,"dress":6,"toilet":6,"babybottle":6,"thermometer":6,"crystalball":6,"peacesymbol":6,"peacockfeather":6,"mountain":6,"snail":5,"icecream2":6,"winkingface":6,"microphone":6,"package":6,"artistpalette":6,"reciclesign":6,"cow3":6,"rainbow":6,"custard2":6,"americanfootball":6,"beermug":7,"duck":7,"rooster":7,"camera":7,"umbrella":7,"lightbulb":7,"passportcontrol":7,"shoppingbags":7,"ticket":6,"lollipop":7,"chestnut":7,"snowman":7,"poop":7,"badger":7,"satellite2":7,"crutch":7,"car":7,"hundred":7,"icecube":7,"clinkingglasses":7,"trophy":7,"squid":7,"shorts2":7,"bison":7,"guitar":7,"rocket":7,"placard":7,"wastebasket":8,"glowingstar":6,"iceskate":7,"hatchingchick":7,"banana":8,"pizza":8,"necktie":8,"ledger":8,"clipboard":8,"truck":8,"diamondstone":6,"stopwatch":6,"giftbox":7,"cloudsnow":7,"chocolate":8,"shark":8,"lion":8,"window":8,"umbrellaground":8,"oilDrum":8,"watch2":6,"bacon":8,"coffeecup":8,"mouse":8,"boar":8,"moviecamera":8,"scissors":8,"biohazard":8,"flashlight":8,"church":9,"sunbehindcloud":7,"shavedice":8,"butter":8,"balletshoes":8,"diyalamp":8,"pencil":8,"basketball":9,"monkey":9,"suv":9,"turtle":8,"tornado":8,"crayon":8,"cookie":9,"peanuts":9,"gamedie":9,"clownface":9,"hamster":9,"openmailbox":9,"balance2":9,"thunderstorm":8,"saucepan":9,"ricecracker":9,"fishingpole":9,"bear":9,"microscope":9,"filecabinet":9,"airplane":9,"shrimp":10,"nailpolish":10,"performingarts":8,"blowfish":8,"sunbehindsmallcloud":8,"backpack":8,"ricecall":9,"owl":9,"vibrationmode":9,"shower":9,"leftluggage":9,"brick2":9,"fuelpump":10,"bicycle":10,"scroll":10,"telescope":10,"cricket":10,"bee":10,"bowling":10,"militarymedal":11,"shallowpanfood":11,"icecream":11,"house":10,"constructionsign":10,"newspaper":10,"stars2":10,"eyeglasses2":10,"fullmoon":10,"scorpion":11,"videogame":11,"dog":11,"candy":11,"articulatedlorry":10,"cardindex":10,"sun":10,"ambulance":11,"herb":11,"beetle":11,"kite":11,"panda":12,"strawberry":12,"divingmask":13,"framedpicture":10,"fireengine":11,"oncomingautomobile":11,"bookmarktabs":11,"busstop":12,"leaf":12,"cake":12,"slotmachine":13,"checkeredflag":13,"cat":14,"cow":10,"clapperboard":11,"sunbehindrain":11,"bus":12,"footprints":12,"crown":12,"frenchfries":12,"palmtree":13,"monorail":14,"pennant":14,"helmet":11,"toolbox":13,"policecar":14,"aerialtram":14,"joker":14,"donut":14,"hamburger":14,"cactus":15,"tiger":15,"tree":16,"books":12,"printer":13,"womanshat":13,"helicopter":14,"suspensionrailway2":15,"ship":15,"confettiball":15,"sparkler":16,"pineapple":17,"caterpillar":18,"taxi":10,"safetyvest":13,"onbus":16,"trolleybus2":16,"partypopper":16,"yarn":16,"turkey":16,"butterfly":19,"lobster":20,"pretzel":20,"globe2":13,"hospital":16,"lantern":16,"socks":16,"motorcycle":18,"fireworks":18,"flower":21,"robot":22,"cupcake":29,"peacock":35,"atomsymbol":10,"razor":10,"moonface":12,"raccoon":15,"bandage":16,"hotel":21,"train":25,"crab":25,"soccerball":25,"popcorn2":29,"toriigate":6,"curlingstone":4,"yoyo":7,"fly":9,"cockroach":10,"spiderweb":11,"microbe":32,"worm":40,"lotus":13,"rosette":17};

// 2026-08-15: 챌린지모드 쉬움/보통/어려움 300개 (유아용 100개와 안 겹침). 레벨 안에서는
// 카테고리가 최대한 안 겹치게 배치.
const CHALLENGE_TIER_TEMPLATES = [
  // ---- easy level 1 ----
  { id: "avocado", name: "Avocado", emoji: "🥑", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "bellpepper", name: "Bell Pepper", emoji: "🫑", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "alien", name: "Alien", emoji: "👽", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "skull", name: "Skull", emoji: "💀", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "barchart", name: "Bar Chart", emoji: "📊", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "paintbrush2", name: "Paintbrush", emoji: "🖌️", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "moneybag", name: "Money Bag", emoji: "💰", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "megaphone", name: "Megaphone", emoji: "📣", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "bookmark", name: "Bookmark", emoji: "🔖", renderMode: "emoji", challengeTier: "easy", challengeLevel: 1 },
  { id: "ram", name: "Ram", emoji: "🐏", challengeTier: "easy", challengeLevel: 1, renderMode: "emoji" },
  // ---- easy level 2 ----
  { id: "chopsticks", name: "Chopsticks", emoji: "🥢", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "punch", name: "Oncoming Fist", emoji: "👊", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "mahjong", name: "Mahjong Tile", emoji: "🀄", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "fish", name: "Fish", emoji: "🐟", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "headphone", name: "Headphone", emoji: "🎧", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "laptop", name: "Laptop", emoji: "💻", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "joystick", name: "Joystick", emoji: "🕹️", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "admissiontickets", name: "Admission Tickets", emoji: "🎟️", challengeTier: "easy", challengeLevel: 2, renderMode: "emoji" },
  { id: "rabbit", name: "Rabbit", emoji: "🐰", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  { id: "toriigate", name: "Torii Gate", emoji: "⛩️", renderMode: "emoji", challengeTier: "easy", challengeLevel: 2 },
  // ---- easy level 3 ----
  { id: "babysymbol", name: "Baby Symbol", emoji: "🚼", renderMode: "emoji", challengeTier: "easy", challengeLevel: 3 },
  { id: "revolvinghearts", name: "Revolving Hearts", emoji: "💞", renderMode: "emoji", challengeTier: "easy", challengeLevel: 3 },
  { id: "cherry", name: "Cherries", emoji: "🍒", renderMode: "emoji", challengeTier: "easy", challengeLevel: 3 },
  { id: "thumbsup", name: "Thumbs Up", emoji: "👍", challengeTier: "easy", challengeLevel: 3, renderMode: "emoji" },
  { id: "thumbsdown", name: "Thumbs Down", emoji: "👎", challengeTier: "easy", challengeLevel: 3, renderMode: "emoji" },
  { id: "musicalkeyboard", name: "Musical Keyboard", emoji: "🎹", challengeTier: "easy", challengeLevel: 3, renderMode: "emoji" },
  { id: "closedmailbox", name: "Closed Mailbox", emoji: "📪", challengeTier: "easy", challengeLevel: 3, renderMode: "emoji" },
  { id: "doorobj", name: "Door", emoji: "🚪", challengeTier: "easy", challengeLevel: 3, renderMode: "emoji" },
  { id: "pig", name: "Pig", emoji: "🐷", renderMode: "emoji", challengeTier: "easy", challengeLevel: 3 },
  { id: "jackolantern", name: "Jack-O-Lantern", emoji: "🎃", renderMode: "emoji", challengeTier: "easy", challengeLevel: 3 },
  // ---- easy level 4 ----
  { id: "nobell", name: "Bell with Slash", emoji: "🔕", renderMode: "emoji", challengeTier: "easy", challengeLevel: 4 },
  { id: "octopus", name: "Octopus", emoji: "🐙", renderMode: "emoji", challengeTier: "easy", challengeLevel: 4 },
  { id: "glassofmilk", name: "Glass of Milk", emoji: "🥛", challengeTier: "easy", challengeLevel: 4, renderMode: "emoji" },
  { id: "oden", name: "Oden", emoji: "🍢", challengeTier: "easy", challengeLevel: 4, renderMode: "emoji" },
  { id: "lipstick", name: "Lipstick", emoji: "💄", challengeTier: "easy", challengeLevel: 4, renderMode: "emoji" },
  { id: "envelope", name: "Envelope", emoji: "✉️", renderMode: "emoji", challengeTier: "easy", challengeLevel: 4 },
  { id: "computermouse", name: "Computer Mouse", emoji: "🖱️", challengeTier: "easy", challengeLevel: 4, renderMode: "emoji" },
  { id: "trumpet", name: "Trumpet", emoji: "🎺", challengeTier: "easy", challengeLevel: 4, renderMode: "emoji" },
  { id: "penguin", name: "Penguin", emoji: "🐧", renderMode: "emoji", challengeTier: "easy", challengeLevel: 4 },
  { id: "firstquartermoon", name: "First Quarter Moon", emoji: "🌓", renderMode: "emoji", challengeTier: "easy", challengeLevel: 4 },
  // ---- easy level 5 ----
  { id: "axe2", name: "Axe", emoji: "🪓", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "speechballoon", name: "Speech Balloon", emoji: "💬", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "dango", name: "Dango", emoji: "🍡", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "starstruck", name: "Star-Struck", emoji: "🤩", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "loudspeaker", name: "Loudspeaker", emoji: "📢", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "mailbox", name: "Mailbox", emoji: "📫", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "radioactive", name: "Radioactive", emoji: "☢️", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "frog", name: "Frog", emoji: "🐸", renderMode: "emoji", challengeTier: "easy", challengeLevel: 5 },
  { id: "lastquartermoon", name: "Last Quarter Moon", emoji: "🌗", challengeTier: "easy", challengeLevel: 5, renderMode: "emoji" },
  { id: "curlingstone", name: "Curling Stone", emoji: "🥌", renderMode: "emoji", challengeTier: "easy", challengeLevel: 5 },
  // ---- easy level 6 ----
  { id: "purse", name: "Purse", emoji: "👛", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  { id: "eye", name: "Eye", emoji: "👁️", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  { id: "fountainpen", name: "Fountain Pen", emoji: "🖋️", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  { id: "cancer", name: "Cancer", emoji: "♋", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  { id: "ladybug", name: "Ladybug", emoji: "🐞", renderMode: "emoji", challengeTier: "easy", challengeLevel: 6 },
  { id: "grapes", name: "Grapes", emoji: "🍇", renderMode: "emoji", challengeTier: "easy", challengeLevel: 6 },
  { id: "radio", name: "Radio", emoji: "📻", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  { id: "saxophone", name: "Saxophone", emoji: "🎷", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  { id: "deer", name: "Deer", emoji: "🦌", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  { id: "ribbon", name: "Ribbon", emoji: "🎀", challengeTier: "easy", challengeLevel: 6, renderMode: "emoji" },
  // ---- easy level 7 ----
  { id: "hourglass2", name: "Hourglass", emoji: "⌛", renderMode: "emoji", challengeTier: "easy", challengeLevel: 7 },
  { id: "grinningface", name: "Grinning Face", emoji: "😀", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "yinyang", name: "Yin Yang", emoji: "☯️", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "magnet", name: "Magnet", emoji: "🧲", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "tropicalfish", name: "Tropical Fish", emoji: "🐠", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "potato", name: "Potato", emoji: "🥔", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "carrot", name: "Carrot", emoji: "🥕", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "oldkey", name: "Old Key", emoji: "🗝️", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "signaltower", name: "Cell Signal", emoji: "📶", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  { id: "mobileoff", name: "Mobile Phone Off", emoji: "📴", challengeTier: "easy", challengeLevel: 7, renderMode: "emoji" },
  // ---- easy level 8 ----
  { id: "mushroom", name: "Mushroom", emoji: "🍄", renderMode: "emoji", challengeTier: "easy", challengeLevel: 8 },
  { id: "hotdog", name: "Hot Dog", emoji: "🌭", challengeTier: "easy", challengeLevel: 8, renderMode: "emoji" },
  { id: "briefs2", name: "Briefs", emoji: "🩲", renderMode: "emoji", challengeTier: "easy", challengeLevel: 8 },
  { id: "ring", name: "Ring", emoji: "💍", challengeTier: "easy", challengeLevel: 8, renderMode: "emoji" },
  { id: "nosmoking", name: "No Smoking", emoji: "🚭", challengeTier: "easy", challengeLevel: 8, renderMode: "emoji" },
  { id: "wheelchair", name: "Wheelchair Symbol", emoji: "♿", challengeTier: "easy", challengeLevel: 8, renderMode: "emoji" },
  { id: "sofa", name: "Couch and Lamp", emoji: "🛋️", challengeTier: "easy", challengeLevel: 8, renderMode: "emoji" },
  { id: "chick", name: "Baby Chick", emoji: "🐤", challengeTier: "easy", challengeLevel: 8, renderMode: "emoji" },
  { id: "mortarboard", name: "Graduation Cap", emoji: "🎓", challengeTier: "easy", challengeLevel: 8, renderMode: "emoji" },
  // ---- easy level 9 ----
  { id: "shell", name: "Spiral Shell", emoji: "🐚", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "wineglass", name: "Wine Glass", emoji: "🍷", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "dress", name: "Dress", emoji: "👗", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "toilet", name: "Toilet", emoji: "🚽", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "babybottle", name: "Baby Bottle", emoji: "🍼", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "thermometer", name: "Thermometer", emoji: "🌡️", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "crystalball", name: "Crystal Ball", emoji: "🔮", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "peacesymbol", name: "Peace Symbol", emoji: "☮️", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "peacockfeather", name: "Feather", emoji: "🪶", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  { id: "mountain", name: "Mountain", emoji: "⛰️", challengeTier: "easy", challengeLevel: 9, renderMode: "emoji" },
  // ---- easy level 10 ----
  { id: "snail", name: "Snail", emoji: "🐌", renderMode: "emoji", challengeTier: "easy", challengeLevel: 10 },
  { id: "icecream2", name: "Ice Cream", emoji: "🍨", challengeTier: "easy", challengeLevel: 10, renderMode: "emoji" },
  { id: "winkingface", name: "Winking Face", emoji: "😉", challengeTier: "easy", challengeLevel: 10, renderMode: "emoji" },
  { id: "microphone", name: "Microphone", emoji: "🎤", challengeTier: "easy", challengeLevel: 10, renderMode: "emoji" },
  { id: "package", name: "Package", emoji: "📦", challengeTier: "easy", challengeLevel: 10, renderMode: "emoji" },
  { id: "artistpalette", name: "Artist Palette", emoji: "🎨", challengeTier: "easy", challengeLevel: 10, renderMode: "emoji" },
  { id: "reciclesign", name: "Recycling Symbol", emoji: "♻️", challengeTier: "easy", challengeLevel: 10, renderMode: "emoji" },
  { id: "cow3", name: "Cow", emoji: "🐄", challengeTier: "easy", challengeLevel: 10, renderMode: "emoji" },
  { id: "rainbow", name: "Rainbow", emoji: "🌈", renderMode: "emoji", challengeTier: "easy", challengeLevel: 10 },
  { id: "yoyo", name: "Yo-Yo", emoji: "🪀", renderMode: "emoji", challengeTier: "easy", challengeLevel: 10 },
  // ---- normal level 1 ----
  { id: "custard2", name: "Custard", emoji: "🍮", challengeTier: "normal", challengeLevel: 1, renderMode: "emoji" },
  { id: "americanfootball", name: "American Football", emoji: "🏈", challengeTier: "normal", challengeLevel: 1, renderMode: "emoji" },
  { id: "beermug", name: "Beer Mug", emoji: "🍺", challengeTier: "normal", challengeLevel: 1, renderMode: "emoji" },
  { id: "duck", name: "Duck", emoji: "🦆", renderMode: "emoji", challengeTier: "normal", challengeLevel: 1 },
  { id: "rooster", name: "Rooster", emoji: "🐓", renderMode: "emoji", challengeTier: "normal", challengeLevel: 1 },
  { id: "camera", name: "Camera", emoji: "📷", challengeTier: "normal", challengeLevel: 1, renderMode: "emoji" },
  { id: "umbrella", name: "Umbrella", emoji: "☂️", renderMode: "emoji", keepThinParts: true, challengeTier: "normal", challengeLevel: 1 },
  { id: "lightbulb", name: "Light Bulb", emoji: "💡", challengeTier: "normal", challengeLevel: 1, renderMode: "emoji" },
  { id: "passportcontrol", name: "Passport Control", emoji: "🛂", challengeTier: "normal", challengeLevel: 1, renderMode: "emoji" },
  { id: "shoppingbags", name: "Shopping Bags", emoji: "🛍️", challengeTier: "normal", challengeLevel: 1, renderMode: "emoji" },
  // ---- normal level 2 ----
  { id: "ticket", name: "Ticket", emoji: "🎫", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  { id: "lollipop", name: "Lollipop", emoji: "🍭", renderMode: "emoji", challengeTier: "normal", challengeLevel: 2 },
  { id: "chestnut", name: "Chestnut", emoji: "🌰", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  { id: "snowman", name: "Snowman", emoji: "⛄", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  { id: "poop", name: "Pile of Poo", emoji: "💩", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  { id: "badger", name: "Badger", emoji: "🦡", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  { id: "satellite2", name: "Satellite Antenna", emoji: "📡", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  { id: "crutch", name: "Crutch", emoji: "🩼", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  { id: "car", name: "Car", emoji: "🚗", renderMode: "emoji", challengeTier: "normal", challengeLevel: 2 },
  { id: "hundred", name: "100", emoji: "💯", challengeTier: "normal", challengeLevel: 2, renderMode: "emoji" },
  // ---- normal level 3 ----
  { id: "icecube", name: "Ice", emoji: "🧊", challengeTier: "normal", challengeLevel: 3, renderMode: "emoji" },
  { id: "clinkingglasses", name: "Clinking Glasses", emoji: "🥂", challengeTier: "normal", challengeLevel: 3, renderMode: "emoji" },
  { id: "trophy", name: "Trophy", emoji: "🏆", challengeTier: "normal", challengeLevel: 3, renderMode: "emoji" },
  { id: "squid", name: "Squid", emoji: "🦑", renderMode: "emoji", challengeTier: "normal", challengeLevel: 3 },
  { id: "shorts2", name: "Shorts", emoji: "🩳", challengeTier: "normal", challengeLevel: 3, renderMode: "emoji" },
  { id: "bison", name: "Bison", emoji: "🦬", challengeTier: "normal", challengeLevel: 3, renderMode: "emoji" },
  { id: "guitar", name: "Guitar", emoji: "🎸", renderMode: "emoji", challengeTier: "normal", challengeLevel: 3 },
  { id: "rocket", name: "Rocket", emoji: "🚀", renderMode: "emoji", challengeTier: "normal", challengeLevel: 3 },
  { id: "placard", name: "Placard", emoji: "🪧", challengeTier: "normal", challengeLevel: 3, renderMode: "emoji" },
  { id: "wastebasket", name: "Wastebasket", emoji: "🗑️", challengeTier: "normal", challengeLevel: 3, renderMode: "emoji" },
  // ---- normal level 4 ----
  { id: "glowingstar", name: "Glowing Star", emoji: "🌟", challengeTier: "normal", challengeLevel: 4, renderMode: "emoji" },
  { id: "iceskate", name: "Ice Skate", emoji: "⛸️", challengeTier: "normal", challengeLevel: 4, renderMode: "emoji" },
  { id: "hatchingchick", name: "Hatching Chick", emoji: "🐣", challengeTier: "normal", challengeLevel: 4, renderMode: "emoji" },
  { id: "banana", name: "Banana", emoji: "🍌", renderMode: "emoji", challengeTier: "normal", challengeLevel: 4 },
  { id: "pizza", name: "Pizza", emoji: "🍕", renderMode: "emoji", challengeTier: "normal", challengeLevel: 4 },
  { id: "necktie", name: "Necktie", emoji: "👔", renderMode: "emoji", challengeTier: "normal", challengeLevel: 4 },
  { id: "ledger", name: "Ledger", emoji: "📒", challengeTier: "normal", challengeLevel: 4, renderMode: "emoji" },
  { id: "clipboard", name: "Clipboard", emoji: "📋", challengeTier: "normal", challengeLevel: 4, renderMode: "emoji" },
  { id: "truck", name: "Truck", emoji: "🚚", renderMode: "emoji", challengeTier: "normal", challengeLevel: 4 },
  // ---- normal level 5 ----
  { id: "diamondstone", name: "Gem Stone", emoji: "💎", challengeTier: "normal", challengeLevel: 5, renderMode: "emoji" },
  { id: "stopwatch", name: "Stopwatch", emoji: "⏱️", challengeTier: "normal", challengeLevel: 5, renderMode: "emoji" },
  { id: "giftbox", name: "Gift Box", emoji: "🎁", renderMode: "emoji", challengeTier: "normal", challengeLevel: 5 },
  { id: "cloudsnow", name: "Cloud with Snow", emoji: "🌨️", challengeTier: "normal", challengeLevel: 5, renderMode: "emoji" },
  { id: "chocolate", name: "Chocolate", emoji: "🍫", renderMode: "emoji", challengeTier: "normal", challengeLevel: 5 },
  { id: "shark", name: "Shark", emoji: "🦈", renderMode: "emoji", challengeTier: "normal", challengeLevel: 5 },
  { id: "lion", name: "Lion", emoji: "🦁", renderMode: "emoji", challengeTier: "normal", challengeLevel: 5 },
  { id: "window", name: "Window", emoji: "🪟", challengeTier: "normal", challengeLevel: 5, renderMode: "emoji" },
  { id: "umbrellaground", name: "Umbrella on Ground", emoji: "⛱️", challengeTier: "normal", challengeLevel: 5, renderMode: "emoji" },
  { id: "oilDrum", name: "Oil Drum", emoji: "🛢️", challengeTier: "normal", challengeLevel: 5, renderMode: "emoji" },
  // ---- normal level 6 ----
  { id: "watch2", name: "Watch", emoji: "⌚", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "bacon", name: "Bacon", emoji: "🥓", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "coffeecup", name: "Coffee", emoji: "☕", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "mouse", name: "Mouse", emoji: "🐭", renderMode: "emoji", challengeTier: "normal", challengeLevel: 6 },
  { id: "boar", name: "Boar", emoji: "🐗", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "moviecamera", name: "Movie Camera", emoji: "🎥", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "scissors", name: "Scissors", emoji: "✂️", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "biohazard", name: "Biohazard", emoji: "☣️", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "flashlight", name: "Flashlight", emoji: "🔦", challengeTier: "normal", challengeLevel: 6, renderMode: "emoji" },
  { id: "church", name: "Church", emoji: "⛪", renderMode: "emoji", challengeTier: "normal", challengeLevel: 6 },
  // ---- normal level 7 ----
  { id: "sunbehindcloud", name: "Sun Behind Cloud", emoji: "⛅", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "shavedice", name: "Shaved Ice", emoji: "🍧", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "butter", name: "Butter", emoji: "🧈", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "balletshoes", name: "Ballet Shoes", emoji: "🩰", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "diyalamp", name: "Diya Lamp", emoji: "🪔", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "pencil", name: "Pencil", emoji: "✏️", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "basketball", name: "Basketball", emoji: "🏀", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "monkey", name: "Monkey", emoji: "🐵", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  { id: "suv", name: "SUV", emoji: "🚙", challengeTier: "normal", challengeLevel: 7, renderMode: "emoji" },
  // ---- normal level 8 ----
  { id: "turtle", name: "Turtle", emoji: "🐢", renderMode: "emoji", faceLeft: true, challengeTier: "normal", challengeLevel: 8 },
  { id: "tornado", name: "Tornado", emoji: "🌪️", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "crayon", name: "Crayon", emoji: "🖍️", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "cookie", name: "Cookie", emoji: "🍪", renderMode: "emoji", challengeTier: "normal", challengeLevel: 8 },
  { id: "peanuts", name: "Peanuts", emoji: "🥜", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "gamedie", name: "Game Die", emoji: "🎲", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "clownface", name: "Clown Face", emoji: "🤡", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "hamster", name: "Hamster", emoji: "🐹", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "openmailbox", name: "Open Mailbox", emoji: "📬", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "balance2", name: "Balance Scale", emoji: "⚖️", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  { id: "fly", name: "Fly", emoji: "🪰", challengeTier: "normal", challengeLevel: 8, renderMode: "emoji" },
  // ---- normal level 9 ----
  { id: "thunderstorm", name: "Thunder Cloud", emoji: "⛈️", challengeTier: "normal", challengeLevel: 9, renderMode: "emoji" },
  { id: "saucepan", name: "Pot of Food", emoji: "🍲", challengeTier: "normal", challengeLevel: 9, renderMode: "emoji" },
  { id: "ricecracker", name: "Rice Cracker", emoji: "🍘", challengeTier: "normal", challengeLevel: 9, renderMode: "emoji" },
  { id: "fishingpole", name: "Fishing Pole", emoji: "🎣", challengeTier: "normal", challengeLevel: 9, renderMode: "emoji" },
  { id: "bear", name: "Bear", emoji: "🐻", renderMode: "emoji", challengeTier: "normal", challengeLevel: 9 },
  { id: "microscope", name: "Microscope", emoji: "🔬", challengeTier: "normal", challengeLevel: 9, renderMode: "emoji" },
  { id: "filecabinet", name: "File Cabinet", emoji: "🗄️", challengeTier: "normal", challengeLevel: 9, renderMode: "emoji" },
  { id: "airplane", name: "Airplane", emoji: "✈️", renderMode: "emoji", challengeTier: "normal", challengeLevel: 9 },
  { id: "shrimp", name: "Shrimp", emoji: "🦐", renderMode: "emoji", challengeTier: "normal", challengeLevel: 9 },
  { id: "nailpolish", name: "Nail Polish", emoji: "💅", challengeTier: "normal", challengeLevel: 9, renderMode: "emoji" },
  // ---- normal level 10 ----
  { id: "performingarts", name: "Performing Arts", emoji: "🎭", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "blowfish", name: "Blowfish", emoji: "🐡", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "sunbehindsmallcloud", name: "Sun Behind Small Cloud", emoji: "🌤️", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "backpack", name: "Backpack", emoji: "🎒", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "ricecall", name: "Rice Ball", emoji: "🍙", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "owl", name: "Owl", emoji: "🦉", renderMode: "emoji", challengeTier: "normal", challengeLevel: 10 },
  { id: "vibrationmode", name: "Vibration Mode", emoji: "📳", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "shower", name: "Shower", emoji: "🚿", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "leftluggage", name: "Left Luggage", emoji: "🛅", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  { id: "brick2", name: "Brick", emoji: "🧱", challengeTier: "normal", challengeLevel: 10, renderMode: "emoji" },
  // ---- hard level 1 ----
  { id: "fuelpump", name: "Fuel Pump", emoji: "⛽", challengeTier: "hard", challengeLevel: 1, renderMode: "emoji" },
  { id: "bicycle", name: "Bicycle", emoji: "🚲", renderMode: "emoji", faceLeft: true, challengeTier: "hard", challengeLevel: 1 },
  { id: "scroll", name: "Scroll", emoji: "📜", challengeTier: "hard", challengeLevel: 1, renderMode: "emoji" },
  { id: "telescope", name: "Telescope", emoji: "🔭", challengeTier: "hard", challengeLevel: 1, renderMode: "emoji" },
  { id: "cricket", name: "Cricket", emoji: "🦗", renderMode: "emoji", faceLeft: true, challengeTier: "hard", challengeLevel: 1 },
  { id: "bee", name: "Bee", emoji: "🐝", renderMode: "emoji", challengeTier: "hard", challengeLevel: 1 },
  { id: "bowling", name: "Bowling", emoji: "🎳", challengeTier: "hard", challengeLevel: 1, renderMode: "emoji" },
  { id: "militarymedal", name: "Military Medal", emoji: "🎖️", challengeTier: "hard", challengeLevel: 1, renderMode: "emoji" },
  { id: "shallowpanfood", name: "Paella", emoji: "🥘", challengeTier: "hard", challengeLevel: 1, renderMode: "emoji" },
  { id: "icecream", name: "Ice Cream", emoji: "🍦", renderMode: "emoji", challengeTier: "hard", challengeLevel: 1 },
  { id: "cockroach", name: "Cockroach", emoji: "🪳", renderMode: "emoji", challengeTier: "hard", challengeLevel: 1 },
  // ---- hard level 2 ----
  { id: "house", name: "House", emoji: "🏠", renderMode: "emoji", challengeTier: "hard", challengeLevel: 2 },
  { id: "constructionsign", name: "Construction", emoji: "🚧", challengeTier: "hard", challengeLevel: 2, renderMode: "emoji" },
  { id: "newspaper", name: "Newspaper", emoji: "📰", challengeTier: "hard", challengeLevel: 2, renderMode: "emoji" },
  { id: "stars2", name: "Sparkle", emoji: "❇️", challengeTier: "hard", challengeLevel: 2, renderMode: "emoji" },
  { id: "eyeglasses2", name: "Monocle", emoji: "🧐", challengeTier: "hard", challengeLevel: 2, renderMode: "emoji" },
  { id: "fullmoon", name: "Full Moon", emoji: "🌕", challengeTier: "hard", challengeLevel: 2, renderMode: "emoji" },
  { id: "scorpion", name: "Scorpion", emoji: "🦂", renderMode: "emoji", faceLeft: true, challengeTier: "hard", challengeLevel: 2 },
  { id: "videogame", name: "Video Game", emoji: "🎮", challengeTier: "hard", challengeLevel: 2, renderMode: "emoji" },
  { id: "dog", name: "Dog", emoji: "🐶", renderMode: "emoji", challengeTier: "hard", challengeLevel: 2 },
  { id: "candy", name: "Candy", emoji: "🍬", renderMode: "emoji", challengeTier: "hard", challengeLevel: 2 },
  // ---- hard level 3 ----
  { id: "articulatedlorry", name: "Articulated Lorry", emoji: "🚛", challengeTier: "hard", challengeLevel: 3, renderMode: "emoji" },
  { id: "cardindex", name: "Card Index", emoji: "📇", challengeTier: "hard", challengeLevel: 3, renderMode: "emoji" },
  { id: "sun", name: "Sun", emoji: "☀️", renderMode: "emoji", overlaySvg: "<circle cx=\"200\" cy=\"200\" r=\"78\"/>", challengeTier: "hard", challengeLevel: 3 },
  { id: "ambulance", name: "Ambulance", emoji: "🚑", challengeTier: "hard", challengeLevel: 3, renderMode: "emoji" },
  { id: "herb", name: "Herb", emoji: "🌿", challengeTier: "hard", challengeLevel: 3, renderMode: "emoji" },
  { id: "beetle", name: "Beetle", emoji: "🪲", challengeTier: "hard", challengeLevel: 3, renderMode: "emoji" },
  { id: "kite", name: "Kite", emoji: "🪁", renderMode: "emoji", challengeTier: "hard", challengeLevel: 3 },
  { id: "panda", name: "Panda", emoji: "🐼", challengeTier: "hard", challengeLevel: 3, renderMode: "emoji" },
  { id: "strawberry", name: "Strawberry", emoji: "🍓", renderMode: "emoji", challengeTier: "hard", challengeLevel: 3 },
  { id: "divingmask", name: "Diving Mask", emoji: "🤿", challengeTier: "hard", challengeLevel: 3, renderMode: "emoji" },
  { id: "spiderweb", name: "Spider Web", emoji: "🕸️", renderMode: "emoji", challengeTier: "hard", challengeLevel: 3 },
  // ---- hard level 4 ----
  { id: "framedpicture", name: "Framed Picture", emoji: "🖼️", challengeTier: "hard", challengeLevel: 4, renderMode: "emoji" },
  { id: "fireengine", name: "Fire Engine", emoji: "🚒", challengeTier: "hard", challengeLevel: 4, renderMode: "emoji" },
  { id: "oncomingautomobile", name: "Oncoming Automobile", emoji: "🚘", challengeTier: "hard", challengeLevel: 4, renderMode: "emoji" },
  { id: "bookmarktabs", name: "Bookmark Tabs", emoji: "📑", challengeTier: "hard", challengeLevel: 4, renderMode: "emoji" },
  { id: "busstop", name: "Bus Stop", emoji: "🚏", challengeTier: "hard", challengeLevel: 4, renderMode: "emoji" },
  { id: "leaf", name: "Leaf", emoji: "🍃", renderMode: "emoji", challengeTier: "hard", challengeLevel: 4 },
  { id: "cake", name: "Cake", emoji: "🎂", renderMode: "emoji", challengeTier: "hard", challengeLevel: 4 },
  { id: "slotmachine", name: "Slot Machine", emoji: "🎰", challengeTier: "hard", challengeLevel: 4, renderMode: "emoji" },
  { id: "checkeredflag", name: "Checkered Flag", emoji: "🏁", challengeTier: "hard", challengeLevel: 4, renderMode: "emoji" },
  { id: "cat", name: "Cat", emoji: "🐱", renderMode: "emoji", challengeTier: "hard", challengeLevel: 4 },
  // ---- hard level 5 ----
  { id: "cow", name: "Cow", emoji: "🐮", challengeTier: "hard", challengeLevel: 5, renderMode: "emoji" },
  { id: "clapperboard", name: "Clapper Board", emoji: "🎬", challengeTier: "hard", challengeLevel: 5, renderMode: "emoji" },
  { id: "sunbehindrain", name: "Sun Behind Rain Cloud", emoji: "🌦️", challengeTier: "hard", challengeLevel: 5, renderMode: "emoji" },
  { id: "bus", name: "Bus", emoji: "🚌", renderMode: "emoji", faceLeft: true, challengeTier: "hard", challengeLevel: 5 },
  { id: "footprints", name: "Footprints", emoji: "👣", challengeTier: "hard", challengeLevel: 5, renderMode: "emoji" },
  { id: "crown", name: "Crown", emoji: "👑", renderMode: "emoji", challengeTier: "hard", challengeLevel: 5 },
  { id: "frenchfries", name: "French Fries", emoji: "🍟", challengeTier: "hard", challengeLevel: 5, renderMode: "emoji" },
  { id: "palmtree", name: "Palm Tree", emoji: "🌴", renderMode: "emoji", challengeTier: "hard", challengeLevel: 5 },
  { id: "monorail", name: "Monorail", emoji: "🚝", renderMode: "emoji", challengeTier: "hard", challengeLevel: 5 },
  { id: "pennant", name: "Pennant", emoji: "🎏", challengeTier: "hard", challengeLevel: 5, renderMode: "emoji" },
  // ---- hard level 6 ----
  { id: "helmet", name: "Helmet", emoji: "⛑️", challengeTier: "hard", challengeLevel: 6, renderMode: "emoji" },
  { id: "toolbox", name: "Toolbox", emoji: "🧰", challengeTier: "hard", challengeLevel: 6, renderMode: "emoji" },
  { id: "policecar", name: "Police Car", emoji: "🚓", challengeTier: "hard", challengeLevel: 6, renderMode: "emoji" },
  { id: "aerialtram", name: "Aerial Tramway", emoji: "🚡", challengeTier: "hard", challengeLevel: 6, renderMode: "emoji" },
  { id: "joker", name: "Joker", emoji: "🃏", challengeTier: "hard", challengeLevel: 6, renderMode: "emoji" },
  { id: "donut", name: "Donut", emoji: "🍩", renderMode: "emoji", challengeTier: "hard", challengeLevel: 6 },
  { id: "hamburger", name: "Hamburger", emoji: "🍔", challengeTier: "hard", challengeLevel: 6, renderMode: "emoji" },
  { id: "cactus", name: "Cactus", emoji: "🌵", renderMode: "emoji", challengeTier: "hard", challengeLevel: 6 },
  { id: "tiger", name: "Tiger", emoji: "🐯", renderMode: "emoji", challengeTier: "hard", challengeLevel: 6 },
  { id: "tree", name: "Tree", emoji: "🌳", renderMode: "emoji", challengeTier: "hard", challengeLevel: 6 },
  { id: "lotus", name: "Lotus", emoji: "🪷", renderMode: "emoji", challengeTier: "hard", challengeLevel: 6 },
  // ---- hard level 7 ----
  { id: "books", name: "Books", emoji: "📚", challengeTier: "hard", challengeLevel: 7, renderMode: "emoji" },
  { id: "printer", name: "Printer", emoji: "🖨️", challengeTier: "hard", challengeLevel: 7, renderMode: "emoji" },
  { id: "womanshat", name: "Woman's Hat", emoji: "👒", challengeTier: "hard", challengeLevel: 7, renderMode: "emoji" },
  { id: "helicopter", name: "Helicopter", emoji: "🚁", renderMode: "emoji", challengeTier: "hard", challengeLevel: 7 },
  { id: "suspensionrailway2", name: "Suspension Railway", emoji: "🚟", renderMode: "emoji", challengeTier: "hard", challengeLevel: 7 },
  { id: "ship", name: "Ship", emoji: "🚢", challengeTier: "hard", challengeLevel: 7, renderMode: "emoji" },
  { id: "confettiball", name: "Confetti Ball", emoji: "🎊", challengeTier: "hard", challengeLevel: 7, renderMode: "emoji" },
  { id: "sparkler", name: "Sparkler", emoji: "🎇", challengeTier: "hard", challengeLevel: 7, renderMode: "emoji" },
  { id: "pineapple", name: "Pineapple", emoji: "🍍", renderMode: "emoji", challengeTier: "hard", challengeLevel: 7 },
  { id: "caterpillar", name: "Caterpillar", emoji: "🐛", renderMode: "emoji", challengeTier: "hard", challengeLevel: 7 },
  { id: "rosette", name: "Rosette", emoji: "🏵️", renderMode: "emoji", challengeTier: "hard", challengeLevel: 7 },
  // ---- hard level 8 ----
  { id: "taxi", name: "Taxi", emoji: "🚕", challengeTier: "hard", challengeLevel: 8, renderMode: "emoji" },
  { id: "safetyvest", name: "Safety Vest", emoji: "🦺", challengeTier: "hard", challengeLevel: 8, renderMode: "emoji" },
  { id: "onbus", name: "Oncoming Bus", emoji: "🚍", challengeTier: "hard", challengeLevel: 8, renderMode: "emoji" },
  { id: "trolleybus2", name: "Trolleybus", emoji: "🚎", challengeTier: "hard", challengeLevel: 8, renderMode: "emoji" },
  { id: "partypopper", name: "Party Popper", emoji: "🎉", challengeTier: "hard", challengeLevel: 8, renderMode: "emoji" },
  { id: "yarn", name: "Yarn", emoji: "🧶", challengeTier: "hard", challengeLevel: 8, renderMode: "emoji" },
  { id: "turkey", name: "Turkey", emoji: "🦃", renderMode: "emoji", challengeTier: "hard", challengeLevel: 8 },
  { id: "butterfly", name: "Butterfly", emoji: "🦋", renderMode: "emoji", challengeTier: "hard", challengeLevel: 8 },
  { id: "lobster", name: "Lobster", emoji: "🦞", renderMode: "emoji", challengeTier: "hard", challengeLevel: 8 },
  { id: "pretzel", name: "Pretzel", emoji: "🥨", renderMode: "emoji", challengeTier: "hard", challengeLevel: 8 },
  // ---- hard level 9 ----
  { id: "globe2", name: "Globe", emoji: "🌐", challengeTier: "hard", challengeLevel: 9, renderMode: "emoji" },
  { id: "hospital", name: "Hospital", emoji: "🏥", challengeTier: "hard", challengeLevel: 9, renderMode: "emoji" },
  { id: "lantern", name: "Red Paper Lantern", emoji: "🏮", challengeTier: "hard", challengeLevel: 9, renderMode: "emoji" },
  { id: "socks", name: "Socks", emoji: "🧦", challengeTier: "hard", challengeLevel: 9, renderMode: "emoji" },
  { id: "motorcycle", name: "Motorcycle", emoji: "🏍️", renderMode: "emoji", challengeTier: "hard", challengeLevel: 9 },
  { id: "fireworks", name: "Fireworks", emoji: "🎆", challengeTier: "hard", challengeLevel: 9, renderMode: "emoji" },
  { id: "flower", name: "Flower", emoji: "🌸", renderMode: "emoji", challengeTier: "hard", challengeLevel: 9 },
  { id: "robot", name: "Robot", emoji: "🤖", renderMode: "emoji", challengeTier: "hard", challengeLevel: 9 },
  { id: "cupcake", name: "Cupcake", emoji: "🧁", renderMode: "emoji", challengeTier: "hard", challengeLevel: 9 },
  { id: "peacock", name: "Peacock", emoji: "🦚", renderMode: "emoji", challengeTier: "hard", challengeLevel: 9 },
  { id: "microbe", name: "Microbe", emoji: "🦠", renderMode: "emoji", challengeTier: "hard", challengeLevel: 9 },
  // ---- hard level 10 ----
  { id: "atomsymbol", name: "Atom Symbol", emoji: "⚛️", challengeTier: "hard", challengeLevel: 10, renderMode: "emoji" },
  { id: "razor", name: "Razor", emoji: "🪒", challengeTier: "hard", challengeLevel: 10, renderMode: "emoji" },
  { id: "moonface", name: "Full Moon Face", emoji: "🌝", challengeTier: "hard", challengeLevel: 10, renderMode: "emoji" },
  { id: "raccoon", name: "Raccoon", emoji: "🦝", challengeTier: "hard", challengeLevel: 10, renderMode: "emoji" },
  { id: "bandage", name: "Bandage", emoji: "🩹", challengeTier: "hard", challengeLevel: 10, renderMode: "emoji" },
  { id: "hotel", name: "Hotel", emoji: "🏨", challengeTier: "hard", challengeLevel: 10, renderMode: "emoji" },
  { id: "train", name: "Train", emoji: "🚂", renderMode: "emoji", challengeTier: "hard", challengeLevel: 10 },
  { id: "crab", name: "Crab", emoji: "🦀", renderMode: "emoji", challengeTier: "hard", challengeLevel: 10 },
  { id: "soccerball", name: "Soccer Ball", emoji: "⚽", renderMode: "emoji", challengeTier: "hard", challengeLevel: 10 },
  { id: "popcorn2", name: "Popcorn", emoji: "🍿", challengeTier: "hard", challengeLevel: 10, renderMode: "emoji" },
  { id: "worm", name: "Worm", emoji: "🪱", renderMode: "emoji", challengeTier: "hard", challengeLevel: 10 },
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
