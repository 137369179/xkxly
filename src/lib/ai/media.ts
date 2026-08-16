/**
 * AI 服务层 · 媒体生成客户端（图片 / 视频）
 * ------------------------------------------------------------------
 * Agnes Media 能力的前端出口：图片生成（同步）、视频生成（异步任务 + 轮询）。
 * 与 chat 客户端一样只走同源 BFF（/api/ai/*），密钥永不进前端 bundle。
 *
 * 端点协议（与 worker/index.mjs + server/index.mjs 一致）：
 *   POST /api/ai/image           文生图/图生图 → { ok, url, model }
 *   POST /api/ai/video           创建视频任务   → { ok, video_id, status, progress, seconds, size, model }
 *   GET  /api/ai/video/status?video_id=xxx  轮询 → { ok, status, progress, url, seconds, size, error }
 */
import type {
  AiError,
  ImageGenOptions,
  ImageGenResult,
  VideoGenOptions,
  VideoStatus,
  VideoTask,
} from './types';
import { PROXY_URL } from './config';

/** BFF 媒体端点基址：由 chat 代理地址推导（同源 /api/ai/...） */
const MEDIA_BASE = PROXY_URL.replace(/\/chat$/, '');

/** 图片生成超时（BFF 上游 120s，客户端留 10s 余量） */
const IMAGE_TIMEOUT_MS = 130_000;
/** 视频创建超时 */
const VIDEO_CREATE_TIMEOUT_MS = 35_000;
/** 视频状态轮询默认间隔 / 总超时 */
const VIDEO_POLL_INTERVAL_MS = 5_000;
const VIDEO_POLL_TIMEOUT_MS = 5 * 60_000;

/** 归一化 BFF 错误（与 chat 客户端 normalizeError 同构，媒体专用精简版） */
function normalizeMediaError(status: number, body: unknown): AiError {
  const raw = body as { error?: { code?: string; message?: string } } | undefined;
  const code = raw?.error?.code || '';
  const message = raw?.error?.message || '请求失败';
  if (status === 401) return { code: 'unauthorized', message: '密钥无效', retryable: false, status };
  if (status === 429) return { code: 'rate_limited', message: '生成太频繁，稍后再试', retryable: true, status };
  if (code === 'timeout') return { code: 'timeout', message, retryable: true, status };
  if (code === 'refused' || code === 'invalid_request' || code === 'bad_json' || code === 'payload_too_large') {
    return { code: 'invalid_request', message, retryable: false, status };
  }
  if (status >= 500) return { code: 'unknown', message, retryable: true, status };
  return { code: 'unknown', message, retryable: false, status };
}

/**
 * 生成图片（文生图 / 图生图）。BFF 同步代理 Agnes，返回最终图片 URL。
 * @returns 成功 {ok:true,url}；失败 {ok:false,error}
 */
export async function generateImage(opts: ImageGenOptions): Promise<ImageGenResult> {
  const started = Date.now();
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  opts.signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ac.abort(), IMAGE_TIMEOUT_MS);
  try {
    const resp = await fetch(`${MEDIA_BASE}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: opts.prompt,
        ...(opts.size ? { size: opts.size } : {}),
        ...(opts.ratio ? { ratio: opts.ratio } : {}),
        ...(opts.image && opts.image.length ? { image: opts.image } : {}),
      }),
      signal: ac.signal,
    });
    const body = await resp.json().catch(() => null);
    if (!resp.ok) {
      if (opts.signal?.aborted || ac.signal.aborted) {
        return { ok: false, error: { code: 'aborted', message: '已取消', retryable: false }, ms: Date.now() - started };
      }
      return { ok: false, error: normalizeMediaError(resp.status, body), ms: Date.now() - started };
    }
    if (!body?.ok || typeof body.url !== 'string') {
      return {
        ok: false,
        error: { code: 'bad_output', message: '图片生成返回异常', retryable: true },
        ms: Date.now() - started,
      };
    }
    return { ok: true, url: body.url, model: body.model, ms: Date.now() - started };
  } catch (e) {
    if (opts.signal?.aborted || ac.signal.aborted) {
      return { ok: false, error: { code: 'aborted', message: '已取消', retryable: false }, ms: Date.now() - started };
    }
    return {
      ok: false,
      error: { code: 'network_error', message: e instanceof Error ? e.message : '网络请求失败', retryable: true },
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * 创建视频生成任务（异步）。成功后需用 videoId 轮询 pollVideoStatus。
 */
export async function createVideo(opts: VideoGenOptions): Promise<VideoTask> {
  const started = Date.now();
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  opts.signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ac.abort(), VIDEO_CREATE_TIMEOUT_MS);
  try {
    const resp = await fetch(`${MEDIA_BASE}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: opts.prompt,
        ...(opts.image ? { image: opts.image } : {}),
        ...(opts.keyframes && opts.keyframes.length ? { keyframes: opts.keyframes } : {}),
        ...(opts.numFrames ? { num_frames: opts.numFrames } : {}),
        ...(opts.frameRate ? { frame_rate: opts.frameRate } : {}),
        ...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt } : {}),
        ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
      }),
      signal: ac.signal,
    });
    const body = await resp.json().catch(() => null);
    if (!resp.ok) {
      if (opts.signal?.aborted || ac.signal.aborted) {
        return { ok: false, error: { code: 'aborted', message: '已取消', retryable: false } };
      }
      return { ok: false, error: normalizeMediaError(resp.status, body), ms: Date.now() - started };
    }
    if (!body?.ok || typeof body.video_id !== 'string') {
      return {
        ok: false,
        error: { code: 'bad_output', message: '视频任务创建返回异常', retryable: true },
        ms: Date.now() - started,
      };
    }
    return {
      ok: true,
      videoId: body.video_id,
      status: body.status,
      progress: body.progress,
      seconds: body.seconds,
      size: body.size,
      model: body.model,
      ms: Date.now() - started,
    };
  } catch (e) {
    if (opts.signal?.aborted || ac.signal.aborted) {
      return { ok: false, error: { code: 'aborted', message: '已取消', retryable: false } };
    }
    return {
      ok: false,
      error: { code: 'network_error', message: e instanceof Error ? e.message : '网络请求失败', retryable: true },
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * 查询单次视频任务状态。
 */
export async function pollVideoStatus(videoId: string, signal?: AbortSignal): Promise<VideoStatus> {
  const started = Date.now();
  try {
    const resp = await fetch(
      `${MEDIA_BASE}/video/status?video_id=${encodeURIComponent(videoId)}`,
      { signal, headers: { Accept: 'application/json' } },
    );
    const body = await resp.json().catch(() => null);
    if (!resp.ok) {
      if (signal?.aborted) {
        return { ok: false, error: { code: 'aborted', message: '已取消', retryable: false } };
      }
      return { ok: false, error: normalizeMediaError(resp.status, body), ms: Date.now() - started };
    }
    return {
      ok: true,
      status: body?.status,
      progress: body?.progress,
      url: body?.url || undefined,
      seconds: body?.seconds,
      size: body?.size,
      ms: Date.now() - started,
    };
  } catch (e) {
    if (signal?.aborted) {
      return { ok: false, error: { code: 'aborted', message: '已取消', retryable: false } };
    }
    return {
      ok: false,
      error: { code: 'network_error', message: e instanceof Error ? e.message : '网络请求失败', retryable: true },
      ms: Date.now() - started,
    };
  }
}

/**
 * 便捷封装：创建视频任务并自动轮询到完成/失败。
 * @param onProgress 进度回调（progress 0-100 / 状态变化）
 * @returns 完成时 {ok:true,url}；超时/失败 {ok:false,error}
 */
export async function generateVideo(
  opts: VideoGenOptions,
  onProgress?: (s: { status: string; progress: number }) => void,
): Promise<{ ok: true; url: string; task: VideoTask } | { ok: false; error: AiError; task?: VideoTask }> {
  const task = await createVideo(opts);
  if (!task.ok || !task.videoId) {
    return { ok: false, error: task.error || { code: 'unknown', message: '创建任务失败', retryable: true }, task };
  }
  onProgress?.({ status: task.status || 'queued', progress: task.progress || 0 });

  const deadline = Date.now() + VIDEO_POLL_TIMEOUT_MS;
  for (;;) {
    if (opts.signal?.aborted) {
      return { ok: false, error: { code: 'aborted', message: '已取消', retryable: false }, task };
    }
    await new Promise((r) => setTimeout(r, VIDEO_POLL_INTERVAL_MS));
    const st = await pollVideoStatus(task.videoId, opts.signal);
    if (!st.ok) return { ok: false, error: st.error || { code: 'unknown', message: '查询失败', retryable: true }, task };
    onProgress?.({ status: st.status || 'unknown', progress: st.progress || 0 });
    if (st.status === 'completed' && st.url) {
      return { ok: true, url: st.url, task };
    }
    if (st.status === 'failed') {
      return {
        ok: false,
        error: { code: 'unknown', message: '视频生成失败，请稍后重试', retryable: true },
        task,
      };
    }
    if (Date.now() > deadline) {
      return { ok: false, error: { code: 'timeout', message: '视频生成超时', retryable: true }, task };
    }
  }
}
