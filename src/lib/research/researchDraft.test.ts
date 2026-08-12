import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInitialSession } from './sessionMachine';
import { loadDraft, saveDraft, clearDraft, DRAFT_VERSION } from './researchDraft';
import type { ResearchSession } from './types';

/**
 * researchDraft 单元测试
 * ------------------------------------------------------------------
 * T6：草稿 save/load/clear 闭环 + 版本不匹配 / TTL 超期丢弃 + 节流写盘。
 * safeStorage 自带内存兜底（node 环境无 localStorage 时自动回落），
 * 但为精确断言「写盘」行为，这里显式 mock localStorage 并清空。
 *
 * 注意：node 环境下 safeStorage.storageAvailable 无法感知 vi.stubGlobal 的 mock
 * （window.localStorage 与全局 localStorage 不一致），数据实际落在内存兜底。
 * 因此断言改为基于 loadDraft 的返回值，而非直接检查 mockStore 大小。
 */

const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => { mockStore[key] = value; },
  removeItem: (key: string) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
};
vi.stubGlobal('localStorage', mockLocalStorage);
vi.stubGlobal('sessionStorage', mockLocalStorage);

function draftOf(over: Partial<ResearchSession> = {}): ResearchSession {
  return { ...createInitialSession('5-7'), status: 'EXPLORE' as const, topicId: 'dino', ...over };
}

describe('researchDraft', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('saveDraft(force) → loadDraft 闭环，字段完整恢复', () => {
    const draft = draftOf({ exploreActions: 4, exploreMs: 1200, knowledgeCard: null });
    saveDraft(draft, { force: true });
    const loaded = loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.status).toBe('EXPLORE');
    expect(loaded?.topicId).toBe('dino');
    expect(loaded?.exploreActions).toBe(4);
    expect(loaded?.exploreMs).toBe(1200);
  });

  it('版本不匹配 → 返回 null（结构升级后旧草稿直接丢弃）', () => {
    const oldDraft = draftOf();
    saveDraft({ ...oldDraft, version: DRAFT_VERSION - 1 }, { force: true });
    expect(loadDraft()).toBeNull();
  });

  it('超 TTL（24h）的草稿不恢复', () => {
    const stale = draftOf({ updatedAt: Date.now() - 25 * 60 * 60 * 1000 });
    saveDraft(stale, { force: true });
    expect(loadDraft()).toBeNull();
  });

  it('TTL 内的草稿正常恢复', () => {
    const fresh = draftOf({ updatedAt: Date.now() - 60 * 60 * 1000 });
    saveDraft(fresh, { force: true });
    expect(loadDraft()?.updatedAt).toBe(fresh.updatedAt);
  });

  it('节流：2s 内非 force 调用不写盘，force 可绕过', () => {
    // 第一次 force 写盘，确保有一个基准状态
    saveDraft(draftOf({ exploreActions: 4 }), { force: true });
    const firstLoad = loadDraft();
    expect(firstLoad).not.toBeNull();
    expect(firstLoad?.exploreActions).toBe(4);

    // 第二次非 force：2s 内被节流，内容不变
    const before = JSON.stringify(firstLoad);
    saveDraft(draftOf({ exploreActions: 99 }));
    const afterThrottle = loadDraft();
    expect(JSON.stringify(afterThrottle)).toBe(before);

    // 第三次 force：立即写盘，内容更新
    saveDraft(draftOf({ exploreActions: 99 }), { force: true });
    const afterForce = loadDraft();
    expect(afterForce?.exploreActions).toBe(99);
  });

  it('clearDraft 后 loadDraft 为 null', () => {
    saveDraft(draftOf(), { force: true });
    expect(loadDraft()).not.toBeNull();
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('无草稿时 loadDraft 返回 null（不抛错）', () => {
    expect(loadDraft()).toBeNull();
  });
});
