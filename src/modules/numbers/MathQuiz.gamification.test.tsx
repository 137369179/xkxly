// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// 复用端到端集成测试的轻量 mock：motion/react + sfx，足以让 RoundRunner 子树在 jsdom 渲染
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: any, tag: string) => {
        return ({ children, ...rest }: any) => createElement(tag, rest, children);
      },
    },
  ),
  AnimatePresence: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
}));
vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  setMuted: vi.fn(),
  triggerHaptic: vi.fn(),
}));
vi.mock('@/lib/speech', async () => {
  const actual = await vi.importActual<typeof import('@/lib/speech')>('@/lib/speech');
  return {
    ...actual,
    speak: vi.fn(() => Promise.resolve()),
    stopSpeaking: vi.fn(),
  };
});
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
  celebrateStars: vi.fn(),
}));
vi.mock('@/lib/router', () => ({ useRoute: () => ({ navigate: vi.fn() }) }));

const { MathQuiz } = await import('./MathQuiz');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderGame() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(MathQuiz)));
  roots.push(root);
  return container;
}

describe('MathQuiz 游戏化接线（R149）', () => {
  it('挂载 ComboMeter 连击能量条（任务 #1 积分/连击激励）+ count=0 引导态', () => {
    const c = renderGame();
    // ComboMeter 在 count=0 时渲染引导文案与无障碍 aria-label，证明生产级连击组件已接入数字练习闭环
    expect(c.textContent).toContain('连续答对积累连击');
    expect(c.querySelector('[aria-label="当前连击 0"]')).not.toBeNull();
  });

  it('挂载错字本 + 数学探险成就地图（任务 #5 错题复习闭环 / 成就系统）', () => {
    const c = renderGame();
    // 错题本空态仍渲染标题与可访问 aria-label，证明生产级复习入口已接入数字练习闭环
    expect(c.textContent).toContain('我的错题本');
    expect(c.querySelector('[aria-label="错题本"]')).not.toBeNull();
    // 数学探险成就地图（MathStarQuest）已接入数字练习闭环，提供关卡式解锁成就目标感
    expect(c.textContent).toContain('数学探险地图');
  });
});
