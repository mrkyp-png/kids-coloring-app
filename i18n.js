// 다국어(i18n) 지원 — 2026-08-11 추가.
// 지금까지 이 앱의 UI 문구는 전부(templates.js 도안 이름 100개 포함) 영어로 하드코딩돼 있었고,
// 몇몇 알림(alert/confirm) 문구만 예외적으로 한국어였다 — 그래서 브라우저가 페이지를 영어로
// 인식해 "번역할까요?" 팝업을 계속 띄우는 문제가 있었음. 이 파일이 그 모든 문구를 언어별
// 사전으로 분리하고, 화면 우상단 🌐 버튼으로 실시간 전환할 수 있게 한다.
// templates.js/app.js보다 먼저 로드되어야 하고(index.html 스크립트 순서 참고), body가 이미
// 파싱된 뒤 실행되므로 data-i18n 요소를 즉시 찾아 번역할 수 있다.
(function () {
  'use strict';

  var SUPPORTED = ['ko', 'en', 'ja', 'zh', 'es'];
  var LANG_NAMES = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文', es: 'Español' };

  // ================= UI 문구 사전 =================
  var STRINGS = {
    en: {
      'loading.text': 'Loading…',
      'onboarding.gate.title': '👨‍👩‍👧 Parent Check',
      'onboarding.gate.sub': 'Please solve this to continue (this app is made for kids, so we make sure a grown-up is here first).',
      'onboarding.gate.retry': 'Not quite — try again!',
      'onboarding.consent.title': '🔒 Before You Start',
      'onboarding.consent.li1': '🚫 No ads, ever',
      'onboarding.consent.li2': '🔐 No real names or precise location — only a nickname & flag you pick, shown on the public ranking only if you choose to save a record',
      'onboarding.consent.li3': '📶 Works fully offline',
      'onboarding.consent.privacyLink': 'Read our Privacy Policy',
      'onboarding.consent.agree': 'Agree & Start',
      'cover.start': '▶ Start',
      'mode.easy': 'Easy',
      'mode.normal': 'Normal',
      'mode.hard': 'Hard',
      'mode.veryhard': 'Very Hard',
      'ranking.btn': '🏆 Ranking',
      'resetMode.btn': '🔄 Reset Mode',
      'boss.sectionTitle': '👑 Final Boss',
      'boss.sectionSub': "Clear all 10 levels in one mode to challenge that mode's boss!",
      'boss.fallback': 'Boss',
      'level.label': 'Level',
      'level.clearBadge': 'CLEAR',
      'boss.defeatedBadge': 'Defeated!',
      'boss.tapToChallenge': 'Tap to challenge!',
      'tool.undo': 'Undo',
      'tool.clear': 'Clear',
      'tool.done': 'Done!',
      'playerEntry.title': "👋 Who's playing?",
      'playerEntry.sub': 'Pick a nickname and flag for the global ranking!',
      'playerEntry.namePlaceholder': 'Nickname',
      'playerEntry.warning': "⚠️ You can't change your nickname or flag later!",
      'playerEntry.submit': "Let's Play!",
      'playerEntry.skip': 'Skip',
      'rankingEntry.title': '🎉 All 10 Levels Clear!',
      'rankingEntry.lockedNote': '⚠️ Your nickname/flag are locked in — set at the very start.',
      'rankingEntry.submit': 'Save my record!',
      'rankingEntry.skip': 'Skip',
      'bossFanfare.title': '🎉👑 Final Boss Defeated! 👑🎉',
      'bossFanfare.close': 'Close',
      'rankingBoard.title': '🏆 Ranking',
      'rankingBoard.sub': 'Fastest full clear time, by mode',
      'rankingBoard.close': 'Close',
      'ranking.notSetup': "Ranking isn't set up yet!",
      'ranking.loading': 'Loading…',
      'ranking.emptyMode': 'No records yet for this mode!',
      'ranking.loadError': "Couldn't load ranking — check your internet.",
      'ranking.setupNeeded': "Ranking isn't set up yet — ask a grown-up to finish setup!",
      'ranking.saving': 'Saving your record...',
      'ranking.saveError': "Couldn't save — check your internet and try again.",
      'ranking.entryTime': '{mode} mode · {time}',
      'alert.modeLocked': '🔒 Not unlocked yet! Beat the Final Boss of {mode} mode first.',
      'alert.modeInProgress': "You can't switch modes with a level in progress. Reset that level (🔄) first, then try again!",
      'alert.levelTimeout': "⏰ Time's up! Level {level} progress was reset. Let's try again!",
      'alert.bossTimeout': "⏰ Time's up! The {name} challenge was reset. Let's try again!",
      'confirm.resetMode': 'Reset all progress for {mode} mode and start over? (Other modes stay the same)',
      'alert.loadFail': "Couldn't load the picture ({id}). Check the console (F12) for the red error message.",
      'stat.finished': '🎉 You finished {done} of {total} pictures!',
      'level.title': 'Level {n}',
      'level.progress': '{done} / {total} perfect',
      'level.clear': '🎉 Level {n} clear!',
      'level.allClear': '🎉 All levels clear!',
      'level.next': 'Next ▶',
      'level.map': 'Map ▶',
      'praise.parts': '{matched} / {total} parts colored',
      'praise.partsRight': '{matched} / {total} parts colored right',
      'rating.1': 'Perfect! Color Master!',
      'rating.2': 'Great job!',
      'rating.3': 'Good job!',
      'rating.4': 'Keep trying!',
      'rating.5': 'Try again!',
      'praise.clearSuffix': '{label} — Clear! 🎉',
      'bossFanfare.sub': '{name} — {mode} mode complete!',
      'anonymous': 'Anonymous',
      'langMenu.label': 'Change language',
      'goalZoom.hint': 'Tap anywhere to close',
      'goalZoom.openLabel': 'Zoom in on the picture',
      'challenge.entryBtn': '🎮 Challenge Mode',
      'challenge.selectTitle': 'Challenge Mode',
      'challenge.difficulty.easy': 'EASY',
      'challenge.difficulty.normal': 'NORMAL',
      'challenge.difficulty.hard': 'HARD',
      'challenge.difficulty.veryhard': 'VERY HARD',
      'challenge.hud.combo': 'Combo x{multiplier}',
      'challenge.hud.accuracy': 'Acc {percent}%',
      'challenge.result.score': 'Score: {score}',
      'challenge.result.newRecord': 'NEW RECORD!',
      'challenge.result.perfect': 'PERFECT!'
    },
    ko: {
      'loading.text': '불러오는 중…',
      'onboarding.gate.title': '👨‍👩‍👧 보호자 확인',
      'onboarding.gate.sub': '계속하려면 문제를 풀어주세요 (어린이용 앱이라 보호자가 함께 있는지 확인해요).',
      'onboarding.gate.retry': '아쉬워요 — 다시 도전해보세요!',
      'onboarding.consent.title': '🔒 시작하기 전에',
      'onboarding.consent.li1': '🚫 광고 없음, 절대!',
      'onboarding.consent.li2': '🔐 실명이나 정확한 위치 없음 — 직접 고른 닉네임과 국기만, 기록을 저장하기로 선택했을 때만 공개 랭킹에 표시돼요',
      'onboarding.consent.li3': '📶 인터넷 없이도 완전히 사용 가능',
      'onboarding.consent.privacyLink': '개인정보처리방침 보기',
      'onboarding.consent.agree': '동의하고 시작하기',
      'cover.start': '▶ 시작하기',
      'mode.easy': '쉬움',
      'mode.normal': '보통',
      'mode.hard': '어려움',
      'mode.veryhard': '매우 어려움',
      'ranking.btn': '🏆 랭킹',
      'resetMode.btn': '🔄 모드 초기화',
      'boss.sectionTitle': '👑 파이널 보스',
      'boss.sectionSub': '한 모드에서 10레벨을 모두 클리어하면 그 모드의 보스에 도전할 수 있어요!',
      'boss.fallback': '보스',
      'level.label': '레벨',
      'level.clearBadge': '클리어',
      'boss.defeatedBadge': '처치!',
      'boss.tapToChallenge': '탭해서 도전!',
      'tool.undo': '되돌리기',
      'tool.clear': '지우기',
      'tool.done': '완료!',
      'playerEntry.title': '👋 누가 플레이하나요?',
      'playerEntry.sub': '전 세계 랭킹에 쓸 닉네임과 국기를 골라주세요!',
      'playerEntry.namePlaceholder': '닉네임',
      'playerEntry.warning': '⚠️ 닉네임과 국기는 나중에 바꿀 수 없어요!',
      'playerEntry.submit': '시작할게요!',
      'playerEntry.skip': '건너뛰기',
      'rankingEntry.title': '🎉 10레벨 전부 클리어!',
      'rankingEntry.lockedNote': '⚠️ 닉네임/국기는 처음에 정한 값으로 고정돼요.',
      'rankingEntry.submit': '기록 저장하기!',
      'rankingEntry.skip': '건너뛰기',
      'bossFanfare.title': '🎉👑 파이널 보스 처치! 👑🎉',
      'bossFanfare.close': '닫기',
      'rankingBoard.title': '🏆 랭킹',
      'rankingBoard.sub': '모드별 최단 완주 기록',
      'rankingBoard.close': '닫기',
      'ranking.notSetup': '랭킹이 아직 준비되지 않았어요!',
      'ranking.loading': '불러오는 중…',
      'ranking.emptyMode': '이 모드는 아직 기록이 없어요!',
      'ranking.loadError': '랭킹을 불러오지 못했어요 — 인터넷 연결을 확인해주세요.',
      'ranking.setupNeeded': '랭킹이 아직 준비되지 않았어요 — 보호자에게 설정을 부탁하세요!',
      'ranking.saving': '기록을 저장하는 중...',
      'ranking.saveError': '저장하지 못했어요 — 인터넷을 확인하고 다시 시도해주세요.',
      'ranking.entryTime': '{mode} 모드 · {time}',
      'alert.modeLocked': '아직 잠겨 있어요! {mode} 모드의 파이널 보스를 먼저 이겨야 열려요.',
      'alert.modeInProgress': '진행 중인 레벨이 있어서 모드를 바꿀 수 없어요. 먼저 그 레벨을 초기화(🔄)하고 다시 시도해주세요!',
      'alert.levelTimeout': '⏰ 시간 초과! Level {level} 진행 상황이 초기화됐어요. 다시 도전해봐요!',
      'alert.bossTimeout': '⏰ 시간 초과! {name} 도전이 초기화됐어요. 다시 도전해봐요!',
      'confirm.resetMode': '{mode} 모드의 진행 상황을 전부 초기화하고 처음부터 다시 시작할까요? (다른 모드는 그대로 남아요)',
      'alert.loadFail': '그림을 못 불러왔어요 ({id}). 콘솔(F12)에서 빨간 에러 메시지를 확인해주세요.',
      'stat.finished': '🎉 {total}개 중 {done}개 그림을 완성했어요!',
      'level.title': '레벨 {n}',
      'level.progress': '{done} / {total} 완벽',
      'level.clear': '🎉 레벨 {n} 클리어!',
      'level.allClear': '🎉 모든 레벨 클리어!',
      'level.next': '다음 ▶',
      'level.map': '지도 ▶',
      'praise.parts': '{matched} / {total} 부분 색칠',
      'praise.partsRight': '{matched} / {total} 부분 정확히 색칠',
      'rating.1': '완벽해요! 색칠왕!',
      'rating.2': '정말 잘했어요!',
      'rating.3': '잘했어요!',
      'rating.4': '조금만 더!',
      'rating.5': '다시 도전해봐요!',
      'praise.clearSuffix': '{label} — 클리어! 🎉',
      'bossFanfare.sub': '{name} — {mode} 모드 완료!',
      'anonymous': '무명의 색칠러',
      'langMenu.label': '언어 변경',
      'goalZoom.hint': '아무 곳이나 탭하면 닫혀요',
      'goalZoom.openLabel': '그림 확대해서 보기',
      'challenge.entryBtn': '🎮 챌린지 모드',
      'challenge.selectTitle': '챌린지 모드',
      'challenge.difficulty.easy': '쉬움',
      'challenge.difficulty.normal': '보통',
      'challenge.difficulty.hard': '어려움',
      'challenge.difficulty.veryhard': '매우 어려움',
      'challenge.hud.combo': '콤보 x{multiplier}',
      'challenge.hud.accuracy': '정확도 {percent}%',
      'challenge.result.score': '점수: {score}',
      'challenge.result.newRecord': '신기록!',
      'challenge.result.perfect': '퍼펙트!'
    },
    ja: {
      'loading.text': '読み込み中…',
      'onboarding.gate.title': '👨‍👩‍👧 保護者確認',
      'onboarding.gate.sub': '続けるにはこの問題を解いてください(お子様向けアプリのため、保護者の同伴を確認しています)。',
      'onboarding.gate.retry': 'おしい!もう一度挑戦してみて!',
      'onboarding.consent.title': '🔒 はじめる前に',
      'onboarding.consent.li1': '🚫 広告は一切なし',
      'onboarding.consent.li2': '🔐 本名や正確な位置情報は使いません — 選んだニックネームと国旗のみ、記録を保存した場合だけ公開ランキングに表示されます',
      'onboarding.consent.li3': '📶 オフラインで完全に遊べます',
      'onboarding.consent.privacyLink': 'プライバシーポリシーを見る',
      'onboarding.consent.agree': '同意してはじめる',
      'cover.start': '▶ はじめる',
      'mode.easy': 'かんたん',
      'mode.normal': 'ふつう',
      'mode.hard': 'むずかしい',
      'mode.veryhard': 'とてもむずかしい',
      'ranking.btn': '🏆 ランキング',
      'resetMode.btn': '🔄 モードをリセット',
      'boss.sectionTitle': '👑 ファイナルボス',
      'boss.sectionSub': '1つのモードで10レベルすべてクリアすると、そのモードのボスに挑戦できます!',
      'boss.fallback': 'ボス',
      'level.label': 'レベル',
      'level.clearBadge': 'クリア',
      'boss.defeatedBadge': '撃破!',
      'boss.tapToChallenge': 'タップして挑戦!',
      'tool.undo': '元に戻す',
      'tool.clear': '消す',
      'tool.done': 'できた!',
      'playerEntry.title': '👋 だれがあそぶ?',
      'playerEntry.sub': '世界ランキング用にニックネームと国旗を選んでね!',
      'playerEntry.namePlaceholder': 'ニックネーム',
      'playerEntry.warning': '⚠️ ニックネームと国旗はあとで変更できません!',
      'playerEntry.submit': 'はじめる!',
      'playerEntry.skip': 'スキップ',
      'rankingEntry.title': '🎉 10レベル全クリア!',
      'rankingEntry.lockedNote': '⚠️ ニックネーム/国旗は最初に決めたものに固定されます。',
      'rankingEntry.submit': '記録を保存する!',
      'rankingEntry.skip': 'スキップ',
      'bossFanfare.title': '🎉👑 ファイナルボス撃破! 👑🎉',
      'bossFanfare.close': '閉じる',
      'rankingBoard.title': '🏆 ランキング',
      'rankingBoard.sub': 'モード別、最速クリアタイム',
      'rankingBoard.close': '閉じる',
      'ranking.notSetup': 'ランキングはまだ準備中です!',
      'ranking.loading': '読み込み中…',
      'ranking.emptyMode': 'このモードにはまだ記録がありません!',
      'ranking.loadError': 'ランキングを読み込めませんでした — インターネット接続を確認してください。',
      'ranking.setupNeeded': 'ランキングはまだ準備中です — 保護者の方に設定をお願いしてください!',
      'ranking.saving': '記録を保存しています...',
      'ranking.saveError': '保存できませんでした — インターネット接続を確認してもう一度試してください。',
      'ranking.entryTime': '{mode}モード · {time}',
      'alert.modeLocked': '🔒 まだ解放されていません!先に{mode}モードのファイナルボスを倒してね。',
      'alert.modeInProgress': '進行中のレベルがあるためモードを変更できません。まずそのレベルをリセット(🔄)してから、もう一度試してください!',
      'alert.levelTimeout': '⏰ 時間切れ!Level {level}の進行状況がリセットされました。もう一度挑戦しよう!',
      'alert.bossTimeout': '⏰ 時間切れ!{name}への挑戦がリセットされました。もう一度挑戦しよう!',
      'confirm.resetMode': '{mode}モードの進行状況をすべてリセットして最初からやり直しますか?(他のモードはそのまま残ります)',
      'alert.loadFail': '絵を読み込めませんでした({id})。コンソール(F12)で赤いエラーメッセージを確認してください。',
      'stat.finished': '🎉 {total}枚中{done}枚の絵を完成させました!',
      'level.title': 'レベル {n}',
      'level.progress': '{done} / {total} パーフェクト',
      'level.clear': '🎉 レベル{n}クリア!',
      'level.allClear': '🎉 全レベルクリア!',
      'level.next': 'つぎへ ▶',
      'level.map': 'マップへ ▶',
      'praise.parts': '{matched} / {total} パーツを塗った',
      'praise.partsRight': '{matched} / {total} パーツを正しく塗った',
      'rating.1': 'パーフェクト!ぬり絵マスター!',
      'rating.2': 'よくできました!',
      'rating.3': 'いいね!',
      'rating.4': 'もうすこし!',
      'rating.5': 'もう一度挑戦しよう!',
      'praise.clearSuffix': '{label} — クリア! 🎉',
      'bossFanfare.sub': '{name} — {mode}モード完了!',
      'anonymous': '名無しさん',
      'langMenu.label': '言語を変更',
      'goalZoom.hint': 'どこかをタップすると閉じます',
      'goalZoom.openLabel': '絵を拡大する',
      'challenge.entryBtn': '🎮 チャレンジモード',
      'challenge.selectTitle': 'チャレンジモード',
      'challenge.difficulty.easy': 'かんたん',
      'challenge.difficulty.normal': 'ふつう',
      'challenge.difficulty.hard': 'むずかしい',
      'challenge.difficulty.veryhard': 'とてもむずかしい',
      'challenge.hud.combo': 'コンボ x{multiplier}',
      'challenge.hud.accuracy': '正確度 {percent}%',
      'challenge.result.score': 'スコア: {score}',
      'challenge.result.newRecord': '新記録！',
      'challenge.result.perfect': 'パーフェクト！'
    },
    zh: {
      'loading.text': '加载中…',
      'onboarding.gate.title': '👨‍👩‍👧 家长确认',
      'onboarding.gate.sub': '请先完成这道题才能继续(这是儿童应用,我们需要确认有家长在旁边)。',
      'onboarding.gate.retry': '差一点哦——再试一次!',
      'onboarding.consent.title': '🔒 开始之前',
      'onboarding.consent.li1': '🚫 永远没有广告',
      'onboarding.consent.li2': '🔐 不使用真实姓名或精确位置——只有你选择的昵称和国旗,且仅在你选择保存记录时才会出现在公开排行榜上',
      'onboarding.consent.li3': '📶 完全支持离线使用',
      'onboarding.consent.privacyLink': '查看隐私政策',
      'onboarding.consent.agree': '同意并开始',
      'cover.start': '▶ 开始',
      'mode.easy': '简单',
      'mode.normal': '普通',
      'mode.hard': '困难',
      'mode.veryhard': '极难',
      'ranking.btn': '🏆 排行榜',
      'resetMode.btn': '🔄 重置模式',
      'boss.sectionTitle': '👑 最终Boss',
      'boss.sectionSub': '在同一模式下通关全部10关,即可挑战该模式的Boss!',
      'boss.fallback': 'Boss',
      'level.label': '关卡',
      'level.clearBadge': '通关',
      'boss.defeatedBadge': '已击败!',
      'boss.tapToChallenge': '点击挑战!',
      'tool.undo': '撤销',
      'tool.clear': '清除',
      'tool.done': '完成!',
      'playerEntry.title': '👋 谁在玩?',
      'playerEntry.sub': '为全球排行榜选择一个昵称和国旗!',
      'playerEntry.namePlaceholder': '昵称',
      'playerEntry.warning': '⚠️ 昵称和国旗之后将无法更改!',
      'playerEntry.submit': '开始游戏!',
      'playerEntry.skip': '跳过',
      'rankingEntry.title': '🎉 10关全部通关!',
      'rankingEntry.lockedNote': '⚠️ 你的昵称/国旗已锁定——以最初设置的为准。',
      'rankingEntry.submit': '保存我的记录!',
      'rankingEntry.skip': '跳过',
      'bossFanfare.title': '🎉👑 击败最终Boss! 👑🎉',
      'bossFanfare.close': '关闭',
      'rankingBoard.title': '🏆 排行榜',
      'rankingBoard.sub': '各模式最快通关时间',
      'rankingBoard.close': '关闭',
      'ranking.notSetup': '排行榜尚未设置!',
      'ranking.loading': '加载中…',
      'ranking.emptyMode': '该模式还没有记录!',
      'ranking.loadError': '无法加载排行榜——请检查网络连接。',
      'ranking.setupNeeded': '排行榜尚未设置——请让家长完成设置!',
      'ranking.saving': '正在保存记录...',
      'ranking.saveError': '保存失败——请检查网络后重试。',
      'ranking.entryTime': '{mode}模式 · {time}',
      'alert.modeLocked': '🔒 还没有解锁!请先打败{mode}模式的最终Boss。',
      'alert.modeInProgress': '有关卡正在进行中,无法切换模式。请先重置(🔄)该关卡后再试!',
      'alert.levelTimeout': '⏰ 时间到!第{level}关的进度已重置。再挑战一次吧!',
      'alert.bossTimeout': '⏰ 时间到!{name}的挑战已重置。再挑战一次吧!',
      'confirm.resetMode': '要重置{mode}模式的全部进度并重新开始吗?(其他模式不受影响)',
      'alert.loadFail': '图片加载失败({id})。请在控制台(F12)查看红色错误信息。',
      'stat.finished': '🎉 你已完成{total}张中的{done}张图画!',
      'level.title': '第{n}关',
      'level.progress': '{done} / {total} 完美',
      'level.clear': '🎉 第{n}关通关!',
      'level.allClear': '🎉 全部关卡通关!',
      'level.next': '下一关 ▶',
      'level.map': '地图 ▶',
      'praise.parts': '已上色 {matched} / {total} 部分',
      'praise.partsRight': '正确上色 {matched} / {total} 部分',
      'rating.1': '完美!涂色大师!',
      'rating.2': '太棒了!',
      'rating.3': '做得好!',
      'rating.4': '再接再厉!',
      'rating.5': '再试一次!',
      'praise.clearSuffix': '{label} — 通关!🎉',
      'bossFanfare.sub': '{name} — {mode}模式完成!',
      'anonymous': '匿名玩家',
      'langMenu.label': '更改语言',
      'goalZoom.hint': '点击任意位置关闭',
      'goalZoom.openLabel': '放大查看图片',
      'challenge.entryBtn': '🎮 挑战模式',
      'challenge.selectTitle': '挑战模式',
      'challenge.difficulty.easy': '简单',
      'challenge.difficulty.normal': '普通',
      'challenge.difficulty.hard': '困难',
      'challenge.difficulty.veryhard': '极难',
      'challenge.hud.combo': '连击 x{multiplier}',
      'challenge.hud.accuracy': '准确度 {percent}%',
      'challenge.result.score': '得分：{score}',
      'challenge.result.newRecord': '新纪录！',
      'challenge.result.perfect': '完美！'
    },
    es: {
      'loading.text': 'Cargando…',
      'onboarding.gate.title': '👨‍👩‍👧 Verificación de adultos',
      'onboarding.gate.sub': 'Resuelve esto para continuar (esta app es para niños, así que confirmamos que hay un adulto presente).',
      'onboarding.gate.retry': 'Casi — ¡inténtalo de nuevo!',
      'onboarding.consent.title': '🔒 Antes de empezar',
      'onboarding.consent.li1': '🚫 Sin anuncios, nunca',
      'onboarding.consent.li2': '🔐 Sin nombres reales ni ubicación precisa — solo un apodo y bandera que elijas, mostrados en el ranking público solo si decides guardar un registro',
      'onboarding.consent.li3': '📶 Funciona totalmente sin conexión',
      'onboarding.consent.privacyLink': 'Leer nuestra Política de Privacidad',
      'onboarding.consent.agree': 'Aceptar y empezar',
      'cover.start': '▶ Empezar',
      'mode.easy': 'Fácil',
      'mode.normal': 'Normal',
      'mode.hard': 'Difícil',
      'mode.veryhard': 'Muy difícil',
      'ranking.btn': '🏆 Ranking',
      'resetMode.btn': '🔄 Reiniciar modo',
      'boss.sectionTitle': '👑 Jefe final',
      'boss.sectionSub': '¡Completa los 10 niveles en un modo para retar al jefe de ese modo!',
      'boss.fallback': 'Jefe',
      'level.label': 'Nivel',
      'level.clearBadge': 'COMPLETO',
      'boss.defeatedBadge': '¡Derrotado!',
      'boss.tapToChallenge': '¡Toca para retar!',
      'tool.undo': 'Deshacer',
      'tool.clear': 'Borrar',
      'tool.done': '¡Listo!',
      'playerEntry.title': '👋 ¿Quién juega?',
      'playerEntry.sub': '¡Elige un apodo y una bandera para el ranking global!',
      'playerEntry.namePlaceholder': 'Apodo',
      'playerEntry.warning': '⚠️ ¡No podrás cambiar tu apodo ni tu bandera después!',
      'playerEntry.submit': '¡A jugar!',
      'playerEntry.skip': 'Omitir',
      'rankingEntry.title': '🎉 ¡Los 10 niveles completados!',
      'rankingEntry.lockedNote': '⚠️ Tu apodo/bandera quedan fijos — se definieron al principio.',
      'rankingEntry.submit': '¡Guardar mi registro!',
      'rankingEntry.skip': 'Omitir',
      'bossFanfare.title': '🎉👑 ¡Jefe final derrotado! 👑🎉',
      'bossFanfare.close': 'Cerrar',
      'rankingBoard.title': '🏆 Ranking',
      'rankingBoard.sub': 'Tiempo más rápido, por modo',
      'rankingBoard.close': 'Cerrar',
      'ranking.notSetup': '¡El ranking aún no está configurado!',
      'ranking.loading': 'Cargando…',
      'ranking.emptyMode': '¡Aún no hay registros para este modo!',
      'ranking.loadError': 'No se pudo cargar el ranking — revisa tu conexión a internet.',
      'ranking.setupNeeded': 'El ranking aún no está configurado — ¡pide a un adulto que termine la configuración!',
      'ranking.saving': 'Guardando tu registro...',
      'ranking.saveError': 'No se pudo guardar — revisa tu conexión e inténtalo de nuevo.',
      'ranking.entryTime': 'Modo {mode} · {time}',
      'alert.modeLocked': '🔒 ¡Aún no está desbloqueado! Primero vence al jefe final del modo {mode}.',
      'alert.modeInProgress': 'No puedes cambiar de modo con un nivel en curso. ¡Reinicia ese nivel (🔄) primero y vuelve a intentarlo!',
      'alert.levelTimeout': '⏰ ¡Se acabó el tiempo! El progreso del nivel {level} se reinició. ¡Inténtalo de nuevo!',
      'alert.bossTimeout': '⏰ ¡Se acabó el tiempo! El reto de {name} se reinició. ¡Inténtalo de nuevo!',
      'confirm.resetMode': '¿Reiniciar todo el progreso del modo {mode} y empezar de nuevo? (Los demás modos no cambian)',
      'alert.loadFail': 'No se pudo cargar el dibujo ({id}). Revisa el mensaje de error rojo en la consola (F12).',
      'stat.finished': '🎉 ¡Completaste {done} de {total} dibujos!',
      'level.title': 'Nivel {n}',
      'level.progress': '{done} / {total} perfecto',
      'level.clear': '🎉 ¡Nivel {n} completado!',
      'level.allClear': '🎉 ¡Todos los niveles completados!',
      'level.next': 'Siguiente ▶',
      'level.map': 'Mapa ▶',
      'praise.parts': '{matched} / {total} partes coloreadas',
      'praise.partsRight': '{matched} / {total} partes coloreadas bien',
      'rating.1': '¡Perfecto! ¡Maestro del color!',
      'rating.2': '¡Muy bien!',
      'rating.3': '¡Buen trabajo!',
      'rating.4': '¡Sigue intentando!',
      'rating.5': '¡Inténtalo de nuevo!',
      'praise.clearSuffix': '{label} — ¡Completado! 🎉',
      'bossFanfare.sub': '{name} — ¡modo {mode} completado!',
      'anonymous': 'Anónimo',
      'langMenu.label': 'Cambiar idioma',
      'goalZoom.hint': 'Toca en cualquier lugar para cerrar',
      'goalZoom.openLabel': 'Ampliar el dibujo',
      'challenge.entryBtn': '🎮 Modo Desafío',
      'challenge.selectTitle': 'Modo Desafío',
      'challenge.difficulty.easy': 'FÁCIL',
      'challenge.difficulty.normal': 'NORMAL',
      'challenge.difficulty.hard': 'DIFÍCIL',
      'challenge.difficulty.veryhard': 'MUY DIFÍCIL',
      'challenge.hud.combo': 'Combo x{multiplier}',
      'challenge.hud.accuracy': 'Precisión {percent}%',
      'challenge.result.score': 'Puntuación: {score}',
      'challenge.result.newRecord': '¡NUEVO RÉCORD!',
      'challenge.result.perfect': '¡PERFECTO!'
    }
  };

  // ================= 도안 이름(templates.js의 100개 id + 보스 4종) — en은 templates.js의 name을 그대로 씀 =================
  var TEMPLATE_NAMES = {
    sun: { ko: '해', ja: '太陽', zh: '太阳', es: 'Sol' },
    moon: { ko: '달', ja: '月', zh: '月亮', es: 'Luna' },
    star: { ko: '별', ja: '星', zh: '星星', es: 'Estrella' },
    cloud: { ko: '구름', ja: '雲', zh: '云', es: 'Nube' },
    rainbow: { ko: '무지개', ja: '虹', zh: '彩虹', es: 'Arcoíris' },
    heart: { ko: '하트', ja: 'ハート', zh: '爱心', es: 'Corazón' },
    drop: { ko: '물방울', ja: '水滴', zh: '水滴', es: 'Gota de agua' },
    balloon: { ko: '풍선', ja: '風船', zh: '气球', es: 'Globo' },
    umbrella: { ko: '우산', ja: '傘', zh: '雨伞', es: 'Paraguas' },
    egg: { ko: '달걀', ja: '卵', zh: '鸡蛋', es: 'Huevo' },

    apple: { ko: '사과', ja: 'リンゴ', zh: '苹果', es: 'Manzana' },
    banana: { ko: '바나나', ja: 'バナナ', zh: '香蕉', es: 'Plátano' },
    orange: { ko: '오렌지', ja: 'オレンジ', zh: '橙子', es: 'Naranja' },
    watermelon: { ko: '수박', ja: 'スイカ', zh: '西瓜', es: 'Sandía' },
    pineapple: { ko: '파인애플', ja: 'パイナップル', zh: '菠萝', es: 'Piña' },
    lemon: { ko: '레몬', ja: 'レモン', zh: '柠檬', es: 'Limón' },
    peach: { ko: '복숭아', ja: '桃', zh: '桃子', es: 'Durazno' },
    pear: { ko: '배', ja: '梨', zh: '梨', es: 'Pera' },
    cherry: { ko: '체리', ja: 'さくらんぼ', zh: '樱桃', es: 'Cereza' },
    strawberry: { ko: '딸기', ja: 'イチゴ', zh: '草莓', es: 'Fresa' },

    cat: { ko: '고양이', ja: '猫', zh: '猫', es: 'Gato' },
    dog: { ko: '강아지', ja: '犬', zh: '狗', es: 'Perro' },
    rabbit: { ko: '토끼', ja: 'ウサギ', zh: '兔子', es: 'Conejo' },
    bear: { ko: '곰', ja: 'クマ', zh: '熊', es: 'Oso' },
    lion: { ko: '사자', ja: 'ライオン', zh: '狮子', es: 'León' },
    pig: { ko: '돼지', ja: 'ブタ', zh: '猪', es: 'Cerdo' },
    sheep: { ko: '양', ja: '羊', zh: '绵羊', es: 'Oveja' },
    mouse: { ko: '쥐', ja: 'ネズミ', zh: '老鼠', es: 'Ratón' },
    elephant: { ko: '코끼리', ja: 'ゾウ', zh: '大象', es: 'Elefante' },
    tiger: { ko: '호랑이', ja: 'トラ', zh: '老虎', es: 'Tigre' },

    duck: { ko: '오리', ja: 'アヒル', zh: '鸭子', es: 'Pato' },
    chicken: { ko: '닭', ja: 'ニワトリ', zh: '鸡', es: 'Pollo' },
    penguin: { ko: '펭귄', ja: 'ペンギン', zh: '企鹅', es: 'Pingüino' },
    owl: { ko: '부엉이', ja: 'フクロウ', zh: '猫头鹰', es: 'Búho' },
    bird: { ko: '새', ja: '鳥', zh: '小鸟', es: 'Pájaro' },
    peacock: { ko: '공작새', ja: 'クジャク', zh: '孔雀', es: 'Pavo real' },
    turkey: { ko: '칠면조', ja: 'シチメンチョウ', zh: '火鸡', es: 'Pavo' },
    rooster: { ko: '수탉', ja: 'オンドリ', zh: '公鸡', es: 'Gallo' },
    swan: { ko: '백조', ja: '白鳥', zh: '天鹅', es: 'Cisne' },
    frog: { ko: '개구리', ja: 'カエル', zh: '青蛙', es: 'Rana' },

    fish: { ko: '물고기', ja: '魚', zh: '鱼', es: 'Pez' },
    whale: { ko: '고래', ja: 'クジラ', zh: '鲸鱼', es: 'Ballena' },
    turtle: { ko: '거북이', ja: 'カメ', zh: '乌龟', es: 'Tortuga' },
    octopus: { ko: '문어', ja: 'タコ', zh: '章鱼', es: 'Pulpo' },
    crab: { ko: '게', ja: 'カニ', zh: '螃蟹', es: 'Cangrejo' },
    dolphin: { ko: '돌고래', ja: 'イルカ', zh: '海豚', es: 'Delfín' },
    shark: { ko: '상어', ja: 'サメ', zh: '鲨鱼', es: 'Tiburón' },
    lobster: { ko: '랍스터', ja: 'ロブスター', zh: '龙虾', es: 'Langosta' },
    shrimp: { ko: '새우', ja: 'エビ', zh: '虾', es: 'Camarón' },
    squid: { ko: '오징어', ja: 'イカ', zh: '鱿鱼', es: 'Calamar' },

    butterfly: { ko: '나비', ja: 'チョウ', zh: '蝴蝶', es: 'Mariposa' },
    ladybug: { ko: '무당벌레', ja: 'テントウムシ', zh: '瓢虫', es: 'Mariquita' },
    bee: { ko: '꿀벌', ja: 'ハチ', zh: '蜜蜂', es: 'Abeja' },
    ant: { ko: '개미', ja: 'アリ', zh: '蚂蚁', es: 'Hormiga' },
    spider: { ko: '거미', ja: 'クモ', zh: '蜘蛛', es: 'Araña' },
    snail: { ko: '달팽이', ja: 'カタツムリ', zh: '蜗牛', es: 'Caracol' },
    caterpillar: { ko: '애벌레', ja: 'イモムシ', zh: '毛毛虫', es: 'Oruga' },
    cricket: { ko: '귀뚜라미', ja: 'コオロギ', zh: '蟋蟀', es: 'Grillo' },
    scorpion: { ko: '전갈', ja: 'サソリ', zh: '蝎子', es: 'Escorpión' },
    mosquito: { ko: '모기', ja: '蚊', zh: '蚊子', es: 'Mosquito' },

    car: { ko: '자동차', ja: '車', zh: '汽车', es: 'Coche' },
    bus: { ko: '버스', ja: 'バス', zh: '公交车', es: 'Autobús' },
    truck: { ko: '트럭', ja: 'トラック', zh: '卡车', es: 'Camión' },
    train: { ko: '기차', ja: '電車', zh: '火车', es: 'Tren' },
    airplane: { ko: '비행기', ja: '飛行機', zh: '飞机', es: 'Avión' },
    rocket: { ko: '로켓', ja: 'ロケット', zh: '火箭', es: 'Cohete' },
    boat: { ko: '요트', ja: 'ヨット', zh: '帆船', es: 'Velero' },
    bicycle: { ko: '자전거', ja: '自転車', zh: '自行车', es: 'Bicicleta' },
    helicopter: { ko: '헬리콥터', ja: 'ヘリコプター', zh: '直升机', es: 'Helicóptero' },
    motorcycle: { ko: '오토바이', ja: 'バイク', zh: '摩托车', es: 'Motocicleta' },

    donut: { ko: '도넛', ja: 'ドーナツ', zh: '甜甜圈', es: 'Dona' },
    cookie: { ko: '쿠키', ja: 'クッキー', zh: '饼干', es: 'Galleta' },
    icecream: { ko: '아이스크림', ja: 'アイスクリーム', zh: '冰淇淋', es: 'Helado' },
    cupcake: { ko: '컵케이크', ja: 'カップケーキ', zh: '纸杯蛋糕', es: 'Cupcake' },
    pizza: { ko: '피자', ja: 'ピザ', zh: '披萨', es: 'Pizza' },
    candy: { ko: '사탕', ja: 'キャンディ', zh: '糖果', es: 'Caramelo' },
    lollipop: { ko: '막대사탕', ja: 'ペロペロキャンディ', zh: '棒棒糖', es: 'Piruleta' },
    pretzel: { ko: '프레첼', ja: 'プレッツェル', zh: '椒盐卷饼', es: 'Pretzel' },
    cake: { ko: '케이크', ja: 'ケーキ', zh: '蛋糕', es: 'Pastel' },
    chocolate: { ko: '초콜릿', ja: 'チョコレート', zh: '巧克力', es: 'Chocolate' },

    tree: { ko: '나무', ja: '木', zh: '树', es: 'Árbol' },
    flower: { ko: '꽃', ja: '花', zh: '花', es: 'Flor' },
    cactus: { ko: '선인장', ja: 'サボテン', zh: '仙人掌', es: 'Cactus' },
    mushroom: { ko: '버섯', ja: 'キノコ', zh: '蘑菇', es: 'Hongo' },
    leaf: { ko: '나뭇잎', ja: '葉っぱ', zh: '叶子', es: 'Hoja' },
    palmtree: { ko: '야자나무', ja: 'ヤシの木', zh: '棕榈树', es: 'Palmera' },
    sunflower: { ko: '해바라기', ja: 'ヒマワリ', zh: '向日葵', es: 'Girasol' },
    fourleafclover: { ko: '네잎클로버', ja: '四つ葉のクローバー', zh: '四叶草', es: 'Trébol' },
    grapes: { ko: '포도', ja: 'ブドウ', zh: '葡萄', es: 'Uvas' },
    tulip: { ko: '튤립', ja: 'チューリップ', zh: '郁金香', es: 'Tulipán' },

    house: { ko: '집', ja: '家', zh: '房子', es: 'Casa' },
    clock: { ko: '시계', ja: '時計', zh: '时钟', es: 'Reloj' },
    giftbox: { ko: '선물상자', ja: 'プレゼント箱', zh: '礼物盒', es: 'Caja de regalo' },
    crown: { ko: '왕관', ja: '王冠', zh: '皇冠', es: 'Corona' },
    robot: { ko: '로봇', ja: 'ロボット', zh: '机器人', es: 'Robot' },
    guitar: { ko: '기타', ja: 'ギター', zh: '吉他', es: 'Guitarra' },
    kite: { ko: '연', ja: '凧', zh: '风筝', es: 'Cometa' },
    bell: { ko: '종', ja: 'ベル', zh: '铃铛', es: 'Campana' },
    envelope: { ko: '편지봉투', ja: '封筒', zh: '信封', es: 'Sobre' },
    soccerball: { ko: '축구공', ja: 'サッカーボール', zh: '足球', es: 'Balón de fútbol' },

    'boss-fairygirl': { ko: '요정 소녀', ja: '妖精ガール', zh: '精灵女孩', es: 'Chica hada' },
    'boss-mermaidgirl': { ko: '인어 소녀', ja: '人魚ガール', zh: '美人鱼女孩', es: 'Chica sirena' },
    'boss-witchgirl': { ko: '마법사 소녀', ja: '魔女ガール', zh: '女巫女孩', es: 'Chica bruja' },
    'boss-herogirl': { ko: '히어로 소녀', ja: 'ヒーローガール', zh: '英雄女孩', es: 'Chica heroína' }
  };

  // ================= 국기 선택 목록(app.js FLAG_OPTIONS)의 영어 라벨 → 언어별 국가명 =================
  var COUNTRY_NAMES = {
    Korea: { ko: '대한민국', ja: '韓国', zh: '韩国', es: 'Corea' },
    USA: { ko: '미국', ja: 'アメリカ', zh: '美国', es: 'EE. UU.' },
    Japan: { ko: '일본', ja: '日本', zh: '日本', es: 'Japón' },
    China: { ko: '중국', ja: '中国', zh: '中国', es: 'China' },
    UK: { ko: '영국', ja: 'イギリス', zh: '英国', es: 'Reino Unido' },
    France: { ko: '프랑스', ja: 'フランス', zh: '法国', es: 'Francia' },
    Germany: { ko: '독일', ja: 'ドイツ', zh: '德国', es: 'Alemania' },
    India: { ko: '인도', ja: 'インド', zh: '印度', es: 'India' },
    Brazil: { ko: '브라질', ja: 'ブラジル', zh: '巴西', es: 'Brasil' },
    Canada: { ko: '캐나다', ja: 'カナダ', zh: '加拿大', es: 'Canadá' },
    Australia: { ko: '호주', ja: 'オーストラリア', zh: '澳大利亚', es: 'Australia' },
    Spain: { ko: '스페인', ja: 'スペイン', zh: '西班牙', es: 'España' },
    Italy: { ko: '이탈리아', ja: 'イタリア', zh: '意大利', es: 'Italia' },
    Mexico: { ko: '멕시코', ja: 'メキシコ', zh: '墨西哥', es: 'México' },
    Russia: { ko: '러시아', ja: 'ロシア', zh: '俄罗斯', es: 'Rusia' },
    Vietnam: { ko: '베트남', ja: 'ベトナム', zh: '越南', es: 'Vietnam' },
    Philippines: { ko: '필리핀', ja: 'フィリピン', zh: '菲律宾', es: 'Filipinas' },
    Indonesia: { ko: '인도네시아', ja: 'インドネシア', zh: '印度尼西亚', es: 'Indonesia' },
    Thailand: { ko: '태국', ja: 'タイ', zh: '泰国', es: 'Tailandia' },
    Singapore: { ko: '싱가포르', ja: 'シンガポール', zh: '新加坡', es: 'Singapur' },
    Other: { ko: '기타', ja: 'その他', zh: '其他', es: 'Otro' }
  };

  // ================= 언어 감지/전환 =================
  function detectLang() {
    try {
      var saved = localStorage.getItem('appLang');
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) { /* 무시 */ }
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    for (var i = 0; i < SUPPORTED.length; i++) {
      if (nav.indexOf(SUPPORTED[i]) === 0) return SUPPORTED[i];
    }
    if (nav.indexOf('zh') === 0) return 'zh'; // zh-CN/zh-TW 등 방어
    return 'en';
  }

  var lang = detectLang();

  function t(key, vars) {
    var str = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.split('{' + k + '}').join(vars[k]);
      });
    }
    return str;
  }

  // tpl: templates.js의 도안 객체({id, name, ...}) 또는 보스 객체
  function templateName(tpl) {
    if (!tpl) return '';
    if (lang === 'en') return tpl.name;
    var m = TEMPLATE_NAMES[tpl.id];
    return (m && m[lang]) || tpl.name;
  }

  // enLabel: app.js FLAG_OPTIONS의 영어 국가명(예: 'Korea')
  function countryName(enLabel) {
    if (lang === 'en') return enLabel;
    var m = COUNTRY_NAMES[enLabel];
    return (m && m[lang]) || enLabel;
  }

  function setLang(l) {
    if (SUPPORTED.indexOf(l) === -1 || l === lang) return;
    try { localStorage.setItem('appLang', l); } catch (e) { /* 무시 */ }
    location.reload(); // 화면 전체를 다시 그리는 대신 새로고침으로 단순하게 전체 반영
  }

  // ================= 정적 문구 적용(data-i18n 계열 속성) =================
  function applyStatic() {
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      placeholders[j].setAttribute('placeholder', t(placeholders[j].getAttribute('data-i18n-placeholder')));
    }
    var ariaLabels = document.querySelectorAll('[data-i18n-aria-label]');
    for (var k = 0; k < ariaLabels.length; k++) {
      ariaLabels[k].setAttribute('aria-label', t(ariaLabels[k].getAttribute('data-i18n-aria-label')));
    }
  }

  // ================= 언어 전환 버튼(🌐, 표지 화면 우상단) =================
  function wireLangSwitcher() {
    var btn = document.getElementById('btn-lang');
    var menu = document.getElementById('lang-menu');
    if (!btn || !menu) return;
    btn.setAttribute('aria-label', t('langMenu.label'));
    var buttons = menu.querySelectorAll('[data-lang]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var code = b.getAttribute('data-lang');
      b.textContent = LANG_NAMES[code] || code;
      if (code === lang) b.classList.add('is-active');
      b.addEventListener('click', function () {
        setLang(this.getAttribute('data-lang'));
      });
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && e.target !== btn && !menu.contains(e.target)) menu.hidden = true;
    });
  }

  applyStatic();
  wireLangSwitcher();

  window.I18N = {
    lang: lang,
    SUPPORTED: SUPPORTED,
    t: t,
    templateName: templateName,
    countryName: countryName,
    setLang: setLang,
    applyStatic: applyStatic
  };
})();
