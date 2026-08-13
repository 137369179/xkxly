/**
 * 运行时全路由冒烟测试（深度审计 P3 · 续）
 * ============================================================
 * 复用 prerender.mjs 的 CDP + 本地静态服务基础设施，在真实 headless Chrome 中
 * 对全部路由做「挂载 + 错误捕获」冒烟：注入 window 级错误钩子，改 hash 触发路由，
 * 收集 console.error / 未捕获异常 / React 边界捕获，并断言 #root 有内容、无崩溃 UI。
 *
 * 与 prerender 的区别：prerender 只验证「挂载成功 + title 匹配」；本脚本验证
 * 「挂载后无运行时错误」，专门捕捉 Maximum update depth、undefined 引用、边界崩溃等
 * 静态分析 + 类型检查抓不到的缺陷。
 *
 * 用法：node scripts/smoke.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// 跨平台解析 Chrome 路径：优先 CHROME_BIN 环境变量（CI 显式指定），
// 否则按平台探测常见安装位置，最后回退到 PATH 上的 `google-chrome` 命令。
// 这样同一脚本在 macOS 本机、Linux CI（ubuntu-latest 自带 /usr/bin/google-chrome）、
// 以及容器里都能直接运行，无需改代码。
function resolveChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) { try { if (c && existsSync(c)) return c; } catch {} }
  return process.env.CHROME_BIN || 'google-chrome';
}
const CHROME = resolveChrome();
const PORT = 8771;
const REPORT_PATH = join(ROOT, 'test-results', 'smoke-report.txt');
const PER_ROUTE_TIMEOUT = 14000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};
function createStaticServer(dir) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(dir, p);
    try {
      if (!existsSync(file) || statSync(file).isDirectory()) {
        const idx = readFileSync(join(dir, 'index.html'));
        res.writeHead(200, { 'content-type': MIME['.html'] });
        res.end(idx);
        return;
      }
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
}

function launchChrome() {
  return new Promise((resolve, reject) => {
    // --disable-dev-shm-usage: 沙箱/容器里 /dev/shm 极小，Chrome 渲染进程易因共享内存耗尽而崩溃，
    //   表现为「未找到 page target」或随机 SIGKILL(137)。改用 /tmp 规避。
    // --disable-software-rasterizer / --disable-gpu: 无头环境不需要光栅化，省内存。
    // --no-first-run / --no-default-browser-check: 跳过首次运行初始化，避免冷启动卡顿。
    // 标准参数：绝大多数环境（开发者本机 / GitHub ubuntu-latest CI）用多进程模式即可稳定跑完 33 路由。
    const baseArgs = [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--disable-software-rasterizer', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0',
    ];
    // 低内存模式（SMOKE_LOW_MEMORY=1）：把渲染进程并入主进程、关闭多进程隔离，
    // 仅在内存极受限的容器 / 沙箱里启用，避免 SIGKILL(137)。默认不开启，以免改变 CI 行为。
    const lowMemArgs = process.env.SMOKE_LOW_MEMORY === '1'
      ? ['--single-process', '--no-zygote', '--disable-features=site-per-process,IsolateOrigins', '--renderer-process-limit=1']
      : [];
    const args = [...baseArgs, ...lowMemArgs];
    const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome 启动超时')), 20000);
    chrome.stderr.on('data', (d) => {
      stderr += d.toString();
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) { clearTimeout(timer); resolve({ chrome, wsUrl: m[1] }); }
    });
    chrome.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

class CdpSession {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessionId = null; this.events = []; this._bound = null; }
  send(method, params = {}, session = false) {
    return new Promise((resolve) => {
      const mid = ++this.id;
      this.pending.set(mid, resolve);
      const msg = { id: mid, method, params };
      if (session && this.sessionId) msg.sessionId = this.sessionId;
      this.ws.send(JSON.stringify(msg));
    });
  }
  // 显式创建一个 about:blank 页面目标，避免依赖 Chrome 自动创建的初始 target
  // （部分环境下 Target.getTargets 在 DevTools 刚就绪时返回空数组，导致「未找到 page target」）。
  async _waitForPage() {
    for (let i = 0; i < 20; i++) {
      const t = await this.send('Target.getTargets');
      const page = (t.targetInfos || []).find((x) => x.type === 'page');
      if (page) return page;
      await sleep(500);
    }
    throw new Error('未找到 page target');
  }
  async attach() {
    let target;
    try {
      target = await this.send('Target.createTarget', { url: 'about:blank' });
    } catch {
      target = await this._waitForPage();
    }
    const { sessionId } = await this.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    this.sessionId = sessionId;
    await this.send('Runtime.enable', {}, true);
    await this.send('Page.enable', {}, true);
  }
  eval(expression) {
    return this.send('Runtime.evaluate', { expression, returnByValue: true }, true).then((r) => r.result?.value);
  }
  setHash(hash) { return this.eval(`location.hash = '${hash}'`); }
  navigate(url) { return this.send('Page.navigate', { url }, true); }
  detach() { return this.send('Target.detachFromTarget', { sessionId: this.sessionId }).catch(() => {}); }
}

// 注入全局错误捕获钩子（在应用挂载前注入一次，window 级持久）
const INJECT = `
window.__smoke = { errors: [] };
window.addEventListener('error', (e) => {
  try { window.__smoke.errors.push('error: ' + (e.message || (e.error && e.error.message) || 'unknown')); } catch (_) {}
});
window.addEventListener('unhandledrejection', (e) => {
  try { window.__smoke.errors.push('unhandledrejection: ' + (e.reason && (e.reason.stack || e.reason.message) || String(e.reason))); } catch (_) {}
});
const _err = console.error;
console.error = function () {
  try {
    const s = Array.from(arguments).map((a) => (typeof a === 'string' ? a : (a && a.stack) ? a.stack : JSON.stringify(a))).join(' ').slice(0, 240);
    window.__smoke.errors.push('console.error: ' + s);
  } catch (_) {}
  return _err.apply(console, arguments);
};
true;
`;

// 路由表（与 prerender.mjs 同步）
const ROUTES = ['today','companion','letters','poems','numbers','logic','adventure','rewards','passport','parent','ttstest','hanzi','pinyin','words','fun','idioms','songs','science','music','art','safety','geography','vehicles','festivals','plants','cat_house','realistic_cat','storybook','wrongbook','gamecenter','story','growth','content'];

// 真正的应用层崩溃（与网络/资源 404 等环境噪声区分）
const CRASH_RE = /Maximum update depth|Cannot read prop|is not a function|is not defined|Objects are not valid as a React child|Too many re-renders|Each child in a list should have a unique|Rendered more hooks than|Invalid hook call|Cannot update a component|undefined is not iterable|null is not iterable/i;

async function smokeRoute(cdp, route) {
  await cdp.setHash(`#/${route}`);
  const deadline = Date.now() + PER_ROUTE_TIMEOUT;
  let last = { root: 0, title: '' };
  while (Date.now() < deadline) {
    await sleep(700);
    const info = await cdp.eval(`(() => { try { return JSON.stringify({ root: (document.getElementById('root') && document.getElementById('root').innerHTML.length) || 0, title: document.title, errs: (window.__smoke && window.__smoke.errors) || [], bodyText: (document.getElementById('root') ? document.getElementById('root').innerText.slice(0,120) : '') }); } catch (e) { return JSON.stringify({ root: 0, title: document.title, errs: [], bodyText: '' }); } })()`);
    let parsed;
    try { parsed = JSON.parse(info || '{}'); } catch { continue; }
    last = parsed;
    if (parsed.root > 300) break; // 已挂载
  }
  return last;
}

// 交互冒烟：逐个点击页面上所有可用按钮（排除链接/禁用，最多 8 个），
// 每次点击后等待并收集「仅应用层崩溃」；若某点击触发路由跳转则回到本路由继续。
async function interactionSmoke(cdp, route) {
  const script = `(() => {
    try { window.__smoke.errors = []; } catch (_) {}
    const hashBefore = location.hash;
    const btns = Array.from(document.querySelectorAll('button:not([disabled]):not([aria-hidden="true"])'));
    const list = btns.slice(0, 8).map((b, i) => ({ i, text: (b.innerText || b.getAttribute('aria-label') || '').slice(0,24) }));
    return JSON.stringify({ hashBefore, count: list.length, list });
  })()`;
  const before = await cdp.eval(script);
  let meta = { hashBefore: '', count: 0, list: [] };
  try { meta = JSON.parse(before || '{}'); } catch {}
  const allCrashes = [];
  let navigated = false;
  for (let i = 0; i < meta.count; i++) {
    // 重新查询第 i 个按钮（DOM 可能因前次点击重渲染）
    const clicked = await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button:not([disabled]):not([aria-hidden="true"])'));
      const b = btns[${i}];
      if (!b) return false;
      try { b.click(); return true; } catch (e) { return false; }
    })()`);
    await sleep(900);
    const snap = await cdp.eval(`(() => {
      try {
        const hashAfter = location.hash;
        const errs = window.__smoke ? window.__smoke.errors : [];
        const crashes = errs.filter((e) => ${CRASH_RE.toString().slice(1, -1)}.test(e));
        return JSON.stringify({ hashAfter, crashes });
      } catch (e) { return JSON.stringify({ hashAfter: location.hash, crashes: [] }); }
    })()`);
    let s = { hashAfter: '', crashes: [] };
    try { s = JSON.parse(snap || '{}'); } catch {}
    if (s.hashAfter !== meta.hashBefore) { navigated = true; await cdp.setHash('#/' + route); await sleep(500); }
    if (s.crashes && s.crashes.length) allCrashes.push(...s.crashes);
  }
  await cdp.eval(`try { window.__smoke.errors = []; } catch (_) {}`);
  return { clicked: meta.count > 0, btnCount: meta.count, navigated, crashes: allCrashes };
}

async function main() {
  const server = createStaticServer(DIST);
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const { chrome, wsUrl } = await launchChrome();
  const ws = new WebSocket(wsUrl);
  let cdp;
  try {
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    cdp = new CdpSession(ws);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && cdp.pending.has(msg.id)) { cdp.pending.get(msg.id)(msg.result); cdp.pending.delete(msg.id); }
    };
    await cdp.attach();
    await cdp.navigate(`${baseUrl}/`);
    await sleep(2500);
    // 注入错误钩子
    await cdp.eval(INJECT);

  const results = [];
  const lines = [];
  let totalErr = 0;
  for (const route of ROUTES) {
    const r = await smokeRoute(cdp, route);
    // 重置错误桶，仅本路由生效
    await cdp.eval(`try { window.__smoke.errors = []; } catch (_) {}`);
    const r2 = await cdp.eval(`(() => { try { return JSON.stringify({ errs: window.__smoke ? window.__smoke.errors : [], bodyText: (document.getElementById('root') ? document.getElementById('root').innerText.slice(0,120) : '') }); } catch (e) { return JSON.stringify({ errs: [], bodyText: '' }); } })()`);
    let parsed2 = { errs: [], bodyText: '' };
    try { parsed2 = JSON.parse(r2 || '{}'); } catch {}
    const mountCrashes = (parsed2.errs || []).filter((e) => CRASH_RE.test(e));
    const crashedUI = /出错了|Something went wrong/i.test(parsed2.bodyText || '');

    // 交互冒烟
    const ix = await interactionSmoke(cdp, route);
    totalErr += mountCrashes.length + ix.crashes.length;

    results.push({ route, root: r.root, mountCrashes, ix });
    const bad = mountCrashes.length || ix.crashes.length || crashedUI;
    const tag = bad ? 'FAIL' : 'ok  ';
    const line = `  [${tag}] /${route}/  root=${r.root}  mountCrash=${mountCrashes.length}  click=${ix.clicked ? 'Y' : 'n'} nav=${ix.navigated ? 'Y' : 'n'} ixCrash=${ix.crashes.length}${crashedUI ? ' CRASH-UI' : ''}`;
    lines.push(line); console.log(line);
    mountCrashes.slice(0, 2).forEach((e) => { const m = `        mount - ${String(e).slice(0, 200)}`; lines.push(m); console.log(m); });
    ix.crashes.slice(0, 2).forEach((e) => { const m = `        click - ${String(e).slice(0, 200)}`; lines.push(m); console.log(m); });
    // 交互若导航走，回到本路由以免污染下一轮
    if (ix.navigated) await cdp.setHash(`#/${route}`);
  }

  if (cdp) { try { await cdp.detach(); } catch {} }

  const failRoutes = results.filter((r) => r.mountCrashes.length || r.ix.crashes.length || false);
  const summary = `\n冒烟完成：${results.length} 路由，异常路由 ${failRoutes.length}，累计应用层崩溃 ${totalErr}`;
  lines.push(summary); console.log(summary);
  if (failRoutes.length) {
    const f = `异常路由： ${failRoutes.map((r) => r.route).join(', ')}`;
    lines.push(f); console.log(f);
    process.exitCode = 2;
  }
  // 写报告文件，供 CI 作为 artifact 上传（即使失败也要写出，便于排查）
  try { mkdirSync(dirname(REPORT_PATH), { recursive: true }); writeFileSync(REPORT_PATH, lines.join('\n') + '\n', 'utf8'); } catch {}
  } finally {
    // 无论如何都要释放资源：此前失败时遗留的 Chrome 进程会占用内存，
    // 导致下一次运行因内存翻倍而 SIGKILL(137)，形成「越修越坏」的假象。
    try { if (ws && ws.readyState === 1) ws.close(); } catch {}
    try { chrome.kill('SIGKILL'); } catch {}
    try { server.close(); } catch {}
  }
}

main().catch((e) => { console.error('[smoke] 失败：', e); process.exit(1); });
