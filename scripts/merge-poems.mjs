/**
 * 合并四批语料 → 去重 → 输出 data/poems.merged.json
 * 去重策略：
 *  1) 按正文内容（去标点）去重 —— 最可靠，能识别「敕勒歌/北朝民歌」与「敕勒歌/佚名」
 *  2) 按 标题+作者 去重
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

const files = fs
  .readdirSync(dataDir)
  .filter((f) => /^poems-\d+\.json$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const bodyKey = (p) => p.lines.join('').replace(/[，。？！、；：「」《》·—…]/g, '');

const merged = [];
const seenBody = new Set();
const seenTitleAuthor = new Set();
let dropped = 0;

for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  for (const p of arr) {
    const bk = bodyKey(p);
    const tk = `${p.title}|${p.author}`;
    if (seenBody.has(bk) || seenTitleAuthor.has(tk)) {
      dropped++;
      continue;
    }
    seenBody.add(bk);
    seenTitleAuthor.add(tk);
    // 朝代规范化
    let dynasty = p.dynasty;
    if (dynasty === '三国') dynasty = '魏晋';
    if (dynasty === '北朝') dynasty = '南北朝';
    let author = p.author;
    if (/民歌|乐府/.test(author)) author = '佚名';
    merged.push({ ...p, dynasty, author });
  }
}

fs.writeFileSync(
  path.join(dataDir, 'poems.merged.json'),
  JSON.stringify(merged, null, 0),
  'utf8',
);

console.log(`files: ${files.join(', ')}`);
console.log(`merged: ${merged.length}  dropped(dup): ${dropped}`);
console.log(`need ${Math.max(0, 360 - merged.length)} more to reach 360`);

// 输出现有标题清单，供补采时排除
fs.writeFileSync(
  path.join(dataDir, 'existing-titles.txt'),
  merged.map((p) => `${p.title}(${p.author})`).join('、'),
  'utf8',
);
