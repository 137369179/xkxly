#!/usr/bin/env node
/**
 * 汉字教学视频覆盖率检查脚本
 * 检查所有汉字数据源，找出缺失视频的字
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VID_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMG_DIR = resolve(ROOT, 'public', 'hanzi-imgs');

// 加载已存在的视频
const existingVid = new Set(
  readdirSync(VID_DIR)
    .filter(f => f.endsWith('.mp4'))
    .map(f => f.replace('-教学.mp4', ''))
);
console.log(`📹 已有视频: ${existingVid.size}`);

// 加载已存在的图片
const existingImg = new Set(
  readdirSync(IMG_DIR)
    .filter(f => /\.(png|webp)$/i.test(f))
    .map(f => f.replace(/\.(png|webp)$/i, ''))
);
console.log(`🖼️  已有图片: ${existingImg.size}`);

// 从 hanzi.ts 提取汉字
function loadHanziData() {
  const content = readFileSync(resolve(ROOT, 'src', 'data', 'hanzi.ts'), 'utf8');
  const chars = new Set();
  // 匹配形如 {c: '字', p: 'pīn', ...} 的结构
  const re = /\{\s*c:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    chars.add(m[1]);
  }
  return chars;
}

// 从 hanzi500.ts 提取汉字（通过 getExtendedHanzi500 或 HANZI_500）
function loadHanzi500Data() {
  const content = readFileSync(resolve(ROOT, 'src', 'data', 'hanzi500.ts'), 'utf8');
  const chars = new Set();
  const re = /char:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    chars.add(m[1]);
  }
  return chars;
}

// 从 hanziSentences.ts 提取汉字
function loadHanziSentencesData() {
  const content = readFileSync(resolve(ROOT, 'src', 'data', 'hanziSentences.ts'), 'utf8');
  const chars = new Set();
  const re = /\{\s*c:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    chars.add(m[1]);
  }
  return chars;
}

const charsFromHanzi = loadHanziData();
const charsFromHanzi500 = loadHanzi500Data();
const charsFromSentences = loadHanziSentencesData();

console.log(`\n📊 数据源统计:`);
console.log(`  hanzi.ts: ${charsFromHanzi.size} 个汉字`);
console.log(`  hanzi500.ts: ${charsFromHanzi500.size} 个汉字`);
console.log(`  hanziSentences.ts: ${charsFromSentences.size} 个汉字`);

// 合并所有唯一汉字
const allUniqueChars = new Set([...charsFromHanzi, ...charsFromHanzi500, ...charsFromSentences]);
console.log(`\n🔢 唯一汉字总数: ${allUniqueChars.size}`);

// 检查缺失
const missingVid = [];
const missingImg = [];
for (const c of allUniqueChars) {
  if (!existingVid.has(c)) missingVid.push(c);
  if (!existingImg.has(c)) missingImg.push(c);
}

console.log(`\n❌ 缺失视频: ${missingVid.length} 个`);
if (missingVid.length > 0 && missingVid.length <= 50) {
  console.log('  字符:', missingVid.join(', '));
} else if (missingVid.length > 50) {
  console.log('  前50个:', missingVid.slice(0, 50).join(', '));
}

console.log(`\n❌ 缺失图片: ${missingImg.length} 个`);
if (missingImg.length > 0 && missingImg.length <= 50) {
  console.log('  字符:', missingImg.join(', '));
} else if (missingImg.length > 50) {
  console.log('  前50个:', missingImg.slice(0, 50).join(', '));
}

// 只缺视频不缺图片的（需要重新生成视频）
const needVideoOnly = missingVid.filter(c => existingImg.has(c));
console.log(`\n⚠️  只缺视频（图片存在）: ${needVideoOnly.length} 个`);
if (needVideoOnly.length > 0) {
  console.log('  可立即生成视频:', needVideoOnly.join(', '));
}
