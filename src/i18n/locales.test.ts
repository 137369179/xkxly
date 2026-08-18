// @vitest-environment node
/**
 * i18n 解析回归测试 · 三模块错题本 / 专项训练
 * ------------------------------------------------------------------
 * 锁定 R4 修复的 i18n 债务：
 *   1. wrongbook 三个 Tab 此前使用字面量点号 key（"tab.overview"），
 *      t() 按 '.' 切分后无法命中，实际渲染出原始 key 路径（死 key）。
 *      已改为嵌套结构 wrongbook.tab.{overview,train,badges,causes}。
 *   2. 新增 wrongbook.causes.* 与 training.banner，中英双语均需可解析。
 * 本测试同时校验 zh-CN / en-US 键对齐，防止再次出现死 key 或缺失翻译。
 */
import { describe, it, expect } from 'vitest';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return path;
    current = current[key];
  }
  if (typeof current === 'string') return current;
  if (typeof current === 'object' && current !== null) {
    return current.string || Object.values(current)[0] || path;
  }
  return path;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
}

type Case = { key: string; params?: Record<string, string | number>; zh: string; en: string };

const CASES: Case[] = [
  { key: 'wrongbook.tab.overview', zh: '概览', en: 'Overview' },
  { key: 'wrongbook.tab.train', zh: '训练', en: 'Train' },
  { key: 'wrongbook.tab.badges', zh: '徽章', en: 'Badges' },
  { key: 'wrongbook.tab.causes', zh: '按原因', en: 'By Cause' },
  { key: 'wrongbook.causes.title', zh: '按原因', en: 'By Cause' },
  { key: 'wrongbook.causes.summary', params: { groups: 2, total: 5 }, zh: '2 类原因 · 5 题', en: '2 causes · 5 items' },
  { key: 'wrongbook.causes.count', params: { count: 3 }, zh: '3 题', en: '3 items' },
  { key: 'wrongbook.causes.practice', zh: '去练习', en: 'Practice' },
  { key: 'training.banner', zh: '专项训练', en: 'Focus Training' },
];

describe('i18n 三模块 key 解析（中/英双语）', () => {
  for (const c of CASES) {
    it(`zh-CN 解析 ${c.key}`, () => {
      expect(interpolate(getNestedValue(zhCN, c.key), c.params)).toBe(c.zh);
    });
    it(`en-US 解析 ${c.key}`, () => {
      expect(interpolate(getNestedValue(enUS, c.key), c.params)).toBe(c.en);
    });
  }
});

describe('i18n zh-CN / en-US 键对齐（wrongbook + training）', () => {
  it('en-US 包含 zh-CN 的全部 wrongbook/training 叶键且均可解析', () => {
    const leaves: string[] = [];
    const walk = (o: any, p: string) => {
      if (o && typeof o === 'object') {
        Object.keys(o).forEach((k) => walk(o[k], p ? `${p}.${k}` : k));
      } else {
        leaves.push(p);
      }
    };
    for (const ns of ['wrongbook', 'training']) {
      walk((zhCN as Record<string, unknown>)[ns] as any, ns);
      for (const leaf of leaves) {
        const resolved = getNestedValue(enUS, leaf);
        // 解析结果不能等于原始 key（否则为死 key / 缺失翻译）
        expect(resolved).not.toBe(leaf);
      }
    }
  });
});
