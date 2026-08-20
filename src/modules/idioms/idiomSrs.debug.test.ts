// @vitest-environment jsdom
/**
 * 复习调试开关 isIdrDebug 的「兜底逻辑」验证
 * ----------------------------------------------
 * 目标：模拟 Safari 隐私模式/存储禁用下，safeStorage 漏读但
 * 直接回读 window.localStorage 的兜底是否生效、且绝不抛错。
 *
 * 场景矩阵：
 *  A) safeStorage 漏读(null) + 原生 localStorage 已写 '1' → 兜底直读开启
 *  B) safeStorage 返回 '1' → 第一级直接开启
 *  C) 原生 localStorage.getItem 抛 SecurityError（真正隐私/禁用）→ 回 false 且不抛
 *  D) 两者都无值 → 未开启 false
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const KEY = 'idiomReview_debug';

// 控制 safeStorage.safeGetItem 返回值（模拟"探测不可用/漏读"）
const mocks = vi.hoisted(() => ({ safeGetItem: vi.fn() }));
vi.mock('@/lib/safeStorage', () => ({ safeGetItem: mocks.safeGetItem }));

import { isIdrDebug } from './idiomSrs';

describe('isIdrDebug 兜底逻辑（Safari 隐私模式模拟）', () => {
  beforeEach(() => {
    mocks.safeGetItem.mockReset().mockReturnValue(null); // 默认：safeStorage 漏读
    try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
  });
  afterEach(() => {
    try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
    vi.restoreAllMocks();
  });

  it('A) safeStorage 漏读(null)，但原生 localStorage 已写 "1" → 兜底直读开启', () => {
    window.localStorage.setItem(KEY, '1');
    expect(isIdrDebug()).toBe(true); // 第二级直读生效
  });

  it('B) safeStorage 返回 "1" → 第一级直接开启', () => {
    mocks.safeGetItem.mockReturnValue('1');
    expect(isIdrDebug()).toBe(true);
  });

  it('C) 原生 localStorage.getItem 抛 SecurityError（真正隐私/禁用）→ 回 false 且不抛', () => {
    mocks.safeGetItem.mockReturnValue(null);
    const spy = vi
      .spyOn(window.localStorage, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });
    expect(() => isIdrDebug()).not.toThrow();
    expect(isIdrDebug()).toBe(false); // 直读失败回落未开启
    spy.mockRestore();
  });

  it('D) 两者都无值/未开启 → false', () => {
    window.localStorage.removeItem(KEY);
    expect(isIdrDebug()).toBe(false);
  });
});