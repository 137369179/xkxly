/**
 * E2E 补充审计 · 链接有效性与页面响应耗时（P1-审计 · 自动测试）
 * ================================================================
 * 复用 smoke.mjs 的 headless Chrome + CDP 设施，对全部路由做：
 *   1. 挂载耗时采集（导航→首屏可交互；慢路由 >1.2s 记入告警）
 *   2. 内部链接有效性（扫描渲染后的 <a href="#/...">，校验一级路由是否存在于路由表）
 *   3. 外部链接清点（网络受限环境暂不逐条可达性验证，仅计数与分级）
 * 无新增运行时依赖；产出 JSON + 文本报告供人工分级。
 *
 * 用法：node scripts/e2e-audit.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = 8772;
const REPORT_JSON = join(ROOT, 'test-results', 'e2e-audit.json');
const REPORT_TXT = join(ROOT, 'test-results', 'e2e-audit.txt');
const SLOW_MS = 1200;
const PER_ROUTE_TIMEOUT = 14000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) { try { if (c && existsSync(c)) return c; } catch {} }
  return process.env.CHROME_BIN || 'google-chrome';
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
function createStaticServer(dir) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(dir, p);
    try {
      if (!existsSync(file) || statSync(file).isDirectory()) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(readFileSync(join(dir, 'index.html'))); return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
    } catch { res.writeHead(404); res.end('not found'); }
  });
}

function launchChrome() {
  return new Promise((resolve, reject) => {
    const chrome = spawn(process.env.CHROME_BIN || resolveChrome(), [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--disable-software-rasterizer', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
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

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessionId = null; }
  send(method, params = {}, session = false) {
    return new Promise((res) => { const mid = ++this.id; this.pending.set(mid, res); const m = { id: mid, method, params }; if (session && this.sessionId) m.sessionId = this.sessionId; this.ws.send(JSON.stringify(m)); });
  }
  async attach() {
    const target = await this.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    this.sessionId = sessionId;
    await this.send('Runtime.enable', {}, true);
  }
  eval(expression) { return this.send('Runtime.evaluate', { expression, returnByValue: true }, true).then((r) => r.result?.value); }
  setHash(h) { return this.eval(`location.hash = '${h}'`); }
  navigate(url) { return this.send('Page.navigate', { url }, true); }
  detach() { return this.send('Target.detachFromTarget', { sessionId: this.sessionId }).catch(() => {}); }
}

const ROUTES = ['today','companion','letters','poems','numbers','logic','adventure','rewards','passport','parent','ttstest','hanzi','pinyin','words','fun','idioms','songs','science','music','art','safety','geography','vehicles','festivals','plants','cat_house','realistic_cat','storybook','wrongbook','gamecenter','story','growth','content'];

async function mountLatency(cdp, route) {
  const t0 = Date.now();
  await cdp.setHash(`#/${route}`);
  const deadline = Date.now() + PER_ROUTE_TIMEOUT;
  let root = 0;
  while (Date.now() < deadline) {
    await sleep(350);
    const r = await cdp.eval(`(() => { try { return (document.getElementById('root')||{}).innerHTML ? (document.getElementById('root')).innerHTML.length : 0; } catch(e){ return 0; } })()`);
    if (typeof r === 'number' && r > 0) root = r;
    if (root > 300) break;
  }
  return { ms: Date.now() - t0, root };
}

async function scanLinks(cdp) {
  const out = await cdp.eval(`(() => {
    const internal = new Set(), external = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const h = (a.getAttribute('href')||'').trim();
      if (!h) return;
      if (h.startsWith('#/')) internal.add(h.slice(2));
      else if (/^https?:/i.test(h)) external.push(h);
    });
    return JSON.stringify({ internal: Array.from(internal), external });
  })()`);
  return JSON.parse(out || '{"internal":[],"external":[]}');
}

async function main() {
  const server = createStaticServer(DIST);
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const { chrome, wsUrl } = await launchChrome();
  const ws = new WebSocket(wsUrl);
  let cdp;
  const allInternal = new Map(); // route -> { sample, sources }
  const externalSeen = new Set();
  const perf = [];
  try {
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    cdp = new Cdp(ws);
    ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && cdp.pending.has(msg.id)) { cdp.pending.get(msg.id)(msg.result); cdp.pending.delete(msg.id); } };
    await cdp.attach();
    await cdp.navigate(`${baseUrl}/`);
    await sleep(2500);

    for (const route of ROUTES) {
      const { ms, root } = await mountLatency(cdp, route);
      perf.push({ route, ms, root, slow: ms > SLOW_MS });
      const links = await scanLinks(cdp);
      links.internal.forEach((routePath) => {
        const seg = routePath.split('/')[0];
        if (!allInternal.has(seg)) allInternal.set(seg, { exists: ROUTES.includes(seg), sample: routePath, seenOn: [route] });
        else allInternal.get(seg).seenOn.push(route);
      });
      links.external.forEach((u) => externalSeen.add(u));
      console.log(`  [${route}] mount=${ms}ms root=${root}${ms > SLOW_MS ? ' SLOW' : ''} links=${links.internal.length} ext=${links.external.length}`);
    }
  } finally {
    try { if (ws.readyState === 1) ws.close(); } catch {}
    try { chrome.kill('SIGKILL'); } catch {}
    try { server.close(); } catch {}
  }

  const broken = [...allInternal.values()].filter((x) => !x.exists).map((x) => ({ route: x.sample, seenOn: x.seenOn.slice(0, 5) }));
  const report = {
    generatedAt: new Date().toISOString(),
    environment: { chrome: 'headless', node: process.version },
    routes: ROUTES.length,
    summary: {
      perf: { slowRoutes: perf.filter((p) => p.slow).map((p) => ({ route: p.route, ms: p.ms })), maxMs: perf.reduce((m, p) => Math.max(m, p.ms), 0) },
      internalLinks: { total: allInternal.size, broken: broken.length, brokenList: broken },
      external: { count: externalSeen.size, note: '网络受限环境仅清点，不做逐条可达性判定' },
    },
    perRoute: perf,
  };
  try { mkdirSync(dirname(REPORT_JSON), { recursive: true }); writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), 'utf8'); } catch {}

  const lines = [`E2E 审计：${ROUTES.length} 路由`, `生成时间：${report.generatedAt}`, '-- 响应耗时 --'];
  perf.forEach((p) => lines.push(`  ${p.slow ? 'SLOW' : 'ok'}  ${p.route.padEnd(16)} ${p.ms}ms root=${p.root}`));
  lines.push('-- 内部链接 --');
  lines.push(`  一级目标 ${allInternal.size} 个，失效 ${broken.length} 个${broken.length ? '：' : ''}`);
  broken.forEach((b) => lines.push(`    ❌ #/${b.route}  (出现在 ${b.seenOn.join(', ')} 等)`));
  lines.push(`-- 外部链接 --`);
  lines.push(`  共 ${externalSeen.size} 个域名/链接（网络受限，仅清点）`);
  lines.push(`\n出问题路由：${perf.filter((p) => p.slow).map((p) => p.route).join(', ') || '无'}`);
  try { writeFileSync(REPORT_TXT, lines.join('\n') + '\n', 'utf8'); } catch {}
  console.log('\n' + lines.join('\n'));
  return broken.length || perf.some((p) => p.slow) ? 3 : 0;
}

main().then((code) => process.exit(code)).catch((e) => { console.error('[e2e-audit] 失败：', e); process.exit(1); });