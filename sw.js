const CACHE_NAME = 'coloring-app-v72';
// 2026-08-11: cache.addAll()은 원자적이라 목록 중 하나라도 못 받아오면 설치 전체가 실패한다.
// boss-battle 배경음악(6.8MB, 다른 음악의 10배 이상 큼)이 이 목록에 있으면 네트워크가 조금만
// 불안정해도 그 파일 하나 때문에 서비스워커 설치 자체가 실패해서 앱 전체가 계속 낡은 캐시에
// 갇히는 문제가 있었다("보스 음악 안나옴" 제보로 발견) — 필수 셸만 원자적으로 캐싱하고,
// 나머지(도안 그림·음악 등 용량 큰 파일들)는 하나 실패해도 설치를 막지 않게 분리했다.
const CRITICAL_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './templates.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/fonts/Fredoka.ttf'
];
const EXTRA_ASSETS = [
  './audio/bgm-happy-adventure.mp3',
  './audio/bgm-boss-battle.mp3',
  './assets/emoji/airplane.svg',
  './assets/emoji/ant.svg',
  './assets/emoji/apple.svg',
  './assets/emoji/balloon.svg',
  './assets/emoji/banana.svg',
  './assets/emoji/bear.svg',
  './assets/emoji/bee.svg',
  './assets/emoji/bell.svg',
  './assets/emoji/bicycle.svg',
  './assets/emoji/bird.svg',
  './assets/emoji/boat.svg',
  './assets/emoji/boss-fairygirl.svg',
  './assets/emoji/boss-fairygirl-icon.svg',
  './assets/emoji/boss-herogirl.svg',
  './assets/emoji/boss-herogirl-icon.svg',
  './assets/emoji/boss-mermaidgirl.svg',
  './assets/emoji/boss-mermaidgirl-icon.svg',
  './assets/emoji/boss-witchgirl.svg',
  './assets/emoji/boss-witchgirl-icon.svg',
  './assets/emoji/bus.svg',
  './assets/emoji/butterfly.svg',
  './assets/emoji/cactus.svg',
  './assets/emoji/cake.svg',
  './assets/emoji/candy.svg',
  './assets/emoji/car.svg',
  './assets/emoji/cat.svg',
  './assets/emoji/caterpillar.svg',
  './assets/emoji/cherry.svg',
  './assets/emoji/chicken.svg',
  './assets/emoji/chocolate.svg',
  './assets/emoji/clock.svg',
  './assets/emoji/cloud.svg',
  './assets/emoji/cookie.svg',
  './assets/emoji/crab.svg',
  './assets/emoji/cricket.svg',
  './assets/emoji/crown.svg',
  './assets/emoji/cupcake.svg',
  './assets/emoji/dog.svg',
  './assets/emoji/dolphin.svg',
  './assets/emoji/donut.svg',
  './assets/emoji/drop.svg',
  './assets/emoji/duck.svg',
  './assets/emoji/egg.svg',
  './assets/emoji/elephant.svg',
  './assets/emoji/envelope.svg',
  './assets/emoji/fish.svg',
  './assets/emoji/flower.svg',
  './assets/emoji/fourleafclover.svg',
  './assets/emoji/frog.svg',
  './assets/emoji/giftbox.svg',
  './assets/emoji/grapes.svg',
  './assets/emoji/guitar.svg',
  './assets/emoji/heart.svg',
  './assets/emoji/helicopter.svg',
  './assets/emoji/house.svg',
  './assets/emoji/icecream.svg',
  './assets/emoji/kite.svg',
  './assets/emoji/ladybug.svg',
  './assets/emoji/leaf.svg',
  './assets/emoji/lemon.svg',
  './assets/emoji/lion.svg',
  './assets/emoji/lobster.svg',
  './assets/emoji/lollipop.svg',
  './assets/emoji/moon.svg',
  './assets/emoji/mosquito.svg',
  './assets/emoji/motorcycle.svg',
  './assets/emoji/mouse.svg',
  './assets/emoji/mushroom.svg',
  './assets/emoji/octopus.svg',
  './assets/emoji/orange.svg',
  './assets/emoji/owl.svg',
  './assets/emoji/palmtree.svg',
  './assets/emoji/peach.svg',
  './assets/emoji/peacock.svg',
  './assets/emoji/pear.svg',
  './assets/emoji/penguin.svg',
  './assets/emoji/pig.svg',
  './assets/emoji/pineapple.svg',
  './assets/emoji/pizza.svg',
  './assets/emoji/pretzel.svg',
  './assets/emoji/rabbit.svg',
  './assets/emoji/rainbow.svg',
  './assets/emoji/robot.svg',
  './assets/emoji/rocket.svg',
  './assets/emoji/rooster.svg',
  './assets/emoji/scorpion.svg',
  './assets/emoji/shark.svg',
  './assets/emoji/sheep.svg',
  './assets/emoji/shrimp.svg',
  './assets/emoji/snail.svg',
  './assets/emoji/soccerball.svg',
  './assets/emoji/spider.svg',
  './assets/emoji/squid.svg',
  './assets/emoji/star.svg',
  './assets/emoji/strawberry.svg',
  './assets/emoji/sun.svg',
  './assets/emoji/sunflower.svg',
  './assets/emoji/swan.svg',
  './assets/emoji/tiger.svg',
  './assets/emoji/train.svg',
  './assets/emoji/tree.svg',
  './assets/emoji/truck.svg',
  './assets/emoji/tulip.svg',
  './assets/emoji/turkey.svg',
  './assets/emoji/turtle.svg',
  './assets/emoji/umbrella.svg',
  './assets/emoji/watermelon.svg',
  './assets/emoji/whale.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CRITICAL_SHELL); // 필수 셸: 하나라도 실패하면 설치 재시도되게 그대로 원자적 유지
      // 나머지는 있으면 좋지만 없어도 fetch 핸들러가 그때그때 받아와서 캐싱해주므로,
      // 하나 실패해도(allSettled) 설치 전체를 막지 않는다.
      await Promise.allSettled(EXTRA_ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
