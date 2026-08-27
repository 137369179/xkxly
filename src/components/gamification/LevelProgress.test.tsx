// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { LevelProgress } from './LevelProgress';
import { createInitialProgress } from '@/lib/progress';
import { SKILL } from '@/lib/srs';

describe('LevelProgress · 掌握进度', () => {
  it('渲染 progressbar 并带掌握度文案', () => {
    const p = createInitialProgress();
    p.mastery = { [SKILL.hanzi('水')]: { lv: 4, ok: 4, ng: 0, due: 0 } };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(LevelProgress, { progress: p })));
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('aria-valuenow')).not.toBeNull();
    expect(container.textContent).toContain('掌握度');
    root.unmount();
  });
});
