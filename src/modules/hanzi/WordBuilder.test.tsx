// @vitest-environment jsdom
/**
 * WordBuilder 深链预选目标字（initialChar）单元测试
 * 覆盖 R3「识字深链直达具体汉字」改造：
 *   1. 无 initialChar 时显示「开始」引导屏，不预选
 *   2. initialChar="木" 时自动预选「木」进入组词/造句，跳过开始屏
 *   3. 非法 initialChar（数据不存在）时不预选，回退到开始屏
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/sfx', () => ({ sfxCorrect: vi.fn(), sfxWrong: vi.fn() }));
vi.mock('@/lib/speech', () => ({ speak: vi.fn(() => Promise.resolve()) }));
vi.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }) }));

const fakeState = { practice: vi.fn(), addStars: vi.fn(), markTraced: vi.fn(), learnSkill: vi.fn() };
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeState) : fakeState),
  useProgress: () => ({ mastery: {} }),
}));

const { WordBuilder } = await import('@/modules/hanzi/WordBuilder');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderWith(initialChar?: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(WordBuilder, { initialChar })));
  roots.push(root);
  return container;
}

function bigChar(container: HTMLElement): string {
  // 大字展示 span 经历响应式字号放大（text-5xl → text-6xl sm:text-7xl），
  // 选择器与当前 UI 保持同步，仅锁定「预选目标字渲染为大字」行为本身。
  const el = container.querySelector('.text-6xl');
  return el?.textContent?.trim() ?? '';
}

describe('WordBuilder 深链预选目标字', () => {
  it('无 initialChar 时显示开始引导屏，不预选', () => {
    const c = renderWith(undefined);
    expect(c.textContent).toContain('wordBuilder.start');
    expect(bigChar(c)).toBe('');
  });

  it('initialChar="木" 自动预选「木」，跳过开始屏', () => {
    const c = renderWith('木');
    expect(c.textContent).not.toContain('wordBuilder.start');
    expect(bigChar(c)).toBe('木');
  });

  it('initialChar 为不存在的字时不预选，回退开始屏', () => {
    const c = renderWith('鿃');
    expect(c.textContent).toContain('wordBuilder.start');
    expect(bigChar(c)).toBe('');
  });
});
