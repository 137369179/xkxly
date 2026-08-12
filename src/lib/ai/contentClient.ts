/**
 * AI 内容中心 · 客户端（P2-3）
 * ------------------------------------------------------------------
 * 调 Worker 的 /api/content/generate（生成并持久化）与 /api/content/list（浏览）。
 * 同源部署走相对路径；生成含 10s 本地冷却 + 错误降级提示。
 */
export type AiContentType = 'story' | 'riddle' | 'science' | 'explainer';

export interface AiContentItem {
  id: string;
  type: AiContentType;
  title: string;
  /** story 为段落文本；riddle/science 为条目数组 */
  content: string | string[];
  tags: string[];
  ageRange?: string;
  source?: string;
  createdAt: number;
}

const GENERATE_COOLDOWN_MS = 10_000;

let lastGenerateAt = 0;

/** 生成一条 AI 内容（服务端持久化到 KV）；hint 为主题上下文（explainer 用） */
export async function generateContent(
  type: AiContentType,
  ageRange?: string,
  hint?: string,
): Promise<{ ok: boolean; item?: AiContentItem; error?: string; cooldown?: number }> {
  const wait = lastGenerateAt + GENERATE_COOLDOWN_MS - Date.now();
  if (wait > 0) return { ok: false, cooldown: Math.ceil(wait / 1000), error: 'cooldown' };
  lastGenerateAt = Date.now();

  try {
    const res = await fetch('/api/content/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ageRange: ageRange ?? '7-8', hint }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        data?.error?.code === 'rate_limited'
          ? '生成太频繁啦，稍等一会儿再试试～'
          : data?.error?.message || '生成失败，请稍后重试';
      return { ok: false, error: msg };
    }
    if (!data?.ok || !data?.item) return { ok: false, error: '内容格式异常，请重试' };
    return { ok: true, item: data.item as AiContentItem };
  } catch {
    return { ok: false, error: '网络好像开小差了，检查一下再试试～' };
  }
}

/** 拉取已生成内容列表（type=all 取全部） */
export async function listContent(
  type: AiContentType | 'all',
  limit = 8,
): Promise<AiContentItem[]> {
  try {
    const res = await fetch(`/api/content/list?type=${type}&limit=${limit}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.items) return [];
    return (data.items as AiContentItem[]).filter((i) => i && i.id);
  } catch {
    return [];
  }
}
