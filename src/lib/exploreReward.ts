/**
 * 探索型学习组件的「完成打卡」激励助手（游戏化·积分/奖励解锁）
 * ------------------------------------------------------------------
 * 识字/英语/数学三大核心模块里，存在一批「探索/认知型」子组件
 * （字源演变、部件拆解、部首浏览、字母精学、数字描红……），
 * 它们只做内容呈现、缺少游戏化闭环。本助手提供一个轻量、可复用的
 * 「完成探索 +⭐」机制：
 *   - 孩子看完/学完一个探索内容 → 点「完成探索」→ 全局星星入账；
 *   - 星星是全局货币，会自动驱动 star-50/200/500 等成就徽章（成就系统）；
 *   - 已探索状态持久化到 localStorage，刷新后仍记为「已探索」（成长目标感）。
 *
 * 设计约束（沿用项目既有规范）：
 *   - 仅依赖 localStorage，不新增任何第三方依赖；
 *   - 不改动既有 SRS / store 业务 schema，零回归风险；
 *   - 纯函数 + 容错（隐私模式 / 存储不可用时优雅降级，仍授予本次奖励）。
 */

const STORAGE_KEY = 'bb-explore-claimed';

/** 已探索记录：rewardKey -> 完成时间戳 */
export interface ExploreClaimMap {
  [key: string]: number;
}

/** 默认每个探索内容完成授予的星星数 */
export const DEFAULT_EXPLORE_STARS = 2;

/** 读取全部已探索记录（容错：解析失败 / 无 storage 时返回空对象） */
export function getClaimedMap(): ExploreClaimMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as ExploreClaimMap) : {};
  } catch {
    return {};
  }
}

/** 某个探索内容是否已完成打卡 */
export function isExplored(key: string): boolean {
  return Boolean(getClaimedMap()[key]);
}

/**
 * 标记某个探索内容为已完成，返回最新记录映射。
 * 幂等：重复调用不会重复写入时间戳。
 * 存储不可用时静默失败（本次奖励仍由调用方在内存中授予）。
 */
export function claimExplore(key: string): ExploreClaimMap {
  const map = getClaimedMap();
  if (!map[key]) {
    map[key] = Date.now();
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        /* 隐私模式 / 配额超限：忽略，奖励仍生效 */
      }
    }
  }
  return map;
}
