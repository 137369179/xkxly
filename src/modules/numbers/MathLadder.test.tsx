// @vitest-environment jsdom
/**
 * P0-Audit #2 · MathLadder 单题锁回归测试
 * ---------------------------------------
 * 缺陷：`submitAnswer` 无"单题已作答"保护，Enter 与点「确认」并发
 * （或连按两次 Enter，同一渲染内输入框尚未清空）时同一题会被提交两次，
 * 导致 correct 双加、SRS(practice)/排行榜(recordSpeed) 重复写入。
 *
 * 目标行为（修复后）：单题只接受一次提交，多余提交一律忽略，
 * 且不会阻断进入下一题。断言编码的是"修复后"的预期，在未修复代码上会失败。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MathLadder } from './MathLadder';

// —— Mock 基础设施（复用既有范式）——
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        ({ children, className, style, onClick }: any) =>
          createElement(tag, { className, style, onClick }, children),
    }
  ),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  setMuted: vi.fn(),
}));
vi.mock('@/lib/speech', () => ({
  randomPraise: vi.fn(),
  randomEncourage: vi.fn(),
  speak: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/feedback', () => ({ answerCorrect: vi.fn(), answerWrong: vi.fn() }));
vi.mock('@/lib/stars', () => ({ starsByRate: () => 3 }));
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
vi.mock('@/components/ui/ProgressBar', () => ({ ProgressBar: () => null }));
vi.mock('@/components/study/StreakBar', () => ({ StreakBar: () => null }));

const recordSpeedSpy = vi.fn();
const practiceSpy = vi.fn();
const fakeStore = { practice: practiceSpy, recordSpeed: recordSpeedSpy };
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeStore) : fakeStore),
}));

let host: HTMLDivElement;
let root: Root;
function render() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(MathLadder)));
}

function startLevel1() {
  // Lv.1 gen：Math.random=0 → a=1, b=1, answer=2
  vi.spyOn(Math, 'random').mockReturnValue(0);
  render();
  act(() => {
    const btn = [...host!.querySelectorAll('button')].find((b) => b.textContent?.includes('Lv.1'));
    expect(btn).toBeTruthy();
    btn!.click();
  });
}

const inputEl = () => host!.querySelector('input') as HTMLInputElement;
/** 用原生 value setter 写入受控输入，确保 React onChange 收到新值 */
function setInput(value: string) {
  act(() => {
    const inp = inputEl();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(inp, value);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function pressEnter() {
  inputEl().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('MathLadder · 单题提交锁（P0-#2）', () => {
  it('输入答案并回车作答一次，计分与 SRS 各只写一次', () => {
    startLevel1();
    setInput('2');
    act(() => pressEnter());

    expect(recordSpeedSpy).toHaveBeenCalledTimes(1);
    expect(practiceSpy).toHaveBeenCalledTimes(1);
    expect(practiceSpy).toHaveBeenCalledWith('math:ladder:1', true, 1);
    expect(host!.textContent).toContain('✅1');
  });

  it('同一渲染帧内按两次 Enter，只计一次分（修复目标）', () => {
    startLevel1();
    setInput('2');

    // 两次 Enter 放在同一 act、期间无重渲染（input 状态未清空）
    act(() => {
      pressEnter();
      pressEnter();
    });

    expect(recordSpeedSpy).toHaveBeenCalledTimes(1);
    expect(practiceSpy).toHaveBeenCalledTimes(1);
    expect(host!.textContent).toContain('✅1');
    expect(host!.textContent).not.toContain('✅2');
  });

  it('提交后仍能推进到下一题（锁不阻断后续作答）', async () => {
    startLevel1();
    setInput('2');
    act(() => pressEnter());

    // 真实等待 600ms 换题（输入框应被清空、题号前进到 Q2）
    await act(async () => {
      await new Promise((r) => setTimeout(r, 650));
    });
    expect(inputEl().value).toBe('');
    expect(host!.textContent).toContain('✅1');
  });
});