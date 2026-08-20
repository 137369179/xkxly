import { dateKey } from '@/lib/dailyPlan';
import type { BadgeDef, Progress } from '@/types';
import { MEDALS } from '@/data/medals';

const totalLevels = 18;

export const BADGES: BadgeDef[] = [
  ...MEDALS,
  {
    id: 'first-step',
    name: '启程小星',
    desc: '第一次来到学习乐园',
    emoji: '🌟',
    tone: 'yellow',
    check: () => true,
  },
  {
    id: 'letter-10',
    name: '字母启蒙',
    desc: '认识 10 个英文字母',
    emoji: '🔤',
    tone: 'blue',
    check: (p) => p.lettersHeard.length >= 10,
    meter: (p) => [p.lettersHeard.length, 10],
  },
  {
    id: 'letter-all',
    name: '字母全通',
    desc: '认识全部 26 个字母',
    emoji: '🎓',
    tone: 'purple',
    check: (p) => p.lettersHeard.length >= 26,
    meter: (p) => [p.lettersHeard.length, 26],
  },
  {
    id: 'match-1',
    name: '配对新手',
    desc: '完成 1 局大小写配对',
    emoji: '🧩',
    tone: 'green',
    check: (p) => p.matchGamesWon >= 1,
    meter: (p) => [p.matchGamesWon, 1],
  },
  {
    id: 'match-5',
    name: '配对高手',
    desc: '完成 5 局大小写配对',
    emoji: '🏅',
    tone: 'orange',
    check: (p) => p.matchGamesWon >= 5,
    meter: (p) => [p.matchGamesWon, 5],
  },
  {
    id: 'poem-1',
    name: '诗词萌芽',
    desc: '朗读第一首古诗',
    emoji: '🌱',
    tone: 'green',
    check: (p) => p.poemsRead.length >= 1,
    meter: (p) => [p.poemsRead.length, 1],
  },
  {
    id: 'poem-10',
    name: '小小诗童',
    desc: '朗读 10 首古诗',
    emoji: '📜',
    tone: 'pink',
    check: (p) => p.poemsRead.length >= 10,
    meter: (p) => [p.poemsRead.length, 10],
  },
  {
    id: 'poem-50',
    name: '诗词达人',
    desc: '朗读 50 首古诗',
    emoji: '🖋️',
    tone: 'purple',
    check: (p) => p.poemsRead.length >= 50,
    meter: (p) => [p.poemsRead.length, 50],
  },
  {
    id: 'poem-100',
    name: '诗坛小才子',
    desc: '朗读 100 首古诗',
    emoji: '👑',
    tone: 'yellow',
    check: (p) => p.poemsRead.length >= 100,
    meter: (p) => [p.poemsRead.length, 100],
  },
  {
    id: 'number-20',
    name: '数字新手',
    desc: '认识 20 个数字',
    emoji: '🔢',
    tone: 'blue',
    check: (p) => p.numbersHeard.length >= 20,
    meter: (p) => [p.numbersHeard.length, 20],
  },
  {
    id: 'number-all',
    name: '百数小王',
    desc: '认识 0 到 100 全部数字',
    emoji: '💯',
    tone: 'orange',
    check: (p) => p.numbersHeard.length >= 101,
    meter: (p) => [p.numbersHeard.length, 101],
  },
  {
    id: 'math-20',
    name: '算术小能手',
    desc: '答对 20 道加减法',
    emoji: '➕',
    tone: 'green',
    check: (p) => p.mathCorrect >= 20,
    meter: (p) => [p.mathCorrect, 20],
  },
  {
    id: 'math-100',
    name: '心算达人',
    desc: '答对 100 道加减法',
    emoji: '🧠',
    tone: 'purple',
    check: (p) => p.mathCorrect >= 100,
    meter: (p) => [p.mathCorrect, 100],
  },
  {
    id: 'count-15',
    name: '数数专家',
    desc: '数数游戏答对 15 次',
    emoji: '🍎',
    tone: 'pink',
    check: (p) => p.countCorrect >= 15,
    meter: (p) => [p.countCorrect, 15],
  },
  {
    id: 'logic-20',
    name: '逻辑之星',
    desc: '逻辑题答对 20 道',
    emoji: '🔷',
    tone: 'blue',
    check: (p) => p.logicCorrect >= 20,
    meter: (p) => [p.logicCorrect, 20],
  },
  {
    id: 'logic-60',
    name: '规律大师',
    desc: '逻辑题答对 60 道',
    emoji: '🧭',
    tone: 'purple',
    check: (p) => p.logicCorrect >= 60,
    meter: (p) => [p.logicCorrect, 60],
  },
  {
    id: 'adv-1',
    name: '闯关先锋',
    desc: '通过第 1 关',
    emoji: '🚩',
    tone: 'green',
    check: (p) => Object.keys(p.levelStars).length >= 1,
    meter: (p) => [Object.keys(p.levelStars).length, 1],
  },
  {
    id: 'adv-6',
    name: '勇敢冒险家',
    desc: '通过 6 个关卡',
    emoji: '🗺️',
    tone: 'orange',
    check: (p) => Object.keys(p.levelStars).length >= 6,
    meter: (p) => [Object.keys(p.levelStars).length, 6],
  },
  {
    id: 'adv-all',
    name: '冒险之王',
    desc: '通关全部 12 关',
    emoji: '🏆',
    tone: 'yellow',
    check: (p) => Object.keys(p.levelStars).length >= totalLevels,
    meter: (p) => [Object.keys(p.levelStars).length, totalLevels],
  },
  {
    id: 'adv-perfect',
    name: '完美通关',
    desc: '全部 18 关都拿到 3 颗星',
    emoji: '💎',
    tone: 'blue',
    check: (p) => {
      const vals = Object.values(p.levelStars);
      return vals.length >= totalLevels && vals.every((v) => v >= 3);
    },
    meter: (p) => [Object.values(p.levelStars).filter((v) => v >= 3).length, totalLevels],
  },
  {
    id: 'star-50',
    name: '星星收藏家',
    desc: '累计获得 50 颗星星',
    emoji: '⭐',
    tone: 'yellow',
    check: (p) => p.stars >= 50,
    meter: (p) => [p.stars, 50],
  },
  {
    id: 'star-200',
    name: '星光璀璨',
    desc: '累计获得 200 颗星星',
    emoji: '✨',
    tone: 'pink',
    check: (p) => p.stars >= 200,
    meter: (p) => [p.stars, 200],
  },
  {
    id: 'streak-3',
    name: '坚持三天',
    desc: '连续 3 天来学习',
    emoji: '🔥',
    tone: 'orange',
    check: (p) => p.streak >= 3,
    meter: (p) => [p.streak, 3],
  },
  {
    id: 'streak-7',
    name: '一周不断',
    desc: '连续 7 天来学习',
    emoji: '🎯',
    tone: 'green',
    check: (p) => p.streak >= 7,
    meter: (p) => [p.streak, 7],
  },
  /* ====== E1: 新模块徽章 ====== */
  {
    id: 'hanzi-50',
    name: '识字起步',
    desc: '学认 50 个汉字',
    emoji: '🀄',
    tone: 'green',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('hanzi:')).length >= 50,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('hanzi:')).length, 50],
  },
  {
    id: 'hanzi-150',
    name: '识字小达人',
    desc: '学认 150 个汉字',
    emoji: '📖',
    tone: 'blue',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('hanzi:')).length >= 150,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('hanzi:')).length, 150],
  },
  {
    id: 'hanzi-300',
    name: '识字大王',
    desc: '学完全部 300 个汉字',
    emoji: '👑',
    tone: 'purple',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('hanzi:')).length >= 300,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('hanzi:')).length, 300],
  },
  {
    id: 'pinyin-30',
    name: '拼音初学',
    desc: '学会 30 个拼音',
    emoji: '📋',
    tone: 'blue',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('pinyin:')).length >= 30,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('pinyin:')).length, 30],
  },
  {
    id: 'pinyin-all',
    name: '拼音全通',
    desc: '学会全部 63 个拼音',
    emoji: '🔤',
    tone: 'purple',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('pinyin:')).length >= 63,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('pinyin:')).length, 63],
  },
  {
    id: 'word-30',
    name: '单词起步',
    desc: '学会 30 个英语单词',
    emoji: '🌐',
    tone: 'pink',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('word:')).length >= 30,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('word:')).length, 30],
  },
  {
    id: 'word-all',
    name: '单词小王',
    desc: '学会全部 74 个单词',
    emoji: '💬',
    tone: 'orange',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('word:')).length >= 74,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('word:')).length, 74],
  },
  {
    id: 'phonics-20',
    name: '拼读入门',
    desc: '学会 20 条 Phonics 规则',
    emoji: '🗣️',
    tone: 'blue',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('phonics:')).length >= 20,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('phonics:')).length, 20],
  },
  {
    id: 'code-lv3',
    name: '小编程员',
    desc: '通过编程第 3 关',
    emoji: '🤖',
    tone: 'green',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('code:')).length >= 3,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('code:')).length, 3],
  },
  {
    id: 'code-all',
    name: '编程高手',
    desc: '通过全部 5 个编程关',
    emoji: '💻',
    tone: 'purple',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('code:')).length >= 5,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('code:')).length, 5],
  },
  {
    id: 'listen-20',
    name: '听力小星',
    desc: '听力训练答对 20 题',
    emoji: '👂',
    tone: 'blue',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('listen:')).reduce((s, k) => s + (p.mastery[k]?.ok ?? 0), 0) >= 20,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('listen:')).reduce((s, k) => s + (p.mastery[k]?.ok ?? 0), 0), 20],
  },
  {
    id: 'listen-50',
    name: '听力达人',
    desc: '听力训练答对 50 题',
    emoji: '🎧',
    tone: 'purple',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('listen:')).reduce((s, k) => s + (p.mastery[k]?.ok ?? 0), 0) >= 50,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('listen:')).reduce((s, k) => s + (p.mastery[k]?.ok ?? 0), 0), 50],
  },
  {
    id: 'pk-1',
    name: '对战初体验',
    desc: '完成 1 次双人对战',
    emoji: '⚔️',
    tone: 'purple',
    check: (p) => (p.pkCount ?? 0) >= 1,
    meter: (p) => [p.pkCount ?? 0, 1],
  },
  {
    id: 'pk-5',
    name: '对战小冠军',
    desc: '参加 5 次双人对战',
    emoji: '🥇',
    tone: 'orange',
    check: (p) => p.pkCount >= 5,
  },
  {
    id: 'creative-1',
    name: '创意萌芽',
    desc: '完成 1 次创意表达',
    emoji: '🎨',
    tone: 'pink',
    check: (p) => p.creativeCount >= 1,
  },
  {
    id: 'tree-lv3',
    name: '成长小树',
    desc: '成长树达到 3 级',
    emoji: '🌳',
    tone: 'green',
    check: (p) => {
      const total = Object.values(p.dailyLog).reduce((s, d) => s + (d?.items ?? 0), 0);
      return total >= 60;
    },
    meter: (p) => {
      const total = Object.values(p.dailyLog).reduce((s, d) => s + (d?.items ?? 0), 0);
      return [Math.min(total, 60), 60];
    },
  },
  {
    id: 'tree-lv5',
    name: '参天大树',
    desc: '成长树达到 5 级',
    emoji: '🌲',
    tone: 'purple',
    check: (p) => {
      const total = Object.values(p.dailyLog).reduce((s, d) => s + (d?.items ?? 0), 0);
      return total >= 200;
    },
    meter: (p) => {
      const total = Object.values(p.dailyLog).reduce((s, d) => s + (d?.items ?? 0), 0);
      return [Math.min(total, 200), 200];
    },
  },
  {
    id: 'streak-30',
    name: '月度坚持',
    desc: '连续 30 天来学习',
    emoji: '💎',
    tone: 'blue',
    check: (p) => p.streak >= 30,
    meter: (p) => [p.streak, 30],
  },
  {
    id: 'star-500',
    name: '星海灿烂',
    desc: '累计获得 500 颗星星',
    emoji: '🌠',
    tone: 'purple',
    check: (p) => p.stars >= 500,
    meter: (p) => [p.stars, 500],
  },
  {
    id: 'recite-10',
    name: '背诵小诗人',
    desc: '背诵 10 首古诗',
    emoji: '🎤',
    tone: 'pink',
    check: (p) => Object.keys(p.poemRecite).length >= 10,
    meter: (p) => [Object.keys(p.poemRecite).length, 10],
  },
  {
    id: 'idiom-10',
    name: '成语小达人',
    desc: '学会 10 个成语',
    emoji: '🏯',
    tone: 'purple',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('idiom:') && (p.mastery[k]?.lv ?? 0) >= 1).length >= 10,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('idiom:') && (p.mastery[k]?.lv ?? 0) >= 1).length, 10],
  },
  {
    id: 'idiom-30',
    name: '成语小博士',
    desc: '学会 30 个成语',
    emoji: '📚',
    tone: 'purple',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('idiom:') && (p.mastery[k]?.lv ?? 0) >= 1).length >= 30,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('idiom:') && (p.mastery[k]?.lv ?? 0) >= 1).length, 30],
  },
  {
    id: 'sentence-10',
    name: '句子小能手',
    desc: '学会 10 个英语句子',
    emoji: '🗣️',
    tone: 'blue',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('sentence:') && (p.mastery[k]?.lv ?? 0) >= 1).length >= 10,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('sentence:') && (p.mastery[k]?.lv ?? 0) >= 1).length, 10],
  },
  {
    id: 'speed-20',
    name: '速算小达人',
    desc: '速算挑战答对 20 题',
    emoji: '⚡',
    tone: 'green',
    check: (p) => (p.speedCorrect ?? 0) >= 20,
    meter: (p) => [p.speedCorrect ?? 0, 20],
  },
  /* ====== A5: 儿歌模块徽章 ====== */
  {
    id: 'rhyme-1',
    name: '儿歌初啼',
    desc: '学会 1 首儿歌',
    emoji: '🎵',
    tone: 'pink',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('rhyme:') && (p.mastery[k]?.lv ?? 0) >= 1).length >= 1,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('rhyme:') && (p.mastery[k]?.lv ?? 0) >= 1).length, 1],
  },
  {
    id: 'rhyme-5',
    name: '儿歌小百灵',
    desc: '学会 5 首儿歌',
    emoji: '🎶',
    tone: 'purple',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('rhyme:') && (p.mastery[k]?.lv ?? 0) >= 1).length >= 5,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('rhyme:') && (p.mastery[k]?.lv ?? 0) >= 1).length, 5],
  },
  {
    id: 'rhyme-all',
    name: '儿歌大王',
    desc: '学会全部 10 首儿歌',
    emoji: '🎤',
    tone: 'yellow',
    check: (p) => Object.keys(p.mastery).filter(k => k.startsWith('rhyme:') && (p.mastery[k]?.lv ?? 0) >= 1).length >= 10,
    meter: (p) => [Object.keys(p.mastery).filter(k => k.startsWith('rhyme:') && (p.mastery[k]?.lv ?? 0) >= 1).length, 10],
  },
  // ── 小智伙伴徽章 ──────────────────────────────────────
  {
    id: 'chat-buddy',
    name: '聊天达人',
    desc: '和小智聊了 5 轮',
    emoji: '💬',
    tone: 'purple',
    check: (p) => {
      const today = dateKey();
      const count = p.chatHistory?.[`chatCount_${today}`] ?? 0;
      return typeof count === 'number' && count >= 5;
    },
  },
  {
    id: 'study-buddy',
    name: '学习小博士',
    desc: '今天听了 3 个讲解',
    emoji: '📖',
    tone: 'blue',
    check: (p) => {
      const today = dateKey();
      const arr: string[] = (p.chatHistory?.[`explained_${today}`] as string[] | undefined) ?? [];
      return arr.length >= 3;
    },
  },
  /* ====== A4: 错题本徽章链 ====== */
  {
    id: 'wrong-first',
    name: '错题初遇',
    desc: '累计 1 次错题',
    emoji: '🌱',
    tone: 'green',
    check: (p) => (p.wrongHistory?.totalEver ?? 0) >= 1 || p.wrongBook.length >= 1,
    meter: (p) => [Math.min(p.wrongHistory?.totalEver ?? p.wrongBook.length, 1), 1],
  },
  {
    id: 'wrong-10',
    name: '错题收集家',
    desc: '累计 10 次错题',
    emoji: '📒',
    tone: 'blue',
    check: (p) => (p.wrongHistory?.totalEver ?? 0) >= 10,
    meter: (p) => [Math.min(p.wrongHistory?.totalEver ?? 0, 10), 10],
  },
  {
    id: 'wrong-50',
    name: '错题研究者',
    desc: '累计 50 次错题',
    emoji: '🔬',
    tone: 'purple',
    check: (p) => (p.wrongHistory?.totalEver ?? 0) >= 50,
    meter: (p) => [Math.min(p.wrongHistory?.totalEver ?? 0, 50), 50],
  },
  {
    id: 'wrong-kill-5',
    name: '错题消灭者·铜',
    desc: '消灭 5 道错题',
    emoji: '⚔️',
    tone: 'orange',
    check: (p) => (p.wrongHistory?.cleared ?? 0) >= 5,
    meter: (p) => [Math.min(p.wrongHistory?.cleared ?? 0, 5), 5],
  },
  {
    id: 'wrong-kill-20',
    name: '错题消灭者·银',
    desc: '消灭 20 道错题',
    emoji: '🛡️',
    tone: 'yellow',
    check: (p) => (p.wrongHistory?.cleared ?? 0) >= 20,
    meter: (p) => [Math.min(p.wrongHistory?.cleared ?? 0, 20), 20],
  },
  {
    id: 'wrong-kill-50',
    name: '错题消灭者·金',
    desc: '消灭 50 道错题',
    emoji: '🏆',
    tone: 'orange',
    check: (p) => (p.wrongHistory?.cleared ?? 0) >= 50,
    meter: (p) => [Math.min(p.wrongHistory?.cleared ?? 0, 50), 50],
  },
  {
    id: 'wrong-streak-10',
    name: '连续消灭',
    desc: '连续答对 10 道错题',
    emoji: '🔥',
    tone: 'orange',
    check: (p) => (p.wrongHistory?.bestStreak ?? 0) >= 10,
    meter: (p) => [Math.min(p.wrongHistory?.bestStreak ?? 0, 10), 10],
  },
  {
    id: 'wrong-streak-30',
    name: '消灭大师',
    desc: '连续答对 30 道错题',
    emoji: '💪',
    tone: 'purple',
    check: (p) => (p.wrongHistory?.bestStreak ?? 0) >= 30,
    meter: (p) => [Math.min(p.wrongHistory?.bestStreak ?? 0, 30), 30],
  },
  {
    id: 'wrong-zero-day',
    name: '零错日',
    desc: '一天 0 错题',
    emoji: '🌟',
    tone: 'green',
    check: (p) => {
      const today = dateKey();
      const todayLog = p.dailyLog[today];
      return !!todayLog && todayLog.items > 0 && todayLog.ok === todayLog.items;
    },
  },
  {
    id: 'wrong-terminator',
    name: '错题终结者',
    desc: '消灭 100 道错题',
    emoji: '👑',
    tone: 'pink',
    check: (p) => (p.wrongHistory?.cleared ?? 0) >= 100,
    meter: (p) => [Math.min(p.wrongHistory?.cleared ?? 0, 100), 100],
  },
  /* ====== P4: Boss战徽章 ====== */
  {
    id: 'boss-first',
    name: 'Boss猎人',
    desc: '击败第一个Boss',
    emoji: '🗡️',
    tone: 'orange',
    check: (p) => {
      const records = p.bossRecords ?? {};
      return Object.values(records).some(r => r.defeated);
    },
    meter: (p) => {
      const records = p.bossRecords ?? {};
      const count = Object.values(records).filter(r => r.defeated).length;
      return [Math.min(count, 1), 1];
    },
  },
  {
    id: 'boss-3',
    name: '勇者之心',
    desc: '击败3个Boss',
    emoji: '💪',
    tone: 'orange',
    check: (p) => {
      const records = p.bossRecords ?? {};
      return Object.values(records).filter(r => r.defeated).length >= 3;
    },
    meter: (p) => {
      const records = p.bossRecords ?? {};
      const count = Object.values(records).filter(r => r.defeated).length;
      return [Math.min(count, 3), 3];
    },
  },
  {
    id: 'boss-all',
    name: '冒险之王',
    desc: '击败全部6个Boss',
    emoji: '👑',
    tone: 'yellow',
    check: (p) => {
      const records = p.bossRecords ?? {};
      return Object.values(records).filter(r => r.defeated).length >= 6;
    },
    meter: (p) => {
      const records = p.bossRecords ?? {};
      const count = Object.values(records).filter(r => r.defeated).length;
      return [Math.min(count, 6), 6];
    },
  },
  {
    id: 'boss-perfect',
    name: '无伤通关',
    desc: '完美击败任意Boss',
    emoji: '💎',
    tone: 'blue',
    check: (p) => {
      const records = p.bossRecords ?? {};
      return Object.values(records).some(r => r.defeated && r.bestTurns <= 5);
    },
  },
  {
    id: 'equip-first',
    name: '装备初成',
    desc: '解锁第一件装备',
    emoji: '🎒',
    tone: 'green',
    check: (p) => (p.ownedEquipment?.length ?? 0) >= 1,
    meter: (p) => [Math.min(p.ownedEquipment?.length ?? 0, 1), 1],
  },
  {
    id: 'equip-all',
    name: '全身神装',
    desc: '解锁全部6件装备',
    emoji: '✨',
    tone: 'purple',
    check: (p) => (p.ownedEquipment?.length ?? 0) >= 6,
    meter: (p) => [Math.min(p.ownedEquipment?.length ?? 0, 6), 6],
  },
  // —— 研究模式（CMML）F19 行为型徽章（2026-08-12，Sprint 3）——
  {
    id: 'research-first',
    name: '小小研究员',
    desc: '完成第一次研究',
    emoji: '🔬',
    tone: 'blue',
    check: (p) => (p.researchStats?.sessionsCompleted ?? 0) >= 1,
    meter: (p) => [Math.min(p.researchStats?.sessionsCompleted ?? 0, 1), 1],
  },
  {
    id: 'research-explore-20',
    name: '好奇宝宝',
    desc: '探索 20 次',
    emoji: '🔍',
    tone: 'orange',
    check: (p) => (p.researchStats?.exploreActions ?? 0) >= 20,
    meter: (p) => [Math.min(p.researchStats?.exploreActions ?? 0, 20), 20],
  },
  {
    id: 'research-topics-5',
    name: '博物学者',
    desc: '探索 5 个主题',
    emoji: '🗺️',
    tone: 'green',
    check: (p) => (p.researchStats?.topicsExplored.length ?? 0) >= 5,
    meter: (p) => [Math.min(p.researchStats?.topicsExplored.length ?? 0, 5), 5],
  },
  {
    id: 'research-cards-3',
    name: '知识收集家',
    desc: '读 3 张知识卡',
    emoji: '🃏',
    tone: 'pink',
    check: (p) => (p.researchStats?.cardsRead ?? 0) >= 3,
    meter: (p) => [Math.min(p.researchStats?.cardsRead ?? 0, 3), 3],
  },
  {
    id: 'research-notes-5',
    name: '笔记小达人',
    desc: '写 5 条研究笔记',
    emoji: '📝',
    tone: 'purple',
    check: (p) => Object.keys(p.researchNotes ?? {}).length >= 5,
    meter: (p) => [Math.min(Object.keys(p.researchNotes ?? {}).length, 5), 5],
  },
  {
    id: 'logic-150',
    name: '逻辑大师',
    desc: '答对 150 道逻辑题',
    emoji: '🏆',
    tone: 'orange',
    check: (p) => p.logicCorrect >= 150,
    meter: (p) => [Math.min(p.logicCorrect, 150), 150],
  },
];

export const BADGE_MAP = new Map(BADGES.map((b) => [b.id, b]));

/** 计算当前应当解锁但尚未记录的徽章 */
export function findNewBadges(p: Progress): string[] {
  const owned = new Set(p.badges);
  return BADGES.filter((b) => !owned.has(b.id) && b.check(p)).map((b) => b.id);
}
