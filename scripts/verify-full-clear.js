// 실제 플레이(레벨 1~10 + 파이널 보스)를 헤드리스로 빠르게 재생해서 유아용 모드가 끝까지
// 정상 작동하는지 검증한다. 사람이 직접 100장을 그릴 필요 없이, __debugSimulatePerfect()로
// 매 그림을 정답대로 채우고 실제 UI 흐름(저장→확인→축하 화면 닫기)을 그대로 밟아서 진행 상황을 쌓는다.
// 2026-08-14: "유아용 모드는 난이도 선택 없이 easy 하나로" 요청으로 난이도 selector가 사라져서,
// 이 스크립트도 원래 하던 easy→normal→hard→veryhard 4모드 순회를 easy 한 개로 줄였다
// (normal/hard/veryhard는 이제 UI로 도달 불가 — 의도된 축소).
// 사용: LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-full-clear.js
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || ('http://localhost:8843/index.html');
const MODE_ORDER = ['easy'];

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

      // 1) 모드 전환 UI가 사라졌으니 항상 기본값(easy)인지만 확인
      const currentMode = await page.evaluate(() => localStorage.getItem('gameMode') || 'easy');
      if (currentMode !== mode) throw new Error('모드 전환 실패: 기대=' + mode + ' 실제=' + currentMode);

      // 2) 레벨 1~10, 각 10장씩 정답대로 채워서 클리어
      // 반드시 __debugOpenLevel(lv)로 먼저 그 레벨에 "진입"해야 currentLevel이 실제 UI 흐름처럼
      // 갱신된다 — __debugOpenTemplate만으로는 recordLevelClearTime/checkFullRunClear가 전혀
      // 발동하지 않아 isBossUnlocked()가 항상 false로 나오는 걸 놓친다(2026-08-11 확인).
      let pictureCount = 0;
      for (let lv = 1; lv <= 10; lv++) {
        await page.evaluate((l) => window.__debugOpenLevel(l), lv);
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

      const timesCheck = await page.evaluate((m) => {
        const times = JSON.parse(localStorage.getItem('levelClearTimes') || '{}')[m] || {};
        for (let lv = 1; lv <= 10; lv++) if (times[lv] == null) return false;
        return true;
      }, mode);
      if (!timesCheck) throw new Error(mode + ': levelClearTimes에 레벨 1~10 기록이 전부 안 남음 — isBossUnlocked가 이 모드에서 계속 false로 남을 수 있음');

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

    // 4) easy 모드 보스까지 깼는지 최종 확인
    const finalCheck = await page.evaluate(() => {
      const bc = JSON.parse(localStorage.getItem('bossCleared') || '{}');
      return bc.easy === true;
    });

    // 4-1) 맵 화면에서 easy 보스 카드가 "열림+클리어(🔓)"로 보이는지 렌더링까지 확인
    const bossCardStates = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#boss-grid .boss-card'));
      return cards.map((c) => ({
        locked: c.classList.contains('locked'),
        cleared: c.classList.contains('boss-cleared'),
        icon: (c.querySelector('.boss-crown, .boss-lock') || {}).textContent,
      }));
    });
    const allBossCardsOpenCleared = bossCardStates.every((s) => !s.locked && s.cleared && s.icon === '🔓');
    if (!allBossCardsOpenCleared) {
      console.log('보스 카드 상태:', JSON.stringify(bossCardStates));
      throw new Error('보스 카드가 열림+클리어(🔓)로 안 보임');
    }

    console.log('');
    console.log(finalCheck ? '✅ 유아용 모드(easy) 레벨1~10 + 보스까지 정상 작동 확인' : '❌ 검증 실패');
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
