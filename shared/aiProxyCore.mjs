/**
 * 宝贝学习乐园 · AI BFF 同构核心（共享逻辑）
 * ------------------------------------------------------------------
 * 被以下两处共同引用，消除「同一份代理逻辑两套实现」的漂移：
 *   - worker/index.mjs        （Cloudflare Worker，生产部署，仅配 Agnes 密钥）
 *   - server/index.mjs        （Node 本地 dev / 自托管，配 Agnes+DeepSeek+Xunfei 密钥）
 *
 * 设计边界：
 *   ✅ 本模块只放「凭证无关、可同构」的纯逻辑：模型解析回退、messages 结构校验、上游请求体成型。
 *   ❌ 不放「按运行环境不同」的内容：白名单具体成员（凭证驱动，见下）、儿童安全护栏、并发闸门、
 *      多供应商候选、SSE 转发细节——这些保留在各自运行时内。
 *
 * 关于 ALLOWED_MODELS（白名单成员）：
 *   生产 Worker 仅持有 Agnes 密钥，故其白名单只含 Agnes 模型；本地 dev 持有三套密钥，白名单含
 *   DeepSeek/Xunfei。这份「数据差异」是凭证可用性驱动的**合理差异**，不能强行统一，否则会让生产
 *   暴露无密钥的模型（上游必失败）或让 dev 无法测 DeepSeek。因此白名单由各运行时自行定义并作为
 *   参数传入 resolveModel()，本模块只统一「解析/回退规则」这一真正会生 bug 的逻辑。
 *
 * 零依赖，纯 Web API / Node 通用 JS，可在 Worker 与 Node 双运行时直接 import。
 */

/**
 * 解析最终使用的模型：客户端透传 model 若不在白名单，回退 defaultModel（再回退列表首项）。
 * 这是防「客户端透传高价/未授权模型造成费用滥用」的唯一闸门，两处必须行为一致。
 * @param {unknown} requested 客户端请求的 model
 * @param {string} [defaultModel] 环境变量 VITE_AI_DEFAULT_MODEL
 * @param {string[]} allowedModels 本运行时允许的白名单（凭证驱动）
 * @returns {string}
 */
export function resolveModel(requested, defaultModel, allowedModels) {
  const list = Array.isArray(allowedModels) ? allowedModels : [];
  const req = typeof requested === 'string' && requested ? requested : '';
  if (req && list.includes(req)) return req;
  if (defaultModel && typeof defaultModel === 'string' && list.includes(defaultModel)) return defaultModel;
  return list[0] ?? 'step-3.7-flash';
}

/**
 * 校验 messages 数组结构（防越界 / 非法 role / 超长注入）。
 * 仅做结构校验，**不含**儿童安全护栏（护栏由 Worker 生产环境在调用方另行负责）。
 * @param {unknown} messages
 * @returns {{ok:true, messages:Array<{role:string,content:string}>}} | {ok:false, code:string, message:string}
 */
export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, code: 'invalid_request', message: 'messages 不能为空' };
  }
  if (messages.length > 20) {
    return { ok: false, code: 'invalid_request', message: 'messages 最多 20 条' };
  }
  for (const msg of messages) {
    if (!msg || !['system', 'user', 'assistant'].includes(msg.role)) {
      return { ok: false, code: 'invalid_request', message: 'messages 包含非法 role' };
    }
    if (typeof msg.content !== 'string' || msg.content.length > 2000) {
      return { ok: false, code: 'invalid_request', message: '单条消息内容超过 2000 字符' };
    }
  }
  return { ok: true, messages };
}

/**
 * 成型上游请求体（仅透传白名单字段，避免前端注入奇怪参数）。
 * @param {object} payload 原始请求体（已 JSON.parse）
 * @param {string} model 经 resolveModel 解析后的模型
 * @param {object} [opts]
 * @param {Array<{role:string,content:string}>} [opts.messages] 覆盖用 messages（如已注入安全护栏 / DeepSeek JSON 加固）。缺省取 payload.messages。
 * @param {string} [opts.systemPrompt] 若提供，前置为该 system 消息（Worker 儿童安全护栏用）
 * @returns {object}
 */
export function buildUpstreamBody(payload, model, opts = {}) {
  const stream = payload.stream !== false;
  let messages = opts.messages ?? payload.messages;
  if (opts.systemPrompt) {
    messages = [{ role: 'system', content: opts.systemPrompt }, ...messages];
  }
  const body = {
    model,
    messages,
    // 温度必须落在 [0,2]：夹紧避免客户端传极端值破坏输出稳定性
    temperature: clampNum(payload.temperature, 0, 2, 0.7),
    // 推理模型 max_tokens 必须给足，否则思考链吃光额度、正文为空；
    // 同时夹紧上限 4096，防止客户端传超大值滥用付费额度（两运行时共用，统一闸门）
    max_tokens: clampInt(payload.max_tokens, 1, 4096, 1200),
    stream,
  };
  if (payload.response_format) body.response_format = payload.response_format;
  return body;
}

/** 数值夹紧：越界回落到边界，非法值回落默认 */
function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function clampInt(v, min, max, fallback) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * 儿童安全护栏（同构纯逻辑，护栏「内容」仍由各运行时注入，本函数只提供「机制」）。
 * 两处（worker / server）必须共用，避免 dev 模式（server）漏掉护栏。
 *
 * 规则：
 *   1. 始终以运行时的安全系统提示作为唯一权威 system 消息，前置；
 *   2. 丢弃客户端传入的 system 消息——防止通过 role:'system' 注入绕过护栏
 *      （OpenAI 兼容接口允许多 system 消息，但儿童场景不允许客户端控制系统指令）；
 *   3. 对每一条非 system 消息内容做提示注入拦截，命中即拒绝。
 *
 * @returns {{ok:true, messages:Array<{role:string,content:string}>}} | {ok:false, code:'refused'}
 */
export function guardMessages(messages, safetyPrompt, injectionPatterns) {
  const out = [{ role: 'system', content: safetyPrompt }];
  for (const msg of messages) {
    if (msg.role === 'system') continue; // 丢弃客户端 system，护栏唯一权威
    if (injectionPatterns.some((re) => re.test(msg.content))) {
      return { ok: false, code: 'refused' };
    }
    out.push(msg);
  }
  return { ok: true, messages: out };
}

/**
 * 轻量 PII 脱敏：屏蔽手机号 / 外链，保护儿童隐私（流式与非流式共用）。
 * 纯逻辑、无运行时依赖，可在 Worker 与 Node 双端复用。
 */
export function redactPII(s) {
  return String(s)
    .replace(/1[3-9]\d{9}/g, '[手机号已屏蔽]')
    .replace(/https?:\/\/[^\s"'<>]+/g, '[链接已屏蔽]');
}

/**
 * 对单个 SSE 文本块脱敏：逐行解析 data: JSON，屏蔽 delta/message.content 中的 PII；
 * 解析失败的脏行回落 redactPII 兜底；跨 chunk 截断的内容由 redactPII 双保险覆盖。
 */
export function redactSSEChunk(text) {
  const out = text.replace(/^data:\s*(\{.*\})\s*$/gm, (_m, jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      const choices = obj.choices;
      if (Array.isArray(choices)) {
        for (const c of choices) {
          const target = c.delta || c.message;
          if (target && typeof target.content === 'string') target.content = redactPII(target.content);
        }
      }
      return 'data: ' + JSON.stringify(obj);
    } catch {
      return _m;
    }
  });
  return redactPII(out);
}
