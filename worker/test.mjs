/**
 * Worker 适配层本地自测（无需 workerd / 无需 Cloudflare 登录）
 * 用 mock fetch 替换上游，验证：health / 校验 / SSE 透传+[DONE] / CORS 白名单。
 * 运行：node test.mjs
 */
import handler from './index.mjs';

const env = {
  AGNES_API_KEY: 'dummy-key',
  AGNES_BASE_URL: 'http://mock-upstream/v1',
  AI_ALLOW_ORIGIN: 'https://good.example.com',
  VITE_AI_DEFAULT_MODEL: 'agnes-2.5-flash',
  AI_RATE_LIMIT_PER_MIN: '1000', // 测试关限流
};

let passed = 0;
let failed = 0;
function assert(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

/** 造一个能吐出 SSE 帧的 mock 上游 */
function makeSseBody() {
  const enc = new TextEncoder();
  const frames = [
    'data: {"choices":[{"delta":{"reasoning_content":"思考中"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"水"}}]}\n\n',
  ];
  return new ReadableStream({
    start(controller) {
      frames.forEach((f) => controller.enqueue(enc.encode(f)));
      controller.close();
    },
  });
}

// mock 上游
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.endsWith('/chat/completions')) {
    const body = JSON.parse(init.body);
    if (!body.stream) {
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }
    return new Response(makeSseBody(), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: 'upstream' }), { status: 200 });
};

async function call(path, init = {}) {
  const url = `http://x.test${path}`;
  const req = new Request(url, init);
  return handler.fetch(req, env);
}

console.log('== health ==');
const h = await call('/api/ai/health');
const hj = await h.json();
assert('health 200', h.status === 200);
assert('health 含 runtime=workers', hj.runtime === 'workers');
assert('health 含 corsOrigin', hj.corsOrigin === 'https://good.example.com');

console.log('== 校验 ==');
const bad = await call('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [] }),
});
assert('空 messages → 400', bad.status === 400);

const badJson = await call('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: 'not json',
});
assert('坏 JSON → 400', badJson.status === 400);

console.log('== SSE 透传 ==');
const sse = await call('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: '说个字' }], stream: true }),
});
const text = await sse.text();
assert('SSE 200 + event-stream', sse.status === 200 && sse.headers.get('content-type').includes('text/event-stream'));
assert('透传 reasoning_content 帧', text.includes('reasoning_content'));
assert('透传 content 帧', text.includes('"水"'));
assert('补 [DONE] 终止帧', text.includes('[DONE]'));

console.log('== 非流式 ==');
const noStream = await call('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], stream: false }),
});
assert('非流式 200', noStream.status === 200);

console.log('== CORS 白名单 ==');
const goodOpt = await call('/api/ai/chat', { method: 'OPTIONS', headers: { Origin: 'https://good.example.com' } });
assert('白名单内回显 Origin', goodOpt.headers.get('access-control-allow-origin') === 'https://good.example.com');
const evilOpt = await call('/api/ai/chat', { method: 'OPTIONS', headers: { Origin: 'https://evil.example.com' } });
assert('白名单外无 allow-origin', !evilOpt.headers.get('access-control-allow-origin'));

console.log('== 404 / 静态 ==');
const nf = await call('/whatever');
assert('无 ASSETS 时未知路由 404', nf.status === 404);

console.log('== 静态资源（ASSETS 绑定）==');
const mockAssets = {
  fetch: async (req) => {
    const u = new URL(req.url);
    if (u.pathname === '/') return new Response('<html>static ok</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    return new Response('not found', { status: 404 });
  },
};
const staticReq = await handler.fetch(new Request('http://x.test/'), { ...env, ASSETS: mockAssets });
assert('静态首页 200', staticReq.status === 200);
const staticApi = await handler.fetch(new Request('http://x.test/api/ai/health'), { ...env, ASSETS: mockAssets });
assert('API 优先于静态路由', (await staticApi.json()).runtime === 'workers');

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);
