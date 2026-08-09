// 현재 difficulty 배정과 실제 측정된 영역 수를 대조해서 단계별 일관성을 점검한다.
const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.goto(INDEX_URL, { waitUntil: 'load' });
  const templates = await page.evaluate(() =>
    COLORING_TEMPLATES.map((t) => ({ id: t.id, name: t.name, difficulty: t.difficulty }))
  );

  const results = [];
  for (const t of templates) {
    const info = await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), t.id);
    results.push({ id: t.id, difficulty: t.difficulty, regions: info.regionCount });
  }
  await browser.close();

  const byLevel = {};
  results.forEach((r) => { (byLevel[r.difficulty] = byLevel[r.difficulty] || []).push(r); });

  console.log('=== 단계별 배정 현황 (실제 영역 수) ===');
  let prevMax = 0;
  let overlapWarnings = [];
  for (let lv = 1; lv <= 10; lv++) {
    const list = (byLevel[lv] || []).sort((a, b) => a.regions - b.regions);
    const counts = list.map((r) => r.regions);
    const min = Math.min(...counts), max = Math.max(...counts);
    console.log(
      'L' + lv + ' (' + list.length + '개) region ' + min + '~' + max + ' : ' +
      list.map((r) => r.id + '(' + r.regions + ')').join(', ')
    );
    if (list.length !== 10) console.log('  ⚠ 개수가 10개가 아님: ' + list.length);
    if (min < prevMax) overlapWarnings.push('L' + lv + '의 최소(' + min + ')가 이전 단계 최대(' + prevMax + ')보다 작음');
    prevMax = max;
  }
  if (overlapWarnings.length) {
    console.log('\n=== 역전 경고 ===');
    overlapWarnings.forEach((w) => console.log(' - ' + w));
  } else {
    console.log('\n역전 없음 (단계가 올라갈수록 난이도도 대체로 증가)');
  }
})();
