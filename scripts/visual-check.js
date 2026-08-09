// 개발용: 지정한 도안들의 목표(goal) 이미지를 스크린샷으로 떠서 눈으로 검수한다.
// 실행 전에 scripts/serve.js를 먼저 띄워둘 것(로컬 서버 필요 — file://은 canvas taint 때문에 실패함).
// 사용: node scripts/visual-check.js [id1 id2 ...]  (인자 없으면 기본 스팟체크 세트 사용)
const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || 'http://localhost:8843/index.html';
const DEFAULT_IDS = ['sun', 'apple', 'shark', 'cake', 'cactus', 'donut', 'tree', 'flower', 'soccerball', 'peacock'];

(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_IDS;
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 700 });
    page.on('pageerror', (e) => console.error('[pageerror]', e));
    await page.goto(INDEX_URL, { waitUntil: 'load' });
    for (const id of ids) {
      await page.evaluate((tid) => window.__debugOpenTemplate(tid), id);
      await new Promise((r) => setTimeout(r, 150));
      const el = await page.$('.goal-canvas-wrap');
      await el.screenshot({ path: path.resolve(__dirname, '..', '_goal-' + id + '.png') });
    }
    console.log('done:', ids.join(', '));
  } finally {
    await browser.close();
  }
})();
