/**
 * AI 任务层 · 公共类型
 * ------------------------------------------------------------------
 * 任务层负责把「业务上下文」翻译成「模型调用」，并为每一个 AI 点
 * 准备好本地兜底内容。UI 层只认这两种形态：
 *
 *   StreamTask   —— 需要边生成边展示的长文本（讲解、故事、周报）
 *   TaskResult   —— 需要结构化数据的一次性调用（出题、批改、排课）
 *
 * 任何一个 AI 点都必须有 fallback，AI 挂了产品照样能用。
 */
import type { AiError, AiMessage, AiScene } from '../types';

/** 流式任务描述：交给 <AiPanel> / useAiStream 执行 */
export interface StreamTask {
  scene: AiScene;
  messages: AiMessage[];
  /** 命中则直接读本地缓存，不发请求（同一道题重复问不重复等） */
  cacheKey?: string;
  /** 缓存有效期（毫秒），默认 7 天 */
  cacheTtl?: number;
  /** AI 不可用时展示的本地内容，必填 —— 没有兜底就不该上 AI */
  fallback: string;
  /** 面板标题，例：小智讲一讲 */
  title: string;
  /** 面板上的提示语，例：正在想怎么讲给你听… */
  hint?: string;
}

/** 结构化任务结果 */
export interface TaskResult<T> {
  ok: boolean;
  data: T;
  /** true 表示这份数据来自本地规则兜底，不是 AI 生成 */
  fallback: boolean;
  error?: AiError;
  /** 耗时，仅用于家长中心展示 */
  ms?: number;
}

export function sys(content: string): AiMessage {
  return { role: 'system', content };
}

/** 从一组候选里挑一个（本地兜底常用） */
export function pick<T>(arr: readonly T[], seed = Date.now()): T {
  return arr[Math.abs(seed) % arr.length]!;
}
