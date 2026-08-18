// lint 告警预算门禁：告警只许降，不许涨
// ============================================================
// 设计目标：
//   1. 用 `npx eslint "src/**/*.{ts,tsx}" --format json` 收集各规则 warning 计数
//   2. 与 scripts/lint-baseline.json 对比，任何规则超过基线 → 打印差异并 exit(1)
//   3. 支持 --update：用当前计数重写基线文件
//   4. 找不到基线文件时自动用当前值生成（首次引导）
//
// 使用方式：
//   node scripts/lint-warn-budget.mjs            # 门禁检查（CI）
//   node scripts/lint-warn-budget.mjs --update   # 刷新基线（人工治理后）
//
// 退出码：
//   0  —— 全部规则 ≤ 基线（或 --update 成功）
//   1  —— 存在规则告警数超基线（CI 门禁失败）
//   2  —— 配置/运行错误（eslint 不可用等）
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const baselinePath = resolve(__dirname, 'lint-baseline.json');

const UPDATE = process.argv.includes('--update');
const target = 'src/**/*.{ts,tsx}';

// ────────────────────────────────────────────────────────────
// 1. 运行 eslint 收集 warning 计数
// ────────────────────────────────────────────────────────────
function collectWarnings() {
  // 优先用本地 .bin/eslint，避免 npx 触发网络解析
  const localBin = resolve(root, 'node_modules/.bin/eslint');
  const bin = existsSync(localBin) ? localBin : 'npx';
  const args = existsSync(localBin)
    ? [target, '--format', 'json']
    : ['eslint', target, '--format', 'json'];

  const res = spawnSync(bin, args, {
    cwd: root,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
    timeout: 180_000,
    maxBuffer: 256 * 1024 * 1024, // eslint JSON 输出可能很大，放宽缓冲
  });

  if (res.error) {
    console.error(`[lint-budget] ✗ 无法运行 eslint: ${res.error.message}`);
    process.exit(2);
  }
  if (res.status !== 0 && !res.stdout.trim()) {
    console.error(`[lint-budget] ✗ eslint 异常退出（status=${res.status}）`);
    console.error((res.stderr || '').trim());
    process.exit(2);
  }

  let reports;
  try {
    reports = JSON.parse(res.stdout);
  } catch (e) {
    console.error(`[lint-budget] ✗ 无法解析 eslint JSON 输出: ${e.message}`);
    process.exit(2);
  }

  const counts = {};
  let errors = 0;
  let total = 0;
  for (const file of reports) {
    for (const msg of file.messages ?? []) {
      if (msg.severity === 2) errors += 1;
      if (msg.severity === 1) {
        const rule = msg.ruleId || '(unknown)';
        counts[rule] = (counts[rule] || 0) + 1;
        total += 1;
      }
    }
  }
  return { counts, total, errors };
}

// ────────────────────────────────────────────────────────────
// 2. 读取基线
// ────────────────────────────────────────────────────────────
function loadBaseline() {
  if (!existsSync(baselinePath)) return null;
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf-8'));
  } catch (e) {
    console.warn(`[lint-budget] ⚠ 基线文件损坏，按不存在处理: ${e.message}`);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// 3. 主流程
// ────────────────────────────────────────────────────────────
const { counts, total, errors } = collectWarnings();
const baseline = loadBaseline();

if (errors > 0) {
  // 门禁只盯 warning；error 归零由整体 lint 流程负责，这里仅提示（部分 error 可能来自他人编辑中的文件）
  console.warn(`[lint-budget] ⚠ 当前存在 ${errors} 个 eslint error（不计入门禁，请另行清零）`);
}

if (UPDATE) {
  const baselineFile = {
    updatedAt: new Date().toISOString(),
    rules: counts,
  };
  writeFileSync(baselinePath, JSON.stringify(baselineFile, null, 2) + '\n', 'utf-8');
  console.log(`[lint-budget] ✓ 已更新基线: ${baselinePath}`);
  console.log(`[lint-budget]   warning 总数: ${total}`);
  console.log(`[lint-budget]   ${formatCounts(counts)}`);
  process.exit(0);
}

if (!baseline) {
  // 首次引导：自动生成基线
  const baselineFile = {
    updatedAt: new Date().toISOString(),
    rules: counts,
  };
  writeFileSync(baselinePath, JSON.stringify(baselineFile, null, 2) + '\n', 'utf-8');
  console.log(`[lint-budget] ℹ 未找到基线，已自动生成: ${baselinePath}`);
  console.log(`[lint-budget]   warning 总数: ${total}`);
  console.log(`[lint-budget]   ${formatCounts(counts)}`);
  process.exit(0);
}

// 门禁对比：只比较基线里出现过的规则 + 当前新增的规则
const baselineRules = baseline.rules ?? {};
const over = [];
const diffs = [];
const allRules = new Set([...Object.keys(baselineRules), ...Object.keys(counts)]);

for (const rule of [...allRules].sort()) {
  const before = baselineRules[rule] ?? 0;
  const now = counts[rule] ?? 0;
  if (now !== before) {
    diffs.push(`${rule}: ${before} → ${now} (${now - before > 0 ? '+' : ''}${now - before})`);
  }
  if (now > before) {
    over.push({ rule, before, now });
  }
}

console.log(`[lint-budget] 当前 warning 总数: ${total}`);
if (diffs.length) {
  console.log('[lint-budget] 规则差异:');
  for (const d of diffs) console.log(`  - ${d}`);
} else {
  console.log('[lint-budget] 所有规则与基线一致，无差异');
}

if (over.length) {
  console.error('[lint-budget] ✗ 以下规则告警数超过基线（只许降不许涨）:');
  for (const o of over) {
    console.error(`  - ${o.rule}: ${o.before} → ${o.now} (超过 ${o.now - o.before})`);
  }
  console.error(`[lint-budget] ✗ CI 门禁未通过。请修复新增告警，或用 --update 更新基线。`);
  process.exit(1);
}

console.log(`[lint-budget] ✓ CI 门禁通过（无规则超基线）`);
process.exit(0);

// ────────────────────────────────────────────────────────────
// 辅助
// ────────────────────────────────────────────────────────────
function formatCounts(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([rule, n]) => `${rule}=${n}`)
    .join(', ');
}
