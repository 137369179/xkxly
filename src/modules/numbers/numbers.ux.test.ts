// @vitest-environment node
/**
 * 数字王国 · 儿童友好 UI 源码审计（自动化「用户测试」替代）
 * ------------------------------------------------------------------
 * 面向 5-12 岁：交互按钮不得使用过小字号（text-xs/<11px），否则低龄儿童
 * 阅读与点按困难。jsdom 无法量像素，故用源码级审计锁定「交互按钮字号」规则：
 *   - 凡带交互(onClick)的 <button>，其 className 不得含 text-xs / text-[11px]。
 * 说明：真实像素触达 ≥44px 与对比度需浏览器(Playwright)校验，属后续项，
 * 本测试聚焦可靠、无 mock 的可自动断言维度。
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIR = resolve(__dirname, '..', '..', '..', 'src', 'modules', 'numbers');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.tsx') && /\b(test|spec)\./.test(f) === false);

/** 命中「可点击按钮」的行：含 <button 且带 onClick */
const INTERACTIVE_BUTTON = /<button[^>]*\bonClick=/;
/** 过大风险字号 */
const RISKY_SMALL = /text-xs|text-\[11px\]/;

describe('数字王国 · 交互按钮字号（儿童友好）', () => {
  for (const file of FILES) {
    it(`${file} 的交互按钮不使用过小字号`, () => {
      const lines = readFileSync(join(DIR, file), 'utf8').split('\n');
      const violations: string[] = [];
      lines.forEach((line, i) => {
        if (INTERACTIVE_BUTTON.test(line) && RISKY_SMALL.test(line)) {
          violations.push(`L${i + 1}: ${line.trim()}`);
        }
      });
      expect(violations, `发现过度字号交互按钮：\n${violations.join('\n')}`).toEqual([]);
    });
  }
});