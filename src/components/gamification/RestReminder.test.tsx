// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { RestReminder } from './RestReminder';

describe('RestReminder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('到达间隔后弹出温和休息提醒', () => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(RestReminder, { intervalMs: 1000 })));

    expect(c.textContent).not.toContain('让眼睛和小手休息一下吧');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(c.textContent).toContain('让眼睛和小手休息一下吧');
    act(() => root.unmount());
  });

  it('点击「好的」后提醒消失', () => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(RestReminder, { intervalMs: 1000 })));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const btn = c.querySelector('button');
    expect(btn).not.toBeNull();
    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(c.textContent).not.toContain('让眼睛和小手休息一下吧');
    act(() => root.unmount());
  });

  it('disabled=true → 永不弹出', () => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(RestReminder, { intervalMs: 1000, disabled: true })));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(c.textContent).not.toContain('让眼睛和小手休息一下吧');
    act(() => root.unmount());
  });
});
