# BFF 单独托管方案 · 宝贝学习乐园 AI 功能上线

> 背景：前端是纯静态 SPA（CloudStudio 静态托管），AI 请求走 `/api/ai/*`，由零依赖 Node BFF（`server/index.mjs`，端口 8787）转发到 Agnes 上游并持有密钥。静态托管跑不了 Node 进程，所以线上 AI 功能 404。本文给出让 AI 随网站一起上线的完整方案。

---

## 1. 现状盘点（已核实）

| 项 | 结论 |
|---|---|
| 前端 AI 出口 | 全站唯一入口 `src/lib/ai/client.ts` → `PROXY_URL` |
| PROXY_URL 定义 | `(import.meta.env.VITE_AI_PROXY_URL || '') + '/api/ai/chat'` — **构建期注入，留空则同源相对路径** |
| BFF 依赖 | **零 npm 依赖**，`node server/index.mjs` 即可运行 |
| BFF 职责 | SSE 流式转发（带背压 + 补 `[DONE]`）、双超时、每 IP 限流、密钥隔离、静态服务、CORS |
| BFF 密钥 | 全在服务端 env：`AGNES_API_KEY` / `AGNES_BASE_URL` / `AI_PROXY_PORT` / `AI_MAX_CONCURRENCY` / `AI_TIMEOUT_MS` |
| CORS | 已开 `Access-Control-Allow-Origin: *` + OPTIONS 预检（跨域就绪） |
| 构建脚本 | `npm run build` = `tsc -b && vite build`；`npm run server` 起 BFF |

**结论：前端不需要改一行代码** —— 只要构建时设 `VITE_AI_PROXY_URL=https://<BFF域名>`，bundle 里的 AI 请求就会自动打到独立 BFF。

---

## 2. 硬约束

1. **密钥只能进服务端**：Agnes 密钥绝不能进静态 bundle（谁拿到谁就能白嫖你的额度）。
2. **SSE 长连接**：托管平台要支持流式响应（推理模型要吐 70~85% 的思考链 token，连接常开几十秒）。
3. **CORS**：BFF 必须允许静态站 origin（已 `*`，够用；可加白名单收紧，见 §6）。
4. **国内可访问**：孩子用的网站，托管在海外平台延迟高、不稳定。
5. **成本**：孩子学习场景调用量极小（每天几次），免费额度足够。

---

## 3. 候选方案对比

| 方案 | 运维 | SSE 支持 | HTTPS | 改动量 | 成本 | 结论 |
|---|---|---|---|---|---|---|
| **A. CloudStudio 沙箱跑 Node BFF** | 需验证沙箱能否开公网端口+常驻 | 未知，需 POC | 平台提供 | 零代码 | 免费 | ⚠️ 先花 10 分钟验证可行性 |
| **B. 腾讯云 CloudBase 云托管(CloudRun)** | 零运维，控制台点几下 | ✅ 容器常驻，无函数超时 | ✅ 自带域名 | 零代码（BFF 原样部署） | 免费额度内≈0 | ✅ **主推** |
| **C. Cloudflare Workers 适配层** | 零运维，已有经验 | ✅ TransformStream 流式 | ✅ | 需写 ~100 行适配层（原 server 保留本地用） | 免费额度内≈0 | ✅ 次选（有账号则更快） |
| **D. 本地 BFF + 内网穿透** | 手动，域名易变 | ✅ | ✅(cloudflared) | 零代码 | 免费但地址每次变 | 只适合临时演示 |
| ~~E. 前端直连上游~~ | — | — | — | — | — | ❌ 密钥泄露，否决 |

---

## 4. 推荐路线：方案 B（CloudBase 云托管）

### 为什么是它
- BFF 是**零依赖 Node 服务**，CloudRun 容器直接 `node server/index.mjs` 原样跑，一行不改。
- 容器常驻 → SSE 长连接无超时风险；平台自带 HTTPS 域名；国内访问快。
- 密钥配在控制台环境变量，**不进仓库**。
- 免费额度对「每天几次调用」的体量绰绰有余。

### 落地步骤
```
1. 准备 BFF 部署包
   ├─ server/index.mjs            （现成，零依赖）
   └─ .env.production.example     （部署模板，值不填）
      AGNES_API_KEY=              ← 部署时填控制台
      AGNES_BASE_URL=             ← 部署时填控制台
      AI_PROXY_PORT=8787
      AI_MAX_CONCURRENCY=8
      AI_TIMEOUT_MS=90000

2. CloudBase 控制台
   ├─ 开通「云托管/CloudRun」→ 新建服务
   ├─ 运行时 Node.js → 上传 server/ 目录（或关联仓库）
   ├─ 环境变量：按 .env.production 填 AGNES_API_KEY 等
   └─ 部署 → 拿到 HTTPS 域名 https://<svc>.tcloudbaseapp.com（示例）

3. 冒烟验证（对 BFF 域名）
   ├─ GET  /api/ai/health            → 200 ok
   └─ POST /api/ai/chat              → SSE 流式帧 + [DONE]（最小请求验证）

4. 前端构建（把 AI 指到 BFF）
   VITE_AI_PROXY_URL=https://<BFF域名> npx vite build

5. 静态站照旧部署（CloudStudio）→ dist/

6. 端到端验证
   ├─ 静态站打开 → 古诗导师提问 → 思考链+回答正常
   └─ 家长中心 → 调用日志面板有记录
```

---

## 5. 备选：方案 C（Cloudflare Workers 适配层）

用户已有 Workers 部署经验（ai-nav 在 Workers 上跑过），如果更想用 Workers：

- 写一个薄 Worker（~100 行）：`POST /api/ai/chat` → 转发到 Agnes，SSE 用 `TransformStream` 流式回包；`GET /api/ai/health` → 探活。
- 密钥用 Workers Secret（`AGNES_API_KEY`）存，`wrangler secret put` 一键。
- **原 `server/index.mjs` 保留**用于本地开发（`npm run server`），Worker 只是线上同构替代。
- 注意：Workers 部署在海外边缘，国内访问延迟约 100~300ms，可接受但不如 B 稳。

---

## 6. 安全与注意事项

1. **密钥三条铁律**
   - `.env.local` / `.env.production`（含真实值）**永不提交 git**（确认 `.gitignore` 已含 `.env*`，但保留 `.env*.example`）。
   - 线上密钥只进平台环境变量 / Secret，不进 bundle。
   - 定期轮换；发现异常消耗先查 BFF 日志。
2. **CORS 收紧（建议，小改动）**：现为 `*`。加 `AI_ALLOW_ORIGIN` 环境变量白名单（逗号分隔），非白名单 origin 拒绝。孩子端无 cookie 场景，`*` 其实够用，但收紧更稳妥。
3. **限流已在位**：BFF 有每 IP 滑动窗口（默认 30/min，`AI_RATE_LIMIT_PER_MIN` 可调），公网暴露后建议保持默认或收紧到 20/min。
4. **TLS**：生产环境不要设 `NODE_TLS_REJECT_UNAUTHORIZED=0`（此前沙箱警告来自测试环境 shell，项目内没有；真实部署若遇 TLS 报错请修 CA 证书）。
5. **域名/备案**：国内云厂商平台域名政策以控制台实际为准（CloudBase 一般提供默认可访问域名；若绑自定义域名按平台要求备案）。
6. **BFF 静态服务可关**：BFF 同时是静态服务器（服务 dist）。线上既然有独立静态托管，BFF 建议只留 `/api/*` 路由，关闭静态服务，避免重复暴露（`AI_SERVE_STATIC=0` 之类的开关，若加）。

---

## 7. 分阶段计划

| 阶段 | 内容 | 产出 | 依赖 |
|---|---|---|---|
| **P0** | 验证 CloudStudio 沙箱能否常驻 Node + 公网端口（10 分钟 POC） | 可行→方案 A 转正；不可行→直接 B | 无 |
| **P1** | CloudBase 部署 BFF + 冒烟验证（health/SSE） | BFF 公网 HTTPS 域名 | 用户 CloudBase 账号 |
| **P2** | 前端构建注入 `VITE_AI_PROXY_URL` → 静态站部署 | AI 全功能在线 | P1 |
| **P3** | CORS 白名单 + 静态服务开关 + 部署文档固化 | 安全收口 | P1 |

> 若想「今天就先体验」，可走方案 D 临时穿透：`npx cloudflared tunnel --url http://localhost:8787` 拿到临时 https 域名 → 构建注入 → 静态站部署。缺点：地址每次重启会变、仅演示用，不建议给孩子长期用。

---

## 8. 一句话总结

**代码已就绪、跨域已开、零依赖可跑** —— 差的只是一个能常驻 Node 的公网 HTTPS 入口。主推 CloudBase 云托管（国内零运维、SSE 友好、免费额度够），其次 Cloudflare Workers（你有现成经验）；部署后前端只需一次带 `VITE_AI_PROXY_URL` 的重新构建，AI 功能即可随网站上线。

---

## 9. 免费落地：Cloudflare Workers（已实现并本地验证 ✅）

> 2026-08-04 补充：选「免费部署」路径，已把方案 C 做成成品。

- `worker/index.mjs` — 与 `server/index.mjs` 同构的 fetch handler：SSE 透传+补 `[DONE]`、密钥隔离、CORS 白名单、Cache API 轻量限流、白名单字段校验。零依赖纯 Web API，无需 `nodejs_compat`。
- `worker/wrangler.toml` + `worker/package.json` + `worker/README.md` — 部署 3 步：`wrangler login` → `wrangler secret put AGNES_API_KEY` → `wrangler deploy`。
- `worker/test.mjs` — 本地 13 项断言全过（health / 校验 / SSE 帧透传 / [DONE] / CORS 白名单 / 404），无需 Cloudflare 登录。
- 前端接入：`VITE_AI_PROXY_URL=https://baobei-bff.<子域>.workers.dev npx vite build`。
- **免费版注意**：单请求 wall-clock ~30s（长文推理可能截断，前端已容忍提前收尾）；workers.dev 域名国内访问稳定性一般，正式给孩子用可绑自定义域名或升级 CloudBase。
- 部署动作需要用户 Cloudflare 登录/Token（本机无登录态，`wrangler whoami` 未返回账号）——README 已备好命令，用户一条命令即完成。
