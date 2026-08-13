// 打印 tsc 错误点对应的源码行（P3-4b 用完即删）
import { readFileSync } from 'node:fs';

const log = readFileSync(process.argv[2], 'utf8');
const filter = process.argv[3] || '';
const re = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const cache = new Map();
const seen = new Set();

for (const line of log.split('\n')) {
  const m = re.exec(line);
  if (!m) continue;
  const [, file, ln, col, code] = m;
  if (filter && !file.includes(filter)) continue;
  const key = `${file}:${ln}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!cache.has(file)) {
    try { cache.set(file, readFileSync(file, 'utf8').split('\n')); }
    catch { cache.set(file, []); }
  }
  const src = cache.get(file)[Number(ln) - 1] ?? '';
  console.log(`${file}:${ln}:${col} [${code}] ${src.trim()}`);
}
