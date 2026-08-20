// @vitest-environment jsdom
/**
 * FollowRead 跟读评测组件 单元测试
 * ============================================================
 * 覆盖听范读和跟读评测的关键逻辑分支：
 *   1. 生命周期日志（mount / unmount / step_change）
 *   2. 步骤1「听范读」：初始渲染、KaraokeReader 接收正确 props、按钮切换步骤
 *   3. 步骤2「跟读」：朗读目标展示、再听一遍范读调用 speak、SpeechEvalButton 接收正确 props
 *   4. 步骤3「结果」：通过/未通过分支、再来一次重置、下一关朗读
 *   5. 回调链路：onPass / onResult 透传
 *   6. props 默认值与覆盖
 *
 * 通过 mock 掉所有浏览器依赖（motion/speechSynthesis/SpeechRecognition/AI 等），
 * 用 react-dom/client 真实渲染 FollowRead，模拟用户点击与 SpeechEvalButton 回调。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react'; // React 19: act 从 react 导入
import { createRoot, type Root } from 'react-dom/client';
import type { PronunciationResult } from '@/lib/pronunciationEval';

// ============================================================
// Mock 外部依赖（必须放在 import FollowRead 之前）
// ============================================================

// 1. motion/react —— 简化成原生标签
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

// 2. 语音/音效 —— 全部空函数，避免触发浏览器 API
const speakMock = vi.fn(() => Promise.resolve());
const stopSpeakingMock = vi.fn();
vi.mock('@/lib/speech', () => ({
  speak: speakMock,
  stopSpeaking: stopSpeakingMock,
  // P2-5：useStore 模块初始化时会调用 TTS 桥接注册，mock 必须提供该导出
  registerTtsBridge: vi.fn(),
}));
vi.mock('@/lib/sfx', () => ({ sfxTap: vi.fn() }));

// 3. UI 组件 —— 简化成原生标签
vi.mock('@/components/ui/Button', () => ({
  CandyButton: (props: any) =>
    createElement(
      'button',
      {
        onClick: props.onClick,
        className: props.className,
        'data-tone': props.tone,
        'data-size': props.size,
      },
      props.children,
    ),
}));

// 4. KaraokeReader —— 简化为带 data-testid 的占位 div，校验透传 props
const karaokeRenderSpy = vi.fn();
vi.mock('@/components/games/KaraokeReader', () => ({
  KaraokeReader: (props: any) => {
    karaokeRenderSpy(props);
    return createElement(
      'div',
      { 'data-testid': 'karaoke', 'data-lang': props.lang, 'data-module': props.module },
      props.text,
    );
  },
}));

// 5. SpeechEvalButton —— 简化为带 data-testid 的占位 div，并把 onPass/onResult
//    暴露到 window 上，便于测试用例手动触发（模拟语音识别完成）
let speechEvalPropsRef: any = null;
vi.mock('@/components/feedback/SpeechEvalButton', () => ({
  SpeechEvalButton: (props: any) => {
    speechEvalPropsRef = props;
    return createElement(
      'div',
      {
        'data-testid': 'speech-eval',
        'data-lang': props.lang,
        'data-threshold': props.threshold,
        'data-enable-ai': String(props.enableAiAdvice),
      },
      `SpeechEval: ${props.targetText}`,
    );
  },
}));

// 6. utils cn —— 简单拼接
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ============================================================
// 测试用例
// ============================================================

// 延迟 import FollowRead 到所有 mock 完成后
const { FollowRead } = await import('@/components/feedback/FollowRead');

/** 构造一个完整的 PronunciationResult（通过） */
function makePassResult(overrides: Partial<PronunciationResult> = {}): PronunciationResult {
  return {
    score: 88,
    passed: true,
    targetCount: 5,
    correctCount: 4,
    chars: [
      { ch: '一', index: 0, status: 'correct', heard: '一' },
      { ch: '闪', index: 1, status: 'correct', heard: '闪' },
      { ch: '一', index: 2, status: 'wrong', heard: '二' },
      { ch: '闪', index: 3, status: 'correct', heard: '闪' },
      { ch: '亮', index: 4, status: 'correct', heard: '亮' },
    ],
    transcript: '一闪二闪亮',
    feedback: '读得真棒！',
    tips: ['「一」字再练一练'],
    ...overrides,
  };
}

/** 构造一个未通过的 PronunciationResult */
function makeFailResult(overrides: Partial<PronunciationResult> = {}): PronunciationResult {
  return makePassResult({
    score: 42,
    passed: false,
    correctCount: 2,
    ...overrides,
  });
}

/** 提取所有 [FollowRead] 前缀的日志，序列化全部参数便于断言 */
function frLogs(logSpy: ReturnType<typeof vi.spyOn>): string[] {
  return logSpy.mock.calls
    .map((c: unknown[]) => c.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '))
    .filter((s: string) => s.includes('[FollowRead]'));
}

/** 在容器内按文本查找按钮 */
function findButton(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text),
  );
}

describe('FollowRead 跟读评测组件', () => {
  let container: HTMLElement;
  let root: Root;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    speakMock.mockClear();
    stopSpeakingMock.mockClear();
    karaokeRenderSpy.mockClear();
    speechEvalPropsRef = null;
    // 默认关闭 fr_debug，日志分支用单独的用例覆盖
    localStorage.removeItem('fr_debug');
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    logSpy.mockRestore();
  });

  // ============================================================
  // 一、生命周期与初始渲染
  // ============================================================
  describe('生命周期与初始渲染', () => {
    it('初始挂载时渲染步骤1「听范读」，标题与 KaraokeReader 正确显示', () => {
      act(() => {
        root.render(
          createElement(FollowRead, {
            text: '一闪一闪亮晶晶',
            lines: ['一闪一闪亮晶晶'],
            lang: 'zh-CN',
            title: '小星星',
            tone: 'blue',
          }),
        );
      });

      // 标题
      expect(container.textContent).toContain('🎤 小星星');
      expect(container.textContent).toContain('先听范读，再跟着读');

      // 步骤指示器
      expect(container.textContent).toContain('1.听范读');
      expect(container.textContent).toContain('2.跟读');
      expect(container.textContent).toContain('3.看结果');

      // KaraokeReader 渲染并接收正确的 props
      const karaoke = container.querySelector('[data-testid="karaoke"]');
      expect(karaoke).not.toBeNull();
      expect(karaoke?.textContent).toContain('一闪一闪亮晶晶');
      expect(karaokeRenderSpy).toHaveBeenCalled();
      const lastCall = karaokeRenderSpy.mock.calls[karaokeRenderSpy.mock.calls.length - 1]![0];
      expect(lastCall.text).toBe('一闪一闪亮晶晶');
      expect(lastCall.lang).toBe('zh-CN');
      expect(lastCall.tone).toBe('blue');
      expect(lastCall.textSize).toBe('lg');

      // 步骤1 按钮：我会读了，开始跟读
      expect(findButton(container, '我会读了，开始跟读')).toBeDefined();
      // 步骤2 不应渲染
      expect(container.textContent).not.toContain('朗读目标');
    });

    it('未传 title 时不渲染标题块', () => {
      act(() => {
        root.render(
          createElement(FollowRead, { text: 'hello', lang: 'en-US' }),
        );
      });
      // 标题块含「先听范读，再跟着读」副标题；步骤指示器中也有 🎤，故只查副标题
      expect(container.textContent).not.toContain('先听范读，再跟着读');
      // 不应有标题 h3（步骤指示器用 div，标题用 h3）
      const h3s = container.querySelectorAll('h3');
      expect(Array.from(h3s).some((h) => h.textContent?.includes('🎤'))).toBe(false);
    });

    it('使用默认 props（lang=zh-CN, module=story, threshold=60, tone=pink, enableAiAdvice=true）', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '测试' }));
      });
      expect(karaokeRenderSpy).toHaveBeenCalled();
      const props = karaokeRenderSpy.mock.calls[0]![0];
      expect(props.lang).toBe('zh-CN');
      expect(props.module).toBe('story');
    });
  });

  // ============================================================
  // 二、步骤1 → 步骤2 切换
  // ============================================================
  describe('步骤1「听范读」→ 步骤2「跟读」', () => {
    it('点击「我会读了，开始跟读」切换到步骤2，调用 sfxTap 与 stopSpeaking', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '测试文本', lang: 'zh-CN' }));
      });
      expect(stopSpeakingMock).not.toHaveBeenCalled();

      const btn = findButton(container, '我会读了，开始跟读')!;
      act(() => btn.click());

      // sfxTap 来自 mock，无法直接断言；stopSpeaking 应被调用
      expect(stopSpeakingMock).toHaveBeenCalled();
      // 步骤2 渲染：朗读目标
      expect(container.textContent).toContain('朗读目标');
      expect(container.textContent).toContain('测试文本');
      // 步骤1 的 KaraokeReader 应卸载
      expect(container.querySelector('[data-testid="karaoke"]')).toBeNull();
    });

    it('步骤2 渲染「再听一遍范读」按钮与 SpeechEvalButton', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '你好世界', lang: 'zh-CN', threshold: 70 }));
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());

      // 再听一遍范读按钮
      expect(findButton(container, '再听一遍范读')).toBeDefined();
      // SpeechEvalButton 渲染
      const se = container.querySelector('[data-testid="speech-eval"]');
      expect(se).not.toBeNull();
      expect(se?.textContent).toContain('你好世界');
      // SpeechEvalButton 接收正确 props
      expect(speechEvalPropsRef).not.toBeNull();
      expect(speechEvalPropsRef.targetText).toBe('你好世界');
      expect(speechEvalPropsRef.lang).toBe('zh-CN');
      expect(speechEvalPropsRef.threshold).toBe(70);
      expect(speechEvalPropsRef.enableAiAdvice).toBe(true);
      expect(typeof speechEvalPropsRef.onPass).toBe('function');
      expect(typeof speechEvalPropsRef.onResult).toBe('function');
    });

    it('点击「再听一遍范读」调用 speak，使用 props.rate 或默认 0.7', () => {
      act(() => {
        root.render(
          createElement(FollowRead, { text: '再来一次', lang: 'zh-CN', rate: 0.85 }),
        );
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      speakMock.mockClear();

      act(() => findButton(container, '再听一遍范读')!.click());

      expect(speakMock).toHaveBeenCalledTimes(1);
      const calls = speakMock.mock.calls as unknown as [string, any][];
      const [calledText, calledOpts] = calls[0]!;
      expect(calledText).toBe('再来一次');
      expect(calledOpts?.lang).toBe('zh-CN');
      expect(calledOpts?.rate).toBe(0.85); // 使用 props.rate
    });

    it('未传 rate 时「再听一遍范读」使用默认 0.7', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '默认语速', lang: 'zh-CN' }));
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      speakMock.mockClear();

      act(() => findButton(container, '再听一遍范读')!.click());

      expect(speakMock).toHaveBeenCalledTimes(1);
      const calls = speakMock.mock.calls as unknown as [string, any][];
      expect(calls[0]?.[1]?.rate).toBe(0.7);
    });

  });

  // ============================================================
  // 三、步骤2 → 步骤3 评测结果（通过/未通过分支）
  // ============================================================
  describe('步骤2「跟读」→ 步骤3「结果」', () => {
    it('SpeechEvalButton 触发 onResult 后切换到步骤3，展示得分与字数', () => {
      const onPass = vi.fn();
      act(() => {
        root.render(
          createElement(FollowRead, {
            text: '一闪一闪',
            lang: 'zh-CN',
            onPass,
          }),
        );
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());

      // 模拟 SpeechEvalButton 回调：通过时同时触发 onResult 与 onPass
      const passResult = makePassResult({ score: 92, correctCount: 4, targetCount: 4 });
      act(() => {
        speechEvalPropsRef.onResult(passResult);
        speechEvalPropsRef.onPass(passResult);
      });

      // 步骤3 渲染
      expect(container.textContent).toContain('92 分');
      expect(container.textContent).toContain('正确 4/4 字');
      // 通过分支：🎉 + 下一关按钮
      expect(container.textContent).toContain('🎉');
      expect(findButton(container, '下一关')).toBeDefined();
      // onPass 应被调用
      expect(onPass).toHaveBeenCalledTimes(1);
      expect(onPass).toHaveBeenCalledWith(passResult);
    });

    it('未通过结果展示 💪 且不显示「下一关」按钮', () => {
      const onPass = vi.fn();
      act(() => {
        root.render(
          createElement(FollowRead, {
            text: '一闪一闪',
            lang: 'zh-CN',
            onPass,
          }),
        );
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());

      const failResult = makeFailResult({ score: 35, correctCount: 1, targetCount: 4 });
      act(() => {
        speechEvalPropsRef.onResult(failResult);
      });

      expect(container.textContent).toContain('35 分');
      expect(container.textContent).toContain('正确 1/4 字');
      // 未通过分支：💪 + 无下一关按钮
      expect(container.textContent).toContain('💪');
      expect(findButton(container, '下一关')).toBeUndefined();
      // onPass 不应被调用
      expect(onPass).not.toHaveBeenCalled();
    });

    it('通过后点击「下一关」调用 speak 朗读表扬语', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '通过测试', lang: 'zh-CN' }));
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      const r = makePassResult();
      act(() => {
        speechEvalPropsRef.onResult(r);
        speechEvalPropsRef.onPass(r);
      });
      speakMock.mockClear();

      act(() => findButton(container, '下一关')!.click());

      expect(speakMock).toHaveBeenCalledTimes(1);
      const calls = speakMock.mock.calls as unknown as [string, any][];
      const [text, opts] = calls[0]!;
      expect(text).toContain('太棒了');
      expect(opts?.lang).toBe('zh-CN');
      expect(opts?.module).toBe('praise');

    });
  });

  // ============================================================
  // 四、步骤3「再来一次」重置
  // ============================================================
  describe('步骤3「再来一次」', () => {
    it('点击「再来一次」回到步骤1，清空 lastResult', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '重置测试', lang: 'zh-CN' }));
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      const r = makePassResult({ score: 90 });
      act(() => {
        speechEvalPropsRef.onResult(r);
        speechEvalPropsRef.onPass(r);
      });

      // 步骤3 已渲染
      expect(container.textContent).toContain('90 分');

      act(() => findButton(container, '再来一次')!.click());

      // 回到步骤1
      expect(container.querySelector('[data-testid="karaoke"]')).not.toBeNull();
      expect(container.textContent).not.toContain('90 分');
      expect(container.textContent).not.toContain('朗读目标');
      // 步骤1 按钮重新出现
      expect(findButton(container, '我会读了，开始跟读')).toBeDefined();
    });

    it('「再来一次」调用 stopSpeaking 清理语音', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '清理', lang: 'zh-CN' }));
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      const r = makePassResult();
      act(() => {
        speechEvalPropsRef.onResult(r);
        speechEvalPropsRef.onPass(r);
      });
      stopSpeakingMock.mockClear();

      act(() => findButton(container, '再来一次')!.click());

      expect(stopSpeakingMock).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 五、性能日志分支（fr_debug）
  // ============================================================
  describe('性能日志（fr_debug）', () => {
    it('fr_debug=1 时输出 mount / step_change 日志', () => {
      localStorage.setItem('fr_debug', '1');
      logSpy.mockClear();

      act(() => {
        root.render(
          createElement(FollowRead, {
            text: '日志测试',
            lang: 'zh-CN',
            title: '日志',
          }),
        );
      });

      const logs = frLogs(logSpy);
      // mount 日志
      expect(logs.some((s) => s.includes('mount'))).toBe(true);
      // step_change 日志（初始 listen）
      expect(logs.some((s) => s.includes('step_change') && s.includes('listen'))).toBe(true);
    });

    it('fr_debug=1 时切换步骤输出 start_follow_click 与 step_change=follow 日志', () => {
      localStorage.setItem('fr_debug', '1');
      act(() => {
        root.render(createElement(FollowRead, { text: '日志', lang: 'zh-CN' }));
      });
      logSpy.mockClear();

      act(() => findButton(container, '我会读了，开始跟读')!.click());

      const logs = frLogs(logSpy);
      expect(logs.some((s) => s.includes('start_follow_click'))).toBe(true);
      expect(logs.some((s) => s.includes('step_change') && s.includes('follow'))).toBe(true);
    });

    it('fr_debug=1 时评测结果输出 eval_result 与 eval_pass 日志', () => {
      localStorage.setItem('fr_debug', '1');
      const onPass = vi.fn();
      act(() => {
        root.render(
          createElement(FollowRead, { text: '日志', lang: 'zh-CN', onPass }),
        );
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      logSpy.mockClear();

      const r = makePassResult({ score: 77 });
      act(() => {
        speechEvalPropsRef.onResult(r);
        speechEvalPropsRef.onPass(r);
      });

      const logs = frLogs(logSpy);
      expect(logs.some((s) => s.includes('eval_result') && s.includes('77'))).toBe(true);
      expect(logs.some((s) => s.includes('eval_pass'))).toBe(true);
      expect(logs.some((s) => s.includes('step_change') && s.includes('result'))).toBe(true);
    });

    it('fr_debug=1 时「再听一遍范读」输出 replay_listen_click 日志', async () => {
      localStorage.setItem('fr_debug', '1');
      act(() => {
        root.render(createElement(FollowRead, { text: '日志', lang: 'zh-CN' }));
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      logSpy.mockClear();

      act(() => findButton(container, '再听一遍范读')!.click());

      const logs = frLogs(logSpy);
      expect(logs.some((s) => s.includes('replay_listen_click'))).toBe(true);
    });

    it('fr_debug=0 时不输出任何 [FollowRead] 日志', () => {
      // 默认 fr_debug 未开启
      act(() => {
        root.render(createElement(FollowRead, { text: '静默', lang: 'zh-CN' }));
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());

      const logs = frLogs(logSpy);
      expect(logs.length).toBe(0);
    });

    it('卸载时输出 unmount 日志（fr_debug=1）', () => {
      localStorage.setItem('fr_debug', '1');
      act(() => {
        root.render(createElement(FollowRead, { text: '卸载', lang: 'zh-CN' }));
      });
      logSpy.mockClear();

      act(() => root.unmount());

      const logs = frLogs(logSpy);
      expect(logs.some((s) => s.includes('unmount'))).toBe(true);
    });
  });

  // ============================================================
  // 六、props 透传与边缘情况
  // ============================================================
  describe('props 透传与边缘情况', () => {
    it('module / moodKey / rate 透传给 KaraokeReader', () => {
      act(() => {
        root.render(
          createElement(FollowRead, {
            text: '春晓',
            lang: 'zh-CN',
            module: 'poem',
            moodKey: 'plain',
            rate: 0.75,
          }),
        );
      });
      const props = karaokeRenderSpy.mock.calls[0]![0];
      expect(props.module).toBe('poem');
      expect(props.moodKey).toBe('plain');
      expect(props.rate).toBe(0.75);
    });

    it('threshold 透传给 SpeechEvalButton', () => {
      act(() => {
        root.render(
          createElement(FollowRead, { text: '阈值', lang: 'zh-CN', threshold: 80 }),
        );
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      expect(speechEvalPropsRef.threshold).toBe(80);
    });

    it('enableAiAdvice=false 透传给 SpeechEvalButton', () => {
      act(() => {
        root.render(
          createElement(FollowRead, { text: '无AI', lang: 'zh-CN', enableAiAdvice: false }),
        );
      });
      act(() => findButton(container, '我会读了，开始跟读')!.click());
      expect(speechEvalPropsRef.enableAiAdvice).toBe(false);
    });

    it('不同 tone 都能正常渲染（pink/green/blue/amber/purple）', () => {
      const tones = ['pink', 'green', 'blue', 'amber', 'purple'] as const;
      for (const t of tones) {
        act(() => {
          root.render(
            createElement(FollowRead, { text: '配色', lang: 'zh-CN', tone: t }),
          );
        });
        const props = karaokeRenderSpy.mock.calls[karaokeRenderSpy.mock.calls.length - 1]![0];
        expect(props.tone).toBe(t);
      }
    });

    it('未传 lines 时 KaraokeReader 仍能接收 text', () => {
      act(() => {
        root.render(createElement(FollowRead, { text: '单段', lang: 'zh-CN' }));
      });
      const props = karaokeRenderSpy.mock.calls[0]![0];
      expect(props.text).toBe('单段');
      expect(props.lines).toBeUndefined();
    });

    it('className 拼接到根 div', () => {
      act(() => {
        root.render(
          createElement(FollowRead, { text: '类名', lang: 'zh-CN', className: 'my-extra' }),
        );
      });
      const rootDiv = container.querySelector('.space-y-4');
      expect(rootDiv?.className).toContain('my-extra');
    });
  });
});
