import { describe, it, expect } from 'vitest';
import { buildManifest, deriveVersion } from '../../../scripts/gen-sw-precache.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..', '..', '..');
const publicDir = join(root, 'public');

describe('gen-sw-precache', () => {
  it('public/ 目录存在，确保测试基于真实资源', () => {
    expect(existsSync(publicDir)).toBe(true);
  });

  it('buildManifest 返回 version + urls，且含 manifest.json 与字体', () => {
    const m = buildManifest(publicDir);
    expect(typeof m.version).toBe('string');
    expect(m.version).toMatch(/^baby-park-v[0-9a-f]{8}$/);
    expect(m.urls).toContain('/manifest.json');
    expect(m.urls.some((u) => u.startsWith('/fonts/'))).toBe(true);
    // png 图标被自动包含（无需手维护）
    expect(m.urls.some((u) => u.startsWith('/icons/') && u.endsWith('.png'))).toBe(true);
  });

  it('urls 已排序且无重复', () => {
    const m = buildManifest(publicDir);
    const sorted = [...m.urls].sort();
    expect(m.urls).toEqual(sorted);
    expect(new Set(m.urls).size).toBe(m.urls.length);
  });

  it('version 对资源体积变化敏感（内容哈希派生）', () => {
    const urls = ['/a.png', '/b.png'];
    const v1 = deriveVersion(urls, () => 100);
    const v2 = deriveVersion(urls, () => 200); // 体积变了
    expect(v1).not.toBe(v2);
    // 顺序不影响结果（可重现）
    const urlsReversed = ['/b.png', '/a.png'];
    expect(deriveVersion(urlsReversed, () => 100)).toBe(v1);
  });

  it('FALLBACK 清单字段形状与生产兜底一致（sw.js 依赖）', () => {
    // 当 precache-manifest.json 缺失时 sw.js 回落 FALLBACK_MANIFEST，
    // 这里确认 buildManifest 产物与其字段兼容（version:string, urls:string[]）
    const m = buildManifest(publicDir);
    expect(Array.isArray(m.urls)).toBe(true);
    m.urls.forEach((u) => expect(typeof u).toBe('string'));
  });
});
