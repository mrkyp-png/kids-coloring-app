// 실제 플레이(레벨 1~10 + 파이널 보스, 4개 모드 전부)를 헤드리스로 빠르게 재생해서
// "쉬움→보통→어려움→매우어려움" 잠금 해제 체인이 끝까지 실제로 작동하는지 검증한다.
// 사람이 직접 100장씩 4번(+보스 4개) 그릴 필요 없이, __debugSimulatePerfect()로 매 그림을
// 정답대로 채우고 실제 UI 흐름(저장→확인→축하 화면 닫기)을 그대로 밟아서 진행 상황을 쌓는다.
// 사용: LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-full-clear.js
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || ('http://localhost:8843/index.html');
const MODE_ORDER = ['easy', 'normal', 'hard', 'veryhard'];

// 도안 하나를 정답대로 채우고 실제 UI 흐름(저장 → 확인 → 축하 화면 닫기)을 그대로 밟는다.
async function completeOneTemplate(page, tplId) {
  const info = await page.evaluate((id) => window.__debugOpenTemplate(id), tplId);
  if (!info) throw new Error('template not found: ' + tplId);

  const sim = await page.evaluate(() => window.__debugSimulatePerfect());
  if (sim.score !== 100) throw new Error(tplId + ' simulate score=' + sim.score + ' (100 아님)');

  await page.evaluate(() => document.getElementById('btn-save').click());

  const bossFanfareVisible = await page.evaluate(() => !document.getElementById('boss-fanfare-modal').hidden);
  if (bossFanfareVisible) {
    await page.evaluate(() => document.getElementById('boss-fanfare-close').click());
    return { bossCleared: true };
  }

  const praiseVisible = await page.evaluate(() => !document.getElementById('praise-overlay').hidden);
  if (praiseVisible) {
    await page.evaluate(() => document.getElementById('praise-overlay').click()); // 즉시 goHome() 트리거
  }

  const rankingVisible = await page.evaluate(() => !document.getElementById('ranking-entry-modal').hidden);
  if (rankingVisible) {
    await page.evaluate(() => document.getElementById('ranking-entry-skip').click());
  }
  return { bossCleared: false };
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.goto(INDEX_URL, { waitUntil: 'load' });
    await page.evaluate(() => {
      localStorage.clear(); // 완전 처음 시작하는 유저 기준
      localStorage.setItem('playerProfile', JSON.stringify({ name: 'QA-bot', country: '' }));
    });
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => document.getElementById('btn-cover-start').click());

    const templatesByLevel = await page.evaluate(() => {
      const byLevel = {};
      for (let lv = 1; lv <= 10; lv++) byLevel[lv] = COLORING_TEMPLATES.filter((t) => t.difficulty === lv).map((t) => t.id);
      return byLevel;
    });
    const bossIds = await page.evaluate(() => {
      const out = {};
      Object.keys(window.BOSS_TEMPLATES || {}).forEach((mode) => { out[mode] = window.BOSS_TEMPLATES[mode].id; });
      return out;
    });

    const t0 = Date.now();

    for (const mode of MODE_ORDER) {
      const modeT0 = Date.now();

      // 1) 이 모드로 전환 (easy는 이미 기본값이라 스킵)
      if (mode !== 'easy') {
        const btn = await page.$(`.mode-btn[data-mode="${mode}"]`);
        const disabled = await page.evaluate((el) => el.disabled, btn);
        if (disabled) throw new Error(mode + ' 모드 버튼이 아직 잠겨 있음 — 이전 모드 보스를 못 깬 것 같음');
        await btn.click();
      }
      const currentMode = await page.evaluate(() => localStorage.getItem('gameMode') || 'easy');
      if (currentMode !== mode) throw new Error('모드 전환 실패: 기대=' + mode + ' 실제=' + currentMode);

      // 2) 레벨 1~10, 각 10장씩 정답대로 채워서 클리어
      let pictureCount = 0;
      for (let lv = 1; lv <= 10; lv++) {
        for (const tplId of templatesByLevel[lv]) {
          await completeOneTemplate(page, tplId);
          pictureCount++;
        }
      }
      const scoreCheck = await page.evaluate((m) => {
        const scores = JSON.parse(localStorage.getItem('templateScores') || '{}')[m] || {};
        return COLORING_TEMPLATES.every((t) => scores[t.id] === 100);
      }, mode);
      if (!scoreCheck) throw new Error(mode + ': 레벨 1~10이 전부 만점 클리어로 안 잡힘');

      // 3) 이 모드 보스 도전 (잠금 해제 확인은 위 disabled 체크에서 이미 됨)
      const bossResult = await completeOneTemplate(page, bossIds[mode]);
      if (!bossResult.bossCleared) throw new Error(mode + ' 보스가 축하 화면(bossFanfareModal)을 안 띄움 — 보스 클리어 인식 실패');

      const bossClearedFlag = await page.evaluate((m) => {
        const map = JSON.parse(localStorage.getItem('bossCleared') || '{}');
        return !!map[m];
      }, mode);
      if (!bossClearedFlag) throw new Error(mode + ' bossCleared 플래그가 localStorage에 안 남음');

      console.log(`OK  ${mode.padEnd(9)} 레벨1~10(${pictureCount}장) + 보스 클리어  (${((Date.now() - modeT0) / 1000).toFixed(1)}s)`);
    }

    // 4) 4개 모드 전부 보스까지 깼는지 최종 확인
    const finalCheck = await page.evaluate(() => {
      const bc = JSON.parse(localStorage.getItem('bossCleared') || '{}');
      return ['easy', 'normal', 'hard', 'veryhard'].every((m) => bc[m] === true);
    });

    console.log('');
    console.log(finalCheck ? '✅ 쉬움→보통→어려움→매우어려움 전체 체인 끝까지 정상 작동 확인' : '❌ 전체 체인 검증 실패');
    console.log('총 소요 시간: ' + ((Date.now() - t0) / 1000).toFixed(1) + '초');
    if (pageErrors.length) {
      console.log('\n[pageerror 발생]');
      pageErrors.forEach((e) => console.log(e));
    }
    if (!finalCheck || pageErrors.length) process.exit(1);
  } catch (err) {
    console.error('\n❌ 검증 실패:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
