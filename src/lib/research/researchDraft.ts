import { safeStorage } from '@/lib/safeStorage';
import { RESEARCH_SESSION_VERSION } from './sessionMachine';
import type { ResearchSession } from './types';

/**
 * 研究会话草稿持久化（ADR-004）
 * ------------------------------------------------------------
 * 易变态会话存 safeStorage 草稿命名空间，不进 Progress（C4 面积收敛到 3 字段）。
 * 全部读写经 safeStorage（safeGetJSON / safeSetJSON）→ 永不抛错（C7）；
 * Safari 隐私 / 家长管控 WebView 下自动回落内存态，绝不白屏。
 */

const DRAFT_KEY = 'research-session-draft';
export const DRAFT_VERSION = RESEARCH_SESSION_VERSION;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 超期草稿不恢复，避免「昨天的会话」突然弹出
const THROTTLE_MS = 2000; // 高频事件（EXPLORE_ACTION）不每次写盘

let lastWriteAt = 0;

/** 写草稿。默认按节流（≥2s）落盘；传 { force: true } 可绕过（测试/状态跃迁时用） */
export function saveDraft(session: ResearchSession, opts: { force?: boolean } = {}): void {
  const now = Date.now();
  if (!opts.force && now - lastWriteAt < THROTTLE_MS) return;
  lastWriteAt = now;
  safeStorage.setJSON(DRAFT_KEY, session); // safeSetJSON 内部吞掉 JSON.stringify 异常，绝不抛错
}

/** 读草稿：版本不符 / 超 TTL / 解析失败 / 不存在 → 返回 null（钩子层据此走 ENTER 新会话） */
export function loadDraft(): ResearchSession | null {
  const raw = safeStorage.getJSON<ResearchSession | null>(DRAFT_KEY, null);
  if (raw == null) return null;
  if (raw.version !== DRAFT_VERSION) return null;
  if (typeof raw.updatedAt !== 'number' || Date.now() - raw.updatedAt > DRAFT_TTL_MS) return null;
  return raw;
}

/** 清草稿（会话走到 COMPLETE 结算后调用） */
export function clearDraft(): void {
  safeStorage.removeItem(DRAFT_KEY);
}

/** 仅用于测试：重置节流计时器，防止跨用例污染 */
export function _resetThrottleForTest(): void {
  lastWriteAt = 0;
}
