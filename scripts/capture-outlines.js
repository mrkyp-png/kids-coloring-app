// 100개 도안의 "선 도안(색 없음)" 썸네일을 캡처해서 이모지와 나란히 비교할 데이터로 저장한다.
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
    const el = await page.$('#line-canvas');
    // line-canvas는 부모 .canvas-wrap 레이아웃에 따라 크기가 달라지므로 확실히 보이도록 인라인 스타일 강제
    const buf = await page.evaluate(() => {
      return new Promise((resolve) => {
        const src = document.getElementById('line-canvas');
        const out = document.createElement('canvas');
        out.width = 300; out.height = 300;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(src, 0, 0, 300, 300);
        resolve(out.toDataURL('image/png'));
      });
    });
    results.push({ ...tpl, dataUrl: buf });
  }

  fs.writeFileSync(
    path.resolve(__dirname, '..', 'outline-previews.json'),
    JSON.stringify(results)
  );
  console.log('Captured', results.length, 'outlines');
  await browser.close();
})();
