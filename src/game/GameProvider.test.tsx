// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from './GameProvider';
import type { AnswerHandleResult } from './useGamification';

vi.mock('@/lib/feedback', () => ({
  answerCorrect: () => '太棒啦',
  answerWrong: () => '再试一次',
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(() => Promise.resolve()),
  celebrateBig: vi.fn(() => Promise.resolve()),
}));

type Ctx = ReturnType<typeof useGame>;

function Child({ capture }: { capture: (v: Ctx) => void }) {
  capture(useGame());
  return null;
}

describe('GameProvider · 统一编排上下文', () => {
  it('Provider 内 useGame 返回 reducedMotion / sound / gamification 三段', () => {
    let v: Ctx | null = null;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        createElement(GameProvider, {
          children: createElement(Child, { capture: (x) => (v = x) }),
        }),
      ),
    );
    expect(v).not.toBeNull();
    expect(typeof v!.reducedMotion).toBe('boolean');
    expect(typeof v!.sound.play).toBe('function');
    expect(typeof v!.sound.setMuted).toBe('function');
    expect(typeof v!.gamification.handleAnswer).toBe('function');
    root.unmount();
  });

  it('useGame 在 Provider 外抛错（强制正确包裹）', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    expect(() =>
      act(() => root.render(createElement(Child, { capture: () => undefined }))),
    ).toThrow();
    root.unmount();
  });

  it('gamification.handleAnswer 经由 Provider 正确返回反馈与连击', () => {
    let v: Ctx | null = null;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        createElement(GameProvider, {
          scene: 'hanzi',
          children: createElement(Child, { capture: (x) => (v = x) }),
        }),
      ),
    );
    let res: AnswerHandleResult | undefined;
    act(() => {
      res = v!.gamification.handleAnswer(true);
    });
    expect(res!.feedback).toBe('太棒啦');
    expect(res!.combo).toBe(1);
    root.unmount();
  });
});
