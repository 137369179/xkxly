// @vitest-environment jsdom
/**
 * CatVoiceChatModal 拆分出的 voice 展示与交互组件单元测试
 * ============================================================
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ============================================================
// Mock 外部依赖
// ============================================================
const mocks = vi.hoisted(() => ({
  speak: vi.fn(),
  sfxTap: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (k: unknown, p?: Record<string, string | number>) =>
      p ? `${String(k)}:${p.time ?? ''}` : String(k),
  }),
}));
vi.mock('@/lib/speech', () => ({
  speak: mocks.speak,
  stopSpeaking: vi.fn(),
}));
vi.mock('@/lib/sfx', () => ({
  sfxTap: mocks.sfxTap,
  sfxPurr: vi.fn(),
  sfxPraise: vi.fn(),
  sfxStar: vi.fn(),
  sfxBubble: vi.fn(),
  sfxBoing: vi.fn(),
  sfxMagic: vi.fn(),
  sfxMeow: vi.fn(),
  sfxMusicBox: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  sfxFlip: vi.fn(),
  sfxPop: vi.fn(),
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));
vi.mock('motion/react', () => ({
  motion: {
    div: (p: any) => createElement('div', p, p.children),
    span: (p: any) => createElement('span', p, p.children),
    button: (p: any) => createElement('button', p, p.children),
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
vi.mock('@/components/ai/RubyText', () => ({
  RubyText: (p: any) => createElement('span', { 'data-testid': 'ruby' }, p.text),
}));

import { VoiceHeader } from './VoiceHeader';
import { VoiceTitle, VoiceCatStage } from './VoiceCatStage';
import { VoiceControls, QuickPhrases } from './VoiceControls';
import { VoiceMessageList, type VoiceMessage } from './VoiceMessageList';
import { VoiceChatInput } from './VoiceChatInput';
import { VoiceToys } from './VoiceToys';

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
  it('格式化通话时长 分:秒 并渲染关闭与操作按钮', () => {
    const onClose = vi.fn();
    mount(createElement(VoiceHeader, { seconds: 65, onClose, closeBtnRef: null }));
    expect(text()).toContain('01:05');
    expect(buttons().length).toBe(1);
    expect(buttons()[0]?.getAttribute('aria-label')).toBe('catCompanion.voice.close');
  });

  it('支持静音切换与清空对话记录', () => {
    const onClose = vi.fn();
    const onClear = vi.fn();
    const onToggleMute = vi.fn();
    mount(
      createElement(VoiceHeader, {
        seconds: 10,
        onClose,
        onClear,
        isMuted: false,
        onToggleMute,
        closeBtnRef: null,
      }),
    );
    expect(buttons().length).toBe(3);
    clickButton(0);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    clickButton(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('VoiceTitle', () => {
  it('渲染标题', () => {
    mount(createElement(VoiceTitle));
    expect(text()).toContain('catCompanion.voice.title');
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

  it('透传 STT 提示文案', () => {
    mount(createElement(VoiceCatStage, { ...base, sttNotice: '请点击麦克风再说话' }));
    expect(text()).toContain('请点击麦克风再说话');
  });

  it('支持儿童互动按钮（摸摸、喂鱼干、鼓掌）点击回调', () => {
    const onPet = vi.fn();
    const onFeed = vi.fn();
    const onPraise = vi.fn();
    mount(
      createElement(VoiceCatStage, {
        ...base,
        onPet,
        onFeed,
        onPraise,
        fishCount: 5,
      }),
    );
    expect(text()).toContain('摸摸');
    expect(text()).toContain('喂鱼干 (5)');
    expect(text()).toContain('鼓掌');

    clickButton(0);
    expect(onPet).toHaveBeenCalledTimes(1);
    clickButton(1);
    expect(onFeed).toHaveBeenCalledTimes(1);
    clickButton(2);
    expect(onPraise).toHaveBeenCalledTimes(1);
  });
});

describe('VoiceControls & QuickPhrases', () => {
  it('VoiceControls 渲染操作按钮并触发对应回调', () => {
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
    clickButton(0);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    clickButton(1);
    expect(onHangUp).toHaveBeenCalledTimes(1);
    clickButton(2);
    expect(onToggleListen).toHaveBeenCalledTimes(1);
  });

  it('QuickPhrases 支持分类切换并点击发送短语', () => {
    const onSend = vi.fn();
    mount(createElement(QuickPhrases, { onSend }));
    // 包含分类按钮 + 推荐短语按钮
    expect(buttons().length).toBeGreaterThan(5);
    // 点击分类后面的第一个短语按钮（索引 5 是首个短语）
    clickButton(5);
    expect(onSend).toHaveBeenCalled();
    expect(mocks.sfxTap).toHaveBeenCalled();
  });
});

describe('VoiceMessageList', () => {
  const msgs: VoiceMessage[] = [
    { id: 'u', sender: 'user', text: '孩子说的' },
    { id: 'c', sender: 'cat', text: '小猫回的话' },
  ];

  it('渲染用户与小猫气泡，小猫气泡可点击重播与切换拼音', () => {
    mount(createElement(VoiceMessageList, { messages: msgs, streaming: false, streamingText: '', endRef: null }));
    expect(text()).toContain('孩子说的');
    expect(text()).toContain('小猫回的话');
    expect(text()).toContain('catCompanion.voice.replay');
    expect(text()).toContain('拼音');

    // 点击重播
    clickButton(0);
    expect(mocks.speak).toHaveBeenCalledWith('小猫回的话', expect.objectContaining({ lang: 'zh-CN' }));

    // 点击拼音切换
    clickButton(1);
    expect(host?.querySelector('[data-testid="ruby"]')).toBeTruthy();
  });
});

describe('VoiceChatInput', () => {
  it('支持输入文本并按发送按钮提交', () => {
    const onSend = vi.fn();
    const onToggleListen = vi.fn();
    mount(
      createElement(VoiceChatInput, {
        onSend,
        isListening: false,
        onToggleListen,
      }),
    );

    const input = host?.querySelector('input');
    expect(input).toBeTruthy();

    act(() => {
      if (input) {
        input.value = '你好小茜！';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // 触发 React onChange
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, '你好小茜！');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const form = host?.querySelector('form');
    act(() => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // 录音按钮点击
    const micBtn = buttons()[0];
    act(() => micBtn?.click());
    expect(onToggleListen).toHaveBeenCalledTimes(1);
  });
});

describe('VoiceToys', () => {
  it('渲染吹泡泡、毛线球、变装秀、八音盒四大互动玩具按钮', () => {
    const onEquipOutfit = vi.fn();
    const onCatAction = vi.fn();
    mount(
      createElement(VoiceToys, {
        onEquipOutfit,
        onCatAction,
      }),
    );
    expect(text()).toContain('吹泡泡');
    expect(text()).toContain('毛线球');
    expect(text()).toContain('变装秀');
    expect(text()).toContain('八音盒');
  });

  it('点击吹泡泡生成浮动泡泡，点击泡泡触发戳破', () => {
    const onCatAction = vi.fn();
    mount(createElement(VoiceToys, { onCatAction }));
    // 点击「吹泡泡」
    clickButton(0);
    expect(onCatAction).toHaveBeenCalledWith(
      expect.stringContaining('梦幻彩虹泡泡'),
      'excited',
    );
  });

  it('点击毛线球与八音盒触发对应互动反馈', () => {
    const onCatAction = vi.fn();
    mount(createElement(VoiceToys, { onCatAction }));
    // 点击「毛线球」
    clickButton(1);
    expect(onCatAction).toHaveBeenCalled();

    // 点击「八音盒」
    clickButton(3);
    expect(onCatAction).toHaveBeenCalledWith(
      expect.stringContaining('八音盒'),
      'happy',
    );
  });

  it('点击变装秀展开换装抽屉并能切换猫咪配饰', () => {
    const onEquipOutfit = vi.fn();
    const onCatAction = vi.fn();
    mount(
      createElement(VoiceToys, {
        onEquipOutfit,
        onCatAction,
      }),
    );
    // 点击「变装秀」展开
    clickButton(2);
    expect(text()).toContain('皇冠');
    expect(text()).toContain('魔法帽');
    expect(text()).toContain('蝴蝶结');

    // 点击皇冠 (在玩具按钮后面)
    const crownBtn = buttons().find((b) => b.textContent?.includes('皇冠'));
    act(() => crownBtn?.click());
    expect(onEquipOutfit).toHaveBeenCalledWith('hat', 'crown');
    expect(onCatAction).toHaveBeenCalledWith(
      expect.stringContaining('全新 皇冠 造型'),
      'excited',
    );
  });
});
