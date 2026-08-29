import { describe, it, expect } from 'vitest';
import {
  MASTERY_WEEK_DAYS,
  masteryNoteFor,
  newlyMasteredThisWeek,
} from './masteryNarrative';
import { dateKey } from '@/lib/dailyPlan';
import type { MasteryItem } from '@/types';

function item(lv: number, firstSeen?: string): MasteryItem {
  return { lv, ok: 3, ng: 0, firstSeen };
}

/** 相对今天偏移 n 天的 yyyy-mm-dd */
function offset(n: number): string {
  return dateKey(Date.now() + n * 86400000);
}

describe('newlyMasteredThisWeek · 本周新掌握统计', () => {
  it('窗口边界：今天与 6 天前计入，7 天前不计', () => {
    const mastery = {
      'hanzi:大': item(1, offset(0)),
      'hanzi:小': item(2, offset(-(MASTERY_WEEK_DAYS - 1))),
      'hanzi:山': item(1, offset(-MASTERY_WEEK_DAYS)),
    };
    expect(newlyMasteredThisWeek(mastery, ['hanzi'])).toBe(2);
  });

  it('lv<1（未掌握）与缺失 firstSeen 的旧数据不计入', () => {
    const mastery = {
      'hanzi:低': item(0, offset(0)),
      'hanzi:旧': item(3, undefined),
    };
    expect(newlyMasteredThisWeek(mastery, ['hanzi'])).toBe(0);
  });

  it('只统计声明前缀下的键，其他学科不串台', () => {
    const mastery = {
      'hanzi:大': item(1, offset(0)),
      'word:apple': item(1, offset(0)),
    };
    expect(newlyMasteredThisWeek(mastery, ['hanzi'])).toBe(1);
    expect(newlyMasteredThisWeek(mastery, ['word'])).toBe(1);
    expect(newlyMasteredThisWeek(mastery, ['hanzi', 'word'])).toBe(2);
  });

  it('前缀按段匹配：math:trace:3 命中 math，不命中 ma', () => {
    const mastery = { 'math:trace:3': item(1, offset(0)) };
    expect(newlyMasteredThisWeek(mastery, ['math'])).toBe(1);
    expect(newlyMasteredThisWeek(mastery, ['ma'])).toBe(0);
  });

  it('空表 / undefined 项安全', () => {
    expect(newlyMasteredThisWeek({}, ['hanzi'])).toBe(0);
    expect(
      newlyMasteredThisWeek({ 'hanzi:x': undefined }, ['hanzi']),
    ).toBe(0);
  });
});

describe('masteryNoteFor · 能力叙事句', () => {
  it('count<=0 返回 null（宁缺毋滥，不显示空句）', () => {
    expect(masteryNoteFor(0, '个汉字')).toBeNull();
    expect(masteryNoteFor(-1, '个汉字')).toBeNull();
  });

  it('正数生成「你学会了」胜任感句式，非交易句式', () => {
    const note = masteryNoteFor(3, '个汉字');
    expect(note).toContain('3');
    expect(note).toContain('个汉字');
    expect(note).toContain('学会');
    expect(note).not.toContain('奖励');
    expect(note).not.toContain('星');
  });
});
