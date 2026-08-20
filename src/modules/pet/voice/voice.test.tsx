// @vitest-environment jsdom
/**
 * CatVoiceChatModal 拆分出的 voice 展示组件单元测试
 * ============================================================
 * 覆盖 P2-3 新增的 4 个纯展示组件：
 *   1. VoiceHeader：通话时长格式化 + 关闭按钮回调
 *   2. VoiceTitle：标题与引擎文案
 *   3. VoiceCatStage：各状态文案切换 + STT 提示透传
 *   4. VoiceControls / QuickPhrases：三个操作按钮回调 + 快捷短语去表情提交
 *   5. VoiceMessageList：用户/小猫气泡 + 重播（调 speak）+ 流式占位
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ============================================================
// Mock 外部依赖（必须在 import 组件之前声明，vitest 自动提升）
// ============================================================
const mocks = vi.hoisted(() => ({
  speak: vi.fn(),
  sfxTap: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    // 无参数返回 key；有 {time} 时拼出 `${key}:${time}`，便于断言格式化结果
    t: (k: unknown, p?: Record<string, string | number>) =>
      p ? `${String(k)}:${p.time ?? ''}` : String(k),
  }),
}));
vi.mock('@/lib/speech', () => ({
  speak: mocks.speak,
  stopSpeaking: vi.fn(),
}));
vi.mock('@/lib/sfx', () => ({ sfxTap: mocks.sfxTap }));
vi.mock('motion/react', () => ({
  motion: {
    div: (p: any) => createElement('div', p, p.children),
    span: (p: any) => createElement('span', p, p.children),
  },
  AnimatePresence: ({ children }: any) => children,
}));
vi.mock('@/components/games/CyberMasterCat3D', () => ({
  CyberMasterCat3D: (p: any) =>
    createElement('div', { 'data-testid': 'c3d', 'data-hat': p.hat, 'data-neck': p.neck }, p.children),
}));
vi.mock('@/modules/pet/PetIcons', () => ({
  CatPurrIcon: (p: any) => createElement('span', { 'data-testid': 'purr' }, p.children),
}));

import { VoiceHeader } from './VoiceHeader';
import { VoiceTitle, VoiceCatStage } from './VoiceCatStage';
import { VoiceControls, QuickPhrases } from './VoiceControls';
import { VoiceMessageList, type VoiceMessage } from './VoiceMessageList';

// ============================================================
// 渲染基础设施
// ============================================================
let host: HTMLDivElement;
let root: Root;

function mount(node: ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(node);
  });
}
const text = () => host?.textContent ?? '';
const buttons = () => Array.from(host?.querySelectorAll('button') ?? []);
function clickButton(idx: number) {
  act(() => buttons()[idx]?.click());
}

beforeEach(() => {
  mocks.speak.mockReset();
  mocks.sfxTap.mockReset();
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

describe('VoiceHeader', () => {
  it('格式化通话时长 分:秒 并渲染关闭按钮', () => {
    const onClose = vi.fn();
    mount(createElement(VoiceHeader, { seconds: 65, onClose, closeBtnRef: null }));
    expect(text()).toContain('01:05');
    expect(buttons().length).toBe(1);
    expect(buttons()[0]?.getAttribute('aria-label')).toBe('catCompanion.voice.close');
  });

  it('时长格式化：跨分钟进位与小时级边界', () => {
    const onClose = vi.fn();
    mount(createElement(VoiceHeader, { seconds: 0, onClose, closeBtnRef: null }));
    expect(text()).toContain('00:00');
    const cases: Array<[number, string]> = [
      [59, '00:59'],
      [60, '01:00'],
      [125, '02:05'],
      [3661, '61:01'],
    ];
    for (const [sec, want] of cases) {
      act(() => root!.render(createElement(VoiceHeader, { seconds: sec, onClose, closeBtnRef: null })));
      expect(text()).toContain(want);
    }
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    mount(createElement(VoiceHeader, { seconds: 0, onClose, closeBtnRef: null }));
    clickButton(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('VoiceTitle', () => {
  it('渲染标题与引擎副文案', () => {
    mount(createElement(VoiceTitle));
    expect(text()).toContain('catCompanion.voice.title');
    expect(text()).toContain('catCompanion.voice.engine');
    expect(host?.querySelector('[data-testid="purr"]')).toBeTruthy();
  });
});

describe('VoiceCatStage', () => {
  const base = {
    isListening: false,
    isTtsSpeaking: false,
    isMuted: false,
    status: 'idle' as const,
    expression: 'happy' as const,
    outfits: {},
    sttNotice: '',
  };

  it('默认显示已连接状态', () => {
    mount(createElement(VoiceCatStage, base));
    expect(text()).toContain('catCompanion.voice.connected');
    expect(host?.querySelector('[data-testid="c3d"]')).toBeTruthy();
  });

  it('监听中显示 listening 状态', () => {
    mount(createElement(VoiceCatStage, { ...base, isListening: true }));
    expect(text()).toContain('catCompanion.voice.listening');
  });

  it('静音时显示 muted 状态', () => {
    mount(createElement(VoiceCatStage, { ...base, isMuted: true }));
    expect(text()).toContain('catCompanion.voice.muted');
  });

  it('TTS 播报中显示 speaking 状态（优先级最高）', () => {
    mount(createElement(VoiceCatStage, { ...base, isTtsSpeaking: true, isListening: true }));
    expect(text()).toContain('catCompanion.voice.speaking');
  });

  it('AI 流式生成中显示 thinking 状态', () => {
    mount(createElement(VoiceCatStage, { ...base, status: 'streaming' as const }));
    expect(text()).toContain('catCompanion.voice.thinking');
  });

  it('混合状态时按优先级：speaking > thinking > listening', () => {
    mount(createElement(VoiceCatStage, { ...base, isTtsSpeaking: true, status: 'streaming' as const }));
    expect(text()).toContain('catCompanion.voice.speaking');

    act(() => root!.render(createElement(VoiceCatStage, { ...base, status: 'streaming' as const, isListening: true })));
    expect(text()).toContain('catCompanion.voice.thinking');
  });

  it('监听或播报时渲染等化条动画，空闲时不渲染', () => {
    mount(createElement(VoiceCatStage, base));
    expect(host?.querySelectorAll('.w-0\\.5').length).toBe(0);

    act(() => root!.render(createElement(VoiceCatStage, { ...base, isListening: true })));
    expect(host?.querySelectorAll('.w-0\\.5').length).toBe(4);
  });

  it('非 streaming 的 AiStatus（error/done）回落连接/监听状态', () => {
    mount(createElement(VoiceCatStage, { ...base, status: 'error' as const }));
    expect(text()).toContain('catCompanion.voice.connected');

    act(() => root!.render(createElement(VoiceCatStage, { ...base, status: 'done' as const, isListening: true })));
    expect(text()).toContain('catCompanion.voice.listening');
  });

  it('透传 STT 提示文案', () => {
    mount(createElement(VoiceCatStage, { ...base, sttNotice: '请点击麦克风再说话' }));
    expect(text()).toContain('请点击麦克风再说话');
  });

  it('将佩戴的配饰透传给 3D 猫咪（hat/neck）', () => {
    mount(createElement(VoiceCatStage, { ...base, outfits: { hat: '皇冠', neck: '围巾' } }));
    const c3d = host?.querySelector('[data-testid="c3d"]');
    expect(c3d?.getAttribute('data-hat')).toBe('皇冠');
    expect(c3d?.getAttribute('data-neck')).toBe('围巾');
  });
});

describe('VoiceControls', () => {
  it('渲染静音/挂断/结束说话三个按钮并触发对应回调', () => {
    const onToggleMute = vi.fn();
    const onHangUp = vi.fn();
    const onToggleListen = vi.fn();
    mount(
      createElement(VoiceControls, {
        isMuted: false,
        isListening: false,
        onToggleMute,
        onHangUp,
        onToggleListen,
      }),
    );
    expect(buttons().length).toBe(3);
    expect(text()).toContain('catCompanion.voice.muteOn');
    expect(text()).toContain('catCompanion.voice.speakAgain');

    clickButton(0);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    clickButton(1);
    expect(onHangUp).toHaveBeenCalledTimes(1);
    clickButton(2);
    expect(onToggleListen).toHaveBeenCalledTimes(1);
  });

  it('静音状态显示 unmute 文案', () => {
    mount(
      createElement(VoiceControls, {
        isMuted: true,
        isListening: false,
        onToggleMute: vi.fn(),
        onHangUp: vi.fn(),
        onToggleListen: vi.fn(),
      }),
    );
    expect(text()).toContain('catCompanion.voice.unmute');
  });

  it('监听中「结束说话」按钮显示 doneSpeaking 文案', () => {
    mount(
      createElement(VoiceControls, {
        isMuted: false,
        isListening: true,
        onToggleMute: vi.fn(),
        onHangUp: vi.fn(),
        onToggleListen: vi.fn(),
      }),
    );
    expect(text()).toContain('catCompanion.voice.doneSpeaking');
  });
});

describe('QuickPhrases', () => {
  it('渲染 6 个快捷短语，点击去除表情后回调文本', () => {
    const onSend = vi.fn();
    mount(createElement(QuickPhrases, { onSend }));
    expect(buttons().length).toBe(6);
    clickButton(2);
    expect(onSend).toHaveBeenCalledWith('catCompanion.quickPhrases.2');
    expect(mocks.sfxTap).toHaveBeenCalledTimes(1);
  });

  it('6 个短语按钮分别回调携带对应文案', () => {
    const onSend = vi.fn();
    mount(createElement(QuickPhrases, { onSend }));
    buttons().forEach((_, i) => clickButton(i));
    expect(onSend).toHaveBeenCalledTimes(6);
    for (let i = 0; i < 6; i++) {
      expect(onSend).toHaveBeenNthCalledWith(i + 1, `catCompanion.quickPhrases.${i}`);
    }
  });
});

describe('VoiceMessageList', () => {
  const msgs: VoiceMessage[] = [
    { id: 'u', sender: 'user', text: '孩子说的' },
    { id: 'c', sender: 'cat', text: '小猫回的话' },
  ];

  it('渲染用户与小猫气泡，小猫气泡可点击重播调用 speak', () => {
    mount(createElement(VoiceMessageList, { messages: msgs, streaming: false, streamingText: '', endRef: null }));
    expect(text()).toContain('孩子说的');
    expect(text()).toContain('小猫回的话');
    expect(text()).toContain('catCompanion.voice.replay');

    clickButton(0);
    expect(mocks.speak).toHaveBeenCalledWith('小猫回的话', expect.objectContaining({ lang: 'zh-CN' }));
    expect(mocks.sfxTap).toHaveBeenCalledTimes(1);
  });

  it('流式回复显示占位；空文本时用统一提示', () => {
    mount(createElement(VoiceMessageList, { messages: [], streaming: true, streamingText: '正在思考', endRef: null }));
    expect(text()).toContain('正在思考');
  });

  it('流式无文本时显示 organizing 提示', () => {
    mount(createElement(VoiceMessageList, { messages: [], streaming: true, streamingText: '', endRef: null }));
    expect(text()).toContain('catCompanion.voice.organizing');
  });

  it('空列表且非流式时无任何气泡与重播按钮', () => {
    mount(createElement(VoiceMessageList, { messages: [], streaming: false, streamingText: '', endRef: null }));
    expect(buttons().length).toBe(0);
    expect(text()).not.toContain('catCompanion.voice.replay');
  });

  it('仅用户消息无重播按钮；多条小猫消息各有重播且对应各自文本', () => {
    const userOnly: VoiceMessage[] = [{ id: 'u', sender: 'user', text: '嗨' }];
    mount(createElement(VoiceMessageList, { messages: userOnly, streaming: false, streamingText: '', endRef: null }));
    expect(buttons().length).toBe(0);

    const multi: VoiceMessage[] = [
      { id: 'c1', sender: 'cat', text: '喵一' },
      { id: 'c2', sender: 'cat', text: '喵二' },
    ];
    act(() => root!.render(createElement(VoiceMessageList, { messages: multi, streaming: false, streamingText: '', endRef: null })));
    expect(buttons().length).toBe(2);
    buttons().forEach((b) => act(() => b.click()));
    expect(mocks.speak).toHaveBeenNthCalledWith(1, '喵一', expect.objectContaining({ lang: 'zh-CN' }));
    expect(mocks.speak).toHaveBeenNthCalledWith(2, '喵二', expect.objectContaining({ lang: 'zh-CN' }));
  });
});