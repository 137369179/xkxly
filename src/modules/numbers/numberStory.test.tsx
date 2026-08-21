// @vitest-environment jsdom
/**
 * AI 数字儿歌降级逻辑 · 单元测试
 * 覆盖 NumberStory 的三态渲染：
 *   - fallback=true    → 离线童谣静态兜底
 *   - status=thinking  → 骨架屏占位
 *   - 正常(streaming/done) → 走 AiPanel
 * useAiStream 被 mock 成可控状态，专注测试组件自身的降级分支。
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { numberRhyme } from '@/data/numberRhymes';

// 可控的 AI 流状态
const stateRef: { current: { status: string; fallback: boolean; text?: string } } = {
  current: { status: 'thinking', fallback: false, text: '' },
};

vi.mock('@/lib/ai/useAi', () => ({
  useAiStream: () => stateRef.current,
}));
vi.mock('@/lib/ai/tasks', () => ({
  numberStoryTask: () => ({ title: 'test-task' }),
}));
vi.mock('@/components/ai', () => ({
  AiPanel: ({ state }: any) =>
    createElement('div', { 'data-testid': 'story-ai' }, `ai:${state.status}`),
}));
vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { NumberStory } from './NumberWall';

let host: HTMLDivElement;
let root: Root;

function renderStory(n: number) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(NumberStory, { n })));
}
const text = () => host?.textContent ?? '';
const byTestId = (id: string) => host?.querySelector(`[data-testid="${id}"]`);

beforeAll(() => {
  // 防止 jsdom/React 环境因 useAiStream 的自动任务副作用报错（此处已 mock，无副作用）
});
beforeEach(() => {
  stateRef.current = { status: 'thinking', fallback: false, text: '' };
});

describe('NumberStory 离线兜底', () => {
  it('fallback=true 时渲染离线童谣卡，并输出对应数字的童谣', () => {
    stateRef.current = { status: 'done', fallback: true, text: '小茜离线文案' };
    renderStory(1);
    expect(byTestId('story-offline')).toBeTruthy();
    expect(text()).toContain(numberRhyme(1));
    expect(text()).toContain('numbers.storyOfflineTitle');
    // 不进入骨架屏 / 不渲染 AiPanel
    expect(byTestId('story-skeleton')).toBeNull();
    expect(byTestId('story-ai')).toBeNull();
  });

  it('不同数字使用不同童谣（校验文案落点）', () => {
    stateRef.current = { status: 'done', fallback: true, text: 'x' };
    renderStory(4);
    expect(text()).toContain(numberRhyme(4));
    expect(text()).not.toContain(numberRhyme(3));
  });
});

describe('NumberStory 骨架屏', () => {
  it('status=thinking 且非 fallback 时渲染骨架屏，不输出童谣', () => {
    stateRef.current = { status: 'thinking', fallback: false, text: '' };
    renderStory(2);
    expect(byTestId('story-skeleton')).toBeTruthy();
    expect(text()).not.toContain(numberRhyme(2));
    expect(byTestId('story-offline')).toBeNull();
    expect(byTestId('story-ai')).toBeNull();
  });
});

describe('NumberStory 正常流式', () => {
  it('status=streaming 时走 AiPanel', () => {
    stateRef.current = { status: 'streaming', fallback: false, text: '流式中' };
    renderStory(5);
    expect(byTestId('story-ai')).toBeTruthy();
    expect(text()).toContain('ai:streaming');
    expect(byTestId('story-offline')).toBeNull();
  });

  it('status=done 且非 fallback 时走 AiPanel（正常成功路径）', () => {
    stateRef.current = { status: 'done', fallback: false, text: '生成的儿歌' };
    renderStory(6);
    expect(byTestId('story-ai')).toBeTruthy();
    expect(text()).toContain('ai:done');
  });
});