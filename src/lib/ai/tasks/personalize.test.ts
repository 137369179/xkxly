/**
 * P0-4 个性化注入 单测
 * - companionChatTask 的 context 注入：无 context 零破坏、有 context 前置系统画像
 * - masteryCue 无掌握度数据时给中性文案（避免误导）
 */
import { describe, it, expect } from 'vitest';
import { companionChatTask } from './companion';
import { masteryCue } from './personalize';
import { companionChatMessages } from '../prompts';
import type { Progress } from '@/types';

const q = '你好，我想听故事';
const base = companionChatMessages(q, []);

describe('companionChatTask · 个性化 context 注入（P0-4）', () => {
  it('无 context 时与原始消息完全一致（零破坏）', () => {
    const t = companionChatTask(q, [], '');
    expect(t.messages).toEqual(base);
  });

  it('有 context 时前置一条 system 画像', () => {
    const ctx = '### 孩子的学习画像\n他最需要温习：数学、古诗。';
    const t = companionChatTask(q, [], ctx);
    expect(t.messages.length).toBe(base.length + 1);
    expect(t.messages[0]!.role).toBe('system');
    expect(t.messages[0]!.content).toContain('孩子的学习画像');
    // 原对话内容保持在后，未被覆盖
    expect(t.messages.slice(1)).toEqual(base);
  });
});

describe('masteryCue · 画像摘要', () => {
  it('无掌握度数据时不误导，给中性文案', () => {
    const cue = masteryCue({ mastery: {} } as Progress, 4);
    expect(cue).toContain('刚认识的新朋友');
  });
});