// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, ...props }: any) =>
          createElement(tag, { className, style, onClick, ...props }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, ...props }: any) =>
          createElement(tag, { className, style, onClick, ...props }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxStar: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockProgress = {
  stars: 12,
  streak: 3,
  badges: ['b1', 'b2'],
  mastery: {},
  dailyLog: {},
};

vi.mock('@/store/useStore', () => ({
  useStore: (selector: any) => (selector ? selector({ progress: mockProgress }) : { progress: mockProgress }),
  useStars: () => 12,
  useStreak: () => 3,
  useBadgeCount: () => 2,
  useDailyLog: () => ({}),
  useMastery: () => ({}),
}));

const mockProfilesState = {
  activeProfileId: 'default',
  meta: { default: { name: '乐乐', avatar: '🐱', ageRange: '4-6' } },
  profiles: { default: {} },
};

vi.mock('@/store/useProfilesStore', () => ({
  useProfilesStore: (selector: any) => (selector ? selector(mockProfilesState) : mockProfilesState),
  useActiveProfileMeta: () => ({ name: '乐乐', avatar: '🐱', ageRange: '4-6' }),
  AGE_RANGES: [{ key: '4-6', label: '4-6岁' }],
}));

import HomePage from '../HomePage';

describe('HomePage 首页全栈非重复与渲染测试', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('正确渲染首页核心结构且无重复模块入口', async () => {
    await act(async () => {
      root.render(createElement(HomePage));
    });

    expect(container.textContent).toContain('探索学习乐园');
    expect(container.textContent).toContain('大厂专业级 · 特色启蒙');
    expect(container.textContent).toContain('探索专题 · 知识画卷');
  });
});
