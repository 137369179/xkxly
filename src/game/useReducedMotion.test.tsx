// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { useReducedMotion } from './useReducedMotion';

function makeMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function Harness({ capture }: { capture: (v: boolean) => void }) {
  capture(useReducedMotion());
  return null;
}

describe('useReducedMotion · 无障碍', () => {
  it('媒体查询匹配时返回 true', () => {
    window.matchMedia = makeMatchMedia(true) as unknown as typeof window.matchMedia;
    let val = false;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(Harness, { capture: (v) => (val = v) })));
    expect(val).toBe(true);
    root.unmount();
  });

  it('媒体查询不匹配时返回 false', () => {
    window.matchMedia = makeMatchMedia(false) as unknown as typeof window.matchMedia;
    let val = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(Harness, { capture: (v) => (val = v) })));
    expect(val).toBe(false);
    root.unmount();
  });
});
