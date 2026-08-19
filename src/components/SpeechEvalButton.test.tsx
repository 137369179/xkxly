// @vitest-environment jsdom
/**
 * SpeechEvalButton 跟读按钮 单元测试
 * ============================================================
 * 覆盖「多级容错」链路的关键分支：
 *   1. start() 抛异常 → 自动降级「大声朗读即通过」
 *   2. 识别一启动就结束（服务不可用，如 Google 服务被墙）→ 自动降级大声朗读
 *   3. 服务不可用报错（network/service-not-allowed）→ 自动降级大声朗读
 *   4. 正常识别 onresult → 评测完成，进入 done，可再次点击
 *   5. 长时间无声音 → 温和提示并复位，不卡死
 *   6. 麦克风权限被拒 → 明确提示
 *   7. 监听中手动点击停止 → 立即复位
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

// ============================================================
// Mock 外部依赖（必须放在 import SpeechEvalButton 之前）
// ============================================================

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }),
}));
vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
}));
vi.mock('@/lib/sfx', () => ({ sfxTap: vi.fn(), sfxWrong: vi.fn(), sfxWin: vi.fn() }));
vi.mock('@/lib/celebrate', () => ({ celebrateBig: vi.fn() }));
vi.mock('@/lib/ai/speechAdvice', () => ({
  getSpeechAdvice: vi.fn(async () => ({ fromAi: false, items: [], encouragement: '' })),
}));
vi.mock('@/components/ui/Button', () => ({
  CandyButton: (props: any) => createElement('button', { onClick: props.onClick }, props.children),
}));
vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));
vi.mock('motion/react', () => ({
  motion: { div: (p: any) => createElement('div', p, p.children), span: (p: any) => createElement('span', p, p.children) },
  AnimatePresence: ({ children }: any) => children,
}));

// ============================================================
// Mock speechRecog：控制麦克风权限 / 音量检测 / 识别构造器
// ============================================================
const requestMicPermissionMock = vi.fn(async () => 'granted');
// detectVoiceOnce 用可控 deferred：默认挂起（保持「大声朗读中」状态），测试可主动 resolve
let resolveVoice!: (v: boolean) => void;
const stopVoiceMock = vi.fn();
const detectVoiceOnceMock = vi.fn(
  () => ({
    promise: new Promise<boolean>((r) => { resolveVoice = r; }),
    stop: () => stopVoiceMock(),
  }),
);
vi.mock('@/lib/ai/speechRecog', () => ({
  getSpeechRecognitionCtor: () => {
    const SR = (window as any).SpeechRecognition;
    return SR || null;
  },
  requestMicPermission: () => requestMicPermissionMock(),
  detectVoiceOnce: () => detectVoiceOnceMock(),
  classifyRecogError: (c: string) => {
    if (c === 'not-allowed') return 'denied';
    if (c === 'audio-capture') return 'no-mic';
    if (c === 'network' || c === 'service-not-allowed' || c === 'language-not-supported') return 'service-unavailable';
    if (c === 'no-speech') return 'no-speech';
    return 'unknown';
  },
}));

// ============================================================
// 可控的 SpeechRecognition 假实现
// ============================================================
type Handlers = {
  onresult?: (e: any) => void;
  onerror?: (e: any) => void;
  onend?: () => void;
};

class FakeSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  static instances: FakeSpeechRecognition[] = [];
  static startBehavior: 'ok' | 'throw' = 'ok';

  handlers: Handlers = {};
  started = false;
  aborted = false;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }

  get onresult() {
    return this.handlers.onresult;
  }
  set onresult(fn: any) {
    this.handlers.onresult = fn;
  }
  get onerror() {
    return this.handlers.onerror;
  }
  set onerror(fn: any) {
    this.handlers.onerror = fn;
  }
  get onend() {
    return this.handlers.onend;
  }
  set onend(fn: any) {
    this.handlers.onend = fn;
  }

  start() {
    if (FakeSpeechRecognition.startBehavior === 'throw') {
      throw new DOMException('recognition has already started', 'InvalidStateError');
    }
    this.started = true;
  }

  abort() {
    this.aborted = true;
  }

  stop() {
    this.started = false;
  }

  /** 测试辅助：模拟触发一次识别结果 */
  fireResult(transcript: string) {
    this.handlers.onresult?.({ results: [[{ transcript }]] });
  }

  /** 测试辅助：模拟触发错误 */
  fireError(code: string) {
    this.handlers.onerror?.({ error: code });
  }

  /** 测试辅助：模拟结束 */
  fireEnd() {
    this.handlers.onend?.();
  }
}

const { SpeechEvalButton } = await import('@/components/SpeechEvalButton');

function setupWindow() {
  (window as any).SpeechRecognition = FakeSpeechRecognition;
  (window as any).webkitSpeechRecognition = undefined;
}

/** 渲染按钮，返回容器与按钮元素 */
function renderButton(props: any = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const el = createElement(SpeechEvalButton, { targetText: 'cat', lang: 'en-US', ...props });
  act(() => {
    root.render(el);
  });
  const button = () => container.querySelector('button')!;
  const text = () => button().textContent ?? '';
  const bodyText = () => container.textContent ?? '';
  const cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return { container, button, text, bodyText, cleanup };
}

/** 点击按钮并冲刷异步（麦克风权限 → 创建识别 → start） */
async function clickAndFlush(btn: () => HTMLElement) {
  await act(async () => {
    btn().click();
    await Promise.resolve();
  });
}

beforeEach(() => {
  FakeSpeechRecognition.instances = [];
  FakeSpeechRecognition.startBehavior = 'ok';
  requestMicPermissionMock.mockClear();
  requestMicPermissionMock.mockResolvedValue('granted');
  detectVoiceOnceMock.mockClear();
  stopVoiceMock.mockClear();
  // 默认挂起：由各用例显式 resolve
  resolveVoice = () => undefined;
  setupWindow();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('SpeechEvalButton 跟读按钮', () => {
  it('start() 抛异常时自动降级「大声朗读即通过」，不卡死', async () => {
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });
    expect(text()).toContain('tts.tapRead');

    FakeSpeechRecognition.startBehavior = 'throw';
    await clickAndFlush(button);

    // 进入大声朗读模式：按钮文案 + 降级提示
    expect(text()).toContain('tts.loudReadListening');
    expect(bodyText()).toContain('tts.loudReadMode');
    expect(detectVoiceOnceMock).toHaveBeenCalled();
    cleanup();
  });

  it('识别一启动就结束（服务不可用）→ 自动降级大声朗读', async () => {
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });
    await clickAndFlush(button);

    const inst = FakeSpeechRecognition.instances[0]!;
    expect(inst.started).toBe(true);

    // 模拟「点击后立即结束」（Google 服务被墙的典型表现）
    await act(async () => {
      inst.fireEnd();
      await Promise.resolve();
    });

    expect(text()).toContain('tts.loudReadListening');
    expect(bodyText()).toContain('tts.loudReadMode');
    cleanup();
  });

  it('服务不可用报错（network）→ 自动降级大声朗读', async () => {
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });
    await clickAndFlush(button);

    const inst = FakeSpeechRecognition.instances[0]!;
    await act(async () => {
      inst.fireError('network');
      await Promise.resolve();
    });

    expect(text()).toContain('tts.loudReadListening');
    expect(bodyText()).toContain('tts.loudReadMode');
    cleanup();
  });

  it('大声朗读模式：检测到声音 → 通过并渲染得分', async () => {
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });

    FakeSpeechRecognition.startBehavior = 'throw'; // 直接触发降级
    await clickAndFlush(button);
    expect(text()).toContain('tts.loudReadListening');

    // 检测到孩子开口 → 通过
    await act(async () => {
      resolveVoice(true);
      await Promise.resolve();
    });

    expect(text()).toContain('tts.passed');
    expect(bodyText()).toContain('100');
    cleanup();
  });

  it('大声朗读模式：长时间没声音 → 温和提示并复位', async () => {
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });

    FakeSpeechRecognition.startBehavior = 'throw';
    await clickAndFlush(button);

    await act(async () => {
      resolveVoice(false);
      await Promise.resolve();
    });

    expect(text()).toContain('tts.tapRead');
    expect(bodyText()).toContain('tts.noSpeech');
    cleanup();
  });

  it('正常识别：onresult 触发后完成评测，进入 done 并渲染得分', async () => {
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });
    await clickAndFlush(button);

    const inst = FakeSpeechRecognition.instances[0]!;
    await act(async () => {
      inst.fireResult('cat');
      await Promise.resolve();
    });

    // 评测完成：通过状态 + 渲染得分，按钮可再次点击
    expect(text()).toContain('tts.passed');
    expect(bodyText()).toContain('100');
    expect(button().hasAttribute('disabled')).toBe(false);
    cleanup();
  });

  it('识别后陷入静默（无任何事件）→ 2.5s 快速降级大声朗读，不等 12s', async () => {
    vi.useFakeTimers();
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });

    await clickAndFlush(button);
    const inst = FakeSpeechRecognition.instances[0]!;
    expect(inst.started).toBe(true);

    // 触发「服务无响应快速检测」：2.5s 内无任何事件 → 降级大声朗读
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(text()).toContain('tts.loudReadListening');
    expect(bodyText()).toContain('tts.loudReadMode');
    expect(inst.aborted).toBe(true);
    cleanup();
  });

  it('onstart 已触发（服务正常工作）后 hang → 12s 兜底超时复位并不朗读', async () => {
    vi.useFakeTimers();
    const { button, text, cleanup } = renderButton({ enableAiAdvice: false });

    await clickAndFlush(button);
    const inst = FakeSpeechRecognition.instances[0]!;
    expect(inst.started).toBe(true);

    // 模拟识别正常启动（触发 onstart，消除 2.5s 快速检测），之后却一直无结果/无结束
    // 组件把 onstart 作为实例上的普通属性赋值，因此直接取出来调用
    ((inst as unknown as { onstart?: () => void }).onstart)?.();

    await act(async () => {
      vi.advanceTimersByTime(12_000);
    });

    expect(text()).toContain('tts.tapRead');
    expect(inst.aborted).toBe(true);
    cleanup();
  });

  it('麦克风权限被拒 → 明确提示', async () => {
    requestMicPermissionMock.mockResolvedValue('denied');
    const { button, text, bodyText, cleanup } = renderButton({ enableAiAdvice: false });
    await clickAndFlush(button);

    expect(text()).toContain('tts.tapRead');
    expect(bodyText()).toContain('tts.micDenied');
    expect(FakeSpeechRecognition.instances.length).toBe(0); // 未创建识别实例
    cleanup();
  });

  it('监听中手动点击停止 → 立即复位可再次点击', async () => {
    const { button, text, cleanup } = renderButton({ enableAiAdvice: false });
    await clickAndFlush(button);
    expect(text()).toContain('tts.listening');

    await act(async () => {
      button().click();
      await Promise.resolve();
    });
    expect(text()).toContain('tts.tapRead');
    expect(button().hasAttribute('disabled')).toBe(false);
    cleanup();
  });

  it('大声朗读模式：点击停止后立即释放麦克风（不再占用 20s）', async () => {
    const { button, text, cleanup } = renderButton({ enableAiAdvice: false });

    FakeSpeechRecognition.startBehavior = 'throw'; // 触发降级 → 开麦监听
    await clickAndFlush(button);
    expect(text()).toContain('tts.loudReadListening');
    expect(stopVoiceMock).not.toHaveBeenCalled();

    // 用户手动停止 → 必须主动释放音量检测占用的麦克风
    await act(async () => {
      button().click();
      await Promise.resolve();
    });

    expect(text()).toContain('tts.tapRead');
    expect(stopVoiceMock).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('大声朗读模式：组件卸载时释放麦克风', async () => {
    const { button, text, cleanup } = renderButton({ enableAiAdvice: false });

    FakeSpeechRecognition.startBehavior = 'throw';
    await clickAndFlush(button);
    expect(text()).toContain('tts.loudReadListening');
    expect(stopVoiceMock).not.toHaveBeenCalled();

    // 卸载组件 → 清理阶段必须释放麦克风
    act(() => cleanup());
    expect(stopVoiceMock).toHaveBeenCalledTimes(1);
  });
});
