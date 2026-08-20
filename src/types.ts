/** ---------------- 主题 Tone ---------------- */
// Tone 统一定义在 @/lib/tones，此处导入用于接口字段
export type Tone = 'pink' | 'purple' | 'blue' | 'green' | 'yellow' | 'orange';
/** SpeakLang 唯一定义源；@/lib/speech 导入并 re-export 供调用方使用 */
export type SpeakLang = 'zh-CN' | 'en-US';

/** ---------------- 古诗 ---------------- */
export interface PoemChar {
  /** 汉字或标点 */
  c: string;
  /** 拼音；标点为空字符串 */
  p: string;
}

export interface PoemLine {
  text: string;
  chars: PoemChar[];
}

export interface Poem {
  id: string;
  title: string;
  titleChars: PoemChar[];
  author: string;
  dynasty: string;
  lines: PoemLine[];
  tags: string[];
  level: number;
}

/** 逐词/逐句注释 */
export interface PoemAnnotation {
  term: string;
  note: string;
}
export interface PoemAllusion {
  term: string;
  explain: string;
}

export interface AllusionSource {
  source: string;
  quote: string;
  evolve?: string;
}

export interface PoemLineNote {
  gloss: string;
  keys?: { term: string; note: string }[];
  point?: string;
}

export interface PoetProfile {
  name: string;
  dynasty: string;
  life: string;
  style?: string;
  epithet?: string;
  bio: string;
  timeline: { year: string; event: string }[];
  art: string;
  works: string[];
  sources: { title: string; note?: string }[];
}

export interface PoemRhetoric {
  type: string;
  where: string;
  explain: string;
}

export interface PoemProsodyManual {
  form: string;
  rhyme: string;
  antithesis: string[];
}

export interface PoemDossier {
  translation: string;
  annotations?: PoemAnnotation[];
  allusions?: PoemAllusion[];
  rhetoric?: PoemRhetoric[];
  prosody?: PoemProsodyManual;
  prosodyManual?: PoemProsodyManual;
  context?: string;
}

export interface DeepPoem extends Poem {
  formCategory?: string;
  genre?: string;
  themes?: string[];
  imagery?: string[];
  themeCategory?: string[];
  poetProfile?: PoetProfile;
  authorBio?: string;
  difficulty?: number;
  dossier?: PoemDossier;
  yunBu?: string;
}

export type PoemMarkField = 'chars' | 'lines';
export interface PoemMark {
  chars: string[];
  lines: number[];
  at: number;
}

export interface ReciteStat {
  best: number;
  runs: number;
  lastAt: number;
  stage: number;
}

/** ---------------- 题目与练习 ---------------- */
export type QuestionKind = 'math' | 'count' | 'number' | 'letter' | 'logic' | 'poem';

export interface OptionItem {

  id: string;
  label?: string;
  emoji?: string;
  shapes?: string[];
}

export interface QuizOption {
  id: string;
  label?: string;
  emoji?: string;
  shapes?: string[];
  correct?: boolean;
}

export interface Question {
  id: string;
  type?: QuestionKind;
  kind?: string;
  speak?: string;
  speakLang?: SpeakLang;
  prompt: string;
  display?: string;
  displayShapes?: string[];
  options: QuizOption[];
  answer?: number;
  answerId?: string;
  hint?: string;
  why?: string;
  skill: string;
  /** 题目难度档（1 易 / 2 中 / 3 难）：DDA 推荐 + 模块出题时标注，供难度感知的间隔重复使用 */
  difficulty?: 1 | 2 | 3;
}

export interface MasteryItem {
  lv: number;
  /** 首次达到 lv>=1（即「已掌握」）的日期 YYYY-MM-DD，用于每日「新掌握」目标统计；旧数据缺失视为非今日 */
  firstSeen?: string;
  interval?: number;
  dueAt?: number;
  due?: number;
  lastAt?: number;
  last?: number;
  ok: number;
  ng: number;
}

/** 每日成长快照：每次练习后按「当天」记录一次，用于家长报告的趋势曲线 */
export interface GrowthSnapshot {
  /** 日期键 YYYY-MM-DD */
  date: string;
  /** 记录时间戳 */
  at: number;
  /** 当天整体掌握率 0-1 */
  rate: number;
  /** 当天已接触知识点数 */
  touched: number;
  /** 当天已熟练知识点数 */
  mastered: number;
  /** 当天累计星星 */
  stars: number;
  /** A4: 当天错题本总数 */
  wrongCount?: number;
  /** A4: 当天新增错题数 */
  wrongNew?: number;
  /** A4: 当天消灭错题数 */
  wrongCleared?: number;
}

/** A4: 错题本历史统计（徽章用） */
export interface WrongHistory {
  /** 历史累计进入过错题本的不同 skill 数 */
  totalEver: number;
  /** 去重后的 skill 数 */
  uniqueSkills: number;
  /** 已消灭（升到 lv3 移出）的错题数 */
  cleared: number;
  /** 错题本历史最高水位 */
  maxCount: number;
  /** 训练中最高连击 */
  bestStreak: number;
  /** 连续训练天数 */
  dailyStreak: number;
  /** 最近训练日期 YYYY-MM-DD */
  lastTrainDate: string;
  /** AI 分析调用次数 */
  aiAnalyzeCount: number;
}

export interface DailyStat {
  sec: number;
  minutes?: number;
  items: number;
  ok: number;
  stars: number;
  lesson: boolean;

  /** 当日数学起始值（每日首次登录时记录，用于计算当日增量） */
  startMathTotal?: number;
  /** 当日数学答对起始值（每日首次登录时记录，用于计算「今日答对数学题」增量） */
  startMathCorrect?: number;
  /** 当日逻辑起始值（每日首次登录时记录，用于计算当日增量） */
  startLogicTotal?: number;
}

export interface Progress {
  stars: number;
  spent: number;
  badges: string[];
  /** 每枚徽章解锁的时间戳（ms），用于成就墙/护照展示解锁日期 */
  badgeDates: Record<string, number>;
  lettersHeard: string[];
  matchGamesWon: number;
  poemsRead: string[];
  poemFavorites: string[];
  poemNotes: Record<string, string>;
  poemMarks: Record<string, PoemMark>;
  poemRecite: Record<string, ReciteStat>;
  numbersHeard: number[];
  mathCorrect: number;
  mathTotal: number;
  countCorrect: number;
  logicCorrect: number;
  logicTotal: number;
  levelStars: Record<number, number>;
  unlockedLevel: number;
  lastVisit: string;
  streak: number;
  mastery: Record<string, MasteryItem>;
  /** 每日成长快照（最多保留约 4 个月），用于家长报告趋势曲线 */
  growth: GrowthSnapshot[];
  wrongBook: string[];
  dailyLog: Record<string, DailyStat>;
  traced: string[];
  stickers: string[];
  lessonDate: string;
  lessonStep: number;
  /** 每日成语复习奖励发放日期（当天完成一次 SRS 复习后置为今日） */
  reviewDate?: string;
  pkCount: number;
  creativeCount: number;
  /** 速算挑战累计答对数（专门用于 speed-20 徽章） */
  speedCorrect: number;
  /** 小游戏历史最高分（key: 游戏标识，value: 最高分） */
  gameBest: Record<string, number>;
  /** 学习养宠：小鱼干数量 */
  fishCount?: number;
  /** 学习养宠：猫咪爱心/亲密度 */
  catAffection?: number;
  /** 学习养宠：猫咪进化等级 (1: 幼猫, 2: 学童猫, 3: 博士喵, 4: 宇宙科学家喵) */
  catLevel?: number;
  /** 学习养宠：拥有互动玩具 */
  catToys?: string[];
  /** 学习养宠：正在进行的打工探险任务 */
  catQuests?: Array<{ id: string; name: string; endAt: number; reward: number }>;
  /** 学习养宠：饱食度 (0-100) */
  catFullness?: number;
  /** 学习养宠：清洁度 (0-100) */
  catCleanliness?: number;
  /** 学习养宠：上次结算饥饿/清洁的时间戳 */
  lastCatUpdate?: number;
  /** 学习养宠：已解锁的装扮 ID 列表 */
  unlockedOutfits?: string[];
  /** 学习养宠：当前佩戴的装扮 (key: type, value: outfitId) */
  equippedOutfits?: Record<string, string>;
  /** 小智陪伴伙伴：
   * - key = `explained_YYYY-MM-DD`，value = string[]（当天已讲解的主题 ID）
   * - key = `chatCount_YYYY-MM-DD`，value = number（当天聊天轮数）
   * 用于进度感知（已讲主题 ✓）+ 成就系统（聊天达人徽章）
   */
  /** companion 专用：键如 'chatCount_YYYY-MM-DD'(number) / 'explained_YYYY-MM-DD'(string[]) */
  chatHistory?: Record<string, string | number | string[]>;

  // —— S2 新增：学习搭子 ——
  buddyJudgeCount?: number;        // 总判断次数
  buddyCorrectJudge?: number;      // 判断正确次数
  buddyStreak?: number;            // 连续判断正确次数
  buddyDifficulty?: number;        // 当前难度等级 (1-3)

  // —— S2 新增：每日任务 ——
  dailyQuests?: Record<string, DailyQuest[]>;  // key = dateKey

  /** A4: 错题本历史统计（徽章用） */
  wrongHistory?: WrongHistory;

  /** 已保存的绘本列表（按保存时间倒序） */
  storybooks?: import('@/modules/storybook/types').SavedStorybook[];

  /** P4: 装备碎片（Boss掉落） */
  ownedFragments?: string[];
  /** P4: 已解锁装备ID列表 */
  ownedEquipment?: string[];
  /** P4: 当前装备的装扮（key: slot, value: equipmentId） */
  equippedItems?: Record<string, string>;
  /** P4: Boss战记录（key: levelId, value: { defeated: boolean, bestTurns: number }） */
  bossRecords?: Record<number, { defeated: boolean; bestTurns: number }>;

  // —— 研究模式（CMML）：跨会话聚合量，须与 createInitialProgress() 同步登记（C4 硬门槛）——
  /** 研究笔记（key: topicId，value: 一句话发现），仿 poemNotes 模式 */
  researchNotes: Record<string, string>;
  /** 收藏的知识卡 kvId 列表（跨会话资产，家长可见） */
  discoveries: string[];
  /** 研究行为计数（F19 行为型徽章唯一数据源，必须持久） */
  researchStats: ResearchStats;
}

/** 研究模式行为统计（F19 / ADR-003）：只统计探索行为，绝不读正确率/掌握度 */
export interface ResearchStats {
  /** 探索过的主题 id（去重）→ 徽章「博物学者」 */
  topicsExplored: string[];
  /** 累计探索交互次数 → 徽章「小小探险家」 */
  exploreActions: number;
  /** 读过的知识卡数（含降级兜底卡） */
  cardsRead: number;
  /** 完成的研究会话数（走到 COMPLETE） */
  sessionsCompleted: number;
  /** 累计探索时长（秒），家长中心用 */
  exploreSeconds: number;
}



/** ---------------- 徽章、贴纸与关卡 ---------------- */
export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  tone: Tone;
  /** 勋章配套图片资源（如 /medals/<id>.png），用于解锁弹窗与成就墙展示 */
  image?: string;
  meter?: (p: Progress) => [number, number];
  check: (p: Progress) => boolean;
}

export interface StickerDef {
  id: string;
  name: string;
  emoji: string;
  desc?: string;
  category?: string;
  album?: string;
  cost: number;
  tone?: Tone;
}

export interface LevelDef {
  id: number;
  name?: string;
  title?: string;
  desc?: string;
  emoji: string;
  tone: Tone;
  skills?: string[];
  kinds?: string[];
  difficulty?: number;
  count?: number;
}

export interface LessonSection {
  id: string;
  type?: string;
  kind?: string;
  title: string;
  subtitle?: string;
  sub?: string;
  emoji: string;
  tone: Tone;
  estSec?: number;
  count?: number;
  minutes?: number;
  skill?: string;
  /** 关联知识点引用：letter/number/hanzi/pinyin/poem/word 拼成 skill id，review 直接是完整 skill id */
  refs?: string[];
  /** 任意扩展数据（具体形态由生成方决定，统一收敛为键值对） */
  data?: Record<string, unknown>;
}

export interface DailyPlan {
  date: string;
  minutes?: number;
  dueCount?: number;
  sections: LessonSection[];
}

// —— S2 新增：每日任务 ——
export interface DailyQuest {
  id: string;
  type: 'math' | 'poem' | 'logic' | 'hanzi' | 'word' | 'game';
  title: string;
  targetCount: number;
  currentCount: number;
  reward: number;
  route: string;
  emoji: string;
  completed: boolean;
  completedAt?: number;
}
