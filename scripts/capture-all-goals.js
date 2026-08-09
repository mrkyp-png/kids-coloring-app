// 100개 도안의 goal-canvas(정답 색 미리보기)를 전부 캡처해서
// JSON(id, name, difficulty, dataUrl)으로 저장한다. 색상 검토용 갤러리 생성에 사용.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 400 });
  await page.goto(INDEX_URL, { waitUntil: 'load' });

  const templates = await page.evaluate(() =>
    COLORING_TEMPLATES.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji, difficulty: t.difficulty }))
  );

  const results = [];
  for (const tpl of templates) {
    await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), tpl.id);
    const el = await page.$('.goal-canvas-wrap');
    const buf = await el.screenshot({ encoding: 'base64' });
    results.push({ ...tpl, dataUrl: 'data:image/png;base64,' + buf });
  }

  fs.writeFileSync(
    path.resolve(__dirname, '..', 'goal-previews.json'),
    JSON.stringify(results)
  );
  console.log('Captured', results.length, 'previews');
  await browser.close();
})();
