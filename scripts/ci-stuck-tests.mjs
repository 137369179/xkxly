// CI 专用：运行 QuizCard 超时干预日志测试，生成 JUnit XML 报告 + 友好摘要
// ============================================================
// 设计目标：
//   1. 单独验证刚新增的 src/components/QuizCard.stuck.test.tsx
//   2. 输出 JUnit XML（CI 系统通用格式，GitHub Actions/GitLab CI/Jenkins 都能解析）
//   3. 输出 CI 友好的中文摘要，便于在 PR 检查页直接看结果
//   4. 失败时以非零退出码退出，CI 据此标记 job 失败
//
// 使用方式：
//   node scripts/ci-stuck-tests.mjs            # 默认运行 stuck 测试
//   node scripts/ci-stuck-tests.mjs <文件路径>  # 运行指定测试文件
//
// 输出文件：
//   test-results/stuck-junit.xml  —— JUnit 格式报告，供 CI 上传为 artifact
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 允许通过命令行参数指定测试文件，默认为 stuck 测试
const testFile = process.argv[2] ?? 'src/components/QuizCard.stuck.test.tsx';
const testPath = resolve(root, testFile);
const outputDir = resolve(root, 'test-results');
const junitPath = resolve(outputDir, 'stuck-junit.xml');

// ────────────────────────────────────────────────────────────
// 1. 前置校验：测试文件必须存在
// ────────────────────────────────────────────────────────────
if (!existsSync(testPath)) {
  console.error(`[ci-stuck] ✗ 测试文件不存在: ${testFile}`);
  console.error(`[ci-stuck] 请确认路径是否正确，或先创建该测试文件。`);
  process.exit(2); // 2 表示配置错误，区别于测试失败
}

// ────────────────────────────────────────────────────────────
// 2. 准备输出目录
// ────────────────────────────────────────────────────────────
mkdirSync(outputDir, { recursive: true });

// ────────────────────────────────────────────────────────────
// 3. 运行 vitest：同时输出 default（控制台）+ junit（文件）
//    vitest 原生支持多 reporter，无需额外依赖
// ────────────────────────────────────────────────────────────
console.log(`[ci-stuck] 运行 ${testFile} ...`);
console.log(`[ci-stuck] JUnit 报告将写入: ${junitPath}`);
console.log('────────────────────────────────────────');

// 注意：stdio: 'inherit' 让 vitest 的彩色输出直接显示在 CI 日志里
const cmd = [
  'npx vitest run',
  testFile,
  '--reporter=default',
  '--reporter=junit',
  `--outputFile=${junitPath}`,
].join(' ');

let exitCode = 0;
try {
  execSync(cmd, { stdio: 'inherit', cwd: root, env: process.env });
} catch (e) {
  exitCode = e.status ?? 1;
}

// ────────────────────────────────────────────────────────────
// 4. 解析 JUnit XML 提取统计摘要
//    用正则提取 testsuite 根节点的属性，避免引入 xml 解析依赖
// ────────────────────────────────────────────────────────────
let tests = 0;
let failures = 0;
let skipped = 0;
let time = 0;
let parsed = false;

if (existsSync(junitPath)) {
  try {
    const xml = readFileSync(junitPath, 'utf-8');
    // 取 testsuite 节点的聚合属性（vitest 输出的根 testsuite 含汇总数据）
    const testsMatch = xml.match(/tests=["'](\d+)["']/);
    const failuresMatch = xml.match(/failures=["'](\d+)["']/);
    const skippedMatch = xml.match(/skipped=["'](\d+)["']/);
    const timeMatch = xml.match(/time=["']([\d.]+)["']/);
    tests = testsMatch ? parseInt(testsMatch[1], 10) : 0;
    failures = failuresMatch ? parseInt(failuresMatch[1], 10) : 0;
    skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
    time = timeMatch ? parseFloat(timeMatch[1]) : 0;
    parsed = true;
  } catch (e) {
    console.warn(`[ci-stuck] ⚠ 无法解析 JUnit XML: ${e.message}`);
  }
} else {
  console.warn(`[ci-stuck] ⚠ JUnit 报告未生成: ${junitPath}`);
}

// ────────────────────────────────────────────────────────────
// 5. 输出 CI 友好摘要（GitHub Actions 会在 PR 检查页直接展示）
// ────────────────────────────────────────────────────────────
const passed = tests - failures - skipped;
const statusIcon = failures === 0 && parsed ? '✓' : '✗';
const statusText = failures === 0 && parsed ? '全部通过' : '存在失败';

console.log('');
console.log('────────────────────────────────────────');
console.log(`[stuck] ${statusIcon} 测试摘要：${statusText}`);
console.log('────────────────────────────────────────');
console.log(`  测试文件:  ${testFile}`);
console.log(`  通过:      ${passed}/${tests}`);
console.log(`  失败:      ${failures}`);
console.log(`  跳过:      ${skipped}`);
console.log(`  耗时:      ${time.toFixed(2)}s`);
console.log(`  JUnit 报告: ${junitPath}`);
console.log('────────────────────────────────────────');

if (exitCode !== 0 || failures > 0) {
  console.error(`[ci-stuck] ✗ 测试失败，CI 将标记为失败`);
  console.error(`[ci-stuck] 详情见上方 vitest 输出或 JUnit 报告`);
  process.exit(1);
}

console.log(`[ci-stuck] ✓ 测试全部通过，可继续后续 CI 步骤`);
process.exit(0);
