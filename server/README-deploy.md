# BFF 部署包 · 宝贝学习乐园 AI 代理

零依赖 Node 服务，`node index.mjs` 直接跑（仅用 Node 内置模块，无 npm install）。

## 包含文件
- `index.mjs` — 主服务（SSE 转发 / 限流 / CORS 白名单 / 静态服务可关）
- `package.json` — 平台识别用（`npm start` = `node index.mjs`）
- `.env.production.example` — 生产环境变量模板（**真实值填平台控制台，不入库**）

## 平台部署要点（以腾讯云 CloudBase 云托管为例）
1. 上传本目录（或关联仓库，仅 `index.mjs` + `package.json` 即够，无需 node_modules）。
2. 环境变量：按 `.env.production.example` 填 `AGNES_API_KEY` / `AGNES_BASE_URL` 等。
3. `AI_SERVE_STATIC=0`（静态站单独托管时）、`AI_ALLOW_ORIGIN=<静态站域名>`。
4. 部署后验证：
   - `GET  https://<域名>/api/ai/health` → `{"ok":true,...}`
   - `POST https://<域名>/api/ai/chat` 最小请求 → SSE 流式帧 + `[DONE]`
5. 前端构建把 AI 指到本服务：`VITE_AI_PROXY_URL=https://<域名> npx vite build`，再部署 dist。

完整方案见项目根目录《BFF托管方案.md》。
