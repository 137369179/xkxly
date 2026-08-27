// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { useGamification, type GamificationApi, type AnswerHandleResult } from './useGamification';
import { createInitialProgress } from '@/lib/progress';

vi.mock('@/lib/feedback', () => ({
  answerCorrect: () => '太棒啦',
  answerWrong: () => '再试一次',
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(() => Promise.resolve()),
  celebrateBig: vi.fn(() => Promise.resolve()),
}));
import { celebrateBig } from '@/lib/celebrate';

function Harness({ capture }: { capture: (g: GamificationApi) => void }) {
  capture(useGamification());
  return null;
}

describe('useGamification · 呈现编排', () => {
  it('答对：连击 +1、返回非空反馈', () => {
    let api: GamificationApi | null = null;
    let res: AnswerHandleResult | undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(Harness, { capture: (g) => (api = g) })));
    act(() => {
      res = api!.handleAnswer(true);
    });
    expect(res!.feedback).toBe('太棒啦');
    expect(res!.combo).toBe(1);
    expect(api!.combo).toBe(1);
    root.unmount();
  });

  it('答错：连击清零、返回温和引导', () => {
    let api: GamificationApi | null = null;
    let res: AnswerHandleResult | undefined;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(Harness, { capture: (g) => (api = g) })));
    act(() => {
      api!.handleAnswer(true);
    });
    act(() => {
      res = api!.handleAnswer(false);
    });
    expect(res!.feedback).toBe('再试一次');
    expect(res!.combo).toBe(0);
    root.unmount();
  });

  it('getProgress 注入后，满足里程碑答对即触发 celebrateBig', () => {
    const progress = { ...createInitialProgress(), streak: 7 };
    let api: GamificationApi | null = null;
    function Harness2({ capture }: { capture: (g: GamificationApi) => void }) {
      capture(useGamification({ getProgress: () => progress }));
      return null;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(Harness2, { capture: (g) => (api = g) })));
    act(() => {
      api!.handleAnswer(true, { skill: 'hanzi:爱' });
    });
    expect(celebrateBig).toHaveBeenCalled();
    root.unmount();
  });
});
