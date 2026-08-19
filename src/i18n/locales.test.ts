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
import zhPatch from './locales/patch.zh-CN.json';
import enPatch from './locales/patch.en-US.json';

/** 深合并（后覆盖前），用于把主 locale 与 patch 合并成最终生效字典 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (Array.isArray(base)) return patch as T;
  if (base && typeof base === 'object' && patch && typeof patch === 'object') {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      out[k] =
        v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object'
          ? deepMerge(out[k], v)
          : v;
    }
    return out as T;
  }
  return patch as T;
}

/** 收集对象的所有叶键路径 */
function flattenKeys(obj: unknown, prefix = ''): string[] {
  const out: string[] = [];
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenKeys(v, path));
      else out.push(path);
    }
  }
  return out;
}

const mergedZh = deepMerge(zhCN, zhPatch);
const mergedEn = deepMerge(enUS, enPatch);

function getNestedValue(obj: any, path: string): string {
  const raw = resolvePath(obj, path.split('.'));
  if (raw === undefined || raw === null) return path;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    return raw.string || Object.values(raw)[0] || path;
  }
  return path;
}

/** 逐层下钻：每层先试「剩余段整体作为字面量键」，兼容扁平带点键（如 mathExtra."subTabs.mul"） */
function resolvePath(obj: any, segments: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const literal = segments.join('.');
  const viaLiteral = obj[literal];
  if (viaLiteral !== undefined && viaLiteral !== null) return viaLiteral;
  if (segments.length === 1) return undefined;
  return resolvePath(obj[segments[0]], segments.slice(1));
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
  // P4-1：大声朗读降级文案此前缺 en 翻译（回退后英文界面显示中文）
  { key: 'tts.loudReadListening', zh: '🎤 大声朗读中…（读完自动通过）', en: '🎤 Keep reading aloud… (it will pass automatically)' },
  { key: 'tts.loudReadMode', zh: '识别服务暂不可用，大声朗读出来就可以通过哦～', en: 'Speech recognition is unavailable — just read it aloud to pass!' },
];

describe('i18n 三模块 key 解析（中/英双语）', () => {
  for (const c of CASES) {
    it(`zh-CN 解析 ${c.key}`, () => {
      expect(interpolate(getNestedValue(mergedZh, c.key), c.params)).toBe(c.zh);
    });
    it(`en-US 解析 ${c.key}`, () => {
      expect(interpolate(getNestedValue(mergedEn, c.key), c.params)).toBe(c.en);
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
      walk((mergedZh as Record<string, unknown>)[ns] as any, ns);
      for (const leaf of leaves) {
        const resolved = getNestedValue(mergedEn, leaf);
        // 解析结果不能等于原始 key（否则为死 key / 缺失翻译）
        expect(resolved).not.toBe(leaf);
      }
    }
  });
});

describe('i18n 全量键对齐（P4-1：防任意新模块缺 en 翻译）', () => {
  it('合并后的 en-US 覆盖 zh-CN 的全部叶键（主 + patch）', () => {
    const zhLeaves = flattenKeys(mergedZh);
    expect(zhLeaves.length).toBeGreaterThan(100);
    for (const leaf of zhLeaves) {
      const resolved = getNestedValue(mergedEn, leaf);
      // 解析结果不能等于原始 key 路径（否则为死 key / 缺失翻译）
      expect(resolved, `en-US 缺失 key: ${leaf}`).not.toBe(leaf);
    }
  });
});
