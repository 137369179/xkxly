import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, NAV_CATEGORY_META, NAV_CATEGORY_MAP, type NavCategory } from '@/data/nav';
import { ROUTES } from '@/lib/router';

/**
 * nav.test.ts
 * ------------------------------------------------------------------
 * T4（C6 路由四件套一致性）：
 *   1. ROUTES 含 'research'（router.ts 已注册）
 *   2. NAV_ITEMS 含 research 条目，且不在底部 Tab（bottom 未置位）
 *   3. NAV_CATEGORY_META 含第 8 个品类 chip（research）
 *   4. NAV_CATEGORY_MAP 将 research 路由映射到 research 品类
 * 任一侧漏注册 → 路由可导航但首页/品类条看不见入口，立即红灯。
 */

describe('C6 研究模式路由四件套', () => {
  it('router.ROUTES 已注册 research', () => {
    expect(ROUTES).toContain('research');
  });

  it('NAV_ITEMS 含 research 条目且不在底部 Tab', () => {
    const item = NAV_ITEMS.find((n) => n.id === 'research');
    expect(item).toBeDefined();
    expect(item?.bottom).toBeFalsy();
    expect(item?.label).toBeTruthy();
    expect(item?.emoji).toBe('🔬');
  });

  it('NavCategory 联合类型含 research', () => {
    const cat: NavCategory = 'research';
    expect(cat).toBe('research');
  });

  it('NAV_CATEGORY_META 含 research 品类 chip（第 8 个品类）', () => {
    expect(NAV_CATEGORY_META.some((c) => c.key === 'research')).toBe(true);
  });

  it('NAV_CATEGORY_MAP 将 research 路由映射到 research 品类', () => {
    expect(NAV_CATEGORY_MAP['research']).toBe('research');
  });
});
