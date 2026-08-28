// @vitest-environment jsdom
/**
 * P0-Audit #1 · SpeedMath 快速连点回归测试
 * -----------------------------------------
 * 缺陷：`handle` 用 `if (chosen || !q) return`（chosen 是 state），
 * 同一渲染内快速连点两个选项时 chosen 尚未刷新，两次都会进入计分，
 * 导致分数虚高 / SRS(practice) / 排行榜(recordSpeed) 被重复写入。
 *
 * 目标行为（修复后）：单题内只接受一次作答，多余点击一律忽略。
 * 这里的断言编码的是"修复后"的预期——在未修复代码上运行会失败。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SpeedMath } from './SpeedMath';

// —— Mock 基础设施（复用既有范式：numbers.test.tsx / StreakBar.test.tsx）——
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick }: any) =>
          createElement(tag, { className, style, onClick }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxWin: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxCorrect: vi.fn(),
  setMuted: vi.fn(),
  triggerHaptic: vi.fn(),
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(() => Promise.resolve()),
  celebrateBig: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }),
}));
vi.mock('@/components/ui/Card', () => ({
  PageHeader: () => null,
  Panel: ({ children, className }: any) => createElement('div', { className }, children),
}));
vi.mock('@/components/ui/Button', () => ({
  CandyButton: ({ children, onClick, disabled }: any) =>
    createElement('button', { onClick, disabled }, children),
}));
vi.mock('@/components/study/AdaptiveDifficultyHint', () => ({
  AdaptiveDifficultyHint: () => null,
}));

// 固定出题：答案恒为选项 A（label '1'），便于触发"答对"路径
vi.mock('@/lib/questions', () => ({
  makeMathQuestion: () => ({
    id: 'q-1',
    prompt: '',
    display: '1+1',
    answerId: 'A',
    skill: 'math:add',
    options: [
      { id: 'A', label: '1' },
      { id: 'B', label: '2' },
    ],
  }),
  makeMulQuestion: () => ({
    id: 'q-1',
    prompt: '',
    display: '1+1',
    answerId: 'A',
    skill: 'math:mul',
    options: [
      { id: 'A', label: '1' },
      { id: 'B', label: '2' },
    ],
  }),
}));

const recordMathSpy = vi.fn();
const recordSpeedSpy = vi.fn();
const practiceSpy = vi.fn();
const fakeStore = {
  practice: practiceSpy,
  recordSpeed: recordSpeedSpy,
  recordMath: recordMathSpy,
  setGameBest: vi.fn(),
  progress: { gameBest: {} },
};
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeStore) : fakeStore),
}));
vi.mock('@/store/adaptiveDifficulty', () => ({
  useAdaptiveDifficultyState: () => [
    1,
    vi.fn(),
    { auto: false, recommended: 1, pending: false, reset: vi.fn(), syncNow: vi.fn() },
  ],
}));

let host: HTMLDivElement;
let root: Root;
function render() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(SpeedMath)));
}
// 进入挑战：点击开始按钮
function startChallenge() {
  act(() => {
    const start = [...host!.querySelectorAll('button')].find((b) => b.textContent?.includes('speedMath.startChallenge'));
    expect(start).toBeTruthy();
    start!.click();
  });
}
const optionBtn = (label: string) =>
  [...host!.querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('SpeedMath · 快速连点单题锁（P0-#1）', () => {
  it('正常单次作答只计一次分、只写一次 SRS/排行榜', () => {
    render();
    startChallenge();
    act(() => optionBtn('1').click());

    expect(recordMathSpy).toHaveBeenCalledTimes(1);
    expect(recordSpeedSpy).toHaveBeenCalledTimes(1);
    expect(practiceSpy).toHaveBeenCalledTimes(1);
  });

  it('同一渲染帧内连点两次同一正确选项，只计一次分', () => {
    render();
    startChallenge();
    const correctBtn = optionBtn('1');

    // 关键：两次点击放在同一个 act 内、期间不重渲染，
    // 模拟儿童快速连点（此时 chosen state 尚未刷新）。
    act(() => {
      correctBtn.click();
      correctBtn.click();
    });

    // 修复后：只算一次
    expect(recordMathSpy).toHaveBeenCalledTimes(1);
    expect(recordSpeedSpy).toHaveBeenCalledTimes(1);
    expect(practiceSpy).toHaveBeenCalledTimes(1);
    expect(practiceSpy).toHaveBeenCalledWith('math:add', true, 1, 1);
    expect(recordMathSpy).toHaveBeenCalledWith(true, 'math:add');
  });

  it('同一渲染帧内连续点两个不同选项，也只计一次分', () => {
    render();
    startChallenge();
    const a = optionBtn('1');
    const b = optionBtn('2');

    act(() => {
      a.click();
      b.click();
    });

    // 无论先点对还是先点错，单题只应被判定一次
    expect(recordMathSpy).toHaveBeenCalledTimes(1);
    expect(recordSpeedSpy).toHaveBeenCalledTimes(1);
  });
});