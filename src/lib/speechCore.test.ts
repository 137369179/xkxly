import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  moduleToPriority,
  PRIORITY_RANK,
  stopSpeaking,
  clearPendingQueue,
  registerStopAction,
  registerTtsBridge,
  pushTtsState,
  speechState,
  type SpeakPriority,
} from './speechCore';

describe('speechCore · 优先级映射', () => {
  it('module key → 优先级', () => {
    expect(moduleToPriority('praise')).toBe('praise');
    expect(moduleToPriority('quiz')).toBe('quiz');
    expect(moduleToPriority('poem')).toBe('poem');
    expect(moduleToPriority('story')).toBe('story');
    expect(moduleToPriority('ai')).toBe('story');
    expect(moduleToPriority(undefined)).toBe('general');
    expect(moduleToPriority('whatever')).toBe('general');
  });

  it('优先级序：praise > quiz > poem > story > general', () => {
    const order: SpeakPriority[] = ['general', 'story', 'poem', 'quiz', 'praise'];
    const ranks = order.map((p) => PRIORITY_RANK[p]);
    // 严格递增
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeGreaterThan(ranks[i - 1]!);
  });
});

describe('speechCore · 停止与队列', () => {
  beforeEach(() => {
    // 清空队列与上报器，保证测试隔离
    clearPendingQueue();
    registerTtsBridge(() => {}, () => true);
  });

  it('clearPendingQueue 清空并 resolve 全部排队项', () => {
    const r1 = vi.fn();
    const r2 = vi.fn();
    speechState.pendingQueue.push(
      { text: 'a', options: {}, priority: 'general', resolve: r1 },
      { text: 'b', options: {}, priority: 'general', resolve: r2 },
    );
    const n = clearPendingQueue();
    expect(n).toBe(2);
    expect(r1).toHaveBeenCalledTimes(1);
    expect(r2).toHaveBeenCalledTimes(1);
    expect(speechState.pendingQueue.length).toBe(0);
  });

  it('stopSpeaking 调用已注册的引擎停止动作', () => {
    const stopA = vi.fn();
    const stopB = vi.fn();
    registerStopAction(stopA);
    registerStopAction(stopB);
    stopSpeaking();
    expect(stopA).toHaveBeenCalledTimes(1);
    expect(stopB).toHaveBeenCalledTimes(1);
  });

  it('stopSpeaking 清空队列并复位当前状态', () => {
    const resolve = vi.fn();
    speechState.pendingQueue.push({ text: 'x', options: {}, priority: 'general', resolve });
    speechState.currentPriority = 'poem';
    speechState.currentUtterance = {} as SpeechSynthesisUtterance;
    stopSpeaking();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(speechState.pendingQueue.length).toBe(0);
    expect(speechState.currentPriority).toBeNull();
    expect(speechState.currentUtterance).toBeNull();
  });

  it('pushTtsState 通知已注入的上报器', () => {
    const reporter = vi.fn();
    registerTtsBridge(reporter, () => true);
    pushTtsState(true, '你好呀', 'praise');
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({ isSpeaking: true, snippet: '你好呀', module: 'praise' }),
    );
  });

  it('重复注册同一停止动作不重复执行', () => {
    const stop = vi.fn();
    registerStopAction(stop);
    registerStopAction(stop); // 去重
    stopSpeaking();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
