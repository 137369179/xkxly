/**
 * 字理查询层（六书 / 部件 / 字族 / 依赖图推荐）
 * ==================================================================
 * 数据来自 `@/data/hanziEtymology`（脚本生成，教学正确性已在生成期把关）。
 * 本层只做**查询、聚合、讲解措辞、推荐排序**，不含任何 UI 与状态依赖。
 *
 * 三个核心能力：
 *   1. 六书归类     —— 字理识字的分类锚点（象形/指事/会意/形声）
 *   2. 部件与字族   —— 「基本字带字」：学会 青，再带出 清 情 晴 请
 *   3. 依赖图推荐   —— 借鉴 WaniKani 的 radical→kanji 解锁：
 *                      优先推荐「部件已掌握」的字，让孩子体验"拼出来"的顿悟
 *
 * 设计约束：
 *   - 纯函数 + 模块级惰性索引，不引入 store（避免 lib→store 层倒置）
 *   - 所有对外措辞都必须与数据一致：数据没给 phonetic 就绝不说"声旁表音"
 */
import {
  HANZI_ETYMOLOGY,
  HANZI_ETYMOLOGY_LIST,
  type HanziEtymology,
  type Liushu,
} from '@/data/hanziEtymology';
import { HANZI_DATA, type HanziEntry } from '@/data/hanzi';

export type { HanziEtymology, Liushu } from '@/data/hanziEtymology';

/** 掌握度最小结构（与 store 的 mastery 兼容，但不依赖其类型） */
export interface MasteryLike {
  lv: number;
}
export type MasteryMap = Record<string, MasteryLike>;

const skillOf = (c: string) => `hanzi:${c}`;
const lvOf = (mastery: MasteryMap, c: string) => mastery[skillOf(c)]?.lv ?? 0;
/** 掌握判定：lv ≥ 1 视为「学过」（与 nextHanzi 的既有语义保持一致） */
const isLearned = (mastery: MasteryMap, c: string) => lvOf(mastery, c) >= 1;

// ================================================================ 1. 六书元数据
export interface LiushuMeta {
  /** 六书名（教研口径） */
  label: string;
  /** 一个字的简称，用于徽章 */
  badge: string;
  emoji: string;
  /** 设计系统色调 */
  tone: 'orange' | 'blue' | 'green' | 'purple';
  /** 给家长看的定义 */
  desc: string;
  /** 给孩子听的一句话 */
  kidHint: string;
  /** 典型例字 */
  examples: string[];
}

export const LIUSHU_META: Record<Liushu, LiushuMeta> = {
  pictographic: {
    label: '象形字',
    badge: '象',
    emoji: '🖼️',
    tone: 'orange',
    desc: '照着事物的样子画出来的字，是汉字最古老的一层。',
    kidHint: '这个字是画出来的，像不像它本来的样子？',
    examples: ['日', '月', '山', '水'],
  },
  ideographic: {
    label: '指事字',
    badge: '指',
    emoji: '📍',
    tone: 'blue',
    desc: '用符号或在图形上加标记，表示看不见摸不着的意思。',
    kidHint: '这个字用一个小记号告诉你意思在哪里。',
    examples: ['上', '下', '本', '一'],
  },
  'compound-ideographic': {
    label: '会意字',
    badge: '会',
    emoji: '🧩',
    tone: 'green',
    desc: '把两个以上部件的意思合起来，组成一个新意思。',
    kidHint: '把几个部件的意思加一加，就猜到这个字了！',
    examples: ['明', '林', '休', '看'],
  },
  pictophonetic: {
    label: '形声字',
    badge: '声',
    emoji: '🔊',
    tone: 'purple',
    desc: '一半表示意思（形旁），一半表示读音（声旁），是现代汉字里最多的一类。',
    kidHint: '一半告诉你意思，一半告诉你怎么读。',
    examples: ['清', '妈', '花', '楼'],
  },
};

export const LIUSHU_ORDER: Liushu[] = [
  'pictographic',
  'ideographic',
  'compound-ideographic',
  'pictophonetic',
];

export function liushuLabel(l: Liushu | undefined): string {
  return l ? LIUSHU_META[l].label : '';
}

// ================================================================ 2. 基础查询
export function getEtymology(c: string): HanziEtymology | undefined {
  return HANZI_ETYMOLOGY[c];
}

export function liushuOf(c: string): Liushu | undefined {
  return HANZI_ETYMOLOGY[c]?.liushu;
}

/** 部件拆分（象形字与拆不出可教学部件的字返回空数组） */
export function getComponents(c: string): string[] {
  return HANZI_ETYMOLOGY[c]?.components ?? [];
}

/** 是否有可展示的拆解（至少 2 个孩子读得出的部件） */
export function hasDecomposition(c: string): boolean {
  return getComponents(c).length >= 2;
}

/** 以本字为部件派生出的字（字族成员，均在字库内、可点击去学） */
export function getDerived(c: string): string[] {
  return HANZI_ETYMOLOGY[c]?.derived ?? [];
}

/** 按六书归类取字（保持教学顺序：level → freq） */
export function getByLiushu(l: Liushu): HanziEtymology[] {
  return HANZI_ETYMOLOGY_LIST.filter((e) => e.liushu === l);
}

export function countByLiushu(): Record<Liushu, number> {
  const out: Record<Liushu, number> = {
    pictographic: 0,
    ideographic: 0,
    'compound-ideographic': 0,
    pictophonetic: 0,
  };
  for (const e of HANZI_ETYMOLOGY_LIST) out[e.liushu] += 1;
  return out;
}

// ================================================================ 3. 惰性索引
/** 部件 → 用到它的字（含不在字库内的部件，如 艹、氵） */
let _componentIndex: Map<string, string[]> | null = null;
function componentIndex(): Map<string, string[]> {
  if (_componentIndex) return _componentIndex;
  const m = new Map<string, string[]>();
  for (const e of HANZI_ETYMOLOGY_LIST) {
    // 同字重复部件（林=木+木）只登记一次，避免字族里出现两个「林」
    for (const comp of new Set(e.components)) {
      if (comp === e.c) continue;
      const arr = m.get(comp);
      if (arr) arr.push(e.c);
      else m.set(comp, [e.c]);
    }
  }
  _componentIndex = m;
  return m;
}

/** 用到该部件的所有字（按教学顺序） */
export function componentUsers(component: string): string[] {
  return componentIndex().get(component) ?? [];
}

/** 全部可教学部件 + 使用频次（降序），供部件拆解 UI 与出题干扰项使用 */
export function allComponents(): Array<{ comp: string; count: number }> {
  return [...componentIndex().entries()]
    .map(([comp, users]) => ({ comp, count: users.length }))
    .sort((a, b) => b.count - a.count || a.comp.localeCompare(b.comp));
}

// ================================================================ 4. 依赖图
/**
 * 先修部件：本字的部件中**恰好也是字库里的字**的那些。
 * 例：清 → ['青']（氵 不是独立汉字，不作为先修）；明 → ['日','月']。
 */
let _poolSet: Set<string> | null = null;
function poolSet(): Set<string> {
  if (!_poolSet) _poolSet = new Set(HANZI_DATA.map((h) => h.c));
  return _poolSet;
}

export function getPrereqs(c: string): string[] {
  const set = poolSet();
  return [...new Set(getComponents(c))].filter((x) => x !== c && set.has(x));
}

/** 先修部件是否已全部学过（无先修的字恒为 true） */
export function isReady(c: string, mastery: MasteryMap): boolean {
  return getPrereqs(c).every((p) => isLearned(mastery, p));
}

/** 尚未学会的先修部件（用于「先去学 X 再回来」的引导） */
export function missingPrereqs(c: string, mastery: MasteryMap): string[] {
  return getPrereqs(c).filter((p) => !isLearned(mastery, p));
}

/** 学会本字能解锁多少个尚未学的派生字（枢纽价值） */
export function unlockValue(c: string, mastery: MasteryMap): number {
  return getDerived(c).filter((d) => !isLearned(mastery, d)).length;
}

/** 课程前沿窗口大小：只在最该学的前 N 个待学字里重排，绝不打乱整体字频曲线 */
const FRONTIER_WINDOW = 12;

/**
 * 依赖图驱动的下一字推荐。
 *
 * 策略（三层，逐层收窄，任何一层无解都能安全回退）：
 *   1. 取教学顺序（level→freq）下最靠前的 N 个**未学**字作为「课程前沿」
 *      —— 保证不会为了字族跳到很生僻的字上去。
 *   2. 前沿里优先保留「先修部件都已学过」的字：孩子此刻能体验
 *      「日 + 月 = 明」的拼装顿悟，记得住、不挫败。
 *   3. 同为就绪状态时，选**枢纽价值最高**的字（学会它能解锁最多派生字），
 *      这正是 WaniKani 先教 radical 再教 kanji 的收益最大化思路。
 *
 * @returns 推荐的汉字；全部学完返回 null
 */
export function recommendByPrereq(
  mastery: MasteryMap,
  opts: { level?: number; window?: number } = {}
): string | null {
  const { level, window = FRONTIER_WINDOW } = opts;
  const pool = level ? HANZI_DATA.filter((h) => h.level === level) : HANZI_DATA;
  const unlearned = pool.filter((h) => !isLearned(mastery, h.c));
  if (!unlearned.length) return null;

  const frontier = unlearned.slice(0, Math.max(1, window));
  const ready = frontier.filter((h) => isReady(h.c, mastery));
  const cands = ready.length ? ready : frontier;

  const first = cands[0];
  if (first === undefined) return null; // 防御：unlearned 非空时 frontier 必有元素
  let best = first;
  let bestScore = -1;
  for (const h of cands) {
    const score = unlockValue(h.c, mastery);
    // 严格大于：同分保持课程顺序（frontier 已按 level→freq 排好）
    if (score > bestScore) {
      bestScore = score;
      best = h;
    }
  }
  return best.c;
}

/** 推荐结果的解释（家长中心/调试可见，说明"为什么推这个字"） */
export function explainRecommendation(c: string, mastery: MasteryMap): string {
  const prereqs = getPrereqs(c);
  const unlock = unlockValue(c, mastery);
  if (prereqs.length && isReady(c, mastery)) {
    return `「${prereqs.join('」「')}」都学过了，正好可以拼出「${c}」`;
  }
  if (unlock >= 2) return `学会「${c}」能带出 ${unlock} 个新字`;
  return `按字频与阶段，「${c}」是接下来最该学的字`;
}

// ================================================================ 5. 字族
export type FamilyRole = 'phonetic' | 'semantic' | 'component';

export interface FamilyMember {
  c: string;
  /** 带声调拼音（取自字库，用于朗读与展示） */
  pd: string;
  /** 该字里这个根扮演的角色：声旁 / 形旁 / 普通部件 */
  role: FamilyRole;
  liushu: Liushu;
  /** 组词（取第一个，字族卡片上展示） */
  word: string;
}

export interface HanziFamily {
  root: string;
  /** 根本身若是字库里的字则有拼音，否则（如 氵、艹）为空 */
  rootPd: string;
  /** 字族性质：声旁族（同音字族）/ 形旁族（同义类）/ 混合 */
  kind: FamilyRole | 'mixed';
  members: FamilyMember[];
}

let _entryIndex: Map<string, HanziEntry> | null = null;
function entryOf(c: string): HanziEntry | undefined {
  if (!_entryIndex) _entryIndex = new Map(HANZI_DATA.map((h) => [h.c, h]));
  return _entryIndex.get(c);
}

function roleOf(root: string, child: string): FamilyRole {
  const e = HANZI_ETYMOLOGY[child];
  if (e?.phonetic === root) return 'phonetic';
  if (e?.semantic === root) return 'semantic';
  return 'component';
}

/**
 * 构建字族图（以 root 为部件的一层字族）。
 * root 既可以是字库里的字（青 → 清/情/晴），也可以是部首（氵 → 江/河/清…）。
 */
export function buildFamilyGraph(
  root: string,
  opts: { max?: number } = {}
): HanziFamily | null {
  const users = componentUsers(root);
  if (!users.length) return null;
  const max = opts.max ?? 12;
  const members: FamilyMember[] = users.slice(0, max).map((c) => {
    const e = entryOf(c);
    return {
      c,
      pd: e?.pd ?? '',
      role: roleOf(root, c),
      liushu: HANZI_ETYMOLOGY[c]?.liushu ?? 'pictophonetic',
      word: e?.words[0] ?? c,
    };
  });
  const roles = new Set(members.map((m) => m.role));
  const kind: HanziFamily['kind'] = roles.size === 1 ? ([...roles][0] ?? 'mixed') : 'mixed';
  return { root, rootPd: entryOf(root)?.pd ?? '', kind, members };
}

/** 可用于「字族学习」的根（成员数达标者），按成员数降序 */
export function listFamilies(minSize = 3): Array<{ root: string; size: number }> {
  return allComponents()
    .filter((x) => x.count >= minSize)
    .map((x) => ({ root: x.comp, size: x.count }));
}

/** 同六书的同伴字（对比学习/出题干扰项），排除自身 */
export function liushuPeers(c: string, n = 6): string[] {
  const l = liushuOf(c);
  if (!l) return [];
  const peers = getByLiushu(l)
    .map((e) => e.c)
    .filter((x) => x !== c);
  return peers.slice(0, n);
}

/**
 * 部件干扰项：与目标字无关、但同样可教学的部件。
 * 供「拖拽拼字」「选出组成部件」类题型使用。
 */
export function componentDistractors(c: string, n = 3): string[] {
  const own = new Set(getComponents(c));
  own.add(c);
  const out: string[] = [];
  // allComponents 已按使用频次降序 —— 高频部件当干扰项才有辨析价值
  for (const { comp } of allComponents()) {
    if (own.has(comp)) continue;
    out.push(comp);
    if (out.length >= n * 4) break;
  }
  // 在高频池里随机取，避免每次干扰项完全相同
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out.slice(0, n);
}

// ================================================================ 6. 讲解措辞
/**
 * 形旁义类提示（人工校订）。
 * 覆盖字库里实际出现的全部形旁字形；未收录者返回空串，讲解句自动省略该从句。
 */
const SEMANTIC_HINT: Record<string, string> = {
  氵: '和水有关',
  艹: '和草木有关',
  木: '和树木有关',
  亻: '和人有关',
  彳: '和行走有关',
  扌: '和手的动作有关',
  口: '和嘴巴、说话有关',
  忄: '和心情有关',
  心: '和心情有关',
  讠: '和说话有关',
  钅: '和金属有关',
  纟: '和丝线、布有关',
  犭: '和动物有关',
  宀: '和房子有关',
  土: '和泥土、地面有关',
  辶: '和走路有关',
  灬: '和火有关',
  火: '和火有关',
  日: '和太阳、时间有关',
  月: '和月亮或身体有关',
  雨: '和天气有关',
  目: '和眼睛有关',
  耳: '和耳朵有关',
  足: '和脚有关',
  走: '和跑动有关',
  车: '和车有关',
  舟: '和船有关',
  牛: '和牛有关',
  鸟: '和鸟有关',
  鱼: '和鱼有关',
  马: '和马有关',
  隹: '和鸟有关',
  穴: '和洞、屋子有关',
  见: '和看有关',
  欠: '和张口出气有关',
  攵: '和用手做事有关',
  酉: '和酒有关',
  田: '和田地有关',
  里: '和路程、村子有关',
  彡: '和毛发、纹路有关',
  囗: '和围起来的地方有关',
  至: '和到达有关',
  竹: '和竹子有关',
  石: '和石头有关',
  米: '和粮食有关',
  衣: '和衣服有关',
  门: '和门有关',
  女: '和女子有关',
  子: '和孩子有关',
  手: '和手有关',
  刂: '和刀有关',
};

/** 形旁义类提示，无收录则返回空串 */
export function semanticHint(component: string): string {
  return SEMANTIC_HINT[component] ?? '';
}

const SOUND_PHRASE: Record<NonNullable<HanziEtymology['soundRel']>, string> = {
  exact: '读音一样',
  rhyme: '韵母一样',
  initial: '开头的音一样',
};

/**
 * 生成给孩子听的字理讲解句（供 LearnFlow 的 know 步、题目 why 复用）。
 *
 * 【措辞纪律】只讲数据支持的内容：
 *   - 数据没给 phonetic（声旁已不表音，如 时/江/树）→ 只讲形旁表义，绝不编"右边表读音"
 *   - uncertain 的字（多为简化字）→ 不做"这是 X 字"的断言，改为中性描述
 */
export function explainFormation(c: string): string {
  const e = HANZI_ETYMOLOGY[c];
  if (!e) return '';
  const entry = entryOf(c);
  const origin = entry?.origin ?? '';
  const comps = e.components;
  const meta = LIUSHU_META[e.liushu];

  if (e.uncertain) {
    return origin ? `「${c}」是个特别的字：${origin}。` : `「${c}」是个特别的字。`;
  }

  if (e.liushu === 'pictophonetic') {
    const parts: string[] = [];
    if (comps.length >= 2) parts.push(`「${c}」= ${comps.join(' + ')}`);
    if (e.semantic) {
      const hint = semanticHint(e.semantic);
      parts.push(hint ? `「${e.semantic}」表示${hint}` : `「${e.semantic}」表示意思`);
    }
    if (e.phonetic && e.soundRel) {
      const py = e.phoneticPinyin ? `（读 ${e.phoneticPinyin}）` : '';
      parts.push(`「${e.phonetic}」${py}和「${c}」${SOUND_PHRASE[e.soundRel]}，提示读音`);
    }
    if (!parts.length) return origin ? `${meta.label}：${origin}。` : `${c} 是${meta.label}。`;
    return `${parts.join('，')}。`;
  }

  if (e.liushu === 'compound-ideographic' && comps.length >= 2) {
    const head = `${comps.join(' + ')} 合起来就是「${c}」`;
    return origin ? `${head}——${origin}。` : `${head}。`;
  }

  if (e.liushu === 'pictographic') {
    return origin ? `「${c}」是画出来的字：${origin}。` : `「${c}」是象形字，照着样子画出来的。`;
  }

  // 指事字（含拆不出部件的会意字）
  return origin ? `「${c}」是${meta.label}：${origin}。` : `「${c}」是${meta.label}。`;
}

/** 一句话六书标签文案（徽章 tooltip / 卡片副标题） */
export function formationTagline(c: string): string {
  const e = HANZI_ETYMOLOGY[c];
  if (!e) return '';
  if (e.uncertain) return '特别的字';
  return LIUSHU_META[e.liushu].label;
}
