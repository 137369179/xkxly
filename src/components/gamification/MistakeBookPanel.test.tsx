// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { MistakeBookPanel } from './MistakeBookPanel';
import { createInitialProgress } from '@/lib/progress';

describe('MistakeBookPanel · 错题本', () => {
  it('无错题时显示空状态鼓励', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(createElement(MistakeBookPanel, { progress: createInitialProgress(), onReview: () => undefined })),
    );
    expect(container.textContent).toContain('错题本空空如也');
    root.unmount();
  });

  it('列出聚类并在点击时触发 onReview（首题 skill）', () => {
    const p = createInitialProgress();
    p.wrongBook = ['math:add', 'math:sub', 'hanzi:水'];
    const onReview = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(MistakeBookPanel, { progress: p, onReview })));
    const btns = container.querySelectorAll('button');
    expect(btns.length).toBeGreaterThan(0);
    act(() => (btns[0] as HTMLButtonElement).click());
    expect(onReview).toHaveBeenCalledWith('math:add');
    root.unmount();
  });
});
