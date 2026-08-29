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
  useStore: (selector: any) => (selector ? selector({ progress: mockProgress, clearStreakEvent: () => {} }) : { progress: mockProgress }),
  useStars: () => 12,
  useStreak: () => 3,
  useStreakFreezes: () => 0,
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

  it('一屏一事：只保留主任务与 3 个快捷位，旧版块已迁往乐园地图', async () => {
    await act(async () => {
      root.render(createElement(HomePage));
    });

    const text = container.textContent ?? '';

    // 新结构：3 个次要快捷位（文案硬编码，不依赖 i18n）
    expect(text).toContain('继续上次');
    expect(text).toContain('益智游戏');
    expect(text).toContain('我的成长');
    // 乐园地图统一入口（用 aria-label 校验，同时覆盖无障碍契约）
    expect(container.querySelector('[aria-label="去乐园地图"]')).not.toBeNull();

    // 改版契约：这三个旧版块的内容已整体迁入乐园地图 hall，
    // 首页不再堆叠入口（改版前首屏可点目标 20+）。
    // 若它们重新出现在首页，说明一屏一事被破坏。
    expect(text).not.toContain('探索学习乐园');
    expect(text).not.toContain('大厂专业级 · 特色启蒙');
    expect(text).not.toContain('探索专题 · 知识画卷');
  });
});
