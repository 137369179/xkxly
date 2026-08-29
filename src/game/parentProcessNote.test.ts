import { describe, it, expect } from 'vitest';
import { parentProcessNote, type ProcessNoteInput } from './parentProcessNote';
import { dateKey } from '@/lib/dailyPlan';
import type { MasteryItem, WrongHistory } from '@/types';

function item(lv: number, firstSeen?: string): MasteryItem {
  return { lv, ok: 3, ng: 0, firstSeen };
}

/** 相对 now 偏移 n 天的 yyyy-mm-dd */
function offset(now: Date, n: number): string {
  return dateKey(now.getTime() + n * 86400000);
}

function wh(over: Partial<WrongHistory> = {}): WrongHistory {
  return {
    totalEver: 0,
    uniqueSkills: 0,
    cleared: 0,
    maxCount: 0,
    bestStreak: 0,
    dailyStreak: 0,
    lastTrainDate: '',
    aiAnalyzeCount: 0,
    ...over,
  };
}

function input(over: Partial<ProcessNoteInput> = {}): ProcessNoteInput {
  return { mastery: {}, wrongHistory: undefined, streak: 0, ...over };
}

describe('parentProcessNote · 家长端反依赖提示', () => {
  const now = new Date(2026, 7, 29, 12, 0, 0); // 固定时钟保证确定性

  it('数据全空时返回 null（宁缺毋滥，不制造空句）', () => {
    expect(parentProcessNote(input(), now)).toBeNull();
  });

  it('本周新掌握知识点 → 句子含过程叙事且不含星星数字', () => {
    const note = parentProcessNote(
      input({ mastery: { 'hanzi:大': item(2, offset(now, 0)), 'word:cat': item(1, offset(now, -2)) } }),
      now,
    );
    expect(note).toContain('新掌握了 2 个知识点');
    expect(note).toContain('过程比星星更值得看见');
  });

  it('本周练过错题且有消灭数 → 报告错题回炉', () => {
    const note = parentProcessNote(
      input({ wrongHistory: wh({ cleared: 5, lastTrainDate: offset(now, -1) }) }),
      now,
    );
    expect(note).toContain('主动回炉消灭了 5 道错题');
  });

  it('错题训练在窗口外但连续训练 ≥2 天 → 报告连续练错题', () => {
    const note = parentProcessNote(
      input({ wrongHistory: wh({ cleared: 5, dailyStreak: 3, lastTrainDate: offset(now, -30) }) }),
      now,
    );
    expect(note).toContain('连续 3 天主动练错题');
    expect(note).not.toContain('回炉');
  });

  it('连续学习 ≥3 天 → 报告坚持打卡', () => {
    const note = parentProcessNote(input({ streak: 6 }), now);
    expect(note).toContain('坚持每天学习，已经连了 6 天');
  });

  it('连续学习 <3 天不写坚持（避免夸大）', () => {
    expect(parentProcessNote(input({ streak: 2 }), now)).toBeNull();
  });

  it('最多取 2 个行为，句子不堆砌', () => {
    const note = parentProcessNote(
      input({
        mastery: { 'hanzi:大': item(1, offset(now, 0)), 'hanzi:小': item(1, offset(now, 0)) },
        wrongHistory: wh({ cleared: 4, lastTrainDate: offset(now, 0) }),
        streak: 9,
      }),
      now,
    );
    expect(note).not.toBeNull();
    // 只保留前两个行为：新掌握 + 错题回炉；streak 不进句
    expect(note).toContain('新掌握了 2 个知识点');
    expect(note).toContain('主动回炉消灭了 4 道错题');
    expect(note).not.toContain('连了 9 天');
  });

  it('输出以「本周孩子」开头（过程导向句式，非奖励记录）', () => {
    const note = parentProcessNote(input({ streak: 4 }), now);
    expect(note).toMatch(/^本周孩子/);
  });
});
