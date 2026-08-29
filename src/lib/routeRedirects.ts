import type { RouteId } from './router';

/**
 * 合并组重定向表（儿童化 UI 改版 · Phase B）
 * ------------------------------------------------------------------
 * 原则：**43 条路由零删减，仅更换渲染目标**。
 * 旧链接（书签 / 分享 / SEO 预渲染直链 / 深链）全部继续可用，不会 404，
 * 只是渲染到合并后的新入口，避免用户与 SEO 双重损失。
 * 重定向在 router.parseHash 中前置生效，组件层无需感知。
 */
export const ROUTE_REDIRECTS: Partial<Record<RouteId, RouteId>> = {
  // 荣誉域三合一：奖励中心 / 打卡护照 / 成就中心 → 成长荣誉馆
  rewards: 'growth',
  passport: 'growth',
  achievement: 'growth',

  // 宠物域三合一：写实 3D 猫 / 桌面宠物 → 伴读猫屋
  realistic_cat: 'cat_house',
  desktop_pet: 'cat_house',

  // 汉字域：听音识字（原孤儿路由）→ 汉字乐园，作为页内玩法入口
  'hanzi-listen': 'hanzi',

  // 故事域：故事总馆（原孤儿路由，无任何入口）→ 乐园地图
  story: 'hall',

  // 游戏域：趣味竞技场 / 亲子对战 → 游戏乐园
  fun: 'gamecenter',
  duel: 'gamecenter',
};

/** 解析重定向：命中则回目标路由，未命中原样返回 */
export function resolveRedirect(route: RouteId): RouteId {
  return ROUTE_REDIRECTS[route] ?? route;
}
