// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { AccessibleButton } from './AccessibleButton';

function mount(props: Record<string, unknown>, label: string): HTMLElement {
  const c = document.createElement('div');
  document.body.appendChild(c);
  const root = createRoot(c);
  act(() => root.render(createElement(AccessibleButton, props, label)));
  return c;
}

describe('AccessibleButton', () => {
  it('渲染文案 + 最小触控 / 焦点可见工具类', () => {
    const el = mount({}, '开始');
    const btn = el.querySelector('button') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('开始');
    expect(btn.className).toContain('a11y-min-target');
    expect(btn.className).toContain('a11y-focusable');
  });

  it('pressed=true → aria-pressed="true"（A6 状态可读）', () => {
    const el = mount({ pressed: true }, '已选');
    expect((el.querySelector('button') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
  });

  it('pressed 未提供 → 不渲染 aria-pressed', () => {
    const el = mount({}, '普通');
    expect((el.querySelector('button') as HTMLButtonElement).getAttribute('aria-pressed')).toBeNull();
  });

  it('装饰图标 aria-hidden + 触发 onClick（A1 色彩不独依）', () => {
    const onClick = vi.fn();
    const el = mount({ icon: '⭐', onClick }, '领取');
    const btn = el.querySelector('button') as HTMLButtonElement;
    expect(btn.querySelector('[aria-hidden="true"]')!.textContent).toBe('⭐');
    act(() => btn.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
