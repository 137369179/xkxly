/**
 * playVariety — 玩法轮换调度器（抗单调 · 多玩法 · 认知负荷节律）
 * ─────────────────────────────────────────────────────────────────
 * 为什么需要它（研究依据，均可核验）：
 *  - 用户原声（宝宝巴士汉字应用宝评论区，2026-08 检索）：
 *    「就是游戏有点幼稚，孩子会不会玩腻呀……希望能多一些玩法」
 *    → 单一玩法是留存杀手，玩法池 + 轮换是第一优先级缺口。
 *  - MDPI《Adaptive Gamification in Preschool》SLR（Computers 15(7):464, 2026）：
 *    competition / badges 会给「部分儿童」带来压力，需谨慎标定挑战难度
 *    → 本调度器**不含排行榜、不含惩罚**，只用「换个玩法」制造新鲜感。
 *  - Panthong 等《Digital Triple-Code Model Game》RCT（Psicología Educativa,
 *    2026, 32:e260460，n=70，大效应量）：增益机制是
 *    「正向情绪 + 目标导向处理 + 降低认知负荷」
 *    → 用 load（认知负荷 1–3）交替节律，避免连续高负荷题。
 *  - LiterasiKu 印尼集群 RCT（2026，24 校 / 950 人 / 16 周）：
 *    口语阅读流畅度 d=0.58、最低四分位 d=0.74，且 16 周增益无衰减
 *    → 排除「新奇效应」解释，前提是玩法多样 + 持续难度适配。
 *  - 洪恩识字 v4.4.7（2026-08-22）：「每 5 字一单元测试」+ 游乐场上百小游戏
 *    → 一节课内玩法穿插，单元节点检测（buildSessionPlan 默认 length=5）。
 *
 * 设计约束（与 R144–R158 已建 @/game 基础设施一致）：
 *  - 纯函数、零 React 依赖、零 localStorage 依赖、零 WIP 依赖 → 可安全新建；
 *  - 确定性可测：随机数由注入的 seed 驱动（mulberry32），单测完全可复现；
 *  - 渐进式难度：band 上限跟随 DifficultyLevel，绝不超出孩子当前能力带；
 *  - 三核心以 `import { buildSessionPlan } from '@/game/playVariety'` 增量接入，
 *    学习逻辑零改动。
 */
import type { DifficultyLevel } from './useAdaptiveDifficulty';

/** 三核心模块键 */
export type ModuleKey = 'hanzi' | 'words' | 'numbers';

/** 难度带，与 DifficultyLevel 语义对齐 */
export type DifficultyBand = DifficultyLevel;

/** 认知负荷 1=轻（看/听辨认）2=中（拼装/归类）3=重（书写/速算） */
export type CognitiveLoad = 1 | 2 | 3;

export interface PlayMode {
  id: string;
  module: ModuleKey;
  /** 给孩子看的玩法名 */
  label: string;
  /** 一句话玩法说明（家长 / 引导语复用） */
  hint: string;
  /** 难度带：仅当 band <= 当前 level 才会被选中 */
  band: DifficultyBand;
  /** 认知负荷：用于交替节律，避免连续重负荷 */
  load: CognitiveLoad;
  /** 慢玩法（书写 / 跟读）：单节课内最多出现一次，防疲劳 */
  slow?: boolean;
}

/**
 * 玩法池：三核心各 6 种，覆盖「认 / 学 / 读 / 写 / 练 / 测」六类交互形态。
 * band 与 load 的取值不是拍脑袋：
 *  - band1 侧重辨认与感知（零基础也能上手，洪恩「低龄启蒙」段位）；
 *  - band2 侧重应用（组词、句子、算式，洪恩「中龄进阶」段位）；
 *  - band3 侧重迁移与速度（分类、反义、应用题，洪恩「大龄冲刺」段位）。
 */
/**
 * 用 `as const satisfies` 声明而非 `readonly PlayMode[]`：
 * 元组索引在 noUncheckedIndexedAccess 下仍是精确类型，因此 `PLAY_MODES[0]`
 * 可作为「理论不可达路径」的安全落点，无需 `!` 断言或 `any` 兜底。
 */
export const PLAY_MODES = [
  // ── 识字 hanzi ────────────────────────────────────────────────
  { id: 'hanzi-pictograph', module: 'hanzi', label: '象形动画', hint: '看汉字从图画变出来，记住它的样子', band: 1, load: 1 },
  { id: 'hanzi-listen-pick', module: 'hanzi', label: '听音选字', hint: '听一听，选出听到的那个字', band: 1, load: 1 },
  { id: 'hanzi-scene-learn', module: 'hanzi', label: '生活场景', hint: '在生活照片里找找这个字藏在哪', band: 1, load: 2 },
  { id: 'hanzi-trace-write', module: 'hanzi', label: '描红写字', hint: '用手指顺着笔画描一描', band: 2, load: 3, slow: true },
  { id: 'hanzi-word-builder', module: 'hanzi', label: '组词拼装', hint: '把这个字和别的字拼成一个词', band: 2, load: 2 },
  { id: 'hanzi-radical-sort', module: 'hanzi', label: '偏旁归类', hint: '把偏旁相同的字送回同一个家', band: 3, load: 3 },

  // ── 词语 words ────────────────────────────────────────────────
  { id: 'word-picture-match', module: 'words', label: '看图选词', hint: '看看图片，选出正确的词语', band: 1, load: 1 },
  { id: 'word-listen-pick', module: 'words', label: '听音选词', hint: '听一听，选出听到的词语', band: 1, load: 1 },
  { id: 'word-puzzle', module: 'words', label: '词语拼图', hint: '把打乱的字块拼成一个词语', band: 2, load: 2 },
  { id: 'word-sentence-fill', module: 'words', label: '句子填空', hint: '把词语放进句子正确的空里', band: 2, load: 2 },
  { id: 'word-category-sort', module: 'words', label: '词语分类', hint: '把同类词语放进同一个篮子', band: 3, load: 2 },
  { id: 'word-antonym-pair', module: 'words', label: '反义配对', hint: '找到意思相反的一对词语', band: 3, load: 3 },

  // ── 数学 numbers ──────────────────────────────────────────────
  { id: 'num-count-objects', module: 'numbers', label: '数物计数', hint: '数一数画面上有几个小东西', band: 1, load: 1 },
  { id: 'num-compare-size', module: 'numbers', label: '比大小', hint: '比一比，哪个数字更大', band: 1, load: 1 },
  { id: 'num-add-beads', module: 'numbers', label: '算珠加法', hint: '拨动算珠，算一算合起来是多少', band: 2, load: 2 },
  { id: 'num-number-line', module: 'numbers', label: '数轴跳跃', hint: '在数轴上向前跳、向后跳', band: 2, load: 2 },
  { id: 'num-speed-drill', module: 'numbers', label: '速算冲关', hint: '在沙漏漏完前答对更多题', band: 3, load: 3 },
  { id: 'num-story-problem', module: 'numbers', label: '应用题小故事', hint: '听完小故事，把算式补充完整', band: 3, load: 3 },
] as const satisfies readonly PlayMode[];

/**
 * 池首元素：所有「理论不可达」路径的安全落点（象形动画 —— 最低难度带、
 * 最低认知负荷，任何孩子都不会被难住）。PLAY_MODES 是编译期非空元组，
 * 因此这里无需运行时判空。
 */
const POOL_HEAD: PlayMode = PLAY_MODES[0];

/** 单节课默认题量：对齐洪恩「每 5 字一单元」与宝宝巴士「一课一练」 */
export const DEFAULT_SESSION_LENGTH = 5;

/** 连续不重复的窗口：最近 N 个玩法不再出现（N 受玩法池容量约束） */
const AVOID_REPEAT_WINDOW = 2;

/** 单节课内慢玩法（书写 / 跟读）上限，防止单节课过长导致疲劳 */
const MAX_SLOW_PER_SESSION = 1;

export interface PickNextModeOptions {
  module: ModuleKey;
  /** 当前自适应难度等级（band 上限） */
  level: DifficultyBand;
  /** 最近已玩过的玩法 id 序列（越靠后越近期），按窗口去重 */
  recent?: readonly string[];
  /**
   * 硬性排除的玩法 id（通常是「本节课已经玩过的」）。
   * 与 recent 的区别：exclude 是强约束，只有在「不放宽就会超出难度带」
   * 时才会被放宽；recent 只是抗单调的软约束，优先级更低。
   */
  exclude?: readonly string[];
  /** 上一个玩法的认知负荷，用于交替节律（不传则不启用负荷交替） */
  lastLoad?: CognitiveLoad;
  /** 本节课已用掉的慢玩法次数 */
  slowUsed?: number;
  /** 随机种子（同 seed → 同结果，便于单测与课堂可复现） */
  seed?: number;
}

/**
 * 确定性伪随机（mulberry32）：无 Math.random，保证单测可复现、
 * 家长复盘时同一节课能重放同一玩法序列。
 */
function makeRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 取某模块（可选难度带上限）下的玩法池 */
export function modesFor(module: ModuleKey, band?: DifficultyBand): PlayMode[] {
  return PLAY_MODES.filter((m) => m.module === module && (band === undefined || m.band <= band));
}

function takeRecentSet(recent: readonly string[], poolSize: number): Set<string> {
  const window = Math.min(AVOID_REPEAT_WINDOW, Math.max(0, poolSize - 1));
  const tail = recent.slice(Math.max(0, recent.length - window));
  return new Set(tail);
}

/**
 * 选出下一个玩法。
 *
 * 优先级（自上而下逐级收窄，逐级兜底，保证任何入参都有返回值）：
 *  1. 模块 + 难度带上限（渐进式难度，绝不超能力带）
 *  2. 本节课不重复（exclude）
 *  3. 最近 N 次不重复（recent，跨节课抗单调）
 *  4. 慢玩法配额（疲劳控制）
 *  5. 认知负荷交替：上一题重负荷时优先降负荷（TCM 2026「降低认知负荷」）
 *  6. 同级内按 seed 确定性随机
 *
 * 全部被过滤时会**逐级放宽**（负荷交替 → 跨节 recent → 慢玩法配额 →
 * 本节 exclude → 最后才是难度带）。注意顺序：宁可在一节课内重复一个
 * 已玩过的玩法，也绝不把孩子推到超出当前能力带的玩法上 —— 难度越界
 * 带来的是挫败感，玩法重复只是轻微的新鲜感折扣。
 */
export function pickNextMode(options: PickNextModeOptions): PlayMode {
  const { module, level, recent = [], exclude = [], lastLoad, slowUsed = 0, seed = 1 } = options;
  const all = modesFor(module);
  if (all.length === 0) {
    // 兜底：未知模块时退回首个人气玩法，绝不返回 undefined
    return POOL_HEAD;
  }

  const rand = makeRandom(seed);
  const slowQuotaLeft = Math.max(0, MAX_SLOW_PER_SESSION - slowUsed);

  /** 依次尝试若干组筛选条件，取第一组非空结果 */
  const attempts: Array<(m: PlayMode) => boolean>[] = [];

  const excluded = new Set(exclude);
  const inBand = (m: PlayMode) => m.band <= level;
  const notExcluded = (m: PlayMode) => !excluded.has(m.id);
  const notRecent = (m: PlayMode) => !takeRecentSet(recent, all.length).has(m.id);
  const slowOk = (m: PlayMode) => !m.slow || slowQuotaLeft > 0;
  const loadOk = (m: PlayMode) => lastLoad === undefined || !(lastLoad >= 2 && m.load >= 3);

  // 理想态：带内 + 本节不重复 + 近期不重复 + 慢玩法配额 + 负荷交替
  attempts.push([inBand, notExcluded, notRecent, slowOk, loadOk]);
  // 放宽负荷交替（玩法池偏重负荷时的正常降级）
  attempts.push([inBand, notExcluded, notRecent, slowOk]);
  // 放宽跨节 recent（历史记录很长时的正常降级）
  attempts.push([inBand, notExcluded, slowOk]);
  // 放宽慢玩法配额（玩法池被难度带压得很窄时）
  attempts.push([inBand, notExcluded]);
  // 难度带内已无可换玩法：宁可本节内重复，也不越难度带
  attempts.push([inBand]);
  // 极端兜底：任意玩法（例如 level 被误传为 0）
  attempts.push([() => true]);

  for (const predicates of attempts) {
    const pool = all.filter((m) => predicates.every((p) => p(m)));
    if (pool.length > 0) {
      const index = Math.floor(rand() * pool.length);
      const picked = pool[Math.min(index, pool.length - 1)];
      if (picked) return picked;
    }
  }
  return POOL_HEAD;
}

export interface BuildSessionPlanOptions {
  module: ModuleKey;
  level: DifficultyBand;
  /** 本节课题量，默认 5（对齐「每 5 字一单元 / 一课一练」） */
  length?: number;
  /** 历史已玩玩法（用于跨节课继续抗单调） */
  recent?: readonly string[];
  seed?: number;
}

/**
 * 生成一节课的玩法序列。
 *
 * 节律规则：
 *  - 玩法不重复（窗口内），跨轮携带 recent，连上历史记录继续抗单调；
 *  - 前一题重负荷后降负荷（认知负荷交替）；
 *  - 慢玩法（书写 / 跟读）整节课最多 1 次，避免单节课拖长；
 *  - 难度带始终 <= level，最后一题允许触及孩子当前最高带（收尾给成就感）。
 */
export function buildSessionPlan(options: BuildSessionPlanOptions): PlayMode[] {
  const { module, level, length = DEFAULT_SESSION_LENGTH, recent = [], seed = 1 } = options;
  // 题量兜底：0 / 负数 → 1 题；非有限数 → 默认 5 题。注意不能写
  // `Math.floor(length) || DEFAULT`，因为 0 是 falsy 会被误换成默认值。
  const raw = Math.floor(length);
  const total = Number.isFinite(raw) ? Math.max(1, raw) : DEFAULT_SESSION_LENGTH;

  const history: string[] = [...recent];
  const usedThisSession: string[] = [];
  const plan: PlayMode[] = [];
  let slowUsed = 0;
  let lastLoad: CognitiveLoad | undefined;

  for (let i = 0; i < total; i += 1) {
    const isFinal = i === total - 1;
    // 收尾一题允许触及当前最高带（给「我做到了」的成就感），
    // 其余题目保持带内即可，seed 递增让每题独立取值。
    const picked = pickNextMode({
      module,
      level: isFinal ? level : Math.max(1, level - (i === 0 ? 1 : 0)) as DifficultyBand,
      recent: history,
      exclude: usedThisSession,
      lastLoad,
      slowUsed,
      seed: seed + i * 7919,
    });
    plan.push(picked);
    history.push(picked.id);
    usedThisSession.push(picked.id);
    lastLoad = picked.load;
    if (picked.slow) slowUsed += 1;
  }

  return plan;
}
