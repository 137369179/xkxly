// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { AchievementWall } from './AchievementWall';
import { createInitialProgress } from '@/lib/progress';

describe('AchievementWall · 成就墙', () => {
  it('渲染成长里程碑汇总与已解锁徽章', () => {
    const p = createInitialProgress();
    p.badges = ['streak-7', 'total-5'];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(AchievementWall, { progress: p })));
    expect(container.textContent).toContain('成长里程碑');
    expect(container.textContent).toContain('streak-7');
    root.unmount();
  });
});
