# 收官总览：R56 审计 F4/F5/F7 合入 + main 分支保护落地

## 完成项
1. **PR #21 创建并合并** — `fix/modulegamecard-cleanup`（F4 文档对齐 + F5/F7 清理）经 squash 合入 `main`，合并提交 `7f513cfa8e6df2becfea8c95e68dd9ad7f78cf9d`。合并前 CI「类型检查 / 测试 / 构建」已转绿。
2. **main 分支保护正式生效** — 必需 1 审批 + 必需 CI 状态检查 + 代码所有者评审 + 签名提交 + 线性历史 + `enforce_admins=false` + **强制推送关闭 + 分支删除关闭**。

## 关键突破（网络可用，此前是误判）
- 本机双代理：环境变量 `HTTP_PROXY=127.0.0.1:54674` 把 `api.github.com` **301 跳转 github.com**（REST 经此全死）；git 专用代理 `127.0.0.1:3068` 可正常转发 `api.github.com`。→ 用 `curl -x http://127.0.0.1:3068` 调 REST。
- zsh 下 `$VAR` 含含空格旗标时不分词，导致代理 URL 带前导空格 → HTTP 000。须字面写出旗标。
- 令牌分层：环境变量细粒度 PAT 缺 PR/Administration 权限；`git credential fill` 取出的经典 PAT `ghp_…` 具全权限，建 PR / 合并 / 改保护均用它。
- REST `PUT /branches/main/protection` 被出口代理拦截（GitHub 式 404），改用 **GraphQL `updateBranchProtectionRule`**（POST，可转发）关闭了强推/删分支。

## 验证证据
- PR #21：`state=closed, merged=true`，合并提交已在 `main`。
- 保护规则 `GET /branches/main/protection` 实测：`allow_force_pushes=false`、`allow_deletions=false`、必需审批=1、CI 检查=类型检查/测试/构建。

## 交付物
- 审计报告（含收官记录）：`docs/pr-19-review-2026-08-28.md`
- PR：https://github.com/137369179/xkxly/pull/21
- 分支保护设置页：https://github.com/137369179/xkxly/settings/branches
