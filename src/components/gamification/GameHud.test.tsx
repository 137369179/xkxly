// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameHud } from './GameHud';
import { GameProvider } from '@/game/GameProvider';
import { createInitialProgress } from '@/lib/progress';
import { SKILL } from '@/lib/srs';

function renderHud(extra?: Record<string, unknown>) {
  const p = createInitialProgress();
  p.mastery = { [SKILL.hanzi('水')]: { lv: 4, ok: 4, ng: 0, due: 0 } };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const tree = createElement(GameProvider, {
    getProgress: () => p,
    scene: 'hanzi',
    children: createElement(GameHud, {
      progress: p,
      combo: 3,
      feedback: { correct: true, message: '你真棒' },
      ...extra,
    }),
  });
  act(() => root.render(tree));
  return { container, root, progress: p };
}

describe('GameHud · 复合游戏化面板', () => {
  it('渲染连击能量条并展示连击数', () => {
    const { container, root } = renderHud();
    const el = container.querySelector('.combo-count');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('aria-label')).toContain('3');
    root.unmount();
  });

  it('渲染即时反馈气泡（答对话术）', () => {
    const { container, root } = renderHud();
    expect(container.textContent).toContain('你真棒');
    root.unmount();
  });

  it('渲染掌握进度与成就墙', () => {
    const { container, root } = renderHud();
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(container.textContent).toContain('掌握度');
    expect(container.textContent).toContain('成就墙');
    root.unmount();
  });

  it('音效开关可切换 aria-pressed', () => {
    const { container, root } = renderHud();
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
    act(() => btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    const btn2 = container.querySelector('button');
    expect(btn2?.getAttribute('aria-pressed')).toBe('true');
    root.unmount();
  });

  it('restDisabled 时仍渲染但不变更默认行为（护眼提示默认隐藏）', () => {
    const { container, root } = renderHud({ restDisabled: true });
    // RestReminder 默认不显示（仅在定时到点后显示），结构存在即可
    expect(container.querySelector('.game-hud-top')).not.toBeNull();
    root.unmount();
  });

  it('可关闭进度/成就区块', () => {
    const { container, root } = renderHud({ showProgress: false, showAchievements: false });
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.textContent).not.toContain('成就墙');
    root.unmount();
  });
});
