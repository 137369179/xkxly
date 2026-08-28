// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { ReducedMotionToggle } from './ReducedMotionToggle';
import { clearMemoryFallback } from '@/lib/safeStorage';

function mount(): HTMLElement {
  const c = document.createElement('div');
  document.body.appendChild(c);
  const root = createRoot(c);
  act(() => root.render(createElement(ReducedMotionToggle, {})));
  return c;
}

describe('ReducedMotionToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-reduced-motion');
    clearMemoryFallback();
    try {
      window.localStorage.clear();
    } catch {
      /* jsdom 无 localStorage 时跳过 */
    }
  });

  it('默认 system（jsdom 无 matchMedia）→ role=switch 且 aria-checked=false', () => {
    const el = mount();
    const sw = el.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(sw).not.toBeNull();
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.getAttribute('aria-label')).toContain('生动动画');
  });

  it('点击开启 → 设置 data-reduced-motion + 持久化 on', () => {
    const el = mount();
    const sw = el.querySelector('[role="switch"]') as HTMLButtonElement;
    act(() => sw.click());
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');
    expect(window.localStorage.getItem('a11y.reducedMotionOverride')).toBe('"on"');
  });

  it('二次点击关闭 → 移除 data 属性 + 持久化 off', () => {
    const el = mount();
    const sw = el.querySelector('[role="switch"]') as HTMLButtonElement;
    act(() => sw.click());
    act(() => sw.click());
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBeNull();
    expect(window.localStorage.getItem('a11y.reducedMotionOverride')).toBe('"off"');
  });
});
