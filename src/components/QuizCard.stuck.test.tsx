// @vitest-environment jsdom
/**
 * QuizCard 超时干预日志验证测试
 * ============================================================
 * 目的：验证 QuizCard 中 [stuck] 前缀日志在以下事件下按预期输出：
 *   1. arm       —— 每道新题展示时启动定时器
 *   2. clear     —— 定时器被清除（答题/换题/卸载/重听）
 *   3. trigger   —— 60s 未作答触发提示（用 console.warn）
 *   4. replay    —— 用户点击"再听一遍"
 *
 * 测试通过 mock 掉所有浏览器依赖（motion/speechSynthesis/confetti/AI 等），
 * 用 react-dom/client 真实渲染 QuizCard，spy console.log/console.warn，
 * 断言日志输出的格式与字段。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react'; // React 19: act 从 react 导入
import { createRoot, type Root } from 'react-dom/client';
import type { Question } from '@/types';

// ============================================================
// Mock 外部依赖（必须放在 import QuizCard 之前）
// ============================================================

// 1. motion/react —— 简化成原生标签，按 motion.xxx 的 xxx 决定 tag
//    丢弃 whileTap/animate/transition 等非 DOM 属性，避免 React 警告
const MOTION_PROPS_OMIT = new Set([
  'whileTap', 'whileHover', 'whileFocus', 'whileDrag', 'whileInView',
  'animate', 'initial', 'exit', 'transition', 'variants', 'layout',
  'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'onAnimationStart', 'onAnimationComplete', 'onDragStart', 'onDragEnd',
  'onUpdate', 'onViewportEnter', 'onViewportLeave',
]);
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: any, component: string) => (props: any) => {
        const { children, ...rest } = props;
        const cleanRest: Record<string, unknown> = {};
        for (const k in rest) {
          if (!MOTION_PROPS_OMIT.has(k)) cleanRest[k] = rest[k]!;
        }
        const tag = typeof component === 'string' ? component : 'div';
        return createElement(tag, cleanRest, children);
      },
    },
  ),
  AnimatePresence: ({ children }: any) => children,
}));

// 2. 语音/音效/庆祝 —— 全部空函数，避免触发浏览器 API
vi.mock('@/lib/sfx', () => ({ sfxCorrect: vi.fn(), sfxWrong: vi.fn() }));
vi.mock('@/lib/celebrate', () => ({
  celebrateBig: vi.fn(),
  celebrateSmall: vi.fn(),
  celebrateStars: vi.fn(),
}));
vi.mock('@/lib/combo', () => ({
  recordCombo: vi.fn(() => ({ triggered: false, level: -1 })),
  COMBO_THRESHOLDS: [],
}));
vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
  praiseByScene: vi.fn(() => ''),
  encourageByScene: vi.fn(() => ''),
  skillToPraiseScene: vi.fn(() => 'general'),
  skillToEncourageScene: vi.fn(() => 'general'),
  // P2-5：useStore 模块初始化时会调用 TTS 桥接注册，mock 必须提供该导出
  registerTtsBridge: vi.fn(),
}));

// 3. UI 组件 —— 简化成原生标签
vi.mock('@/components/ui/Button', () => ({
  CandyButton: (props: any) =>
    createElement('button', { onClick: props.onClick, className: props.className }, props.children),
}));
vi.mock('@/components/ui/Feedback', () => ({
  FeedbackBanner: (props: any) => createElement('div', null, props.text),
}));
vi.mock('@/components/ai', () => ({
  AiButton: (props: any) =>
    createElement('button', { onClick: props.onClick }, props.children),
  AiPanel: () => createElement('div', null),
}));

// 4. AI 流式 hook —— 返回 idle 状态
vi.mock('@/lib/ai/useAi', () => ({
  useAiStream: vi.fn(() => ({
    status: 'idle',
    text: '',
    run: vi.fn(),
    reset: vi.fn(),
  })),
}));
vi.mock('@/lib/ai/tasks', () => ({
  quizExtendTask: vi.fn(() => ({})),
}));


// 5. wrongReason —— 返回 null（不展示错因）
vi.mock('@/lib/questions', () => ({
  wrongReason: vi.fn(() => null),
}));

// 6. tones —— 提供最小 TONE_STYLE
vi.mock('@/lib/tones', () => ({
  TONE_STYLE: {
    blue: { soft: '#eee', deep: '#333', main: '#888' },
    green: { soft: '#e0f7e0', deep: '#080', main: '#080' },
    purple: { soft: '#f3e8ff', deep: '#603', main: '#606' },
    orange: { soft: '#fff0e0', deep: '#a50', main: '#a50' },
    pink: { soft: '#ffe0ee', deep: '#a36', main: '#a36' },
    yellow: { soft: '#fff8d0', deep: '#650', main: '#650' },
  },
  toneAt: (i: number) => {
    const tones = ['blue', 'green', 'purple', 'orange', 'pink', 'yellow'] as const;
    return tones[i % tones.length];
  },
}));

// 7. utils cn —— 简单拼接
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  sample: <T,>(arr: T[]): T => arr[0]!,
}));

// ============================================================
// 测试用例
// ============================================================

// 延迟 import QuizCard 到所有 mock 完成后
const { QuizCard } = await import('@/components/QuizCard');

/** 构造一道最小可用题目 */
function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-test-1',
    type: 'math',
    prompt: '1 + 1 = ?',
    options: [
      { id: 'a', label: '1' },
      { id: 'b', label: '2' },
      { id: 'c', label: '3' },
    ],
    answerId: 'b',
    skill: 'math:add',
    speak: '1 加 1 等于几',
    ...overrides,
  };
}

/** 提取所有 [stuck] 前缀的日志 */
function stuckLogs(logSpy: ReturnType<typeof vi.spyOn>): string[] {
  return logSpy.mock.calls.map((c: unknown[]) => String(c[0])).filter((s: string) => s.includes('[stuck]'));
}
function stuckWarns(warnSpy: ReturnType<typeof vi.spyOn>): string[] {
  return warnSpy.mock.calls.map((c: unknown[]) => String(c[0])).filter((s: string) => s.includes('[stuck]'));
}

describe('QuizCard 超时干预日志', () => {
  let container: HTMLElement;
  let root: Root;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  it('挂载后立即输出 [stuck] arm 日志', () => {
    const q = makeQuestion();
    act(() => {
      root.render(createElement(QuizCard, { question: q }));
    });

    const logs = stuckLogs(logSpy);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const armLog = logs.find((s) => s.includes('[stuck] arm'));
    expect(armLog).toBeDefined();
    expect(armLog).toContain('qid=q-test-1');
    expect(armLog).toContain('skill=math:add');
    expect(armLog).toContain('threshold=60000ms');
  });

  it('60s 未作答时输出 [stuck] trigger 警告日志', () => {
    const q = makeQuestion();
    act(() => {
      root.render(createElement(QuizCard, { question: q }));
    });
    logSpy.mockClear();

    // 快进 60 秒
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    const warns = stuckWarns(warnSpy);
    expect(warns.length).toBe(1);
    const triggerLog = warns[0]!!
    expect(triggerLog).toContain('[stuck] trigger');
    expect(triggerLog).toContain('qid=q-test-1');
    expect(triggerLog).toContain('after 60000ms');
    expect(triggerLog).toContain('弹出"再听一遍"提示');
  });

  it('答对后输出 [stuck] clear 日志，reason=answered', () => {
    const q = makeQuestion();
    act(() => {
      root.render(createElement(QuizCard, { question: q }));
    });
    logSpy.mockClear();

    // 点击正确答案 b
    const correctBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('2'),
    );
    expect(correctBtn).toBeDefined();
    act(() => {
      correctBtn!.click();
    });

    const logs = stuckLogs(logSpy);
    const clearLog = logs.find((s) => s.includes('[stuck] clear') && s.includes('reason=answered'));
    expect(clearLog).toBeDefined();
    expect(clearLog).toContain('qid=q-test-1');
    expect(clearLog).toContain('skill=math:add');
    expect(clearLog).toMatch(/elapsed=\d+ms/);
  });

  it('答错后也输出 [stuck] clear 日志，reason=answered', () => {
    const q = makeQuestion();
    act(() => {
      root.render(createElement(QuizCard, { question: q }));
    });
    logSpy.mockClear();

    // 点击错误答案 a
    const wrongBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('1'),
    );
    act(() => {
      wrongBtn!.click();
    });

    const logs = stuckLogs(logSpy);
    const clearLog = logs.find((s) => s.includes('reason=answered'));
    expect(clearLog).toBeDefined();
  });

  it('换题时输出 [stuck] clear 日志，reason=new-question', () => {
    const q1 = makeQuestion({ id: 'q-1' });
    act(() => {
      root.render(createElement(QuizCard, { question: q1 }));
    });
    logSpy.mockClear();

    // 换题
    const q2 = makeQuestion({ id: 'q-2' });
    act(() => {
      root.render(createElement(QuizCard, { question: q2 }));
    });

    const logs = stuckLogs(logSpy);
    const clearLog = logs.find((s) => s.includes('reason=new-question'));
    expect(clearLog).toBeDefined();
    // 同时应看到新题的 arm 日志
    const armLog = logs.find((s) => s.includes('[stuck] arm') && s.includes('qid=q-2'));
    expect(armLog).toBeDefined();
  });

  it('点击"再听一遍"输出 [stuck] replay 日志', () => {
    const q = makeQuestion();
    act(() => {
      root.render(createElement(QuizCard, { question: q }));
    });
    // 触发超时让"再听一遍"按钮出现
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    logSpy.mockClear();

    // 找到"再听一遍"按钮（语言无关：按 stuck 提示条容器定位，避免测试环境
    // locale（jsdom 默认 en-US）渲染英文文案导致中文查询落空）
    const hintBox = Array.from(container.querySelectorAll('div')).find((d) =>
      String(d.className).includes('bg-candy-pink-soft'),
    );
    const replayBtn = hintBox ? hintBox.querySelector('button') : null;
    expect(replayBtn).toBeDefined();
    act(() => {
      replayBtn!.click();
    });

    const logs = stuckLogs(logSpy);
    const replayLog = logs.find((s) => s.includes('[stuck] replay'));
    expect(replayLog).toBeDefined();
    expect(replayLog).toContain('qid=q-test-1');
    expect(replayLog).toContain('用户点击"再听一遍"');
  });

  it('卸载组件时输出 [stuck] clear 日志，reason=unmount', () => {
    const q = makeQuestion();
    act(() => {
      root.render(createElement(QuizCard, { question: q }));
    });
    logSpy.mockClear();

    act(() => root.unmount());

    const logs = stuckLogs(logSpy);
    const clearLog = logs.find((s) => s.includes('reason=unmount'));
    expect(clearLog).toBeDefined();
  });
});
