// 一次性批量精确替换工具（P3-4b 用完即删）
// 规则：每条 edit 必须在目标文件中「唯一匹配」，否则整条跳过并报错，绝不模糊替换。
import { readFileSync, writeFileSync } from 'node:fs';

const edits = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byFile = new Map();
for (const e of edits) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}

let ok = 0;
const fails = [];
for (const [file, list] of byFile) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    for (const e of list) fails.push(`${file} :: FILE NOT FOUND`);
    continue;
  }
  let next = src;
  for (const e of list) {
    const count = next.split(e.old).length - 1;
    if (count !== 1) {
      fails.push(`${file} :: match=${count} :: ${e.old.slice(0, 90)}`);
      continue;
    }
    next = next.replace(e.old, e.new);
    ok++;
  }
  if (next !== src) writeFileSync(file, next, 'utf8');
}

console.log(`applied: ${ok} / ${edits.length}`);
if (fails.length) {
  console.log(`\n=== FAILED (${fails.length}) ===`);
  for (const f of fails) console.log(f);
}
