const CACHE_NAME = 'coloring-app-v64';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './templates.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/fonts/Fredoka.ttf',
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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
