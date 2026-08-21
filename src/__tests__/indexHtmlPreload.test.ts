// @vitest-environment node
/**
 * P0-Audit #4 · index.html 首屏图片 preload 回归测试
 * --------------------------------------------------
 * 缺陷：index.html 用 fetchpriority 预加载 `/hero_banner.jpg`，
 * 而该图仅作 og:image/twitter:image（社交分享图），并非首屏渲染图；
 * 真实首屏 Hero 背景图是 `/hero_jelly.png`，未被 preload → 浪费带宽也不提 LCP。
 *
 * 目标行为（修复后）：image preload 应指向首页实际使用的首屏图。
 * 断言编码的是"修复后"的预期，在当前 index.html 上会失败。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const html = readFileSync(`${root}index.html`, 'utf8');
const homeHero = readFileSync(`${root}src/modules/home/HomeHero.tsx`, 'utf8');

/** 提取 index.html 中所有 as="image" 的 preload href */
function imagePreloads(): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*\bas=["']image["'][^>]*href=["']([^"']+)["'][^>]*>/g)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

describe('index.html 首屏图片 preload（P0-#4）', () => {
  it('HomeHero 的实际首屏图确实为 /hero_jelly.png（前置契约，资产变更时此测试需同步）', () => {
    expect(homeHero).toContain('/hero_jelly.png');
  });

  it('应预加载首页实际 LCP 图，而非仅 og 用图（修复目标）', () => {
    const preloads = imagePreloads();
    // 修复后必须预加载真实首屏图
    expect(preloads).toContain('/hero_jelly.png');
    // 不应预加载仅作 og:image 的 hero_banner.jpg
    expect(preloads).not.toContain('/hero_banner.jpg');
  });

  it('hero_banner.jpg 仅用于 og:image/twitter:image（社交分享），不参与首屏 preload', () => {
    expect(html).toContain('og:image');
    expect(html).toContain('twitter:image');
  });
});