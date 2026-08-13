/**
 * 里程碑庆祝系统（核心加强 E）
 * ------------------------------------------------------------
 * 设计依据：洪恩识字每5字测验通过后触发专属动画 + 叫叫阅读L级结业证书。
 * 对 5-6 岁孩子而言，「里程碑达成」比「得分」更有激励意义。
 *
 * 里程碑定义：
 *   - 总掌握 5 / 10 / 25 / 50 / 100 个知识点
 *   - 分项里程碑：汉字 50 / 100 / 200 / 300
 *   - 连续打卡 7 / 14 / 30 天
 *   - 星星 50 / 100 / 300 / 500
 */
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import type { Progress } from '@/types';

export interface Milestone {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  /** 再次达成时的变体文案 */
  revisit?: string;
}

const MILESTONES: {
  check: (p: Progress) => boolean;
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  revisit?: string;
}[] = [
  // 总量里程碑
  {
    id: 'total-5',
    icon: '🌱',
    title: '学习小芽',
    subtitle: '已经学会 5 个知识点啦！刚破土而出的小芽～',
    revisit: '你已经是学习小芽的老朋友啦！',
    check: (p) => totalMastered(p) >= 5,
  },
  {
    id: 'total-10',
    icon: '🌿',
    title: '知识嫩叶',
    subtitle: '10 个知识点！叶子越长越多啦～',
    revisit: '你的知识之树已经枝繁叶茂！',
    check: (p) => totalMastered(p) >= 10,
  },
  {
    id: 'total-25',
    icon: '🪴',
    title: '知识盆栽',
    subtitle: '已经掌握 25 个知识点了！像小盆栽一样茁壮成长～',
    revisit: '你的知识盆栽已经开满花了！',
    check: (p) => totalMastered(p) >= 25,
  },
  {
    id: 'total-50',
    icon: '🌳',
    title: '知识小树',
    subtitle: '50 个知识点！你的知识树已经开花啦～',
    check: (p) => totalMastered(p) >= 50,
  },
  {
    id: 'total-100',
    icon: '🏆',
    title: '百点达人',
    subtitle: '100 个知识点！你已经是个小学霸啦！',
    check: (p) => totalMastered(p) >= 100,
  },
  // 分项里程碑
  {
    id: 'hanzi-50',
    icon: '🀄',
    title: '汉字小达人（50字）',
    subtitle: '认识 50 个汉字了！可以读简单的小故事啦～',
    check: (p) => categoryMastered(p, 'hanzi') >= 50,
  },
  {
    id: 'hanzi-100',
    icon: '📖',
    title: '汉字百字王（100字）',
    subtitle: '100 个汉字！绘本看得懂一大半了！',
    check: (p) => categoryMastered(p, 'hanzi') >= 100,
  },
  {
    id: 'hanzi-200',
    icon: '📚',
    title: '汉字小专家（200字）',
    subtitle: '200 个汉字！可以自己读绘本啦！',
    check: (p) => categoryMastered(p, 'hanzi') >= 200,
  },
  // 打卡里程碑
  {
    id: 'streak-7',
    icon: '🔥',
    title: '七天连学',
    subtitle: '连续学习 7 天了！好习惯已经养成～',
    revisit: '又是坚持 7 天！你已经是个自律小达人！',
    check: (p) => (p.streak ?? 0) >= 7,
  },
  {
    id: 'streak-14',
    icon: '💪',
    title: '十四天坚持',
    subtitle: '连续 14 天没偷懒！太了不起了！',
    check: (p) => (p.streak ?? 0) >= 14,
  },
  {
    id: 'streak-30',
    icon: '👑',
    title: '月度学习王者',
    subtitle: '整整一个月都在学习！你是最棒的！',
    check: (p) => (p.streak ?? 0) >= 30,
  },
  // 星星里程碑
  {
    id: 'stars-50',
    icon: '⭐',
    title: '50 颗星星',
    subtitle: '攒了 50 颗星星！闪闪发光的小富婆/富翁～',
    check: (p) => (p.stars ?? 0) >= 50,
  },
  {
    id: 'stars-100',
    icon: '🌟',
    title: '100 颗星星',
    subtitle: '100 颗星星！你已经坐拥星海了！',
    check: (p) => (p.stars ?? 0) >= 100,
  },
  {
    id: 'stars-300',
    icon: '💫',
    title: '300 颗星星',
    subtitle: '银河里最亮的星就是你！',
    check: (p) => (p.stars ?? 0) >= 300,
  },
  {
    id: 'stars-500',
    icon: '🌌',
    title: '星海霸主',
    subtitle: '500 颗星星！整个银河都是你的家园！',
    check: (p) => (p.stars ?? 0) >= 500,
  },
];

/** 计算已掌握知识点总量（lv >= 2 算"掌握"，lv >= 5 算"精通"） */
function totalMastered(p: Progress): number {
  return Object.values(p.mastery).filter((m) => m.lv >= 2).length;
}

/** 计算某分类已掌握数量 */
function categoryMastered(p: Progress, category: string): number {
  return Object.entries(p.mastery)
    .filter(([k, m]) => k.startsWith(`${category}:`) && m.lv >= 2)
    .length;
}

/** 标记已庆祝过的里程碑（格式 milestone:{id}） */
const CELEBRATED_KEY = 'milestones-celebrated';

const memoryCelebrated = new Set<string>();

function getCelebrated(): Set<string> {
  const raw = safeGetItem(CELEBRATED_KEY);
  if (!raw) return memoryCelebrated;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : memoryCelebrated;
  } catch {
    return memoryCelebrated;
  }
}

function markCelebrated(id: string) {
  const set = getCelebrated();
  set.add(id);
  try {
    safeSetItem(CELEBRATED_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[milestone] 写入失败', e);
  }
  memoryCelebrated.add(id);
}

/**
 * 检查当前进度是否触发新的里程碑。
 * 返回未庆祝过的里程碑列表，按触发顺序排列。
 */
export function checkMilestones(p: Progress): Milestone[] {
  const celebrated = getCelebrated();
  const results: Milestone[] = [];
  for (const m of MILESTONES) {
    if (!m.check(p)) continue;
    if (celebrated.has(m.id)) continue;
    results.push({ id: m.id, icon: m.icon, title: m.title, subtitle: m.subtitle });
  }
  return results;
}

/**
 * 确认某个里程碑已经展示过庆祝 UI，后续不再弹窗。
 */
export function ackMilestone(id: string) {
  markCelebrated(id);
}

/**
 * 获取里程碑总数，用于进度条展示。
 */
export function milestoneCount(): number {
  return MILESTONES.length;
}

/**
 * 获取已达成里程碑数。
 */
export function achievedCount(p: Progress): number {
  return MILESTONES.filter((m) => m.check(p)).length;
}
