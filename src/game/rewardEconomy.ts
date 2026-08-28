/**
 * rewardEconomy — 星星经济与扭蛋解锁层（奖励解锁 · 成长目标感）
 * ─────────────────────────────────────────────────────────────────
 * 为什么需要它（研究依据，均可核验）：
 *  - 帮帮识字 v3.47.1 / v3.50.0（2026-08-28 检索）：
 *    「完成任务会获得星星，星星能在商城兑换学习道具，激发学习兴趣」
 *    → 星星必须是**可累积、可支配**的货币，而不是一次性的表现评分。
 *  - 宝宝巴士汉字（更新日志 2026-08 / V9.80.20.10）：
 *    「跟读新体验：当孩子准确读出『手』等汉字时，扭蛋机会惊喜开启，
 *    变出与字义相关联的物品」
 *    → 惊喜式解锁（gacha）是被头部产品验证的即时正强化手段。
 *  - 洪恩识字 v4.4.7（2026-08-22）：每 5 字一单元、每 10 字解锁一本绘本
 *    → 解锁节奏要**成阶梯**，孩子始终看得见下一个目标。
 *
 * 本仓库当前缺口（代码级证据）：
 *  - `src/lib/stars.ts` 只提供 starsByRate / starsByCorrect / starsByMistakes，
 *    语义是**单次表现评级（1–3 星档位）**，没有余额、没有消费、没有解锁；
 *  - `StarQuest` 系列把已掌握字数映射为四级里程碑地图，属于**成果展示**，
 *    孩子无法主动「攒星星换东西」。
 *  → 「奖励解锁」这一支柱在本项目只有展示层，缺可支配的激励闭环。
 *    rewardEconomy 补齐的就是这一层：赚 → 攒 → 花 → 解锁 → 新目标。
 *
 * 反向约束（刻意不做，均有依据）：
 *  - ❌ 无付费墙：目录里不存在任何真实货币字段，所有奖励**只能通过学习赚取**。
 *    依据 Prodigy 付费皮肤争议（2026 家长社区舆情）+ 本产品面向低龄儿童的定位。
 *  - ❌ 无排行榜 / 无对战 / 无惩罚：扣分与排名会给「部分儿童」带来压力
 *    （MDPI《Adaptive Gamification in Preschool》SLR, Computers 15(7):464, 2026）。
 *    答错**永不扣分**，只走 `encourage` 温和引导（见 comeback 星的设计）。
 *  - ✅ 有保底（pity）：连续多次未出稀有则必出，避免随机性变成挫败源。
 *  - ✅ 有每日上限：防止「为刷星星而刷」，对齐 2 胜即停的防过度游戏化立场。
 *  - ✅ 有奖励淡出（rewardStage）：见下方「外部奖励的脚手架原则」，这是
 *    本模块与商业商城最本质的区别之一。
 *
 * 外部奖励的脚手架原则（重要 · 2026 反方证据，与本模块设计直接冲突过）：
 *  - Deci / Koestner / Ryan 元分析（1999，经典但仍是该议题的基准证据）：
 *    预期内的实物奖励会在奖励撤除后把内在动机压到**低于初始水平**
 *    （过度理由效应 overjustification effect）。
 *  - ScreenWise（2026）《The Dopamine-Learning Trap》：多数高分教育 App
 *    本质是「斯金纳箱」，依靠**可变比率强化**（variable-ratio schedule）
 *    让孩子为抽卡与连胜而点，而不是为内容而学；并点名 Duolingo 的
 *    Hearts「用惩罚错误来变现」与 Streak「把学习变成心理负债」。
 *  - ACER / AARE（EducationDaily 2026）：传统 token economy 会陷入
 *    「做这个给我几分？」的交易心态，并制造「隐形的中间层」。
 *  → 因此本模块**不是把商城搬进来**，而是把奖励当作**脚手架**：
 *    掌握量越高，附加星的折算系数越低（rewardStage），但**基础评级星
 *    永不打折**——保留胜任感反馈，淡出的是「为了星星而刷」的外部牵引。
 *
 * 设计约束（与 R144–R159 已建 @/game 基础设施一致）：
 *  - 纯函数、零 React 依赖、零 localStorage / 网络依赖 → 可安全新建；
 *  - 确定性可测：抽取由注入的 seed 驱动（mulberry32），单测完全可复现；
 *  - 零 `any` / 零 `!` / 零 `as`，noUncheckedIndexedAccess 下全路径安全；
 *  - 三核心以 `import { earnStars } from '@/game/rewardEconomy'` 增量接入，
 *    学习逻辑零改动；持久化由调用方（useStore / safeStorage）负责。
 */
import { starsByCorrect } from '@/lib/stars';
import type { ModuleKey } from './playVariety';

/** 扭蛋奖品的稀有度档位 */
export type RewardTier = 'common' | 'rare' | 'epic';

/** 可解锁奖励的类型 */
export type RewardKind = 'capsule' | 'theme' | 'pet' | 'badge' | 'story';

/**
 * 每日星星入账上限。
 * 理由：星星一旦成为唯一目标，孩子会从「我想学」漂移成「我想刷星」。
 * 30 颗 ≈ 6–8 节高质量课程，足够一天的正常学习量；超过后仍然可以继续学，
 * 只是不再加星（UI 用温和文案提示「今天收集的星星够多啦，明天再来」）。
 */
export const DEFAULT_DAILY_CAP = 30;

/** 保底阈值：连续抽到这么多次的普通档后，下一次必出稀有及以上 */
export const PITY_THRESHOLD = 5;

/** 抽到重复奖品时返还的星星，避免「白抽一次」的失落感 */
export const DUPLICATE_REFUND = 2;

/** 星级档位对应的基础星数权重（复用 @/lib/stars 的统一口径，避免阈值漂移） */
const COMBO_BONUS_STEPS = [
  { combo: 8, bonus: 3 },
  { combo: 5, bonus: 2 },
  { combo: 3, bonus: 1 },
] as const satisfies readonly { combo: number; bonus: number }[];

/** 全对额外奖励 */
const PERFECT_BONUS = 1;

/** 出错后仍能连对 ≥3 的鼓励星（温和引导：错误不是惩罚，恢复才值奖励） */
const COMEBACK_BONUS = 1;
const COMEBACK_MIN_COMBO = 3;

/** 扭蛋档位概率（common = 1 - rare - epic） */
const RARE_RATE = 0.25;
const EPIC_RATE = 0.05;

// ─────────────────────────────────────────────────────────────
// 1) 赚取：从一节课结果计算星星收益
// ─────────────────────────────────────────────────────────────

export interface SessionOutcome {
  module: ModuleKey;
  /** 本节课题量 */
  total: number;
  /** 答对题量 */
  correct: number;
  /** 本节最长连击（不传视为 0） */
  bestCombo?: number;
}

/** 星星明细项：给 UI 做「你因为 XX 拿到 N 颗星」的正向强化 */
export interface StarBreakdown {
  /** 来源标识，UI 可据此配图标与文案 */
  source: 'rating' | 'combo' | 'perfect' | 'comeback';
  /** 该项获得的星数 */
  stars: number;
  /** 给孩子的中文说明 */
  reason: string;
}

export interface EarnResult {
  /** 最终入账星数（已扣除每日上限，永不为负） */
  granted: number;
  /** 未扣上限时的原始收益 */
  raw: number;
  /** 因每日上限被截断的星数 */
  capped: number;
  /** 逐项明细 */
  breakdown: readonly StarBreakdown[];
}

// ─────────────────────────────────────────────────────────────
// 1.5) 奖励淡出：把外部奖励当作脚手架，而非长期挂钩
// ─────────────────────────────────────────────────────────────

/** 反馈重心：token=强调星星，mixed=并重，competence=强调能力成长 */
export type RewardEmphasis = 'token' | 'mixed' | 'competence';

export interface RewardStage {
  /** 0 起步 / 1 上手 / 2 稳定 / 3 自主 */
  stage: 0 | 1 | 2 | 3;
  /** 附加星（连击 / 全对 / 鼓励）的折算系数；基础评级星永不打折 */
  bonusMultiplier: number;
  /** 反馈重心，随阶段从「星星」逐步转向「我学会了什么」 */
  emphasis: RewardEmphasis;
  /** 给家长 / 开发看的阶段说明 */
  note: string;
}

/**
 * 淡出阶梯：掌握量越多，附加星给得越少。
 *
 * 为什么只折附加星、不折评级星：评级星对应的是「我完成了一关、我答对了多少」
 * 这类**胜任感信息**，属于 SDT 所说的 informational feedback，撤掉会伤害
 * 自主感；而连击星、全对星更像可刷的**外部牵引**，才是需要淡出的部分。
 * 系数下限 0.6，绝不归零——研究同样指出，并非所有反馈都有害，
 * 完全撤除认可会让低龄儿童失去「被看见」的感觉。
 */
/**
 * 内部查表行：在 RewardStage 之上多一个「掌握量上限」阈值。
 *
 * 刻意**不**把 maxMastered 放进 RewardStage —— 它是查表的实现细节，
 * 对外只承诺「当前阶段如何折算」。未来若要细分或调整分段，
 * 只改本表即可，调用方签名与单测断言不受影响。
 * （同时避免 `satisfies` 对对象字面量的多余属性检查报错。）
 */
interface FadeStageRule extends RewardStage {
  maxMastered: number;
}

export const FADE_STAGES = [
  { stage: 0, maxMastered: 19, bonusMultiplier: 1, emphasis: 'token', note: '起步期：用星星把孩子带进门' },
  { stage: 1, maxMastered: 59, bonusMultiplier: 0.85, emphasis: 'token', note: '上手期：仍以星星为主，开始强调连击' },
  { stage: 2, maxMastered: 119, bonusMultiplier: 0.7, emphasis: 'mixed', note: '稳定期：星星与能力反馈并重' },
  { stage: 3, maxMastered: Number.POSITIVE_INFINITY, bonusMultiplier: 0.6, emphasis: 'competence', note: '自主期：重心转向「我学会了什么」' },
] as const satisfies readonly FadeStageRule[];

const FADE_HEAD: RewardStage = FADE_STAGES[0];

/** 按已掌握量判定当前奖励阶段 */
export function rewardStage(masteredCount: number): RewardStage {
  const n = Math.max(0, Math.floor(masteredCount));
  const hit = FADE_STAGES.find((s) => n <= s.maxMastered);
  return hit ?? FADE_HEAD;
}

export interface EarnOptions {
  /** 今天已入账的星数（用于每日上限），默认 0 */
  earnedToday?: number;
  /** 每日上限，默认 DEFAULT_DAILY_CAP */
  dailyCap?: number;
  /**
   * 已掌握内容量（字 / 词 / 题均可，语义由调用方统一）。
   * 用于奖励淡出：掌握越多，附加星折算越低，但基础评级星不打折。
   */
  masteredCount?: number;
}

/**
 * 计算一节课的星星收益。
 *
 * 关键取舍：**答错永不扣分**。低龄儿童的自我效能感非常脆弱，
 * 扣分会把「我还差一点」翻译成「我不行」。因此错误只影响 rating 档位
 * （少拿星），而绝不产生负数；同时额外设置 comeback 星——只要孩子在
 * 出错后还能连对 3 题以上，就补一颗「越挫越勇」星，把错误重新定义为
 * 「通往奖励的路上一小段」，而不是需要回避的东西。
 */
export function earnStars(outcome: SessionOutcome, options: EarnOptions = {}): EarnResult {
  const { earnedToday = 0, dailyCap = DEFAULT_DAILY_CAP, masteredCount = 0 } = options;
  const total = Math.max(0, Math.floor(outcome.total));
  const correct = Math.min(Math.max(0, Math.floor(outcome.correct)), total);
  const bestCombo = Math.max(0, Math.floor(outcome.bestCombo ?? 0));

  const stage = rewardStage(masteredCount);
  /**
   * 附加星折算：达标即至少给 1 颗（绝不出现「我连对了 5 题却一颗星都没有」），
   * 否则淡出在孩子眼里会变成「我变强了反而奖励变少」的惩罚。
   */
  const scaleBonus = (raw: number): number => Math.max(1, Math.round(raw * stage.bonusMultiplier));

  const breakdown: StarBreakdown[] = [];
  const mistakes = total - correct;

  // ① 表现评级（复用统一口径，三核心阈值一致）
  if (total > 0) {
    const rating = starsByCorrect(correct, total);
    if (rating > 0) {
      breakdown.push({
        source: 'rating',
        stars: rating,
        reason: rating >= 3 ? '答得又快又准，拿到三星！' : rating === 2 ? '做得很不错，两颗星！' : '完成了这一关，一颗星！',
      });
    }
  }

  // ② 连击奖励（取最高命中档位，不叠加）
  const comboHit = COMBO_BONUS_STEPS.find((step) => bestCombo >= step.combo);
  if (comboHit) {
    breakdown.push({
      source: 'combo',
      stars: scaleBonus(comboHit.bonus),
      reason: `连对了 ${bestCombo} 题，连击奖励！`,
    });
  }

  // ③ 全对奖励
  if (total > 0 && correct === total) {
    breakdown.push({ source: 'perfect', stars: scaleBonus(PERFECT_BONUS), reason: '全部答对，额外奖励！' });
  }

  // ④ 鼓励星：出过错，但仍连对 ≥3
  if (mistakes > 0 && bestCombo >= COMEBACK_MIN_COMBO) {
    breakdown.push({
      source: 'comeback',
      stars: scaleBonus(COMEBACK_BONUS),
      reason: '错了也没放弃，越练越棒！',
    });
  }

  const raw = breakdown.reduce((sum, item) => sum + item.stars, 0);
  const cap = Math.max(0, Math.floor(dailyCap));
  const remaining = Math.max(0, cap - Math.max(0, Math.floor(earnedToday)));
  const granted = Math.max(0, Math.min(raw, remaining));

  return { granted, raw, capped: Math.max(0, raw - granted), breakdown };
}

// ─────────────────────────────────────────────────────────────
// 2) 目录：可解锁的奖励阶梯
// ─────────────────────────────────────────────────────────────

export interface RewardItem {
  id: string;
  kind: RewardKind;
  label: string;
  /** 解锁后孩子得到什么（正向描述，用「解锁」而非「购买」） */
  description: string;
  /** 所需星星（永远 > 0，且不存在任何真实货币通道） */
  cost: number;
  /** 限定模块；不传表示三个模块通用 */
  module?: ModuleKey;
}

/**
 * 奖励目录：成本从 5 递增到 200，形成 12 级阶梯。
 * 阶梯的意义是**让孩子永远看得见下一个够得着的目标**——最贵的奖励
 * 需要约 6–8 天的正常学习量，不会遥不可及，也不会一次学完就全部解锁。
 *
 * 用 `as const satisfies` 声明：元组索引在 noUncheckedIndexedAccess 下
 * 仍是精确类型，因此 `REWARD_CATALOG[0]` 可作为安全落点，无需 `!` 断言。
 */
export const REWARD_CATALOG = [
  { id: 'capsule-basic', kind: 'capsule', label: '星星扭蛋', description: '转一转扭蛋机，收一件小惊喜', cost: 5 },
  { id: 'theme-candy', kind: 'theme', label: '糖果主题', description: '把乐园换成粉粉的糖果色', cost: 12 },
  { id: 'pet-snack', kind: 'pet', label: '宠物小零食', description: '喂一口小零食，宠物会开心地摇尾巴', cost: 20 },
  { id: 'theme-ocean', kind: 'theme', label: '海洋主题', description: '把乐园变成蓝蓝的海底世界', cost: 30 },
  { id: 'badge-brave', kind: 'badge', label: '勇敢勋章', description: '送给敢挑战难题的小朋友', cost: 40 },
  { id: 'pet-hat', kind: 'pet', label: '宠物小帽子', description: '给宠物戴一顶可爱的小帽子', cost: 50 },
  { id: 'theme-forest', kind: 'theme', label: '森林主题', description: '把乐园搬进绿油油的小森林', cost: 60 },
  { id: 'story-animal', kind: 'story', label: '动物绘本', description: '解锁一本会说话的动物绘本', cost: 80 },
  { id: 'badge-focus', kind: 'badge', label: '专注勋章', description: '送给一口气学完一整课的小朋友', cost: 100 },
  { id: 'story-space', kind: 'story', label: '太空绘本', description: '解锁一本飞向星星的太空绘本', cost: 120 },
  { id: 'pet-cape', kind: 'pet', label: '宠物小披风', description: '给宠物披上帅气的小披风', cost: 150 },
  { id: 'badge-star', kind: 'badge', label: '星空勋章', description: '送给坚持学习很久的小朋友', cost: 200 },
] as const satisfies readonly RewardItem[];

// ─────────────────────────────────────────────────────────────
// 3) 消费与解锁
// ─────────────────────────────────────────────────────────────

export interface RedeemResult {
  ok: boolean;
  /** 消费后的余额（失败时原样返回） */
  balance: number;
  /** 本次解锁的奖励 id（失败时为空数组） */
  unlocked: readonly string[];
  /** 给孩子看的文案：余额不足时说「再集 N 颗星」，绝不说「不够」 */
  message: string;
  /** 距离该奖励还差几颗星（成功时为 0） */
  shortfall: number;
}

function clampBalance(value: number): number {
  return Math.max(0, Math.floor(value));
}

/**
 * 用星星解锁一件奖励。
 *
 * 失败路径刻意设计成**目标而非否定**：返回 shortfall 与「再集 N 颗星就能
 * 解锁 X 啦」，把「买不起」的挫败翻译成「还差一点点」的期待。这是本模块
 * 与商业商城最本质的区别——商城靠稀缺感促成付费，这里靠可预期性维持内驱。
 */
export function redeem(balance: number, item: RewardItem, owned: readonly string[] = []): RedeemResult {
  const current = clampBalance(balance);
  if (owned.includes(item.id)) {
    return {
      ok: false,
      balance: current,
      unlocked: [],
      message: `「${item.label}」你已经拥有啦，去看看别的吧！`,
      shortfall: 0,
    };
  }
  if (current < item.cost) {
    const shortfall = item.cost - current;
    return {
      ok: false,
      balance: current,
      unlocked: [],
      message: `再集 ${shortfall} 颗星，就能解锁「${item.label}」啦！`,
      shortfall,
    };
  }
  return {
    ok: true,
    balance: current - item.cost,
    unlocked: [item.id],
    message: `恭喜！「${item.label}」解锁成功！`,
    shortfall: 0,
  };
}

/** 下一个够得着的目标：用于顶部「距离 XX 还差 N 颗星」的成长牵引 */
export interface RewardGoal {
  item: RewardItem;
  /** 还差几颗星 */
  shortfall: number;
  /** 0~1 完成度 */
  progress: number;
}

export function nextRewardGoal(balance: number, owned: readonly string[] = []): RewardGoal | null {
  const current = clampBalance(balance);
  const pending = REWARD_CATALOG.filter((item) => !owned.includes(item.id));
  const head = pending[0];
  if (!head) return null;
  const shortfall = Math.max(0, head.cost - current);
  const progress = head.cost <= 0 ? 1 : Math.min(1, current / head.cost);
  return { item: head, shortfall, progress };
}

// ─────────────────────────────────────────────────────────────
// 4) 扭蛋机：惊喜式解锁（保底 + 去重优先）
// ─────────────────────────────────────────────────────────────

export interface CapsulePrize {
  id: string;
  label: string;
  tier: RewardTier;
  /** 极简符号（非 emoji），UI 可直接渲染；也可由 UI 自行替换插画 */
  glyph: string;
}

/**
 * 扭蛋奖品池：普通 8 / 稀有 5 / 史诗 3。
 * 灵感来自宝宝巴士「跟读正确 → 扭蛋机变出与字义相关的物品」——奖品本身
 * 没有功能价值，只提供**收集与惊喜**，避免把学习奖励异化为能力道具。
 */
export const CAPSULE_PRIZES = [
  // 普通档
  { id: 'cap-star-sticker', label: '星星贴纸', tier: 'common', glyph: '★' },
  { id: 'cap-flower', label: '小花花', tier: 'common', glyph: '✿' },
  { id: 'cap-note', label: '小音符', tier: 'common', glyph: '♫' },
  { id: 'cap-bubble', label: '彩色泡泡', tier: 'common', glyph: '●' },
  { id: 'cap-cloud', label: '棉花云', tier: 'common', glyph: '☁' },
  { id: 'cap-leaf', label: '小树叶', tier: 'common', glyph: '❧' },
  { id: 'cap-bell', label: '小铃铛', tier: 'common', glyph: '♪' },
  { id: 'cap-heart', label: '爱心糖果', tier: 'common', glyph: '♥' },
  // 稀有档
  { id: 'cap-rainbow', label: '彩虹桥', tier: 'rare', glyph: '❋' },
  { id: 'cap-crystal', label: '小水晶', tier: 'rare', glyph: '◆' },
  { id: 'cap-kite', label: '小风筝', tier: 'rare', glyph: '◈' },
  { id: 'cap-lantern', label: '小灯笼', tier: 'rare', glyph: '❂' },
  { id: 'cap-shell', label: '海螺壳', tier: 'rare', glyph: '❀' },
  // 史诗档
  { id: 'cap-comet', label: '小彗星', tier: 'epic', glyph: '✦' },
  { id: 'cap-crown', label: '星星王冠', tier: 'epic', glyph: '❖' },
  { id: 'cap-dragon', label: '小龙灯', tier: 'epic', glyph: '❉' },
] as const satisfies readonly CapsulePrize[];

/** 奖品池首项：安全落点 */
const PRIZE_HEAD: CapsulePrize = CAPSULE_PRIZES[0];

/** 全奖品池（全部收集完毕后的兜底取值来源） */
const ALL_PRIZES: readonly CapsulePrize[] = CAPSULE_PRIZES;

export interface CapsuleDrawResult {
  prize: CapsulePrize;
  /** 是否已拥有（重复） */
  duplicate: boolean;
  /** 抽后更新的「连续未出稀有」计数 */
  pityAfter: number;
  /** 本次是否触发保底 */
  pityTriggered: boolean;
  /** 给孩子看的文案 */
  message: string;
  /** 重复时返还的星星（非重复为 0） */
  refund: number;
}

export interface CapsuleDrawOptions {
  /** 连续未出稀有的计数（由调用方持久化），默认 0 */
  pity?: number;
  /** 已拥有的奖品 id */
  owned?: readonly string[];
  /** 随机种子（同 seed → 同结果，便于单测与可复现） */
  seed?: number;
}

const TIERS: readonly RewardTier[] = ['common', 'rare', 'epic'];

/**
 * 档位降级 / 升级链：先向上升档（更稀有 = 更惊喜），再向下降档（保底有货）。
 * 顺序刻意如此——抽到已收集完的档位时，给孩子一个更好的，而不是更差的，
 * 避免「我攒了好久结果抽到自己不想要的」这类挫败。
 */
const TIER_FALLBACK: Record<RewardTier, readonly RewardTier[]> = {
  common: ['common', 'rare', 'epic'],
  rare: ['rare', 'epic', 'common'],
  epic: ['epic', 'rare', 'common'],
};

/** 确定性伪随机（mulberry32）：无 Math.random，单测可复现 */
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

function pickFrom<T>(pool: readonly T[], rand: () => number, fallback: T): T {
  if (pool.length === 0) return fallback;
  const index = Math.floor(rand() * pool.length);
  const picked = pool[Math.min(index, pool.length - 1)];
  return picked ?? fallback;
}

function rollTier(rand: () => number, pity: number): { tier: RewardTier; forced: boolean } {
  if (pity >= PITY_THRESHOLD) return { tier: 'rare', forced: true };
  const r = rand();
  if (r < EPIC_RATE) return { tier: 'epic', forced: false };
  if (r < EPIC_RATE + RARE_RATE) return { tier: 'rare', forced: false };
  return { tier: 'common', forced: false };
}

function messageFor(prize: CapsulePrize, duplicate: boolean): string {
  if (duplicate) return `「${prize.label}」你已经有了，星星还给你，下次再试试！`;
  if (prize.tier === 'epic') return `太厉害了！你抽到了超稀有的「${prize.label}」！`;
  if (prize.tier === 'rare') return `哇！是很少见的「${prize.label}」！`;
  return `你抽到了「${prize.label}」，收集册又多了一个！`;
}

/**
 * 抽一次扭蛋。
 *
 * 三重防挫败设计：
 *  1. **保底**：连续 PITY_THRESHOLD 次没出稀有，下一次必出稀有及以上；
 *  2. **去重优先**：优先抽未拥有的奖品，收集过程始终有进展；
 *  3. **重复返星**：万一是重复的，返还 DUPLICATE_REFUND 颗星并配温和文案，
 *     绝不出现「白抽一次」的纯损失。
 */
export function drawCapsule(options: CapsuleDrawOptions = {}): CapsuleDrawResult {
  const { pity = 0, owned = [], seed = 1 } = options;
  const rand = makeRandom(seed);
  const ownedSet = new Set(owned);

  const rolled = rollTier(rand, Math.max(0, Math.floor(pity)));
  const chain = TIER_FALLBACK[rolled.tier];

  let chosen: CapsulePrize | null = null;
  for (const tier of chain) {
    const fresh = CAPSULE_PRIZES.filter((p) => p.tier === tier && !ownedSet.has(p.id));
    if (fresh.length > 0) {
      chosen = pickFrom(fresh, rand, PRIZE_HEAD);
      break;
    }
  }

  // 全部收集完毕：走重复路径（返还星星 + 温和文案），绝不返回空结果
  const duplicate = chosen === null;
  const prize: CapsulePrize = chosen ?? pickFrom(ALL_PRIZES, rand, PRIZE_HEAD);
  const refund = duplicate ? DUPLICATE_REFUND : 0;

  // 保底计数：出稀有/史诗即清零，抽到普通则累加
  const pityAfter = duplicate || prize.tier !== 'common' ? 0 : Math.max(0, Math.floor(pity)) + 1;

  return {
    prize,
    duplicate,
    pityAfter,
    pityTriggered: rolled.forced,
    message: messageFor(prize, duplicate),
    refund,
  };
}

/** 某档位奖品总数，供 UI 展示「收集进度 3/8」 */
export function capsuleStats(owned: readonly string[]): { tier: RewardTier; ownedCount: number; total: number }[] {
  const ownedSet = new Set(owned);
  const head: RewardTier = 'common';
  return TIERS.map((tier) => {
    const all = CAPSULE_PRIZES.filter((p) => p.tier === tier);
    const t: RewardTier = all[0]?.tier ?? head;
    return { tier: t, ownedCount: all.filter((p) => ownedSet.has(p.id)).length, total: all.length };
  });
}

// ─────────────────────────────────────────────────────────────
// 5) 概率公示：把「惊喜」从黑箱变成可预期
// ─────────────────────────────────────────────────────────────

export interface CapsuleOdds {
  tier: RewardTier;
  /** 百分比字符串，精确到两位小数（监管要求的公示格式，禁止「稀有」等模糊表述） */
  percent: string;
  /** 数值概率 0~1 */
  rate: number;
  /** 该档位奖品数 */
  total: number;
}

/** 百分比格式化：固定两位小数，避免 0.7 → 「70%」这类精度丢失 */
function toPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * 扭蛋各档位的真实抽取概率。
 *
 * 为什么要显式导出而不是让 UI 自己写死一份：概率一旦有两份实现，
 * 算法调整后公示值与真实值就会漂移 —— 这正是监管点名的违规情形之一
 * （「概率数值错误或与实际算法不符」「伪随机导致实际概率与公示概率
 * 存在系统性偏差」）。这里与 rollTier 共用同一组常量，从根上杜绝漂移。
 *
 * 另一层意义是反操控：可变比率强化是斯金纳箱的核心机制，而**透明**
 * 本身就是把「惊喜」拉回「可预期」的手段 —— 孩子和家长都能看见
 * 「普通 70.00% / 稀有 25.00% / 史诗 5.00%」，而不是被一个黑箱牵着走。
 */
export function capsuleOdds(): readonly CapsuleOdds[] {
  return TIERS.map((tier) => {
    const rate = tier === 'rare' ? RARE_RATE : tier === 'epic' ? EPIC_RATE : 1 - RARE_RATE - EPIC_RATE;
    return {
      tier,
      rate,
      percent: toPercent(rate),
      total: CAPSULE_PRIZES.filter((p) => p.tier === tier).length,
    };
  });
}

/**
 * 距离触发保底还差几次。
 * 监管要求「玩家必须能够清晰看到距离保底的剩余次数」，因此这里提供
 * 可直接展示的剩余值（已到保底时为 0）。
 */
export function pityRemaining(pity: number): number {
  return Math.max(0, PITY_THRESHOLD - Math.max(0, Math.floor(pity)));
}
