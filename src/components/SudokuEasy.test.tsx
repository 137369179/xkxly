// @vitest-environment jsdom
/**
 * SudokuEasy 玩法单元测试（Lint 第三批数学组件配套单测）
 * 覆盖：isCorrect 判定、PUZZLES/SOLUTIONS 数据完整性、渲染冒烟
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    { get: (_t: any, c: string) => (props: any) => createElement(typeof c === 'string' ? c : 'div', props, props.children) },
  ),
  AnimatePresence: ({ children }: any) => children,
}));
vi.mock('@/lib/sfx', () => ({ sfxTap: vi.fn(), sfxCorrect: vi.fn(), sfxWrong: vi.fn() }));
vi.mock('@/lib/utils', () => ({ cn: (...a: any[]) => a.filter(Boolean).join(' ') }));
vi.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }) }));
vi.mock('@/components/ui/Button', () => ({
  CandyButton: (props: any) => createElement('button', { onClick: props.onClick, className: props.className }, props.children),
}));

const { SudokuEasy, isCorrect, PUZZLES, SOLUTIONS } = await import('@/components/SudokuEasy');

function render() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => { root.render(createElement(SudokuEasy)); });
  return { container, root };
}

describe('SudokuEasy 纯逻辑', () => {
  it('PUZZLES 与 SOLUTIONS 均为 4 题且每题 16 格', () => {
    expect(PUZZLES.length).toBe(4);
    expect(SOLUTIONS.length).toBe(4);
    PUZZLES.forEach(p => expect(p.length).toBe(16));
    SOLUTIONS.forEach(s => expect(s.length).toBe(16));
  });

  it('原题（含空格）判定为未完成', () => {
    expect(isCorrect(PUZZLES[0] ?? [], SOLUTIONS[0] ?? [])).toBe(false);
  });

  it('填写正解后判定为完成', () => {
    expect(isCorrect(SOLUTIONS[0] ?? [], SOLUTIONS[0] ?? [])).toBe(true);
    expect(isCorrect(SOLUTIONS[3] ?? [], SOLUTIONS[3] ?? [])).toBe(true);
  });

  it('填错则判定未完成', () => {
    const wrong = [...(SOLUTIONS[0] ?? [])];
    // 翻转两个非空格
    const a = wrong.findIndex(v => v !== 0);
    const b = wrong.findIndex((v, i) => v !== 0 && i > a);
    if (a >= 0 && b >= 0) { const t = wrong[a] ?? 0; wrong[a] = wrong[b] ?? 0; wrong[b] = t; }
    expect(isCorrect(wrong, SOLUTIONS[0] ?? [])).toBe(false);
  });
});

describe('SudokuEasy 渲染冒烟', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => { act(() => root?.unmount()); container?.remove(); });

  it('渲染标题与 4 个关卡按钮且不崩溃', () => {
    const r = render();
    container = r.container; root = r.root;
    expect(container.textContent).toContain('sudokuEasy.learnTitle');
    // 4 个关卡切换按钮 + 3 个主题切换按钮
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(7);
  });
});
