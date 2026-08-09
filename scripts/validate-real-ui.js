// __debugSimulatePerfect()는 내부 데이터를 직접 칠해서 "데이터가 일관적인지"만 확인한다.
// 이 스크립트는 실제 사용자처럼 팔레트 버튼을 클릭하고 캔버스를 탭해서
// 진짜 UI 흐름으로도 100점이 나오는지 검증한다.
const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.error('[pageerror]', err));
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(INDEX_URL, { waitUntil: 'load' });

  const ids = process.argv.slice(2).length
    ? process.argv.slice(2)
    : await page.evaluate(() => COLORING_TEMPLATES.map((t) => t.id));
  const results = [];
  let failCount = 0;

  for (const id of ids) {
    const info = await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), id);
    await page.evaluate(() => { document.getElementById('map-screen').hidden = true; });

    for (let i = 0; i < info.targetColors.length; i++) {
      const targetHex = info.targetColors[i];
      // 1) 목표색과 일치하는 팔레트 버튼을 실제로 클릭
      const clicked = await page.evaluate((hex) => {
        const btn = Array.from(document.querySelectorAll('.color-swatch')).find((b) => b.dataset.color === hex);
        if (!btn) return false;
        btn.click();
        return true;
      }, targetHex);
      if (!clicked) {
        console.log(id, 'region', i, 'target', targetHex, '-> 팔레트에서 버튼을 못 찾음(진짜 버그)');
        continue;
      }
      // 2) 해당 영역의 seed 픽셀 위치를 화면 좌표로 변환해서 진짜 pointerdown 이벤트를 직접 발생시킨다
      // (puppeteer의 page.mouse.click은 실제 기기의 pointerdown과 다르게 동작할 수 있어 우회)
      const seed = info.centroids ? info.centroids[i] : null;
      if (seed == null) continue;
      const check = await page.evaluate((seedIdx, expectedHex) => {
        const WORK_SIZE = 640;
        const x = seedIdx % WORK_SIZE, y = Math.floor(seedIdx / WORK_SIZE);
        const layer = document.getElementById('tap-layer');
        const rect = layer.getBoundingClientRect();
        const cx = rect.left + (x / WORK_SIZE) * rect.width;
        const cy = rect.top + (y / WORK_SIZE) * rect.height;
        const ev = new PointerEvent('pointerdown', { clientX: cx, clientY: cy, bubbles: true });
        layer.dispatchEvent(ev);
        const fillCanvas = document.getElementById('fill-canvas');
        const ctx = fillCanvas.getContext('2d');
        const d = ctx.getImageData(x, y, 1, 1).data;
        const gotHex = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        return { x, y, gotHex, expectedHex, alpha: d[3] };
      }, seed, targetHex);
      if (check.gotHex !== check.expectedHex) {
        console.log(id, 'region', i, 'FAIL: seed(', check.x, check.y, ') expected', check.expectedHex, 'got', check.gotHex, 'alpha', check.alpha);
      }
    }

    await page.click('#btn-save');
    await new Promise((r) => setTimeout(r, 150));
    const scoreText = await page.evaluate(() => {
      const el = document.querySelector('.b-score');
      return el ? el.textContent : null;
    });
    results.push({ id, scoreText });
    if (scoreText !== '100 points') {
      failCount++;
      console.log(id, '실제 UI 클릭으로 얻은 점수:', scoreText, '<-- FAIL');
    }
  }

  console.log('\n총', results.length, '개 중', failCount, '개 100점 미달');
  await browser.close();
})();
