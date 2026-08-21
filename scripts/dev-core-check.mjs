/**
 * Dev server 核心功能交互检查
 * =============================================================
 * 对运行中的 Vite dev（localhost:5173）用 headless Chrome + CDP 验证核心学习模块：
 *   数字 / 拼音 / 古诗 / 汉字 / 成语
 * 每个模块：挂载断言 + 按钮交互冒烟 + 收集 console/未捕获异常（CRASH_RE 过滤），
 * 断言无应用层崩溃、无误界UI。
 * 用法：node scripts/dev-core-check.mjs  [PORT]
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = process.argv[2] || '5173';
const BASE = `http://localhost:${PORT}/`;
const PER_ROUTE_TIMEOUT = 22000; // vite dev 首次模块编译较慢，放宽

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const cand = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const c of cand) { try { if (existsSync(c)) return c; } catch {} }
  return 'google-chrome';
}
function launchChrome() {
  return new Promise((resolve_, reject) => {
    const chrome = spawn(resolveChrome(), [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--disable-software-rasterizer', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome 启动超时')), 20000);
    chrome.stderr.on('data', (d) => { stderr += d.toString(); const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(timer); resolve_({ chrome, wsUrl: m[1] }); } });
    chrome.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}
class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessionId = null; }
  send(method, params = {}, session = false) { return new Promise((r) => { const mid = ++this.id; this.pending.set(mid, r); const m = { id: mid, method, params }; if (session && this.sessionId) m.sessionId = this.sessionId; this.ws.send(JSON.stringify(m)); }); }
  async attach() { const t = await this.send('Target.createTarget', { url: 'about:blank' }); const { sessionId } = await this.send('Target.attachToTarget', { targetId: t.targetId, flatten: true }); this.sessionId = sessionId; await this.send('Runtime.enable', {}, true); }
  eval(expression) { return this.send('Runtime.evaluate', { expression, returnByValue: true }, true).then((r) => r.result?.value); }
  setHash(h) { return this.eval(`location.hash = '${h}'`); }
  navigate(url) { return this.send('Page.navigate', { url }, true); }
  detach() { return this.send('Target.detachFromTarget', { sessionId: this.sessionId }).catch(() => {}); }
}

const CORE = [
  { route: 'numbers', label: '数字王国' },
  { route: 'pinyin', label: '拼音' },
  { route: 'poems', label: '古诗' },
  { route: 'hanzi', label: '汉字' },
  { route: 'idioms', label: '成语' },
];
const INJECT = `
window.__dc = { errors: [] };
window.addEventListener('error', (e) => { try { window.__dc.errors.push('error: ' + (e.message||'')); } catch(_){} });
window.addEventListener('unhandledrejection', (e) => { try { window.__dc.errors.push('unhandledrejection: ' + String(e.reason&&(e.reason.stack||e.reason.message)||e.reason)); } catch(_){} });
const _e = console.error; console.error = function(){ try { window.__dc.errors.push('console.error: ' + String(arguments[0]).slice(0,220)); } catch(_){} return _e.apply(console, arguments); };
true;`;
const CRASH = /Maximum update depth|Cannot read prop|is not a function|is not defined|Objects are not valid as a React child|Too many re-renders|Each child in a list should have a unique|Rendered more hooks than|Invalid hook call|Cannot update a component|undefined is not iterable|null is not iterable/i;

async function main() {
  const { chrome, wsUrl } = await launchChrome();
  const ws = new WebSocket(wsUrl);
  let cdp;
  const results = [];
  try {
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    cdp = new Cdp(ws);
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && cdp.pending.has(m.id)) { cdp.pending.get(m.id)(m.result); cdp.pending.delete(m.id); } };
    await cdp.attach();
    await cdp.navigate(BASE);
    await sleep(3000);
    await cdp.eval(INJECT);

    for (const { route, label } of CORE) {
      await cdp.eval('try{window.__dc.errors=[]}catch(_){}');
      await cdp.setHash(`#/${route}`);
      // 等待挂载
      let root = 0, body = '';
      const deadline = Date.now() + PER_ROUTE_TIMEOUT;
      while (Date.now() < deadline) {
        await sleep(500);
        const snap = await cdp.eval(`(()=>{try{const r=document.getElementById('root');return JSON.stringify({root:r?r.innerHTML.length:0, body:(r?r.innerText.slice(0,60):'').replace(/\\n/g,' ')})}catch(e){return JSON.stringify({root:0,body:''})}})()`);
        let s = { root: 0, body: '' }; try { s = JSON.parse(snap); } catch {}
        root = s.root; body = s.body;
        if (root > 300) break;
      }
      // 交互冒烟：最多点 6 个非禁用按钮
      const clicks = await cdp.eval(`(async()=>{ let cnt=0; const n=Math.min(6, document.querySelectorAll('button:not([disabled])').length); for(let i=0;i<n;i++){ const b=document.querySelectorAll('button:not([disabled])')[i]; if(!b) break; try{ b.click(); cnt++; }catch(_){} } await new Promise(r=>setTimeout(r,800)); return cnt; })()`);
      await sleep(800);
      const errs = await cdp.eval('window.__dc?window.__dc.errors:[]');
      const crashes = (errs || []).filter((e) => CRASH.test(e));
      const troubleUI = /出错了|Something went wrong/i.test(body);
      results.push({ route, label, root, body: body.slice(0, 40), clicks, crashes, troubleUI });
      const tag = crashes.length || troubleUI ? 'FAIL' : 'ok';
      console.log(`  [${tag}] /${route}/ ${label}  root=${root} clicks=${clicks} crash=${crashes.length} text="${body}"`);
      crashes.slice(0, 2).forEach((e) => console.log(`        - ${String(e).slice(0, 200)}`));
    }
  } finally {
    try { ws.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {}
  }
  const failed = results.filter((r) => r.crashes.length || r.troubleUI || r.root <= 300);
  console.log(`\n核心模块检查：${results.length} 个，异常 ${failed.length} 个`);
  return failed.length ? 2 : 0;
}
main().then((c) => { console.log(c === 0 ? '核心功能检查通过 ✅' : '存在异常，详见上方'); process.exit(c); }).catch((e) => { console.error('[dev-core-check] 失败：', e); process.exit(1); });