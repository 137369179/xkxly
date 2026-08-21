// @vitest-environment jsdom
/**
 * RoundRunner 闯关里程碑条（streakBar）测试
 * ------------------------------------------------------------
 * 验证游戏化「3 连对闯关」可视化：
 *  - 未传 streakBar → 不渲染闯关条（零回归）
 *  - 连对递增点亮圆点，答错归零
 *  - 达标（streak === target）时点亮全部圆点
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RoundRunner } from './RoundRunner';
import type { Question } from '@/types';

// Mock motion/react 用 Proxy 自动支持任何 motion.xxx 标签
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, disabled }: any) =>
          createElement(tag, { className, style, onClick, disabled }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
}));

// 隔离不相关副作用：庆祝/音效/翻译/弹窗一律无操作
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
vi.mock('@/components/feedback/StruggleModal', () => ({
  StruggleModal: () => null,
}));
vi.mock('@/lib/struggle', () => ({
  useStruggle: () => ({
    wrongStreak: 0,
    isStruggling: false,
    record: vi.fn(),
    reset: vi.fn(),
  }),
}));
vi.mock('@/lib/translate', () => ({ t: (k: string) => k }));
// QuizCard 内部依赖较多，直接 mock 成可控按钮，让测试聚焦 RoundRunner 自身逻辑
vi.mock('@/components/QuizCard', () => ({
  QuizCard: ({ question, onAnswer, onNext }: any) =>
    createElement(
      'div',
      { 'data-testid': 'quiz-card' },
      createElement('span', { 'data-testid': 'qid' }, question.id),
      createElement('button', { 'data-testid': 'btn-right', onClick: () => onAnswer(true) }, '对'),
      createElement('button', { 'data-testid': 'btn-wrong', onClick: () => onAnswer(false) }, '错'),
      createElement('button', { 'data-testid': 'btn-next', onClick: () => onNext() }, '下一题')
    ),
}));

let counter = 0;
function makeQ(): Question {
  counter += 1;
  return {
    id: `r-${counter}`,
    kind: 'choice',
    skill: 'math:test',
    prompt: '测试题',
    display: '测试',
    options: [{ id: 'a', label: 'A', emoji: '' }],
    answerId: 'a',
  };
}

let host: HTMLDivElement;
let root: Root;
function setup(streakBar?: { target: number; tone?: 'yellow' | 'green' | 'purple' | 'pink' | 'blue' }) {
  counter = 0;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(
      createElement(RoundRunner, {
        makeQuestion: makeQ,
        difficulty: 1 as never,
        tone: 'pink',
        questionsPerRound: 5,
        streakBar,
        onAnswered: () => {},
        onSolved: () => {},
        onComplete: () => {},
      })
    );
  });
}
const streakBarEl = () => host?.querySelector('[data-testid="streak-bar"]');
const dotsOn = () => host?.querySelectorAll('[data-testid^="streak-dot-"][data-on="1"]').length ?? 0;
const click = (testid: string) => {
  act(() => {
    host?.querySelector(`[data-testid="${testid}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('RoundRunner 闯关里程碑条', () => {
  it('未传 streakBar 时不渲染闯关条（零回归）', () => {
    setup();
    expect(streakBarEl()).toBeNull();
  });

  it('传入 streakBar 后渲染 target 个圆点，初始全空', () => {
    setup({ target: 3 });
    const bar = streakBarEl();
    expect(bar).not.toBeNull();
    expect(bar!.querySelectorAll('[data-testid^="streak-dot-"]').length).toBe(3);
    expect(dotsOn()).toBe(0);
  });

  it('连对递增点亮圆点', () => {
    setup({ target: 3 });
    click('btn-right');
    expect(dotsOn()).toBe(1);
    click('btn-next');
    click('btn-right');
    expect(dotsOn()).toBe(2);
    click('btn-next');
    click('btn-right');
    expect(dotsOn()).toBe(3);
  });

  it('答错归零', () => {
    setup({ target: 3 });
    click('btn-right');
    expect(dotsOn()).toBe(1);
    click('btn-next');
    click('btn-wrong');
    expect(dotsOn()).toBe(0);
  });
});
