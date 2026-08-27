// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { useAdaptiveDifficulty, type AdaptiveDifficultyApi, type DifficultyLevel } from './useAdaptiveDifficulty';

function Harness({
  apiRef,
  initial,
}: {
  apiRef: { current: AdaptiveDifficultyApi | null };
  initial?: DifficultyLevel;
}) {
  apiRef.current = useAdaptiveDifficulty(initial ? { initialLevel: initial } : {});
  return null;
}

describe('useAdaptiveDifficulty', () => {
  it('连续答对 5 题 → 难度升档 + streakTarget 跟随', () => {
    const apiRef = { current: null as AdaptiveDifficultyApi | null };
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(Harness, { apiRef })));

    expect(apiRef.current!.level).toBe(1);
    expect(apiRef.current!.streakTarget).toBe(2);

    for (let i = 0; i < 5; i++) act(() => apiRef.current!.onCorrect());
    expect(apiRef.current!.level).toBe(2);
    expect(apiRef.current!.streakTarget).toBe(3);
    expect(apiRef.current!.correctStreak).toBe(5);

    act(() => root.unmount());
  });

  it('连续答错 2 题（自难度 3 起）→ 难度降档；单错不降', () => {
    const apiRef = { current: null as AdaptiveDifficultyApi | null };
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(Harness, { apiRef, initial: 3 })));

    act(() => apiRef.current!.onWrong());
    expect(apiRef.current!.level).toBe(3); // 单错不降档

    act(() => apiRef.current!.onWrong());
    expect(apiRef.current!.level).toBe(2); // 连续两错降档

    act(() => root.unmount());
  });

  it('reset 回到初始难度', () => {
    const apiRef = { current: null as AdaptiveDifficultyApi | null };
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(Harness, { apiRef, initial: 2 })));

    act(() => apiRef.current!.onCorrect());
    act(() => apiRef.current!.onCorrect());
    act(() => apiRef.current!.reset());
    expect(apiRef.current!.level).toBe(2);
    expect(apiRef.current!.correctStreak).toBe(0);

    act(() => root.unmount());
  });

  it('maxLevel 限制难度上限', () => {
    const apiRef = { current: null as AdaptiveDifficultyApi | null };
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(Harness, { apiRef, initial: 3 })));

    for (let i = 0; i < 8; i++) act(() => apiRef.current!.onCorrect());
    expect(apiRef.current!.level).toBe(3); // 已是上限，不再升

    act(() => root.unmount());
  });
});
