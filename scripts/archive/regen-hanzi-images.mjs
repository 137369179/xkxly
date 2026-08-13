#!/usr/bin/env node
/**
 * 重新生成所有汉字配图（替换低质量 placeholder）
 * ------------------------------------------------------------
 * 调用 BFF /api/hanzi/image/:char，写入 public/hanzi-imgs/{char}.png
 */
import { writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-imgs');

// Parse args
const args = process.argv.slice(2);
let serverUrl = 'http://localhost:8787';
let forceRegen = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server' && args[i + 1]) {
    serverUrl = args[++i];
  } else if (args[i] === '--force') {
    forceRegen = true;
  }
}

// Read hanzi data - extract chars from TypeScript file
const tsContent = await import('node:fs').then(fs => 
  fs.readFileSync(resolve(ROOT, 'src/data/hanzi.ts'), 'utf8')
);

// Extract all character entries
const charMatches = tsContent.matchAll(/\{ c: '(.+?)', p: '([^']+)', pd: '([^']+)',[^}]+\}/g);
const chars = [];
for (const m of charMatches) {
  chars.push({ c: m[1], pd: m[3] });
}

console.log(`📚 Found ${chars.length} characters in hanzi.ts`);

// Ensure output dir
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Concurrency control
const CONCURRENCY = 5;
let done = 0;
let skipped = 0;
let failed = 0;

async function generateOne(hanzi) {
  const char = hanzi.c;
  const outputPath = resolve(OUTPUT_DIR, `${char}.png`);

  // Check existing file quality
  if (existsSync(outputPath) && !forceRegen) {
    try {
      const stat = statSync(outputPath);
      if (stat.size > 5000) {
        skipped++;
        return;
      }
    } catch {}
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
      throw new Error(data?.error?.message || 'No dataUrl in response');
    }
    
    // base64 → buffer → file
    const base64 = data.dataUrl.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    writeFileSync(outputPath, buf);
    done++;
    console.log(`  ✓ ${char} (${hanzi.pd}) - ${buf.length} bytes`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${char}: ${e.message}`);
  }
}

async function main() {
  console.log(`🚀 Starting batch generation, concurrency=${CONCURRENCY}, server=${serverUrl}\n`);

  // Process in batches
  for (let i = 0; i < chars.length; i += CONCURRENCY) {
    const batch = chars.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(generateOne));
    const progress = Math.round((i + batch.length) / chars.length * 100);
    process.stderr.write(`\r  Progress: ${progress}% (${i + batch.length}/${chars.length})`);
  }

  console.log('\n\n✅ Done!');
  console.log(`   Success: ${done}  Skipped: ${skipped}  Failed: ${failed}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
}

main().catch(e => {
  console.error('❌ Generation failed:', e);
  process.exit(1);
});
