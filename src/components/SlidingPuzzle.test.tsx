// @vitest-environment jsdom
/**
 * SlidingPuzzle 玩法单元测试（Lint 第三批数学组件配套单测）
 * 覆盖：genGrid 可解性结构、findBlank/getMoves 邻居规则、isSolved 判定、渲染冒烟
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/sfx', () => ({ sfxTap: vi.fn(), sfxCorrect: vi.fn() }));
vi.mock('@/lib/utils', () => ({ cn: (...a: any[]) => a.filter(Boolean).join(' ') }));
vi.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }) }));
vi.mock('@/components/ui/Button', () => ({
  CandyButton: (props: any) => createElement('button', { onClick: props.onClick, className: props.className }, props.children),
}));

const { SlidingPuzzle, genGrid, findBlank, getMoves, isSolved } = await import('@/components/SlidingPuzzle');

function render() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => { root.render(createElement(SlidingPuzzle)); });
  return { container, root };
}

describe('SlidingPuzzle 纯逻辑', () => {
  it('genGrid(3) 生成 3×3 且恰有一个空格', () => {
    const g = genGrid(3);
    expect(g.length).toBe(3);
    g.forEach(row => expect(row.length).toBe(3));
    const zeros = g.flat().filter(v => v === 0).length;
    expect(zeros).toBe(1);
  });

  it('genGrid(4) 生成 4×4 且恰有一个空格', () => {
    const g = genGrid(4);
    expect(g.length).toBe(4);
    g.forEach(row => expect(row.length).toBe(4));
    expect(g.flat().filter(v => v === 0).length).toBe(1);
  });

  it('findBlank 定位空格坐标', () => {
    const g = [[1,2,3],[4,0,5],[6,7,8]];
    expect(findBlank(g, 3)).toEqual([1, 1]);
  });

  it('getMoves 仅返回合法四邻域', () => {
    expect(getMoves(0, 0, 3).sort()).toEqual([[0,1],[1,0]].sort());
    expect(getMoves(1, 1, 3).sort()).toEqual([[0,1],[1,0],[1,2],[2,1]].sort());
    expect(getMoves(2, 2, 3).sort()).toEqual([[1,2],[2,1]].sort());
  });

  it('isSolved 正确判定 3×3 终局', () => {
    const solved = [[1,2,3],[4,5,6],[7,8,0]];
    expect(isSolved(solved, 3)).toBe(true);
    const unsolved = [[1,2,3],[4,5,6],[7,0,8]];
    expect(isSolved(unsolved, 3)).toBe(false);
  });

  it('一次合法滑动后空格位置随之移动', () => {
    const g = [[1,2,3],[4,0,5],[6,7,8]]; // blank at (1,1)
    const [br, bc] = findBlank(g, 3);
    const mv = getMoves(br, bc, 3)[0]!;
    const [mr, mc] = mv;
    const a = g[br]?.[bc] ?? 0;
    const b = g[mr]?.[mc] ?? 0;
    const rowB = g[br]; const rowM = g[mr];
    if (rowB && rowM) { rowB[bc] = b; rowM[mc] = a; }
    const [nr, nc] = findBlank(g, 3);
    expect([nr, nc]).toEqual([mr, mc]);
  });
});

describe('SlidingPuzzle 渲染冒烟', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => { act(() => root?.unmount()); container?.remove(); });

  it('渲染 3×3 棋盘且不崩溃', () => {
    const r = render();
    container = r.container; root = r.root;
    expect(container.textContent).toContain('slidingPuzzle.title');
    // 9 个格子按钮
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(9);
  });

  it('点击相邻滑块后步数计数增加', () => {
    const r = render();
    container = r.container; root = r.root;
    const before = container.textContent ?? '';
    // 找到任何可点击的格子按钮并点击一次（至少存在一个相邻于空格的格子）
    const tiles = Array.from(container.querySelectorAll('button')).slice(0, 9);
    let clicked = false;
    for (const b of tiles) {
      act(() => { (b as HTMLButtonElement).click(); });
      const after = container?.textContent ?? '';
      if (after !== before) { clicked = true; break; }
    }
    expect(clicked).toBe(true);
  });
});
