/**
 * 科学小考官 · 题目生成器测试（R54 游戏化）
 * ------------------------------------------------------------
 * 覆盖：
 *  - 三类（恐龙/动物/行星）三档难度均可生成合法 Question（选项含正确答案）
 *  - 答案与选项一致性（answerId 必在 options 中）
 *  - ScienceQuiz 组件渲染冒烟（RoundRunner + StreakBar 挂载不崩溃）
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { makeScienceQuestion } from '@/lib/questions/science';
import type { Question } from '@/types';

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: any, tag: string) => {
        return ({ children, className, style, onClick, disabled }: any) =>
          createElement(tag, { className, style, onClick, disabled }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(() => Promise.resolve()),
  celebrateBig: vi.fn(() => Promise.resolve()),
  celebrateStars: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ open, children }: any) => (open ? createElement('div', { 'data-testid': 'modal' }, children) : null),
}));
vi.mock('@/components/feedback/StruggleModal', () => ({ StruggleModal: () => null }));
vi.mock('@/lib/struggle', () => ({
  useStruggle: () => ({ wrongStreak: 0, isStruggling: false, record: vi.fn(), reset: vi.fn() }),
}));
vi.mock('@/store/adaptiveDifficulty', () => ({
  useAdaptiveDifficultyState: () => [1, vi.fn(), { recommended: 1, syncNow: vi.fn(), pending: false }],
}));
vi.mock('@/store/useStore', () => ({
  useStore: Object.assign((sel?: any) => (sel ? { practice: vi.fn() } : { practice: vi.fn() }), { getState: () => ({ progress: {} }) }),
  useSkillMastery: () => ({}),
}));
vi.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }) }));

function assertValidQuestion(q: Question): void {
  expect(q.id).toBeTruthy();
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.options.length).toBeGreaterThanOrEqual(4);
  // 答案必在选项中
  expect(q.options.some((o) => o.id === q.answerId)).toBe(true);
  expect(q.skill).toBeTruthy();
}

describe('makeScienceQuestion 三档难度契约', () => {
  it.each(['dino', 'animal', 'space'] as const)('%s L1 认物题合法', (cat) => {
    for (let i = 0; i < 20; i++) {
      assertValidQuestion(makeScienceQuestion(cat, 1));
    }
  });

  it.each(['dino', 'animal', 'space'] as const)('%s L2 特征题合法', (cat) => {
    for (let i = 0; i < 20; i++) {
      assertValidQuestion(makeScienceQuestion(cat, 2));
    }
  });

  it.each(['dino', 'animal', 'space'] as const)('%s L3 推理题合法', (cat) => {
    for (let i = 0; i < 10; i++) {
      assertValidQuestion(makeScienceQuestion(cat, 3));
    }
  });

  it('题目 id 唯一（多次生成不重复）', () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeScienceQuestion('dino', 1).id));
    expect(ids.size).toBe(50);
  });
});

describe('ScienceQuiz 组件冒烟', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('渲染小考官面板 + 闯关条，不崩溃', async () => {
    const { ScienceQuiz } = await import('@/components/quiz/ScienceQuiz');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(createElement(ScienceQuiz, { category: 'dino' as const }));
    });
    expect(host.textContent).toBeTruthy();
    act(() => root.unmount());
    host.remove();
  }, 15000);
});
