#!/usr/bin/env bash
#
# 本机配置 main 分支保护规则
#
# 用法（在本机 macOS 终端执行）：
#   cd "/Users/mac/WorkBuddy/学习天地/宝贝学习乐园"
#   bash scripts/branch-protection-local.sh view    # 查看现有规则
#   bash scripts/branch-protection-local.sh apply   # 确认后应用推荐配置
#
# 说明：
#   - 脚本从本机钥匙串(osxkeychain)取 GitHub PAT，不会回显明文
#   - 开头会 unset 沙箱代理变量；若仍收到 301，说明网络层对 api.github.com 全局拦截，
#     REST 通道不可用，此时脚本会明确报错并提示改用 GitHub Web 手动配置（不会谎报成功）
#   - apply 会先展示现有规则，并要求键入 y 才真正 PUT（防误改）
#
# 重要：当前网络环境（含本机）对 api.github.com 一律 301 重定向到 github.com(Web 端)，
#       故 REST 方式大概率不可用，请直接走 GitHub Web 手动配置（见 docs/branch-protection-setup.md）。
#
set -euo pipefail

# 清除可能的沙箱代理，确保本机直连 GitHub API
unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy 2>/dev/null || true

OWNER=137369179
REPO=xkxly
BRANCH=main
API="https://api.github.com/repos/$OWNER/$REPO/branches/$BRANCH/protection"

# 从本机钥匙串取 PAT（git credential fill）
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
if [ -z "$TOKEN" ]; then
  echo "❌ 未从本机钥匙串取到 GitHub PAT。"
  echo "   请确认 macOS 钥匙串中存在 github.com 的 internet password，"
  echo "   或在执行前 export GITHUB_TOKEN=你的token 后重试。"
  exit 1
fi

H_AUTH=(-H "Authorization: Bearer $TOKEN")
H_JSON=(-H "Accept: application/vnd.github+json" -H "Content-Type: application/json")

# 严格校验 HTTP 码：2xx 成功、404 无规则、其余（含 301）视为 REST 通道不可用
check_http() {
  local code="$1" bodyfile="$2" action="$3"
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then return 0; fi
  if [ "$code" = "404" ]; then return 1; fi
  echo "  ⚠️ HTTP=$code（通常为 301 重定向到 github.com Web 端）—— 网络层对 api.github.com 的 REST 调用被全局拦截。"
  echo "     当前网络环境下 REST 通道不可用，$action"
  echo "     原始响应体："; cat "$bodyfile" 2>/dev/null
  return 2
}

cmd="${1:-view}"

if [ "$cmd" = "view" ]; then
  echo "=== 当前 $BRANCH 分支保护规则 (GET $API) ==="
  HTTP=$(curl -s -o /tmp/bp_view.json -w "%{http_code}" "${H_AUTH[@]}" "${H_JSON[@]}" "$API")
  if [ "$HTTP" = "200" ]; then
    python3 -m json.tool /tmp/bp_view.json
    exit 0
  elif [ "$HTTP" = "404" ]; then
    echo "  (HTTP 404) main 当前【没有】任何分支保护规则。"
    exit 0
  else
    check_http "$HTTP" /tmp/bp_view.json "无法读取现有规则。"
    exit 2
  fi
fi

if [ "$cmd" = "apply" ]; then
  echo "=== 步骤1：读取现有规则（供你核对）==="
  HTTP=$(curl -s -o /tmp/bp_current.json -w "%{http_code}" "${H_AUTH[@]}" "${H_JSON[@]}" "$API")
  if [ "$HTTP" = "200" ]; then
    python3 -m json.tool /tmp/bp_current.json
  elif [ "$HTTP" = "404" ]; then
    echo "  (HTTP 404) 当前无规则，将新建。"
  else
    check_http "$HTTP" /tmp/bp_current.json "读取失败且 REST 通道被拦截，继续 PUT 也只会再次 301、无任何效果。"
    echo "  ➡️ 请改用 GitHub Web 手动配置：仓库 Settings → Branches → Branch protection rules。"
    exit 2
  fi
  echo ""
  echo "即将整段替换 main 保护规则为推荐配置："
  echo "  Require pull request before merging = true"
  echo "  Required approvals                = 1"
  echo "  Dismiss stale approvals           = true"
  echo "  enforce_admins                    = false  (保留你自合并能力，仅阻非 admin 无审查合入)"
  echo "  allow_force_pushes / deletions    = false"
  echo "  required_status_checks            = null   (当前 CI 为 commit status，开启会卡合并)"
  echo ""
  read -r -p "确认应用以上配置? 键入 y 继续: " ans
  if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
    echo "已取消，未做任何修改。"
    exit 0
  fi

  BODY='{
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
  }'

  echo "=== 步骤2：PUT 推荐配置 ==="
  PUT_HTTP=$(curl -s -X PUT "${H_AUTH[@]}" "${H_JSON[@]}" --data-binary "$BODY" "$API" -o /tmp/bp_result.json -w "%{http_code}")
  echo "  HTTP=$PUT_HTTP"
  echo "--- 响应 ---"
  python3 -m json.tool /tmp/bp_result.json 2>/dev/null || cat /tmp/bp_result.json
  echo ""
  if [[ "$PUT_HTTP" =~ ^2[0-9][0-9]$ ]]; then
    echo "✅ 配置成功。可在 GitHub Web: Settings → Branches → Branch protection rules 复核。"
    echo "   验证：新建一个测试 PR，其 mergeable_state 应为 blocked（缺审批）即证明生效。"
    exit 0
  else
    echo "❌ 配置失败（HTTP=$PUT_HTTP）。${BRANCH} 分支保护规则【未变更】。"
    echo "   当前网络对 api.github.com 返回 $PUT_HTTP（通常 301 到 github.com Web 端），REST 通道不可用。"
    echo "   ➡️ 请改用 GitHub Web 手动配置：仓库 Settings → Branches → Branch protection rules（详见 docs/branch-protection-setup.md）。"
    exit 2
  fi
fi

echo "用法: $0 [view|apply]"
exit 1
