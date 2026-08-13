#!/usr/bin/env node
/**
 * 汉字配图批量预生成脚本
 * ------------------------------------------------------------
 * 读取 src/data/hanzi.ts 的全部汉字数据，
 * 调用 BFF /api/hanzi/image/:char 生图，
 * 写入 public/hanzi-imgs/{char}.png。
 *
 * 用法：
 *   node scripts/gen-hanzi-images.mjs              # 生成全部 300 字
 *   node scripts/gen-hanzi-images.mjs --level 1    # 只生成启蒙级
 *   node scripts/gen-hanzi-images.mjs --level 1,2  # 生成启蒙+常用
 *   node scripts/gen-hanzi-images.mjs --server http://localhost:8787
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-imgs');

// 解析命令行参数
const args = process.argv.slice(2);
const levels = new Set();
let serverUrl = 'http://localhost:8787';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--level' && args[i + 1]) {
    args[++i].split(',').forEach(l => levels.add(Number(l)));
  } else if (args[i] === '--server' && args[i + 1]) {
    serverUrl = args[++i];
  } else if (args[i] === '--all') {
    levels.add(1); levels.add(2); levels.add(3);
  }
}

// 加载汉字数据
const hanziData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/hanzi.ts'), 'utf8'));
// hanzi.ts 导出 HANZI_DATA 数组（需动态 import）
const { HANZI_DATA } = await import(resolve(ROOT, 'src/data/hanzi.ts'));

console.log(`📚 共 ${HANZI_DATA.length} 个汉字`);
const filtered = levels.size > 0
  ? HANZI_DATA.filter(h => levels.has(h.level))
  : HANZI_DATA;
console.log(`🎯 本次生成 ${filtered.length} 个字`);

// 确保输出目录
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 并发控制
const CONCURRENCY = 3;
let done = 0;
let skipped = 0;
let failed = 0;

async function generateOne(hanzi) {
  const char = hanzi.c;
  const outputPath = resolve(OUTPUT_DIR, `${char}.png`);

  // 跳过已有文件
  if (existsSync(outputPath)) {
    skipped++;
    return;
  }

  try {
    const url = `${serverUrl}/api/hanzi/image/${encodeURIComponent(char)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.ok || !data.dataUrl) {
      throw new Error(data?.error?.message || '响应无 dataUrl');
    }
    // base64 → buffer → 文件
    const base64 = data.dataUrl.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    writeFileSync(outputPath, buf);
    done++;
    console.log(`  ✓ ${char} (${hanzi.pd})`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${char}: ${e.message}`);
  }
}

async function main() {
  console.log(`🚀 开始批量生成，并发=${CONCURRENCY}，服务器=${serverUrl}\n`);

  // 分批并发
  for (let i = 0; i < filtered.length; i += CONCURRENCY) {
    const batch = filtered.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(generateOne));
    const progress = Math.round((i + batch.length) / filtered.length * 100);
    process.stderr.write(`\r  进度: ${progress}% (${i + batch.length}/${filtered.length})`);
  }

  console.log('\n\n✅ 完成！');
  console.log(`   成功: ${done}  跳过: ${skipped}  失败: ${failed}`);
  console.log(`   输出目录: ${OUTPUT_DIR}`);
}

main().catch(e => {
  console.error('❌ 生成失败:', e);
  process.exit(1);
});
