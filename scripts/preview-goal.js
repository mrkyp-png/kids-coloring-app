// 특정 도안들의 goal-canvas(정답 미리보기) 색을 캡처해서 확인한다.
const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 400 });
  await page.goto(INDEX_URL, { waitUntil: 'load' });

  const ids = process.argv.slice(2);
  for (const id of ids) {
    await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), id);
    const el = await page.$('#goal-canvas');
    await el.screenshot({ path: path.resolve(__dirname, '..', 'preview-' + id + '.png') });
  }
  await browser.close();
})();
