// @vitest-environment jsdom
/**
 * MiniSudoku 玩法单元测试（Lint 第三批数学组件配套单测）
 * 覆盖：genBoard 拉丁方不变量、谜面为解的子集、渲染冒烟
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
vi.mock('@/lib/sfx', () => ({ sfxTap: vi.fn(), sfxCorrect: vi.fn() }));
vi.mock('@/lib/speech', () => ({ speak: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/utils', () => ({ cn: (...a: any[]) => a.filter(Boolean).join(' ') }));
vi.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }) }));
vi.mock('@/components/ui/Button', () => ({
  CandyButton: (props: any) => createElement('button', { onClick: props.onClick, className: props.className }, props.children),
}));

const EMOJIS = ['🐱', '🐶', '🐰'];
const { MiniSudoku, genBoard } = await import('@/components/MiniSudoku');

function render() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => { root.render(createElement(MiniSudoku)); });
  return { container, root };
}

describe('MiniSudoku 纯逻辑', () => {
  it('genBoard 生成 3×3 谜面与解', () => {
    const { grid, solution } = genBoard();
    expect(grid.length).toBe(3);
    expect(solution.length).toBe(3);
    grid.forEach(r => expect(r.length).toBe(3));
    solution.forEach(r => expect(r.length).toBe(3));
  });

  it('解（solution）每行每列均为拉丁方（3 个 emoji 互不相同）', () => {
    const { solution } = genBoard();
    for (let r = 0; r < 3; r++) {
      const rowSet = new Set(solution[r]);
      expect(rowSet.size).toBe(3);
      expect([...rowSet].every(e => EMOJIS.includes(e))).toBe(true);
    }
    for (let c = 0; c < 3; c++) {
      const colSet = new Set([solution[0]?.[c] ?? '', solution[1]?.[c] ?? '', solution[2]?.[c] ?? '']);
      expect(colSet.size).toBe(3);
    }
  });

  it('谜面是解的子集：所有非空格与解一致', () => {
    for (let trial = 0; trial < 20; trial++) {
      const { grid, solution } = genBoard();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const cell = grid[r]?.[c];
        if (cell !== null) expect(cell).toBe(solution[r]?.[c] ?? '');
      }
    }
  });

  it('谜面至少挖空 1 格（可玩），且不超过 9 格', () => {
    const { grid } = genBoard();
    const nulls = grid.flat().filter(v => v === null).length;
    expect(nulls).toBeGreaterThanOrEqual(1);
    expect(nulls).toBeLessThanOrEqual(9);
  });
});

describe('MiniSudoku 渲染冒烟', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => { act(() => root?.unmount()); container?.remove(); });

  it('渲染标题与 3×3 棋盘且不崩溃', () => {
    const r = render();
    container = r.container; root = r.root;
    expect(container.textContent).toContain('miniSudoku.title');
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(9);
  });
});
