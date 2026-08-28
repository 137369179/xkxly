# `main` 分支保护规则配置指南

> 状态：**REST 通道全局不可用，GitHub Web 手动为唯一路径**（2026-08-28 复测确认）
> 原因：诊断确认**整个 `api.github.com` 被网络中间层全局 301 重定向到 `github.com`（Web 端）**——`/user`、`/repos/...`、graphql 全部 301，且用户的**本机 macOS 终端**同样 301。这不仅是 WorkBuddy 沙箱问题，而是当前网络环境对 GitHub REST API 的全局拦截。故 REST/`gh`/MCP 写均不可达。
>
> ⚠️ **重要更正**：此前 `bash scripts/branch-protection-local.sh apply` 两次都返回 301，但脚本误报「✅ 配置完成」——**实际从未生效，`main` 分支保护规则至今未改动**。脚本已修复该谎报 bug（非 2xx 明确报错并中止），当前网络下会正确提示改用 Web 手动。
>
> ✅ **唯一可行路径：GitHub Web 手动配置**（浏览器走 github.com，不受 api 子域 301 影响）：
> 1. 打开 `https://github.com/137369179/xkxly/settings/branches`
> 2. 若已有 `main` 规则 → 点 **Edit**；若无 → **New rule**，Branch name pattern 填 `main`
> 3. 勾 **Require a pull request before merging**；展开后 **Required approvals = 1**；勾 **Dismiss stale approvals when new commits are pushed**
> 4. **不要**勾 Require review from code owners / Require approval from PR 发起人
> 5. Require status checks to pass：**保持关闭**（当前 CI 是 commit status，开启会卡合并）
> 6. **Require administrators (`enforce_admins`)：保持关闭（false）** ← 保留你自合并能力
> 7. Allow force pushes / Allow deletions：**关闭**
> 8. 点 **Save changes**
>
> （脚本 `scripts/branch-protection-local.sh` 保留作网络恢复后的备用工具，已修好错误处理；不要在当前网络下依赖它。）

## 一、先查看现有规则（关键第一步）

路径：**仓库 `137369179/xkxly` → Settings → Branches → Branch protection rules**

> ⚠️ PR #20 当时的 `mergeable_state` 为 `blocked`（要求 review），说明 `main` **很可能已存在一条分支保护规则**。请先确认它现在的内容，再按需调整，避免重复创建或配置冲突。

## 二、推荐配置（兼顾安全 + 单一开发者自合并工作流）

仓库目前由单一主要开发者（`137369179`）自开发自合并，且偏好「绝对自主、不要反复确认」。因此推荐**不对 admin 强制 review**，仅阻止非 admin 无审查合入。

新建/编辑规则（Branch name pattern = `main`）：

| 选项 | 推荐值 | 说明 |
|---|---|---|
| Require a pull request before merging | ✅ 开启 | 核心开关 |
| └ Required approvals | **1** | 至少 1 个审批 |
| └ Dismiss stale approvals when new commits are pushed | ✅ 开启 | 新提交后旧审批失效 |
| └ Require review from code owners | ❌ 关闭 | 除非已配置 `CODEOWNERS` |
| └ Require approval from PR 发起人 | ❌ 关闭 | 单一开发者无意义 |
| Require status checks to pass | ❌ 关闭* | *除非已在仓库配置了具名 CI check；当前 CI 为 commit status 非 check run，开启会卡死合并 |
| Require conversation resolution | 可选 | 按需 |
| **Require approvals for administrators (enforce_admins)** | **❌ 关闭 (false)** | **重要**：保留你自己（admin）的自合并能力，避免阻塞日常快速合入；仅阻止非 admin 无审查合入 |
| Allow force pushes | ❌ 关闭 | 更安全 |
| Allow deletions | ❌ 关闭 | 保护主分支 |

> 若你希望**连自己也必须经 review**（最高安全），可开启 `enforce_admins=true`，但单一账号下需第二个账号/协作者 review，会阻塞自合并——一般不推荐当前阶段。

## 三、网络恢复后的一键脚本（备用）

当沙箱网络恢复（`curl https://api.github.com/user` 返回 200）时，用 keychain PAT 执行：

```bash
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d '{
    "required_status_checks": null,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "require_last_push_approval": false
    },
    "enforce_admins": false,
    "restrictions": null,
    "required_linear_history": false,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": false
  }' \
  https://api.github.com/repos/137369179/xkxly/branches/main/protection
```

## 四、验证方法

配置后，新建一个测试 PR 并查看其 `mergeable_state`：
- 应为 `blocked`（缺少审批）而非 `clean` → 证明规则生效
- 你（admin）用 PAT 仍可对已审批/或绕过方式合并（取决于 `enforce_admins`）
