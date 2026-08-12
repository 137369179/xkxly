# AI BFF · Cloudflare Worker 适配层（免费部署）

`server/index.mjs` 的线上免费替代：同样的 SSE 转发 / 密钥隔离 / CORS 白名单 / 限流，
零依赖纯 Web API，部署在 Cloudflare 免费计划（每天 10 万次请求，孩子场景用不完）。

**静态站 + AI 一体**：`wrangler.toml` 已配 `[assets]` 指向项目 `dist/`，
部署后同一个域名同时提供网站页面和 `/api/ai/*`（同域无需跨域）。前端构建后 `wrangler deploy` 即整体更新。

> 本地开发仍用 `server/index.mjs`（`npm run server`）；这个 Worker 只在线上用。

## 部署（3 步，需要 Cloudflare 账号）

```bash
cd worker

# 1. 登录（一次性，浏览器授权）
wrangler login
# 或：已有 API Token 时直接用环境变量（CI 里也是这个方式）
#   export CLOUDFLARE_API_TOKEN=你的token
#   export CLOUDFLARE_ACCOUNT_ID=你的account_id

# 2. 写入密钥（值不会显示、不入库）
wrangler secret put AGNES_API_KEY      # 粘贴真实 key
wrangler secret put AGNES_BASE_URL     # 可选，默认 https://api.agnes-ai.cn/v1

# 3. 部署
wrangler deploy
```

部署完成后会输出 `https://baobei-bff.<你的子域>.workers.dev`。

## 验证

```bash
curl https://baobei-bff.<你的子域>.workers.dev/api/ai/health
# → {"ok":true,"runtime":"workers",...}
```

## 前端接入（AI 功能上线）

```bash
# 在项目根目录，把 AI 请求指向 Worker，重新构建
VITE_AI_PROXY_URL=https://baobei-bff.<你的子域>.workers.dev npx vite build
# 再把 dist/ 部署到静态托管，AI 功能即随网站上线
```

## 免费版限制（重要）

- **单请求 wall-clock 约 30s**：长推理流可能被平台掐断。前端已容忍「无 [DONE] 提前收尾」，
  截断时显示已流出的内容，不会报错。家长周报等长文场景建议把
  `wrangler.toml` 里 `VITE_AI_DEFAULT_MODEL` 改为 `agnes-2.0-flash`（快）。
- **workers.dev 域名在国内访问稳定性一般**：若正式给孩子用且访问慢，可绑定自有域名
  （Cloudflare 免费计划支持自定义域名路由到 Worker），或升级 CloudBase 云托管（见根目录《BFF托管方案.md》）。
- 限流基于 Cache API（尽力而为），防连点够用，跨边缘节点不严格。

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 本地 `wrangler dev` 调试 |
| `npm run deploy` | 部署/更新 |
| `npm run secrets` | 写两个密钥 |
| `npm test` | 本地逻辑自测（13 项断言，无需登录） |
