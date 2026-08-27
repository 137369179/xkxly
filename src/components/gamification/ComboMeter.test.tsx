// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { ComboMeter } from './ComboMeter';

function mount(count: number): HTMLElement {
  const c = document.createElement('div');
  document.body.appendChild(c);
  const root = createRoot(c);
  act(() => root.render(createElement(ComboMeter, { count })));
  return c;
}

describe('ComboMeter', () => {
  it('count=0 → 引导文案「连续答对积累连击」', () => {
    const el = mount(0);
    expect(el.textContent).toContain('连续答对积累连击');
    expect(el.querySelector('[aria-label="当前连击 0"]')).not.toBeNull();
  });

  it('count=3 → 提示「再对 2 题解锁 🌟」且进度条存在', () => {
    const el = mount(3);
    expect(el.textContent).toContain('再对 2 题解锁 🌟');
    expect(el.querySelector('.combo-fill')).not.toBeNull();
  });

  it('count=10 → 达到最高阈值，显示「已解锁 🔥 连击大师」', () => {
    const el = mount(10);
    expect(el.textContent).toContain('已解锁 🔥 连击大师');
  });
});
