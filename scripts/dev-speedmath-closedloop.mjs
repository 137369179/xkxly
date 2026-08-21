/**
 * 数字速算（SpeedMath）交互闭环验证
 * 路径：#/numbers → cards/口算 → 极速口算挑战 → 开始挑战 → 出题 → 点选项 → 确认判定/换题、无崩溃
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function chromePath(){const c=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'];for(const p of c){try{if(existsSync(p))return p}catch{}}return 'google-chrome'}
function launch(){return new Promise((res,rej)=>{const ch=spawn(chromePath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0'],{stdio:['ignore','pipe','pipe']});let s='';const t=setTimeout(()=>rej(new Error('timeout')),20000);ch.stderr.on('data',d=>{s+=d.toString();const m=s.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(t);res({ch,wsUrl:m[1]})}});ch.on('error',e=>{clearTimeout(t);rej(e)})})}
class C{constructor(ws){this.ws=ws;this.id=0;this.p=new Map();this.sid=null}send(m,p2={},s=false){return new Promise(r=>{const i=++this.id;this.p.set(i,r);const m2={id:i,method:m,params:p2};if(s&&this.sid)m2.sessionId=this.sid;this.ws.send(JSON.stringify(m2))})}async at(){const t=await this.send('Target.createTarget',{url:'about:blank'});const {sessionId}=await this.send('Target.attachToTarget',{targetId:t.targetId,flatten:true});this.sid=sessionId;await this.send('Runtime.enable',{},true)}eval(e){return this.send('Runtime.evaluate',{expression:e,returnByValue:true},true).then(r=>r.result?.value)}}
const INJECT=`window.__e={errs:[]};window.addEventListener('error',e=>{try{window.__e.errs.push('error:'+(e.message||''))}catch(_){}});window.addEventListener('unhandledrejection',e=>{try{window.__e.errs.push('unhandledrejection:'+String(e.reason&&(e.reason.message)||e.reason))}catch(_){}});const _c=console.error;console.error=function(){try{window.__e.errs.push('console.error:'+String(arguments[0]).slice(0,200))}catch(_){}return _c.apply(console,arguments)};true;`;
const CRASH=/Maximum update depth|Cannot read prop|is not a function|is not defined|Objects are not valid as a React child|Too many re-renders|Rendered more hooks|Cannot update a component|undefined is not iterable|null is not iterable/i;

async function main(){
 const {ch,wsUrl}=await launch();const ws=new WebSocket(wsUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});const c=new C(ws);ws.onmessage=ev=>{const d=JSON.parse(ev.data);if(d.id&&c.p.has(d.id)){c.p.get(d.id)(d.result);c.p.delete(d.id)}};await c.at();
 await c.send('Page.navigate',{url:'http://localhost:5173/'},true);await sleep(2500);
 await c.eval(`location.hash='#/numbers'`);await sleep(3500);
 await c.eval(INJECT);
 const step=(name)=>console.log('\n=== ' + name + ' ===');
 const clickByText=(re)=>{return c.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>${re.toString()}.test((b.innerText||'')));if(!b)return false;b.click();return true})()`)};
 const readQuiz=()=>c.eval(`(()=>{const opts=[...document.querySelectorAll('button')].map(b=>(b.innerText||'').trim()).filter(t=>t&&t.length<=3&&!/^[A-Za-z]/.test(t));const body=(document.getElementById('root')||{}).innerText||'';return JSON.stringify({ok:(body.match(/✅\\s*(\\d+)/)||[])[1]||'0', hasColon:/⏱/.test(body), optCount:[...document.querySelectorAll('button:not([disabled])')].length, question:(body.match(/[1-9][0-9]*[+\\-×÷*][0-9]+=?/)||[])[0]||''})})()`);

 step('① 进入数字王国，点击“口算”入口');
 let ok=await clickByText(/口算/);console.log('点击口算:',ok?'是':'否');await sleep(2000);
 step('② 打开“极速口算挑战”（若存在）');
 let ok2=await clickByText(/极速|速算/);console.log('点击极速速算:',ok2?'是':'否（可能已在列表）');await sleep(2000);
 step('③ 点击“开始挑战”（兼容中英）');
 let ok3=false;
 for (const re of [/开始挑战|Start Challenge|Start challenge/i, /*兜底：全宽主按钮，前面第几个 */ /^开始|Start$/]) {
   ok3 = await clickByText(re); if (ok3) break;
 }
 if (!ok3) {
   // 兜底：SpeedMath 选择屏的“开始”是全宽 CandyButton，取选中格态后页面主按钮
   ok3 = await c.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.className&&/w-full|full/i.test(x.className));if(!b)return false;b.click();return true})()`);
   console.log('点击开始(全宽兜底):', ok3?'是':'否');
 } else { console.log('点击开始:', ok3?'是':'否'); }
 await sleep(2500);

 let q=JSON.parse(await readQuiz());console.log('出题状态:',JSON.stringify(q));
 const crashes=await c.eval('window.__e?window.__e.errs:[]');
 console.log('当前错误数:',crashes.length, crashes.slice(0,3));
 const inQuiz=q.hasColon&&q.optCount>=2;
 if(!inQuiz){console.log('未能进入速算答题界面（选择器未命中）');ws.close();ch.kill('SIGKILL');process.exit(2);}

 step('④ 精确点速算选项并断言计分递增（限定作用域 py-4/text-2xl）');
 const readOk=()=>c.eval(`(()=>{const body=(document.getElementById('root')||{}).innerText||'';const m=body.match(/✅\\s*(\\d+)/);return m?parseInt(m[1],10):-1})()`);
 const optCount=()=>c.eval(`(()=>[...document.querySelectorAll('button')].filter(b=>/py-4/.test(b.className)&&/text-2xl/.test(b.className)&&!b.disabled).length)()`);
 const clickOpt=()=>c.eval(`(()=>{const bs=[...document.querySelectorAll('button')].filter(b=>/py-4/.test(b.className)&&/text-2xl/.test(b.className)&&!b.disabled);if(!bs.length)return false;bs[0].click();return true})()`);
 const crashArr = crashes.filter(e=>CRASH.test(e));
 let okBefore=await readOk(); let scored=false; let attempts=0;
 for (attempts=0; attempts<6 && !scored; attempts++) {
   const n=await optCount();
   if (n<2) { await sleep(900); continue; }
   const before=await readOk();
   await clickOpt(); await sleep(420);
   const after=await readOk();
   if (after>before) { scored=true; console.log(`答对并计分递增：ok ${before} → ${after}（第 ${attempts+1} 次作答）`); break; }
   await sleep(900); // 答错→等待换下一题继续
 }
 const crash2=await c.eval('window.__e?window.__e.errs:[]');
 (crash2.filter(e=>CRASH.test(e))).forEach(e=>crashArr.push(e));
 console.log('\n=== 结论 ===');
 console.log('进入答题界面:', inQuiz?'是':'否');
 console.log('作答仍有倒计时(游戏中):', (await c.eval('window.__e?true:true')) && (await c.eval('(()=>{const body=(document.getElementById("root")||{}).innerText||"";return /⏱/.test(body)})()')) ? '是':'否');
 console.log('计分递增断言:', scored?`通过（ok 递增至 ${await readOk()}）`:'未触发');
 console.log('应用层崩溃:', crashArr.length, crashArr.slice(0,2));
 const pass = inQuiz && scored && crashArr.length===0;
 console.log(pass?'交互闭环 + 计分递增 正常 ✅':'存在异常 ❌');
 ws.close();ch.kill('SIGKILL');process.exit(pass?0:2);
}
main().catch(e=>{console.error(e);process.exit(1)});