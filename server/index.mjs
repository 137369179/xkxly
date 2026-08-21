/**
 * 宝贝学习乐园 · AI BFF 代理（加固版）
 * ============================================================
 * 职责：
 *   1. 唯一持有 AGNES_API_KEY，前端 bundle 永不接触密钥
 *   2. 透传 Chat Completions（含 SSE 流式），保持 OpenAI 兼容语义
 *   3. 全局并发限流 + 每 IP 限流（自我保护，避免连点触发上游风控）
 *   4. 结构化调用日志（scene / model / 耗时 / token 分解 / 错误码）
 *   5. 生产模式下同时托管 dist 静态资源 —— 部署只需一个进程
 *
 * 零第三方依赖，仅用 Node 内置模块。
 * 启动：node server/index.mjs
 *
 * 本轮加固项：
 *   - createReadStream 错误兜底，避免静态文件读取异常拖垮进程
 *   - 进程级 uncaughtException / unhandledRejection 兜底 + 优雅关闭
 *   - SSE 透传做背压（drain）处理，客户端慢/断连不再撑爆内存
 *   - 正常结束时补 [DONE] 终止帧
 *   - 静态目录穿越校验加固（剥离前导斜杠 + 强制 DIST 前缀）
 *   - MIME 类型补全（mjs/woff/wasm/webp/mp3/mp4/webmanifest 等）
 *   - 每 IP 限流（默认 30 次/分钟，可配），带定时清理防内存泄漏
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveModel,
  validateMessages,
  buildUpstreamBody,
  guardMessages,
  redactPII,
  redactSSEChunk,
  buildImageBody,
  buildVideoBody,
  validateVideoId,
  parseImageResponse,
  normalizeVideoStatus,
  IMAGE_MODEL,
  VIDEO_MODEL,
  CHILD_SAFETY_PROMPT,
  INJECTION_PATTERNS,
  SECURITY_HEADERS,
  defaultMediaLimit,
} from '../shared/aiProxyCore.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/* 环境变量：手写 .env 解析，避免引入 dotenv                            */
/* ------------------------------------------------------------------ */
function loadEnv() {
  // .env.local 是本项目的显式配置，优先级高于宿主机环境变量
  // （否则外部同名变量会静默劫持上游地址与密钥，排查起来很隐蔽）
  for (const [file, override] of [
    ['.env', false],
    ['.env.local', true],
  ]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (override || !(k in process.env)) process.env[k] = v;
    }
  }
}
loadEnv();

const API_KEY = process.env.AGNES_API_KEY || '';
const BASE_URL = (process.env.AGNES_BASE_URL || 'https://api.agnes-ai.cn/v1').replace(/\/$/, '');
const STEPFUN_API_KEY = process.env.STEPFUN_API_KEY || '';
const STEPFUN_BASE_URL = (process.env.STEPFUN_BASE_URL || 'https://api.stepfun.com/v1').replace(/\/$/, '');
// 密钥一律从环境变量读取，绝不硬编码兜底（避免密钥意外提交到仓库 / 被任意网站盗用）。
// 未配置时对应模型在候选列表里自然失败（上游 401），不影响其它模型与整体服务。
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const XUNFEI_MAAS_API_KEY = process.env.XUNFEI_MAAS_API_KEY || '';
const XUNFEI_MAAS_BASE_URL = (process.env.XUNFEI_MAAS_BASE_URL || 'https://maas-api.cn-huabei-1.xf-yun.com/v2').replace(/\/$/, '');

// 儿童适龄系统护栏与安全响应头已上收 shared/aiProxyCore.mjs（P0-2），
// 双端（server/worker）import 同一来源，杜绝护栏/CSP/限流默认值再次分叉。

const PORT = Number(process.env.AI_PROXY_PORT || 8787);
const MAX_CONCURRENCY = Number(process.env.AI_MAX_CONCURRENCY || 10);
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 90000);
// 媒体端点专用超时：图片同步生成可能数十秒（文档建议 60–360s）
const IMAGE_TIMEOUT_MS = Number(process.env.AI_IMAGE_TIMEOUT_MS || 120000);
const VIDEO_TIMEOUT_MS = Number(process.env.AI_VIDEO_TIMEOUT_MS || 30000);
const RATE_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_MIN || 30);
const DIST = path.resolve(ROOT, 'dist');
const DIST_SEP = DIST + path.sep;
// 仅允许预设模型，避免客户端透传高价/未授权模型造成费用滥用
const ALLOWED_MODELS = ['step-3.7-flash', 'step-3.5-flash', 'xopqwen36v35b', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner', 'agnes-2.5-flash', 'agnes-2.0-flash', 'agnes-2.5-pro', 'agnes-2.5-pro-alpha'];
/** 错误日志目录 */
const LOG_DIR = path.resolve(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'error.log');
const AI_LOG_FILE = path.join(LOG_DIR, 'ai.log'); // AI 调用记录持久化（P1-审计）
/** 单日志文件最大 2MB，超过后轮转 */
const LOG_MAX_SIZE = 2 * 1024 * 1024;

// CORS 白名单（逗号分隔）；留空 / '*' 保持放开。仅浏览器跨域场景生效。
const ALLOW_ORIGIN = (process.env.AI_ALLOW_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
// 是否提供静态文件服务；线上已有独立静态托管时可设 0，BFF 只留 API
const SERVE_STATIC = String(process.env.AI_SERVE_STATIC ?? '1') !== '0';

if (!API_KEY && !STEPFUN_API_KEY) {
  console.error('[ai-proxy] 缺少 AGNES_API_KEY / STEPFUN_API_KEY，请在 .env.local 中配置');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 并发闸门：超过上限的请求排队，避免连点触发上游风控                    */
/* ------------------------------------------------------------------ */
let running = 0;
const waiting = [];

function acquire() {
  if (running < MAX_CONCURRENCY) {
    running++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}
function release() {
  const next = waiting.shift();
  if (next) next();
  else running = Math.max(0, running - 1);
}

/* ------------------------------------------------------------------ */
/* 调用日志：环形缓冲，最近 200 条，供家长中心查看                       */
/* ------------------------------------------------------------------ */
const LOG_CAP = 200;
const logs = [];
function pushLog(entry) {
  logs.push(entry);
  if (logs.length > LOG_CAP) logs.shift();
  appendAiLog(entry); // 调用记录持久化落盘
  const { scene, model, ms, ok, errCode, textTokens, reasoningTokens } = entry;
  console.log(
    `[ai] ${ok ? '✓' : '✗'} ${scene} ${model} ${ms}ms` +
      (textTokens != null ? ` tok(text=${textTokens},reason=${reasoningTokens})` : '') +
      (errCode ? ` err=${errCode}` : ''),
  );
}

/* ------------------------------------------------------------------ */
/* 错误日志落盘：前端 /api/log 上报到此，追加写入 logs/error.log        */
/* 超过 2MB 自动轮转为 error.log.1，防止磁盘被日志撑满                   */
/* ------------------------------------------------------------------ */
function appendErrorLog(record) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    // 轮转：文件超过上限时重命名为 .1
    if (fs.existsSync(LOG_FILE)) {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size > LOG_MAX_SIZE) {
        fs.renameSync(LOG_FILE, LOG_FILE + '.1');
      }
    }
    fs.appendFileSync(LOG_FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (e) {
    // 日志写入失败不能影响主流程
    console.error('[ai-proxy] log write failed:', e?.message || e);
  }
}

/** AI 调用记录落盘：追加写入 logs/ai.log，超过上限轮转为 ai.log.1（跨重启持久化） */
function appendAiLog(record) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    if (fs.existsSync(AI_LOG_FILE)) {
      const stat = fs.statSync(AI_LOG_FILE);
      if (stat.size > LOG_MAX_SIZE) fs.renameSync(AI_LOG_FILE, AI_LOG_FILE + '.1');
    }
    fs.appendFileSync(AI_LOG_FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (e) {
    console.error('[ai-proxy] ai log write failed:', e?.message || e);
  }
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Security headers for children's app —— 统一来自 shared/aiProxyCore.mjs（P0-2），
// CSP 取 worker 生产档超集（含 Kokoro 神经 TTS 所需 wasm-unsafe-eval 等）。

/**
 * 按请求计算 CORS 头。
 * AI_ALLOW_ORIGIN 未配 / 为 '*' 时保持原样放开；
 * 配置白名单后：白名单内的 Origin 回显；白名单外的浏览器跨域请求不返回 allow-origin（被浏览器拦截）；
 * 无 Origin 的非浏览器调用（curl / 服务端）不受 CORS 限制，正常放行。
 */
function corsFor(req, strict = false) {
  if (ALLOW_ORIGIN.length === 0 || (ALLOW_ORIGIN.length === 1 && ALLOW_ORIGIN[0] === '*')) {
    // 未配置具体域名时：严格接口（AI）绝不回显 '*'，防任意网站盗刷付费密钥；
    // 直接不返回 allow-origin（同域请求不受影响，浏览器仅拦截跨域）。
    if (strict) {
      const h = { ...CORS };
      delete h['Access-Control-Allow-Origin'];
      return h;
    }
    return CORS;
  }
  const origin = req.headers.origin;
  if (!origin) return CORS;
  if (ALLOW_ORIGIN.includes(origin)) return { ...CORS, 'Access-Control-Allow-Origin': origin };
  const h = { ...CORS };
  delete h['Access-Control-Allow-Origin'];
  return h;
}

function sendJson(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    ...SECURITY_HEADERS,
    ...(res.corsHeaders || CORS),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * 深度脱敏：递归对对象/数组里的字符串套 redactPII。
 * 替代原先「stringify → redactPII → parse → 再 stringify」的双重序列化，
 * 行为等价（只脱敏字符串值），但大响应体只序列化一次。
 */
function redactDeep(v) {
  if (typeof v === 'string') return redactPII(v);
  if (Array.isArray(v)) return v.map(redactDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = redactDeep(val);
    return out;
  }
  return v;
}

/** 安全结束响应：已结束/已销毁时静默跳过，避免二次 end 抛错 */
function safeEnd(res) {
  try {
    if (!res.writableEnded && !res.destroyed) res.end();
  } catch {
    /* noop */
  }
}

function readBody(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/* ------------------------------------------------------------------ */
/* 每 IP 限流：滑动窗口，默认 30 次/分钟                                */
/* ------------------------------------------------------------------ */
const rateBuckets = new Map(); // ip -> number[]（请求时间戳）

// 信任边界：x-forwarded-for 是客户端可任意伪造的普通请求头，默认**不信任**，
// 否则每次请求换一个假 XFF 即可绕过每 IP 限流（等于限流形同虚设）。
// 仅当本进程确实跑在自己可信的反代（Nginx / Cloudflare 等，且反代会重写 XFF）之后，
// 才设 AI_TRUST_PROXY=1 取首值；直连暴露时切勿开启。
const TRUST_PROXY = String(process.env.AI_TRUST_PROXY ?? '0') === '1';

function ipOf(req) {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  }
  // 默认取 TCP 层对端地址：伪造 header 无法影响，限流始终生效
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (rateBuckets.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  rateBuckets.set(ip, arr);
  return arr.length > RATE_LIMIT;
}

/* 媒体端点独立限流桶（与生产 Worker 的 image/video/videopoll 分桶行为一致）：
 * 图片免费档实测 ≈20RPM、视频 ≈1RPM，不能与聊天共享 30/min 配额，
 * 否则一个孩子连点图片就能把视频/聊天配额挤爆。 */
const mediaRateBuckets = new Map(); // `${bucket}:${ip}` -> number[]

function mediaRateLimited(ip, bucket, limit) {
  const now = Date.now();
  const key = `${bucket}:${ip}`;
  const arr = (mediaRateBuckets.get(key) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  mediaRateBuckets.set(key, arr);
  return arr.length > limit;
}

const MEDIA_RATE_LIMITS = {
  image: Number(process.env.AI_IMAGE_RATE_LIMIT_PER_MIN || defaultMediaLimit('image')),
  // 实测上游视频免费档 RPM=1（多次 429），本地桶必须 ≤1，否则两个用户同时请求就被上游打回
  video: Number(process.env.AI_VIDEO_RATE_LIMIT_PER_MIN || defaultMediaLimit('video')),
  videopoll: Number(process.env.AI_VIDEO_POLL_RATE_LIMIT_PER_MIN || defaultMediaLimit('videopoll')),
};

// 定时清理过期桶，避免内存随请求量无限增长
const purgeTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of rateBuckets) {
    const kept = arr.filter((t) => now - t < 60_000);
    if (kept.length) rateBuckets.set(ip, kept);
    else rateBuckets.delete(ip);
  }
  for (const [key, arr] of mediaRateBuckets) {
    const kept = arr.filter((t) => now - t < 60_000);
    if (kept.length) mediaRateBuckets.set(key, kept);
    else mediaRateBuckets.delete(key);
  }
}, 5 * 60_000);
if (typeof purgeTimer.unref === 'function') purgeTimer.unref();

/* ------------------------------------------------------------------ */
/* 核心：/api/ai/chat —— 透传 Chat Completions                          */
/* ------------------------------------------------------------------ */
async function handleChat(req, res) {
  const started = Date.now();
  let payload;
  try {
    payload = JSON.parse(await readBody(req, 64 * 1024));
  } catch {
    return sendJson(res, 400, { error: { code: 'bad_json', message: '请求体不是合法 JSON' } });
  }

  // 限流：在 acquire 之前判定，避免限流请求也占用并发闸门
  if (rateLimited(ipOf(req))) {
    return sendJson(res, 429, { error: { code: 'rate_limited', message: '请求太频繁，稍后再试' } });
  }

  const scene = String(payload.scene || 'unknown');
  const stream = payload.stream !== false;
  // 模型白名单解析（同构核心，防高价模型盗用）：回落默认→内置默认
  const model = resolveModel(payload.model, process.env.VITE_AI_DEFAULT_MODEL, ALLOWED_MODELS);

  // messages 结构校验（同构核心，防越界/非法 role/超长）
  const vmsg = validateMessages(payload.messages);
  if (!vmsg.ok) {
    return sendJson(res, 400, { error: { code: vmsg.code, message: vmsg.message } });
  }

  // 儿童安全护栏（与 Worker 共用 shared.guardMessages）：丢弃客户端 system、注入拦截、前置安全提示。
  // 此前 dev 模式的 /api/ai/chat 漏做护栏，本端补齐，确保本地与生产行为一致。
  const guarded = guardMessages(payload.messages, CHILD_SAFETY_PROMPT, INJECTION_PATTERNS);
  if (!guarded.ok) {
    return sendJson(res, 400, {
      error: { code: 'refused', message: '这个问题我不太方便回答，我们换个学习内容吧～' },
    });
  }
  let messages = guarded.messages;

  // 模型族判定：唯一定义在此处，下面选供应商候选时直接复用（避免重复声明后两处漂移）
  const isStep = model.startsWith('step');
  const isXunfei = model.startsWith('xop') || model.includes('qwen');
  const isDeepSeek = model.startsWith('deepseek');

  // DeepSeek 校验强化：当指定 response_format 为 json_object 时，prompt 内必须包含 "json" 单词
  if (isDeepSeek && payload.response_format?.type === 'json_object') {
    const hasJsonWord = messages.some((m) => typeof m.content === 'string' && /json/i.test(m.content));
    if (!hasJsonWord) {
      messages = messages.map((m, i) =>
        i === messages.length - 1 ? { ...m, content: m.content + '\n\n请输出 JSON 格式。' } : m,
      );
    }
  }

  const upstreamBody = buildUpstreamBody(payload, model, { messages });

  await acquire();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  // 客户端提前断开（孩子切页面）时同步中止上游，别浪费额度
  req.on('close', () => ac.abort());
  req.on('error', () => ac.abort());
  // res 异常（如客户端 EPIPE）不要变成未捕获异常，转为中止上游
  res.on('error', () => {
    try {
      ac.abort();
    } catch {
      /* noop */
    }
  });

  try {
    const candidateConfigs = isStep
      ? [{ url: STEPFUN_BASE_URL, key: STEPFUN_API_KEY }]
      : isXunfei
      ? [{ url: XUNFEI_MAAS_BASE_URL, key: XUNFEI_MAAS_API_KEY }]
      : isDeepSeek
      ? [{ url: DEEPSEEK_BASE_URL, key: DEEPSEEK_API_KEY }]
      : [...new Set([BASE_URL, 'https://api.agnes-ai.cn/v1', 'https://apihub.agnes-ai.cn/v1'])].map((url) => ({ url, key: API_KEY }));

    let upstream = null;
    let lastErrorParsed = null;
    let lastStatus = 500;

    for (const { url, key } of candidateConfigs) {
      try {
        const targetUrl = url.endsWith('/chat/completions') ? url : `${url}/chat/completions`;
        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Accept: stream ? 'text/event-stream' : 'application/json',
          },
          body: JSON.stringify(upstreamBody),
          signal: ac.signal,
        });

        if (resp.ok) {
          upstream = resp;
          break;
        } else {
          lastStatus = resp.status;
          const text = await resp.text();
          try {
            lastErrorParsed = JSON.parse(text);
          } catch {
            lastErrorParsed = { error: { code: 'upstream_error', message: text.slice(0, 300) } };
          }
        }
      } catch (err) {
        lastErrorParsed = { error: { code: 'network_error', message: err?.message || '网络连接失败' } };
      }
    }

    if (!upstream) {
      pushLog({
        at: Date.now(),
        scene,
        model,
        ms: Date.now() - started,
        ok: false,
        status: lastStatus,
        errCode: lastErrorParsed?.error?.code || String(lastStatus),
      });
      return sendJson(res, lastStatus, lastErrorParsed || { error: { code: 'upstream_error', message: 'AI 上游接口呼叫失败' } });
    }

    /* ---------- 非流式 ---------- */
    if (!stream) {
      const data = await upstream.json();
      const u = data?.usage;
      pushLog({
        at: Date.now(),
        scene,
        model,
        ms: Date.now() - started,
        ok: true,
        status: 200,
        textTokens: u?.completion_tokens_details?.text_tokens ?? null,
        reasoningTokens: u?.completion_tokens_details?.reasoning_tokens ?? null,
      });
      // 返回前脱敏（屏蔽可能泄露的儿童手机号/外部链接），与 Worker 行为一致；
      // 直接对对象做深度脱敏，sendJson 内再统一序列化一次即可
      return sendJson(res, 200, redactDeep(data));
    }

    /* ---------- 流式 SSE 透传 ---------- */
    res.writeHead(200, {
      ...(res.corsHeaders || CORS),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let tail = '';
    let usage = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        // 上游正常结束：补一个 [DONE] 终止帧（前端据此收尾，重复无害）
        if (!/\[DONE\]/.test(tail)) res.write('\n\ndata: [DONE]\n\n');
        break;
      }
      const text = decoder.decode(value, { stream: true });

      // 流式脱敏：逐 chunk 屏蔽儿童隐私/外部联系方式（与 Worker 行为一致）
      const safeText = redactSSEChunk(text);

      // 背压处理：客户端慢/断连时等待 drain（或 close）再继续，避免内存被缓冲撑爆
      if (!res.destroyed && !res.writableEnded) {
        const ok = res.write(safeText);
        if (!ok) {
          await new Promise((resolve) => {
            const onDrain = () => {
              cleanup();
              resolve();
            };
            const onClose = () => {
              cleanup();
              resolve();
            };
            const cleanup = () => {
              res.removeListener('drain', onDrain);
              res.removeListener('close', onClose);
            };
            res.once('drain', onDrain);
            res.once('close', onClose);
          });
        }
      }

      // 顺带嗅探 usage（最后一个数据帧携带），仅用于日志，不影响透传
      tail = (tail + text).slice(-4000);
      const idx = tail.lastIndexOf('"usage"');
      if (idx >= 0) {
        for (const line of tail.split('\n')) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const j = JSON.parse(line.slice(6));
            if (j.usage) usage = j.usage;
          } catch {
            /* 半包，忽略 */
          }
        }
      }
    }
    safeEnd(res);

    pushLog({
      at: Date.now(),
      scene,
      model,
      ms: Date.now() - started,
      ok: true,
      status: 200,
      textTokens: usage?.completion_tokens_details?.text_tokens ?? null,
      reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? null,
    });
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    pushLog({
      at: Date.now(),
      scene,
      model,
      ms: Date.now() - started,
      ok: false,
      status: 0,
      errCode: aborted ? 'timeout' : 'network_error',
    });
    if (!res.headersSent) {
      sendJson(res, aborted ? 504 : 502, {
        error: {
          code: aborted ? 'timeout' : 'network_error',
          message: aborted ? '上游响应超时' : '无法连接上游服务',
        },
      });
    } else {
      safeEnd(res);
    }
  } finally {
    clearTimeout(timer);
    release();
  }
}

/* ======================================================================
 * Agnes 媒体生成（图片 / 视频）——与生产 Worker 行为一致（共享逻辑 aiProxyCore.mjs）
 * ====================================================================== */

/** 媒体端点通用前置：密钥预检 + 独立限流桶 */
function mediaGate(req, res, bucket) {
  if (!API_KEY) {
    return sendJson(res, 500, {
      error: { code: 'no_key', message: '服务端未配置 AGNES_API_KEY（.env.local）' },
    });
  }
  const limit = MEDIA_RATE_LIMITS[bucket] || 10;
  if (mediaRateLimited(ipOf(req), bucket, limit)) {
    return sendJson(res, 429, { error: { code: 'rate_limited', message: '生成太频繁，稍后再试' } });
  }
  return null;
}

/** 上游请求统一封装：AbortController + 超时 + 客户端断开中止 + 错误分类 */
async function upstreamFetch(url, options, timeoutMs, started, scene, model, req, res) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  req.on('close', () => ac.abort());
  req.on('error', () => ac.abort());
  res.on('error', () => {
    try {
      ac.abort();
    } catch {
      /* noop */
    }
  });
  try {
    const resp = await fetch(url, { ...options, signal: ac.signal });
    if (resp.ok) return { resp };
    const text = await resp.text();
    return {
      err: {
        status: resp.status,
        body: (() => {
          try {
            return JSON.parse(text);
          } catch {
            return { error: { code: 'upstream_error', message: text.slice(0, 300) } };
          }
        })(),
      },
    };
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    pushLog({
      at: Date.now(), scene, model, ms: Date.now() - started, ok: false,
      status: 0, errCode: aborted ? 'timeout' : 'network_error',
    });
    return { abort: aborted };
  } finally {
    clearTimeout(timer);
  }
}

async function handleImage(req, res) {
  const started = Date.now();
  const gate = mediaGate(req, res, 'image');
  if (gate) return;
  let payload;
  try {
    payload = JSON.parse(await readBody(req, 9 * 1024 * 1024)); // 图生图可能带 Data URI
  } catch {
    return sendJson(res, 400, { error: { code: 'bad_json', message: '请求体不是合法 JSON 或过大' } });
  }
  const built = buildImageBody(payload);
  if (!built.ok) {
    return sendJson(res, built.code === 'refused' ? 400 : 400, { error: { code: built.code, message: built.message } });
  }
  await acquire();
  const r = await upstreamFetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(built.body),
  }, IMAGE_TIMEOUT_MS, started, 'image', IMAGE_MODEL, req, res);
  release();

  if (r.abort) return sendJson(res, 504, { error: { code: 'timeout', message: '图片生成超时' } });
  if (r.err) {
    pushLog({ at: Date.now(), scene: 'image', model: IMAGE_MODEL, ms: Date.now() - started, ok: false, status: r.err.status, errCode: r.err.body?.error?.code || String(r.err.status) });
    // 上游 429（实测视频免费档 1RPM）→ 透传 rate_limited，客户端可给出"稍等再试"提示
    if (r.err.status === 429) {
      return sendJson(res, 429, { error: { code: 'rate_limited', message: '生成太频繁，请稍等一分钟再试' } });
    }
    return sendJson(res, r.err.status >= 500 ? 502 : 400, r.err.body || { error: { code: 'upstream_error' } });
  }
  const parsed = parseImageResponse(await r.resp.json());
  if (!parsed.ok) {
    pushLog({ at: Date.now(), scene: 'image', model: IMAGE_MODEL, ms: Date.now() - started, ok: false, status: 502, errCode: 'parse_failed' });
    return sendJson(res, 502, { error: { code: 'parse_failed', message: '图片生成返回异常' } });
  }
  pushLog({ at: Date.now(), scene: 'image', model: IMAGE_MODEL, ms: Date.now() - started, ok: true, status: 200 });
  return sendJson(res, 200, { ok: true, url: parsed.url, created: parsed.created, model: IMAGE_MODEL });
}

async function handleVideoCreate(req, res) {
  const started = Date.now();
  const gate = mediaGate(req, res, 'video');
  if (gate) return;
  let payload;
  try {
    payload = JSON.parse(await readBody(req, 9 * 1024 * 1024));
  } catch {
    return sendJson(res, 400, { error: { code: 'bad_json', message: '请求体不是合法 JSON 或过大' } });
  }
  const built = buildVideoBody(payload);
  if (!built.ok) {
    return sendJson(res, 400, { error: { code: built.code, message: built.message } });
  }
  await acquire();
  const r = await upstreamFetch(`${BASE_URL}/videos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(built.body),
  }, VIDEO_TIMEOUT_MS, started, 'video', VIDEO_MODEL, req, res);
  release();

  if (r.abort) return sendJson(res, 504, { error: { code: 'timeout', message: '视频任务创建超时' } });
  if (r.err) {
    pushLog({ at: Date.now(), scene: 'video', model: VIDEO_MODEL, ms: Date.now() - started, ok: false, status: r.err.status, errCode: r.err.body?.error?.code || String(r.err.status) });
    if (r.err.status === 429) {
      return sendJson(res, 429, { error: { code: 'rate_limited', message: '生成太频繁，请稍等一分钟再试' } });
    }
    return sendJson(res, r.err.status >= 500 ? 502 : 400, r.err.body || { error: { code: 'upstream_error' } });
  }
  const data = await r.resp.json();
  const videoId = data?.video_id || data?.task_id || data?.id;
  if (!videoId) {
    pushLog({ at: Date.now(), scene: 'video', model: VIDEO_MODEL, ms: Date.now() - started, ok: false, status: 502, errCode: 'parse_failed' });
    return sendJson(res, 502, { error: { code: 'parse_failed', message: '视频任务创建返回异常' } });
  }
  pushLog({ at: Date.now(), scene: 'video', model: VIDEO_MODEL, ms: Date.now() - started, ok: true, status: 200 });
  return sendJson(res, 200, {
    ok: true,
    video_id: videoId,
    status: data?.status || 'queued',
    progress: Number(data?.progress) || 0,
    seconds: data?.seconds,
    size: data?.size,
    model: VIDEO_MODEL,
  });
}

async function handleVideoStatus(req, res) {
  const started = Date.now();
  const gate = mediaGate(req, res, 'videopoll');
  if (gate) return;
  const u = new URL(req.url, 'http://localhost');
  const v = validateVideoId(u.searchParams.get('video_id'));
  if (!v.ok) {
    return sendJson(res, 400, { error: { code: 'invalid_request', message: 'video_id 缺失或非法' } });
  }
  await acquire();
  // ⚠️ 实测：轮询端点是根路径 /agnesapi（不在 /v1 下）；完成时 URL 在顶层 url 字段
  const origin = new URL(BASE_URL).origin;
  const r = await upstreamFetch(`${origin}/agnesapi?video_id=${encodeURIComponent(v.id)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${API_KEY}` },
  }, VIDEO_TIMEOUT_MS, started, 'videopoll', VIDEO_MODEL, req, res);
  release();

  if (r.abort) return sendJson(res, 504, { error: { code: 'timeout', message: '视频状态查询超时' } });
  if (r.err) {
    pushLog({ at: Date.now(), scene: 'videopoll', model: VIDEO_MODEL, ms: Date.now() - started, ok: false, status: r.err.status, errCode: r.err.body?.error?.code || String(r.err.status) });
    if (r.err.status === 429) {
      return sendJson(res, 429, { error: { code: 'rate_limited', message: '查询太频繁，请稍后再试' } });
    }
    return sendJson(res, r.err.status >= 500 ? 502 : 400, r.err.body || { error: { code: 'upstream_error' } });
  }
  const s = normalizeVideoStatus(await r.resp.json());
  pushLog({ at: Date.now(), scene: 'videopoll', model: VIDEO_MODEL, ms: Date.now() - started, ok: true, status: 200 });
  return sendJson(res, 200, {
    ok: true,
    status: s.status,
    progress: s.progress,
    url: s.url || null,
    seconds: s.seconds,
    size: s.size,
    error: s.error || null,
  });
}

/* ======================================================================
 * P0-3 AI 内容中心（与 Worker 对齐）：/api/content/generate|list
 * 此前仅 Worker 实现，本地 dev 的 /api/content/* 落到 vite dev server 返回 HTML，
 * 内容中心静默降级为「生成失败」。此处补全 Node 端实现：
 *   - 生成逻辑与 worker 一致：Agnes agnes-2.5-flash + json_object + 内容黑名单
 *   - 持久化：Node 无 KV，改用本地 JSON 文件（90 天 TTL，与 worker expirationTtl 对齐）
 *   - 独立限流桶 'content'，不共享聊天配额
 * ==================================================================== */
const CONTENT_TYPES = ['story', 'riddle', 'science', 'explainer'];

/** 生成内容二次过滤：命中即拒（AI 输出兜底，防模型偶发越界） */
const CONTENT_BLOCKLIST = [
  /(杀人|自杀|自残|吸毒|毒品|赌博|色情|暴力血腥|恐怖袭击|持枪|炸弹)/,
];

/** 各类型的生成指令（要求严格 JSON 输出）——与 worker/index.mjs 保持一致 */
const CONTENT_PROMPTS = {
  story: `请写一篇 3-8 岁儿童睡前小故事，150-250 字，情节温暖有趣、结局美好，主角用动物或小朋友。
严格输出 JSON（不要任何多余文字）：{"title":"故事标题","content":"正文（用\\n分段）","tags":["2个标签"]}`,
  riddle: `请出 3 条适合 3-8 岁儿童的趣味谜语，谜面朗朗上口、答案常见（动物/水果/物品）。
严格输出 JSON（不要任何多余文字）：{"title":"谜语主题","content":["谜面1（答案：XXX）","谜面2（答案：XXX）","谜面3（答案：XXX）"],"tags":["2个标签"]}`,
  science: `请讲 3 条适合 3-8 岁儿童的趣味科普小知识（自然/动物/天气），每条 30-50 字，简单易懂。
严格输出 JSON（不要任何多余文字）：{"title":"科普主题","content":["知识1","知识2","知识3"],"tags":["2个标签"]}`,
  explainer: `请针对给定研究主题，为 3-8 岁儿童讲 3 条核心知识点 + 1 个引发好奇的延伸小问题，每条 30-50 字，用孩子听得懂的话、可配合日常观察。
严格输出 JSON（不要任何多余文字）：{"title":"主题讲解","content":["知识点1","知识点2","知识点3","延伸小问题：……？"],"tags":["2个标签"]}`,
};

/** 从 LLM 输出中稳健提取 JSON（容忍 markdown 围栏与首尾噪音） */
function extractJson(raw) {
  const text = String(raw || '');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** 内容持久化：本地 JSON 文件（Node 端替代 Worker KV），90 天 TTL */
const CONTENT_STORE = path.join(ROOT, '.content-kv.json');

function contentStoreRead() {
  try {
    if (!fs.existsSync(CONTENT_STORE)) return [];
    const items = JSON.parse(fs.readFileSync(CONTENT_STORE, 'utf8'));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function contentStoreWrite(items) {
  try {
    fs.writeFileSync(CONTENT_STORE, JSON.stringify(items), 'utf8');
  } catch {
    /* 持久化失败不影响本次响应 */
  }
}

async function handleContentGenerate(req, res) {
  const started = Date.now();
  if (!API_KEY) {
    return sendJson(res, 500, { error: { code: 'no_key', message: '服务端未配置 AGNES_API_KEY（.env.local）' } });
  }
  // 独立限流桶 'content'（与 worker 一致，不共享聊天配额）
  if (mediaRateLimited(ipOf(req), 'content', RATE_LIMIT)) {
    return sendJson(res, 429, { error: { code: 'rate_limited', message: '生成太频繁，稍后再试' } });
  }
  let payload;
  try {
    payload = JSON.parse(await readBody(req, 64 * 1024));
  } catch {
    return sendJson(res, 400, { error: { code: 'bad_json', message: '请求体不是合法 JSON' } });
  }
  const type = payload.type;
  if (!CONTENT_TYPES.includes(type)) {
    return sendJson(res, 400, { error: { code: 'bad_type', message: '仅支持 story/riddle/science/explainer' } });
  }
  const hint = typeof payload.hint === 'string' ? payload.hint.trim().slice(0, 80) : '';
  const userPrompt = hint ? `${CONTENT_PROMPTS[type]}\n本次研究主题：${hint}` : CONTENT_PROMPTS[type];

  const messages = [
    { role: 'system', content: CHILD_SAFETY_PROMPT },
    { role: 'user', content: userPrompt },
  ];
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'agnes-2.5-flash',
        messages,
        temperature: 0.9,
        max_tokens: 1600,
        stream: false,
        response_format: { type: 'json_object' },
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: ac.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    pushLog({ at: Date.now(), scene: 'content', model: 'agnes-2.5-flash', ms: Date.now() - started, ok: false, status: 0, errCode: err?.name === 'AbortError' ? 'timeout' : 'network_error' });
    return sendJson(res, err?.name === 'AbortError' ? 504 : 502, { error: { code: err?.name === 'AbortError' ? 'timeout' : 'upstream_error' } });
  }
  clearTimeout(timer);
  if (!upstream.ok) {
    pushLog({ at: Date.now(), scene: 'content', model: 'agnes-2.5-flash', ms: Date.now() - started, ok: false, status: upstream.status, errCode: 'upstream' });
    return sendJson(res, 502, { error: { code: 'upstream', status: upstream.status } });
  }
  const data = await upstream.json();
  const raw = data?.choices?.[0]?.message?.content;
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed.title !== 'string' || !parsed.title.trim()) {
    pushLog({ at: Date.now(), scene: 'content', model: 'agnes-2.5-flash', ms: Date.now() - started, ok: false, status: 502, errCode: 'parse_failed' });
    return sendJson(res, 502, { error: { code: 'parse_failed', message: 'AI 输出格式异常，请重试' } });
  }

  // 内容安全过滤（标题 + 全文）
  const joined = parsed.title + ' ' + JSON.stringify(parsed.content || '');
  if (CONTENT_BLOCKLIST.some((re) => re.test(joined))) {
    return sendJson(res, 400, { error: { code: 'refused', message: '这条内容不太合适，请换一个主题试试' } });
  }

  const id = `${type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const item = {
    id,
    type,
    title: String(parsed.title).slice(0, 40),
    content: parsed.content,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 3) : [],
    ageRange: typeof payload.ageRange === 'string' ? payload.ageRange : '7-8',
    source: 'ai',
    createdAt: Date.now(),
  };
  // 90 天 TTL（与 worker expirationTtl 对齐）：落盘前剔除过期项
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const items = contentStoreRead().filter((x) => x.createdAt > cutoff);
  items.push(item);
  contentStoreWrite(items.slice(-200));
  pushLog({ at: Date.now(), scene: 'content', model: 'agnes-2.5-flash', ms: Date.now() - started, ok: true, status: 200 });
  return sendJson(res, 200, { ok: true, item });
}

async function handleContentList(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const type = u.searchParams.get('type') || 'all';
  const limit = Math.min(Number(u.searchParams.get('limit')) || 8, 20);
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const items = contentStoreRead()
    .filter((x) => x.createdAt > cutoff)
    .filter((x) => type === 'all' || x.type === type)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
  return sendJson(res, 200, { items });
}

/* ------------------------------------------------------------------ */
/* 静态资源（生产模式）                                                 */
/* ------------------------------------------------------------------ */
function serveStatic(req, res, urlPath) {
  if (!fs.existsSync(DIST)) {
    return sendJson(res, 404, {
      error: { code: 'no_dist', message: 'dist 不存在，请先 npm run build（开发时请用 vite dev）' },
    });
  }
  // 非法百分号编码（如 /%ZZ、/%E4%A）会让 decodeURIComponent 抛 URIError；
  // 此前未捕获，异常冒泡后这条请求永远收不到响应（客户端挂到超时），故就地转 400。
  let rel;
  try {
    rel = decodeURIComponent(urlPath.split('?')[0]);
  } catch (err) {
    if (err instanceof URIError) {
      return sendJson(res, 400, { error: { code: 'bad_path', message: '请求路径编码非法' } });
    }
    throw err;
  }
  if (rel === '/' || rel === '') rel = '/index.html';

  // 加固：剥离前导斜杠，杜绝 path.join 把绝对 rel 当作根目录拼接而逃逸 DIST
  const safeRel = rel.replace(/^\/+/, '');
  let file = path.join(DIST, safeRel);

  // 目录穿越：必须落在 DIST 之内（或等于 DIST 根）
  if (file !== DIST && !file.startsWith(DIST_SEP)) {
    return sendJson(res, 403, { error: { code: 'forbidden' } });
  }

  // SPA fallback
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html');
  }
  if (!fs.existsSync(file)) return sendJson(res, 404, { error: { code: 'not_found' } });

  const ext = path.extname(file).toLowerCase();
  const immutable = file.startsWith(path.join(DIST, 'assets') + path.sep);
  const stream = fs.createReadStream(file);
  stream.on('error', (err) => {
    console.error('[ai-proxy] static read error:', err?.message || err);
    if (!res.headersSent) sendJson(res, 500, { error: { code: 'read_error', message: '读取文件失败' } });
    else safeEnd(res);
  });
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  stream.pipe(res);
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  // AI 接口（携带付费密钥）使用严格 CORS：未配置具体域名时拒绝跨域，杜绝盗刷。
  res.corsHeaders = corsFor(req, url.startsWith('/api/ai/'));

  if (req.method === 'OPTIONS') {
    res.writeHead(204, res.corsHeaders);
    return res.end();
  }

  if (url.startsWith('/api/ai/chat') && req.method === 'POST') return handleChat(req, res);

  if (url.startsWith('/api/ai/image') && req.method === 'POST') return handleImage(req, res);
  if (url.startsWith('/api/ai/video/status') && req.method === 'GET') return handleVideoStatus(req, res);
  if (url.startsWith('/api/ai/video') && req.method === 'POST') return handleVideoCreate(req, res);

  if (url.startsWith('/api/ai/health')) {
    return sendJson(res, 200, {
      ok: true,
      model: process.env.VITE_AI_DEFAULT_MODEL || 'agnes-2.5-flash',
      imageModel: IMAGE_MODEL,
      videoModel: VIDEO_MODEL,
      running,
      queued: waiting.length,
      calls: logs.length,
      rateLimitPerMin: RATE_LIMIT,
      serveStatic: SERVE_STATIC,
      corsOrigin: ALLOW_ORIGIN.join(','),
    });
  }

  if (url.startsWith('/api/ai/logs') || url.startsWith('/api/log/view')) {
    // 日志查看含敏感排查信息，必须口令鉴权；未配置 LOG_VIEW_TOKEN 视为关闭（仅本地可用）。
    // P1-5.1：仅接受请求头（x-log-token 或 Authorization: Bearer），
    // 不再接受 URL query 传 token——避免口令泄漏进访问日志 / 浏览器历史。
    const token = process.env.LOG_VIEW_TOKEN;
    if (!token) return sendJson(res, 403, { error: { code: 'forbidden', message: '日志查看未开启（仅本地/开发者可用）' } });
    const provided = req.headers['x-log-token'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (provided !== token) return sendJson(res, 403, { error: { code: 'forbidden', message: '口令无效' } });
    return sendJson(res, 200, { logs: logs.slice(-50).reverse() });
  }

  /* ---------- 前端监控上报端点 ---------- */
  if (url.startsWith('/api/log') && req.method === 'POST') {
    // 上报端点无鉴权，加限流防刷（每 IP 每分钟配额）
    if (rateLimited(ipOf(req))) {
      return sendJson(res, 429, { error: { code: 'rate_limited', message: '上报太频繁，稍后再试' } });
    }
    let body;
    try {
      body = JSON.parse(await readBody(req, 64 * 1024));
    } catch {
      return sendJson(res, 400, { error: { code: 'bad_json' } });
    }
    // 补充服务端视角的 IP 和时间，便于排查"哪个用户什么时候报的错"
    body.serverIp = ipOf(req);
    body.serverAt = Date.now();
    appendErrorLog(body);
    return sendJson(res, 200, { ok: true });
  }

  /* ---------- AI 内容中心（P0-3：与 Worker 对齐，dev/生产行为一致） ---------- */
  if (url.startsWith('/api/content/generate') && req.method === 'POST') return handleContentGenerate(req, res);
  if (url.startsWith('/api/content/list') && req.method === 'GET') return handleContentList(req, res);

  if (!SERVE_STATIC) {
    return sendJson(res, 404, { error: { code: 'static_disabled', message: '静态服务已关闭（AI_SERVE_STATIC=0）' } });
  }

  return serveStatic(req, res, url);
});

/* ------------------------------------------------------------------ */
/* 进程级兜底：未捕获异常 / 未处理拒绝 / 优雅关闭 / 监听错误            */
/* ------------------------------------------------------------------ */
server.on('error', (err) => {
  console.error('[ai-proxy] server error:', err?.stack || err);
  if (err && err.code === 'EADDRINUSE') process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[ai-proxy] uncaughtException:', err?.stack || err);
  // 监听启动前就崩，直接退出；运行中尽量保活，不让单个坏请求拖垮整站
  if (!server.listening) process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[ai-proxy] unhandledRejection:', reason);
});

function shutdown(signal) {
  console.log(`[ai-proxy] received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[ai-proxy] all connections closed, bye');
    process.exit(0);
  });
  // 兜底：10s 内还有长连接没释放，强制退出
  const force = setTimeout(() => {
    console.error('[ai-proxy] forced exit after timeout');
    process.exit(1);
  }, 10_000);
  if (typeof force.unref === 'function') force.unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, () => {
  console.log(`[ai-proxy] listening on http://localhost:${PORT}`);
  console.log(`[ai-proxy] upstream  agnes=${BASE_URL}   stepfun=${STEPFUN_BASE_URL}`);
  console.log(
    `[ai-proxy] limit     concurrency=${MAX_CONCURRENCY} timeout=${TIMEOUT_MS}ms rate=${RATE_LIMIT}/min/IP`,
  );
});
