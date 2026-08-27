// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { GentleFeedback } from './GentleFeedback';

describe('GentleFeedback · 即时反馈', () => {
  it('答对：aria-live 状态区含表扬话术', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(GentleFeedback, { correct: true, message: '你真棒' })));
    const el = container.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('aria-live')).toBe('polite');
    expect(container.textContent).toContain('你真棒');
    root.unmount();
  });

  it('答错：温和引导话术', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(GentleFeedback, { correct: false, message: '再试试看' })));
    expect(container.textContent).toContain('再试试看');
    root.unmount();
  });
});
