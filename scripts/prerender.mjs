/**
 * P2-1 · SEO 架构升级：构建期预渲染脚本
 * ============================================================
 * 作用：把 hash SPA 的每个核心路由渲染成独立静态页 `dist/<route>/index.html`，
 *       让爬虫可通过 `https://xkxly.ccwu.cc/<route>/` 直接抓取到完整内容，
 *       同时站点内部仍保持 hash 导航（零前端重构）。
 *
 * 依赖：
 *   - 本机 Chrome（headless + CDP，WebSocket 由 Node ≥22 内置提供）
 *   - 已构建的 dist/（先 `npm run build` 再跑本脚本）
 *
 * 用法：node scripts/prerender.mjs
 * 说明：任何路由渲染失败只告警、不阻断（SEO 尽力而为）。
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = 'https://xkxly.ccwu.cc';
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8765;
const PER_ROUTE_TIMEOUT = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 1. 静态服务（serve dist/） ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
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
      res.writeHead(404);
      res.end('not found');
    }
  });
}

/* ---------- 2. 路由 → SEO 元信息（读 i18n zh-CN，避免文案漂移） ---------- */
const zh = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales/zh-CN.json'), 'utf8'));
const CATEGORY_LABEL = zh.categories || {};
// route → 品类（与 src/data/nav.ts 的 NAV_CATEGORY_MAP 保持一致）
const ROUTE_CATEGORY = {
  today: 'home', companion: 'ai', letters: 'learn', poems: 'learn', numbers: 'learn',
  logic: 'learn', adventure: 'game', rewards: 'parent', passport: 'parent', parent: 'parent', ttstest: 'parent',
  hanzi: 'learn', pinyin: 'learn', words: 'learn', fun: 'game', idioms: 'learn',
  songs: 'story', science: 'learn', music: 'create', art: 'create', safety: 'learn',
  geography: 'learn', vehicles: 'game', festivals: 'learn', plants: 'learn',
  cat_house: 'create', realistic_cat: 'create', storybook: 'story', wrongbook: 'ai',
  gamecenter: 'game', story: 'story', growth: 'growth', content: 'ai', achievement: 'growth',
};
// 预渲染路由（不含 home：根 URL 已是独立页）
const ROUTES = Object.keys(ROUTE_CATEGORY);

// 无 NavItem 的路由（如 PIN 门禁内的家长诊断页）提供预渲染标题，
// 否则 label 回退为 route id，永远匹配不到页面 <title> → 被判定 SKIP。
// 预渲染无头 Chrome 的活跃语言为 en-US，故 label 取英文标题以匹配。
const ROUTE_LABEL = { ttstest: '🎙 Voice Engine Diagnostic', achievement: '🏆 宝贝成就中心' };

/* ---------- 3. CDP ---------- */
function launchChrome() {
  return new Promise((resolve, reject) => {
    const chrome = spawn(CHROME, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome 启动超时')), 15000);
    chrome.stderr.on('data', (d) => {
      stderr += d.toString();
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) { clearTimeout(timer); resolve({ chrome, wsUrl: m[1] }); }
    });
    chrome.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

class CdpSession {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessionId = null; }
  send(method, params = {}, session = false) {
    return new Promise((resolve) => {
      const mid = ++this.id;
      this.pending.set(mid, resolve);
      const msg = { id: mid, method, params };
      if (session && this.sessionId) msg.sessionId = this.sessionId;
      this.ws.send(JSON.stringify(msg));
    });
  }
  attach() {
    return this.send('Target.getTargets').then(async (targets) => {
      let page = targets.targetInfos.find((t) => t.type === 'page');
      // Chrome 启动初期 page target 可能尚未就绪，最多等 5s
      for (let i = 0; !page && i < 10; i++) {
        await sleep(500);
        const t = await this.send('Target.getTargets');
        page = t.targetInfos.find((x) => x.type === 'page');
      }
      if (!page) throw new Error('未找到 page target');
      const { sessionId } = await this.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
      this.sessionId = sessionId;
      await this.send('Runtime.enable', {}, true);
      await this.send('Page.enable', {}, true);
    });
  }
  eval(expression) {
    return this.send('Runtime.evaluate', { expression, returnByValue: true }, true).then((r) => r.result?.value);
  }
  setHash(hash) {
    return this.eval(`location.hash = '${hash}'`);
  }
  navigate(url) {
    return this.send('Page.navigate', { url }, true);
  }
  detach() {
    return this.send('Target.detachFromTarget', { sessionId: this.sessionId }).catch(() => {});
  }
}

/** 渲染一个路由：改 hash → 轮询直到 title 含该路由 label → 取 root innerHTML */
async function renderRoute(cdp, route, label) {
  await cdp.setHash(`#/${route}`);
  const deadline = Date.now() + PER_ROUTE_TIMEOUT;
  let lastTitle = '';
  while (Date.now() < deadline) {
    await sleep(600);
    const info = await cdp.eval(
      `JSON.stringify({ root: (document.getElementById('root')?.innerHTML.length) || 0, title: document.title })`,
    );
    let parsed;
    try { parsed = JSON.parse(info || '{}'); } catch { continue; }
    lastTitle = parsed.title || '';
    if (parsed.root > 500 && lastTitle.includes(label)) {
      const rootHtml = await cdp.eval(`document.getElementById('root')?.innerHTML || ''`);
      return { ok: true, title: lastTitle, rootHtml: rootHtml || '' };
    }
  }
  return { ok: false, route, lastTitle };
}

/* ---------- 4. SEO 标签注入 ---------- */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSeoHead(route, title, desc, categoryLabel) {
  const url = `${SITE}/${route}/`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: '宝贝学习乐园', item: `${SITE}/` }],
  };
  if (categoryLabel) {
    breadcrumb.itemListElement.push({ '@type': 'ListItem', position: 2, name: categoryLabel, item: `${SITE}/` });
  }
  breadcrumb.itemListElement.push({
    '@type': 'ListItem',
    position: breadcrumb.itemListElement.length + 1,
    name: title,
    item: url,
  });
  return [
    `<link rel="canonical" href="${url}">`,
    `<meta name="description" content="${escapeHtml(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${escapeHtml(title)} | 宝贝学习乐园">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:site_name" content="宝贝学习乐园">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(title)} | 宝贝学习乐园">`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}">`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`,
  ].join('\n    ');
}

/* ---------- 5. 主流程 ---------- */
async function main() {
  const template = readFileSync(join(DIST, 'index.html'), 'utf8');
  const server = createStaticServer(DIST);
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const { chrome, wsUrl } = await launchChrome();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && cdp.pending.has(msg.id)) { cdp.pending.get(msg.id)(msg.result); cdp.pending.delete(msg.id); }
  };
  const cdp = new CdpSession(ws);
  await cdp.attach();
  // 先整页加载一次应用，后续路由用改 hash 触发
  await cdp.navigate(`${baseUrl}/`);
  await sleep(2500);

  const okList = [];
  const failList = [];
  // 预渲染页统一移除模板中「根级」canonical/OG/description，避免爬虫取到首页元信息
  const cleanTemplate = template
    .replace(/<link rel="canonical"[^>]*\/>\s*/i, '')
    .replace(/<meta name="description"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:url"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:title"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:description"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:card"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:title"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:description"[^>]*>\s*/gi, '');
  for (const route of ROUTES) {
    const nav = zh.nav?.[route];
    const label = nav?.label ?? ROUTE_LABEL[route] ?? route;
    const desc = nav?.desc ?? `${label} · 宝贝学习乐园`;
    const categoryLabel = CATEGORY_LABEL[ROUTE_CATEGORY[route]] || '';
    const out = await renderRoute(cdp, route, label).catch(() => ({ ok: false, route }));
    if (!out.ok) {
      failList.push(route);
      console.log(`  [SKIP] /${route}/ ${out.lastTitle ? `title="${out.lastTitle}"` : '渲染超时或无内容'}`);
      continue;
    }
    const seoHead = buildSeoHead(route, label, desc, categoryLabel);
    const html = cleanTemplate
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${label} | 宝贝学习乐园</title>`)
      .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${out.rootHtml}</div>`)
      .replace(/<\/head>/, `    ${seoHead}\n  </head>`);
    const outDir = join(DIST, route);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html, 'utf8');
    okList.push(route);
    console.log(`  [OK] /${route}/ ${(html.length / 1024).toFixed(0)}KB`);
  }

  await cdp.detach();
  ws.close();
  chrome.kill();
  server.close();

  console.log(`\n预渲染完成：${okList.length}/${ROUTES.length} 成功${failList.length ? `，跳过 ${failList.join(', ')}` : ''}`);
  if (okList.length === 0) process.exitCode = 1;
}

main().catch((e) => { console.error('[prerender] 失败：', e); process.exit(1); });
