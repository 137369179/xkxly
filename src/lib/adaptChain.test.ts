import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInitialProgress } from '@/lib/progress';

// Mock localStorage for node environment
const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => { mockStore[key] = value; },
  removeItem: (key: string) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); },
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Import after mock
const { recordAdapt, getAdaptLv, getChainSnapshot, resetChain, recordAttempt, recommendDifficulty, applyRecentSignals, getWeakTypes } = await import('./adaptChain');

describe('adaptChain', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // safeStorage 有模块级 memoryFallback，mockLocalStorage.clear() 清不到；
    // 显式 reset 用到的 cat，避免跨用例串味（chain 日志残留在内存兜底）。
    resetChain('math');
    resetChain('word');
    resetChain('hanzi');
  });

  it('初始难度为 1', () => {
    expect(getAdaptLv('math')).toBe(1);
  });

  it('recordAdapt 返回结果', () => {
    const result = recordAdapt('math', true);
    expect(result.newLv).toBeGreaterThanOrEqual(1);
  });

  it('连对5题后仍可用', () => {
    for (let i = 0; i < 5; i++) {
      recordAdapt('math', true);
    }
    expect(getAdaptLv('math')).toBeGreaterThanOrEqual(1);
  });

  it('getChainSnapshot 返回数组', () => {
    recordAdapt('math', true);
    const snapshot = getChainSnapshot();
    expect(Array.isArray(snapshot)).toBe(true);
    expect(snapshot.length).toBeGreaterThanOrEqual(1);
  });
});

describe('DDA 动态难度适配', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // safeStorage 有模块级 memoryFallback，mockLocalStorage.clear() 清不到；
    // 显式 reset 用到的 cat，避免跨用例串味（chain 日志残留在内存兜底）。
    resetChain('math');
    resetChain('word');
    resetChain('hanzi');
  });

  it('无作答记录时返回历史正确率基线', () => {
    // ok=8 ng=2 → rate 0.8 → 基线 2
    const p = createInitialProgress();
    p.mastery = { 'hanzi:好': { lv: 2, due: 0, ok: 8, ng: 2, last: 1 } };
    expect(recommendDifficulty(p, 'hanzi')).toBe(2);
  });

  it('最近正确率高(>85%)则升一档（心流区上限）', () => {
    const p = createInitialProgress();
    p.mastery = { 'hanzi:好': { lv: 2, due: 0, ok: 8, ng: 2, last: 1 } };
    for (let i = 0; i < 10; i++) recordAttempt('hanzi', { correct: true, ms: 3000 });
    expect(recommendDifficulty(p, 'hanzi')).toBe(3);
  });

  it('最近正确率低(<65%)则降一档（防挫败）', () => {
    const p = createInitialProgress();
    p.mastery = { 'hanzi:好': { lv: 3, due: 0, ok: 20, ng: 2, last: 1 } };
    for (let i = 0; i < 10; i++) recordAttempt('hanzi', { correct: false, ms: 3000 });
    expect(recommendDifficulty(p, 'hanzi')).toBe(1);
  });

  it('反应时明显偏慢(>12s)则降一档', () => {
    const p = createInitialProgress();
    p.mastery = { 'hanzi:好': { lv: 2, due: 0, ok: 8, ng: 2, last: 1 } };
    // 全对但超慢：识别为"在纠结"，从正确率升档后的 3 降回 2（缓一档而非打到地板）
    for (let i = 0; i < 10; i++) recordAttempt('hanzi', { correct: true, ms: 20000 });
    expect(recommendDifficulty(p, 'hanzi')).toBe(2);
  });

  it('连续 3 次答错立即降档', () => {
    const p = createInitialProgress();
    p.mastery = { 'hanzi:好': { lv: 3, due: 0, ok: 20, ng: 1, last: 1 } };
    for (let i = 0; i < 6; i++) recordAttempt('hanzi', { correct: true, ms: 3000 });
    recordAttempt('hanzi', { correct: false, ms: 3000 });
    recordAttempt('hanzi', { correct: false, ms: 3000 });
    recordAttempt('hanzi', { correct: false, ms: 3000 });
    expect(recommendDifficulty(p, 'hanzi')).toBeLessThan(3);
  });

  it('难度始终夹在 1–3', () => {
    const p = createInitialProgress();
    for (let i = 0; i < 10; i++) recordAttempt('hanzi', { correct: true, ms: 1000 });
    const d = recommendDifficulty(p, 'hanzi');
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThanOrEqual(3);
  });
});

/**
 * P1-1：错题本这类调用方自己有更精确的基线（单个知识点掌握度），
 * 只需要叠加"当下状态"信号，故把窗口信号拆成了独立纯函数。
 */
describe('applyRecentSignals · 状态信号叠加（不含历史基线）', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // safeStorage 有模块级 memoryFallback，mockLocalStorage.clear() 清不到；
    // 显式 reset 用到的 cat，避免跨用例串味（chain 日志残留在内存兜底）。
    resetChain('math');
    resetChain('word');
    resetChain('hanzi');
  });

  it('样本不足(<3)时原样返回基线，不瞎调', () => {
    recordAttempt('math', { correct: false, ms: 30000 });
    recordAttempt('math', { correct: false, ms: 30000 });
    expect(applyRecentSignals('math', 2)).toBe(2);
  });

  it('最近全对且够快 → 在基线上升一档', () => {
    for (let i = 0; i < 10; i++) recordAttempt('math', { correct: true, ms: 2000 });
    expect(applyRecentSignals('math', 1)).toBe(2);
  });

  it('最近连错 → 在基线上降档', () => {
    for (let i = 0; i < 10; i++) recordAttempt('math', { correct: false, ms: 3000 });
    expect(applyRecentSignals('math', 3)).toBe(1);
  });

  it('提示依赖过高(>40%) → 降一档', () => {
    // 8 对 2 错保证正确率 0.8 落在心流区内（不触发升/降），只剩提示信号起作用
    for (let i = 0; i < 8; i++) recordAttempt('math', { correct: true, ms: 3000, hintUsed: true });
    for (let i = 0; i < 2; i++) recordAttempt('math', { correct: false, ms: 3000 });
    expect(applyRecentSignals('math', 3)).toBe(2);
  });

  it('结果恒夹在 1–3，且不同 cat 的日志互不串味', () => {
    for (let i = 0; i < 10; i++) recordAttempt('math', { correct: true, ms: 1000 });
    expect(applyRecentSignals('math', 3)).toBe(3);      // 已封顶不越界
    expect(applyRecentSignals('word', 2)).toBe(2);      // word 无日志 → 原样
    for (let i = 0; i < 10; i++) recordAttempt('word', { correct: false, ms: 1000 });
    expect(applyRecentSignals('word', 1)).toBe(1);      // 已触底不越界
  });
});

/**
 * P1-3 错因驱动内容：getWeakTypes 聚合某类最近错题的薄弱题型（errorType），
 * 供错题本优先加权重练。是 AdaptiveTrainer 实际消费的数据源。
 */
describe('getWeakTypes · 错因聚合（P1-3 数据源）', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // safeStorage 有模块级 memoryFallback，mockLocalStorage.clear() 清不到；
    // 显式 reset 用到的 cat，避免跨用例串味（chain 日志残留在内存兜底）。
    resetChain('math');
    resetChain('word');
    resetChain('hanzi');
  });

  it('无错题时返回空', () => {
    expect(getWeakTypes('math')).toEqual([]);
  });

  it('只统计答错的 errorType，按频次降序', () => {
    // 乘法错 3 次、减法错 1 次、加法对（不计入）
    recordAttempt('math', { correct: false, ms: 3000, errorType: 'mul' });
    recordAttempt('math', { correct: false, ms: 3000, errorType: 'mul' });
    recordAttempt('math', { correct: false, ms: 3000, errorType: 'mul' });
    recordAttempt('math', { correct: false, ms: 3000, errorType: 'sub' });
    recordAttempt('math', { correct: true, ms: 3000, errorType: 'add' });

    const ws = getWeakTypes('math');
    expect(ws).toEqual([
      { type: 'mul', count: 3 },
      { type: 'sub', count: 1 },
    ]);
  });

  it('不同 cat 的错因互不串味', () => {
    recordAttempt('math', { correct: false, ms: 3000, errorType: 'mul' });
    recordAttempt('word', { correct: false, ms: 3000, errorType: 'spell' });
    expect(getWeakTypes('math')).toEqual([{ type: 'mul', count: 1 }]);
    expect(getWeakTypes('word')).toEqual([{ type: 'spell', count: 1 }]);
  });
});
