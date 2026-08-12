#!/usr/bin/env bash
# 一键部署「宝贝学习乐园」到 Cloudflare Workers（静态站 + AI BFF 一体）
#
# 前置条件（二者其一）：
#   1) 环境变量已注入 CLOUDFLARE_API_TOKEN（推荐，非交互 CI/自动化用）
#   2) 或已执行过 ./node_modules/.bin/wrangler login 留下交互会话
#
# 用法：
#   bash scripts/deploy.sh
# 或注入令牌后：
#   CLOUDFLARE_API_TOKEN=xxxx bash scripts/deploy.sh
#
# 说明：遵循项目铁律——
#   - 构建不管道 tail（避免掩盖 tsc 失败重传旧 dist）
#   - 部署前清代理 env（wrangler 在本机会被代理 SIGKILL/卡死）
#   - 构建放开 heap 上限（vite 大仓易 OOM）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 0a) StepFun 密钥说明（默认模型 step-3.7-flash 走 STEPFUN_API_KEY；与下方 CLOUDFLARE 鉴权同源，均需令牌）
echo "ℹ️  默认模型已切换为 step-3.7-flash（StepFun 阶跃星辰）。" >&2
echo "   若 STEPFUN_API_KEY 已随 CLOUDFLARE 令牌一起就绪，用下方一条命令即可完成「密钥注入 + 构建 + 部署」：" >&2
echo "     CLOUDFLARE_API_TOKEN=xxxx STEPFUN_API_KEY=yyyy bash scripts/deploy.sh" >&2

# 0b) 若有 STEPFUN_API_KEY 环境变量，注入为 Worker secret（需 CLOUDFLARE 已鉴权）
if [ -n "${STEPFUN_API_KEY:-}" ]; then
  echo "==> 注入 STEPFUN_API_KEY 为 Worker secret ..."
  cd "$ROOT/worker"
  printf '%s' "$STEPFUN_API_KEY" | env -u HTTP_PROXY -u HTTPS_PROXY -u NO_PROXY ./node_modules/.bin/wrangler secret put STEPFUN_API_KEY
fi

# 0) CLOUDFLARE 凭证预检（快速失败，给出清晰指引）
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -z "${CLOUDFLARE_API_KEY:-}" ]; then
  echo "❌ 未检测到 CLOUDFLARE_API_TOKEN / CLOUDFLARE_API_KEY，无法非交互部署。" >&2
  echo "   方式一（推荐，一次性命令）：" >&2
  echo "     CLOUDFLARE_API_TOKEN=xxxx STEPFUN_API_KEY=yyyy bash scripts/deploy.sh" >&2
  echo "   方式二：交互登录（仅本机一次）" >&2
  echo "     cd $ROOT/worker && ./node_modules/.bin/wrangler login" >&2
  echo "     STEPFUN_API_KEY=yyyy bash scripts/deploy.sh" >&2
  exit 1
fi

# 1) 生产构建（heap 上限 3072M，严禁管道 tail）
echo "==> [1/2] 生产构建 npm run build"
cd "$ROOT"
NODE_OPTIONS=--max-old-space-size=3072 npm run build

# 2) 部署（清代理 env，使用本地 wrangler 二进制）
echo "==> [2/2] 部署 wrangler deploy (proxy env cleared)"
cd "$ROOT/worker"
env -u HTTP_PROXY -u HTTPS_PROXY -u NO_PROXY ./node_modules/.bin/wrangler deploy --outdir=../dist

echo "✅ 部署完成：xkxly.ccwu.cc 与 baobei-bff.xujinlong76.workers.dev 同步更新"
