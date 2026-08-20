// @vitest-environment jsdom
/**
 * 成语 SRS 复习 · 纯逻辑测试（T-3.2）
 * 覆盖：due 筛选 / 排序 / 每日上限 / 计数 / skill↔id 换算。
 */
import { describe, it, expect } from 'vitest';
import {
  selectDueIdiomSkills,
  dueIdiomCount,
  idiomIdOfSkill,
  idiomSkill,
  MAX_DAILY,
} from './idiomSrs';
import type { MasteryItem } from '@/types';

const now = 1_000_000;

function item(over: Partial<MasteryItem> & { due: number }): MasteryItem {
  return { lv: 1, ok: 0, ng: 0, last: 0, ...over } as MasteryItem;
}

describe('idiomSrs 纯逻辑', () => {
  it('仅筛出 idiom: 前缀且到期的技能', () => {
    const mastery: Record<string, MasteryItem> = {
      'idiom:i3': item({ due: now - 10 }), // 到期
      'idiom:i5': item({ due: now + 10 }), // 未到期
      'poem:p1': item({ due: now - 5 }), // 非成语
      'idiom:i12': item({ due: now - 2 }), // 到期
    };
    const due = selectDueIdiomSkills(mastery, now);
    expect(due).toEqual(['idiom:i3', 'idiom:i12']); // 按 due 升序（小者在前）
  });

  it('按 due 升序且受每日上限截断', () => {
    const mastery: Record<string, MasteryItem> = {};
    for (let i = 0; i < 15; i += 1) mastery[`idiom:i${i}`] = item({ due: now - i });
    const due = selectDueIdiomSkills(mastery, now, 10);
    expect(due.length).toBe(10);
    // 早起 i14（due 最早）排最前
    expect(due[0]).toBe('idiom:i14');
    // 默认上限与 MAX_DAILY 一致
    expect(selectDueIdiomSkills(mastery, now).length).toBe(MAX_DAILY);
  });

  it('dueIdiomCount 不截断、只计到期成语', () => {
    const mastery: Record<string, MasteryItem> = {
      'idiom:i3': item({ due: now - 1 }),
      'idiom:i5': item({ due: now + 1 }),
      'poem:p1': item({ due: now - 1 }),
    };
    expect(dueIdiomCount(mastery, now)).toBe(1);
  });

  it('skill↔id 换算对称', () => {
    expect(idiomSkill('i7')).toBe('idiom:i7');
    expect(idiomIdOfSkill('idiom:i7')).toBe('i7');
    expect(idiomIdOfSkill('poem:p1')).toBe('');
  });
});