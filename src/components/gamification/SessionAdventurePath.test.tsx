// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { SessionAdventurePath, type SessionAdventurePathProps } from './SessionAdventurePath';
import type { ModuleKey } from '@/game/playVariety';

function renderPath(props: SessionAdventurePathProps) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(SessionAdventurePath, props));
  });
  return { container, root };
}

const MODULES: ModuleKey[] = ['hanzi', 'words', 'numbers'];

describe('SessionAdventurePath · 玩法轮换可视化消费层', () => {
  it('默认渲染 5 个玩法站点（对齐洪恩「每 5 字一单元」）', () => {
    const { container } = renderPath({ module: 'hanzi', level: 2 });
    const stops = container.querySelectorAll('.sap-stop');
    expect(stops).toHaveLength(5);
  });

  it('三核心模块均能产出非空路线图', () => {
    for (const module of MODULES) {
      const { container } = renderPath({ module, level: 2 });
      const stops = container.querySelectorAll('.sap-stop');
      expect(stops.length).toBeGreaterThan(0);
    }
  });

  it('第一个站点是当前步骤（aria-current=step）', () => {
    const { container } = renderPath({ module: 'words', level: 1 });
    const first = container.querySelector('.sap-stop');
    expect(first?.getAttribute('aria-current')).toBe('step');
  });

  it('section 通过 aria-labelledby 指向可见标题', () => {
    const { container } = renderPath({ module: 'numbers', level: 3 });
    const section = container.querySelector('[data-testid="session-adventure-path"]');
    const id = section?.getAttribute('aria-labelledby');
    expect(id).toBeTruthy();
    const title = container.querySelector(`#${id}`);
    expect(title?.textContent).toContain('冒险路线');
  });

  it('每个站点都渲染难度 ★（band 1-3）', () => {
    const { container } = renderPath({ module: 'hanzi', level: 3 });
    const stars = container.querySelectorAll('.sap-stop [aria-label^="难度"]');
    expect(stars.length).toBe(5);
    for (const s of Array.from(stars)) {
      expect((s.textContent ?? '').length).toBeGreaterThanOrEqual(1);
      expect((s.textContent ?? '').length).toBeLessThanOrEqual(3);
    }
  });

  it('length 入参精确控制站点数量', () => {
    const { container } = renderPath({ module: 'numbers', level: 2, length: 3 });
    expect(container.querySelectorAll('.sap-stop')).toHaveLength(3);
  });

  it('同 seed 渲染结果确定可复现（课堂/测试可重放）', () => {
    const a = renderPath({ module: 'hanzi', level: 2, seed: 7 });
    const b = renderPath({ module: 'hanzi', level: 2, seed: 7 });
    const labelsA = Array.from(a.container.querySelectorAll('.sap-label')).map((n) => n.textContent);
    const labelsB = Array.from(b.container.querySelectorAll('.sap-label')).map((n) => n.textContent);
    expect(labelsA).toEqual(labelsB);
  });

  it('reducedMotion 时移除入场动画样式（无障碍/护眼）', () => {
    const normal = renderPath({ module: 'hanzi', level: 2, reducedMotion: false });
    const reduced = renderPath({ module: 'hanzi', level: 2, reducedMotion: true });
    const normalStyle = normal.container.querySelector('.sap-reduced')
      ? 'has-class'
      : (normal.container.querySelector('.sap-stop') as HTMLElement)?.style.animation || '';
    const reducedStyle = (reduced.container.querySelector('.sap-stop') as HTMLElement)?.style.animation || '';
    expect(normalStyle).not.toBe('');
    expect(reducedStyle).toBe('');
  });

  it('所有站点玩法均落在当前难度带内（绝不越界给孩子挫败感）', () => {
    const { container } = renderPath({ module: 'words', level: 2 });
    const bands = Array.from(
      container.querySelectorAll('.sap-stop [aria-label^="难度"]'),
    ).map((n) => (n.getAttribute('aria-label') ?? '').match(/难度 (\d)/)?.[1]);
    for (const b of bands) {
      expect(Number(b)).toBeLessThanOrEqual(2);
    }
  });
});
