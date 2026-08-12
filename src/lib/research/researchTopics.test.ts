import { describe, it, expect } from 'vitest';
import { RESEARCH_TOPICS, SLOT_KEYS, densityFor, DEFAULT_DENSITY } from './researchTopics';
import { getTopic } from './researchTopics';
import zh from '@/i18n/locales/zh-CN.json';
import en from '@/i18n/locales/en-US.json';

/**
 * researchTopics 单元测试（T7 / C7 i18n 红线 + ADR-002 密度）
 * ------------------------------------------------------------------
 * 1. 每个 topic 的 i18nKey / fallbackFactsI18nKey 在中英两 locale 均存在
 * 2. exploreSlot ∈ SLOT_KEYS 注册表键
 * 3. density 覆盖所有支持的 ageRange（3-4/5-6/7-8/9-10/11-12）
 * 4. 数据文件内无中文字面量（正则断言，C7 红线）
 */

function hasPath(obj: unknown, path: string): boolean {
  return path.split('.').every((seg) => {
    if (obj == null || typeof obj !== 'object') return false;
    obj = (obj as Record<string, unknown>)[seg];
    return obj !== undefined;
  });
}

describe('T7 · 选题注册表 i18n 完整性（C7 红线）', () => {
  it('每 topic 的 i18nKey 在中英两 locale 均存在（label/desc）', () => {
    for (const tp of RESEARCH_TOPICS) {
      expect(hasPath(zh, `${tp.i18nKey}.label`), `zh ${tp.i18nKey}.label`).toBe(true);
      expect(hasPath(zh, `${tp.i18nKey}.desc`), `zh ${tp.i18nKey}.desc`).toBe(true);
      expect(hasPath(en, `${tp.i18nKey}.label`), `en ${tp.i18nKey}.label`).toBe(true);
      expect(hasPath(en, `${tp.i18nKey}.desc`), `en ${tp.i18nKey}.desc`).toBe(true);
    }
  });

  it('每 topic 的 fallbackFactsI18nKey 在中英两 locale 均存在', () => {
    for (const tp of RESEARCH_TOPICS) {
      expect(hasPath(zh, tp.fallbackFactsI18nKey), `zh ${tp.fallbackFactsI18nKey}`).toBe(true);
      expect(hasPath(en, tp.fallbackFactsI18nKey), `en ${tp.fallbackFactsI18nKey}`).toBe(true);
    }
  });

  it('exploreSlot ∈ SLOT_KEYS 注册表键', () => {
    for (const tp of RESEARCH_TOPICS) {
      expect(SLOT_KEYS).toContain(tp.exploreSlot);
    }
  });

  it('density 覆盖所有支持的 ageRange', () => {
    for (const age of ['3-4', '5-6', '7-8', '9-10', '11-12']) {
      const d = densityFor(age);
      expect(d.core).toBeGreaterThanOrEqual(1);
      expect(d.extended).toBeGreaterThanOrEqual(1);
      expect(d.maxReveal).toBeGreaterThanOrEqual(d.core);
    }
  });

  it('未登记的 ageRange 回落 DEFAULT_DENSITY（不抛错）', () => {
    expect(densityFor('99-100')).toEqual(DEFAULT_DENSITY);
  });

  it('数据文件内无中文字面量（C7 红线：展示型字段）', () => {
    const src = require('fs').readFileSync(__filename.replace('.test.ts', '.ts'), 'utf-8');
    // cardMatchTags 是内部 KV 匹配数据（AI 生成内容的 tags 为中文，匹配必需），
    // 从不渲染给孩子 → 从断言中挖除；其余展示型字段（i18nKey/emoji/tone 等）必须无中文
    const withoutMatchTags = src.replace(/cardMatchTags: \[[^\]]*\]/g, 'cardMatchTags: []');
    // 排除注释行（/**、*、// 前缀）后，断言代码区无 CJK 字符
    const codeLines = withoutMatchTags.split('\n').filter(
      (l: string) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/**'),
    );
    const cjk = codeLines.filter((l: string) => /[\u4e00-\u9fff]/.test(l));
    expect(cjk).toEqual([]);
  });

  it('getTopic 返回 null 于未知 id', () => {
    expect(getTopic('nonexistent')).toBeNull();
    expect(getTopic('dino')?.id).toBe('dino');
  });
});
