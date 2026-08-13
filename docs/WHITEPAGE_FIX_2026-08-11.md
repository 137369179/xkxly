# 线上白屏抢修报告 · 2026-08-11

> 触发：用户反馈「打开线上版本出错，空白页面」，附控制台三条报错。
> 结果：白屏根因消除，并顺带修好两个「已上线但线上必然失效」的功能。当前线上 Version `ddfed9bf`。

---

## 一、用户上报的三条报错，逐条定性

| # | 报错 | 定性 | 处理 |
|---|---|---|---|
| 1 | `Cannot access 'Oi' before initialization` @ `vendor-BPhSzWA9.js` | **致命 · 白屏真凶** | 已修（分包重构） |
| 2 | CSP 拦截 `static.cloudflareinsights.com/beacon.min.js` | 噪音，但确实是配置缺失 | 已修（CSP 放行） |
| 3 | 字体 / hero 图 preload 未被使用 | 无害提示 | 不处理 |

---

## 二、根因 1（致命）：three 族跨 chunk 循环依赖导致 TDZ

### 现象
首屏 eager 加载的 generic `vendor` chunk 在求值阶段就抛 `ReferenceError`，React 根本没机会挂载 → 整站空白，任何路由都进不去。

### 根因
`vite.config.ts` 的 `manualChunks` 中，three 分支正则**漏了两个传递依赖**：

- `@monogrid/gainmap-js` —— 报错里 `class ah extends Oi` 的 `QuadRenderer` / `GainMap` 实际拥有者
- `maath`

这两个包落进了 generic `vendor`，而 `three` / `@react-three/drei` 在 `vendor-three`。同一条依赖族被劈成两个 chunk 后，Rollup 无法保证包内循环依赖的求值顺序，于是 `Oi`（基类）尚未初始化就被子类继承。

### 修复
```ts
// vite.config.ts
resolve: { dedupe: ['react', 'react-dom', 'scheduler', 'three'] }

// manualChunks —— 整族（含传递依赖）并入同一 chunk
if (/(?:^|[\\/])node_modules[\\/](?:@react-three|@monogrid|three|three-stdlib|three-mesh-bvh|maath|troika-three-text|troika-three-utils|troika-worker-utils|camera-controls)(?:[\\/]|$)/.test(id))
  return 'vendor-three';
```

### 证据
- generic vendor 哈希 `vendor-BPhSzWA9.js` → `vendor-DSeHZQhU.js`，`QuadRenderer` 等符号迁移至 `vendor-three-*.js`
- 无头浏览器加载：`Cannot access 'Oi'` 消失，`#root` 正常渲染

### 排查弯路（写下来避免重犯）
改完正则后重新构建，chunk 哈希 **byte-identical**，一度误判为构建缓存问题（清 `dist/assets` + `node_modules/.vite` 重建仍相同）。真因是正则压根没匹配到泄漏包。
**破法：不要猜正则，在 `manualChunks` 里临时 `fs.appendFileSync` 打印 `id`，把 three 族 11 个包根全部枚举出来再写正则。**

---

## 三、根因 2：3D 猫场景的外部 HDRI 被 CSP 拦死

修完白屏后，无头验证发现 `#/realistic_cat` 虽然渲染了但 `canvas = 0`，控制台：

```
Refused to connect to 'https://raw.githack.com/pmndrs/drei-assets/.../hdri/lebombo_1k.hdr'
because it violates the following Content Security Policy directive: "connect-src 'self' ..."
```

`CatScene.tsx` 用了 `<Environment preset="apartment">`，drei 的 preset 是**隐形外部 CDN 依赖**。后果不止 CSP：国内网络访问 raw.githack.com 本就不稳，离线 PWA 场景 100% 失败。失败形态还很隐蔽——不报错，只是 Suspense 永久挂起、canvas 挂不上。

### 修复：不放行 CDN，直接消灭外部依赖

```tsx
<Environment resolution={256} frames={1} environmentIntensity={0.6}>
  <Lightformer intensity={2.2} color="#fff6ea" rotation-x={Math.PI/2} position={[0,5,-2]} scale={[12,12,1]} />   {/* 天花板灯带 */}
  <Lightformer intensity={1.1} color="#e6f0ff" rotation-y={Math.PI/2} position={[-6,1.5,0]} scale={[10,4,1]} />  {/* 左侧窗户冷光 */}
  <Lightformer intensity={0.9} color="#ffe9d2" rotation-y={-Math.PI/2} position={[6,1.5,0]} scale={[10,4,1]} />  {/* 右侧墙面暖反弹 */}
  <Lightformer form="ring" intensity={1.4} position={[2.5,3,3]} scale={2.2} />                                    {/* 毛发/眼睛高光 */}
</Environment>
```

本地实时烘一张 256px 立方环境贴图，只渲染一帧，开销可忽略，视觉上保留了室内暖调 PBR 反射。

**验证：本地无头加载 external requests = 0；线上 CAT 页 `canvas = 1`。**

---

## 四、根因 3：Kokoro 神经语音引擎线上必然静默失败

顺手排查其余外部依赖时发现：`src/lib/tts/settings.ts` 的 `kokoroLibUrl` 指向 `cdn.jsdelivr.net`，模型走 huggingface，ONNX Runtime 在 blob Worker 里跑 WASM。原 CSP **三项全拦** —— 家长中心里开启「神经引擎」后会无声失败。

统一后的 CSP（`public/_headers` 与 `worker/index.mjs` 两处同步）：

```
default-src 'self';
script-src  'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://cdn.jsdelivr.net;
style-src   'self' 'unsafe-inline';
font-src    'self';
img-src     'self' data: blob:;
connect-src 'self' https://static.cloudflareinsights.com https://cdn.jsdelivr.net
            https://huggingface.co https://*.huggingface.co https://*.hf.co;
media-src   'self' blob:;
worker-src  'self' blob:;
object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

- 每一项放行理由已写成注释锁在 `worker/index.mjs` 里，防止后人收紧时又把功能锁死。
- 顺手删掉 `connect-src` 里多余的 `https://api.agnes-ai.cn`：前端只调同源 `/api`，上游请求发生在 worker 服务端，CSP 管不到它。
- **注意 CSP 有两个写点**，线上实际生效的是 worker 那份。

---

## 五、顺带修复

`src/modules/wrongbook/WrongBookStats.tsx` 重复声明 `today`（`TS2451`）—— 又一例被 `.tsbuildinfo` 增量缓存掩盖、只有 `tsc -b --force` 才暴露的预存错误。

---

## 六、两条验证环境假阳性（别再被骗）

本机 `/Applications/Google Chrome.app` 是 **Chrome 87（2020 年版）**：

1. `t.entries.at is not a function` / `this.i.at is not a function` —— 抓 stack 确认**全部来自 `static.cloudflareinsights.com/beacon.min.js`**（Cloudflare 自动注入的 RUM），且 Chrome 87 无 `Array.prototype.at`（探测 `hasArrayAt: false`）。真实用户浏览器（Chrome 92+）不会触发，**与本站代码无关**。
2. `'wasm-unsafe-eval' is an invalid source, will be ignored` —— Chrome 87 不认该关键字，Chrome 97+ 正常。

另：`~/.cache/puppeteer/chrome/149.0.7827.22-chrome-mac-x64.zip` 是坏包（`cannot find zipfile directory`），想用现代浏览器验证需重新下载。

沉淀的验证脚本：`/tmp/verify_headless.mjs`（本地 dist）、`/tmp/verify_live.mjs`（线上走代理）、`/tmp/diag_stack.mjs`（抓 pageerror stack + 探测 JS 能力）。判活指标：`#root.childElementCount > 0`、3D 路由 `canvas > 0`、external requests 数、pageerror 数。

---

## 七、门禁与部署

| 环节 | 结果 |
|---|---|
| `tsc -b --force` | **0 错** |
| `vitest run` | **17 文件 / 280 用例 全绿** |
| `npm run build` | exit 0，入口 `index-BrmtuhNd.js` |
| 本地无头验证 | HOME 渲染 ✅ / CAT `canvas=1` ✅ / external req **0** ✅ / pageerror **0** ✅ |
| `wrangler deploy` | Version `ddfed9bf-2190-4bcc-a7bf-a7d1790a22c9` |
| 线上复验 | entry hash 一致 ✅ / 新 CSP 生效 ✅ / CAT `canvas=1` ✅ / 无 TDZ ✅ |

### 部署 Version 归档
- `29ebd02a` —— three TDZ 修复 + beacon CSP（入口 `index-98X1EYNb.js`）
- `ddfed9bf` —— HDRI 程序化 + Kokoro CSP（入口 `index-BrmtuhNd.js`）**← 当前线上**

> 边缘缓存提示：部署后 `xkxly.ccwu.cc` 首次请求可能仍 `cf-cache-status: HIT` 返回旧 HTML，约十几秒后自动转新版。复验请重试几次再判定。

---

## 八、仍未完成（非本轮范围）

- **P0-2 密钥轮换** —— 需在 Agnes 平台轮换 `AGNES_API_KEY` 后 `cd worker && npx wrangler secret put AGNES_API_KEY`。平台操作 agent 无法代执行，AI 相关功能在此之前仍不可用。
- **P2-5** 消除 `lib → store` 层倒置（已确认存在 `store/useStore.ts ↔ lib/adaptChain.ts` 等 2 个循环，非白屏根因）。
- **P3-3** 收敛剩余约 13 处 `as any`；**P3-4** 开启 `noUnusedLocals` / `noUncheckedIndexedAccess` 并修复。
