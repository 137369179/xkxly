import { describe, it, expect } from 'vitest';
import {
  review,
  isDue,
  dueSkills,
  touchedCount,
  masteredCount,
  masteryRate,
  weakSkills,
  skillLabel,
  skillCategory,
  dueText,
  emptyMastery,
  INTERVALS,
  MAX_LEVEL,
  SKILL,
} from './srs';
import type { Progress, MasteryItem } from '@/types';

const NOW = 1700000000000; // 固定时间戳，避免测试抖动
const DAY = 86400000;

function makeProgress(mastery: Record<string, MasteryItem> = {}): Progress {
  return {
    stars: 0,
    badges: [],
    lettersHeard: [],
    mastery,
    dailyLog: {},
    recite: {},
    wrongBook: [],
    streak: { count: 0, last: '' },
    todayItems: 0,
    todaySecs: 0,
    lastActive: '',
    newBadges: [],
  } as unknown as Progress;
}

describe('srs · review()', () => {
  it('答对：升 1 级并按新等级排下次复习', () => {
    const prev: MasteryItem = { lv: 2, due: 0, ok: 5, ng: 1, last: 0 };
    const next = review(prev, true, NOW);
    expect(next.lv).toBe(3);
    expect(next.due).toBe(NOW + INTERVALS[3] * DAY);
    expect(next.ok).toBe(6);
    expect(next.ng).toBe(1);
    expect(next.last).toBe(NOW);
  });

  it('答对：已达 MAX_LEVEL 不再升级', () => {
    const prev: MasteryItem = { lv: MAX_LEVEL, due: 0, ok: 99, ng: 0, last: 0 };
    const next = review(prev, true, NOW);
    expect(next.lv).toBe(MAX_LEVEL);
  });

  it('答错：降 1 级并按新等级间隔的一半安排复习（温和回退）', () => {
    const prev: MasteryItem = { lv: 3, due: 0, ok: 5, ng: 1, last: 0 };
    const next = review(prev, false, NOW);
    expect(next.lv).toBe(2);
    // 降级到 lv2，INTERVALS[2]=2天，间隔为 ceil(2天/2) = 1天
    expect(next.due).toBe(NOW + Math.ceil((INTERVALS[2] * DAY) / 2));
    expect(next.ok).toBe(5);
    expect(next.ng).toBe(2);
  });

  it('答错：lv0 间隔最低 10 分钟', () => {
    const prev: MasteryItem = { lv: 1, due: 0, ok: 0, ng: 3, last: 0 };
    const next = review(prev, false, NOW);
    expect(next.lv).toBe(0);
    // 降级到 lv0，INTERVALS[0]=0天，间隔为 max(10分钟, 0) = 10分钟
    expect(next.due).toBe(NOW + 10 * 60000);
  });

  it('prev 为 undefined 时从空掌握度开始', () => {
    const next = review(undefined, true, NOW);
    expect(next.lv).toBe(1);
    expect(next.ok).toBe(1);
    expect(next.ng).toBe(0);
  });
});

describe('srs · isDue()', () => {
  it('未到 due 时间不算到期', () => {
    expect(isDue({ lv: 2, due: NOW + DAY, ok: 1, ng: 0, last: NOW }, NOW)).toBe(false);
  });

  it('due 时间已过算到期', () => {
    expect(isDue({ lv: 2, due: NOW - 1000, ok: 1, ng: 0, last: 0 }, NOW)).toBe(true);
  });

  it('已掌握（lv=MAX_LEVEL）保温未满：距下次复习还早不算到期', () => {
    expect(isDue({ lv: MAX_LEVEL, due: NOW + 10 * DAY, ok: 10, ng: 0, last: 0 }, NOW)).toBe(false);
  });

  it('已掌握（lv=MAX_LEVEL）到下次复习时间(due)即保温复习', () => {
    expect(isDue({ lv: MAX_LEVEL, due: NOW - 1, ok: 10, ng: 0, last: 0 }, NOW)).toBe(true);
  });

  it('undefined 不算到期', () => {
    expect(isDue(undefined, NOW)).toBe(false);
  });
});

describe('srs · dueSkills()', () => {
  it('取出所有到期知识点，按等级低+逾期久优先', () => {
    const p = makeProgress({
      'letter:A': { lv: 3, due: NOW - 2000, ok: 2, ng: 0, last: 0 },
      'letter:B': { lv: 1, due: NOW - 5000, ok: 1, ng: 1, last: 0 },
      'letter:C': { lv: 5, due: NOW + DAY, ok: 10, ng: 0, last: 0 }, // 已掌握且刚复习，下次复习在未来，未到期
      'letter:D': { lv: 1, due: NOW + DAY, ok: 0, ng: 0, last: 0 }, // 未到期
    });
    const due = dueSkills(p, NOW);
    expect(due).toEqual(['letter:B', 'letter:A']);
  });

  it('limit 生效', () => {
    const p = makeProgress({
      a: { lv: 1, due: NOW - 1, ok: 0, ng: 0, last: 0 },
      b: { lv: 1, due: NOW - 2, ok: 0, ng: 0, last: 0 },
      c: { lv: 1, due: NOW - 3, ok: 0, ng: 0, last: 0 },
    });
    expect(dueSkills(p, NOW, 2).length).toBe(2);
  });
});

describe('srs · 统计函数', () => {
  const p = makeProgress({
    'letter:A': { lv: 5, due: 0, ok: 10, ng: 0, last: 0 },
    'letter:B': { lv: 4, due: 0, ok: 8, ng: 1, last: 0 },
    'letter:C': { lv: 2, due: 0, ok: 2, ng: 3, last: 0 },
  });

  it('touchedCount 返回已接触知识点总数', () => {
    expect(touchedCount(p)).toBe(3);
  });

  it('masteredCount 返回 lv>=4 的数量', () => {
    expect(masteredCount(p)).toBe(2);
  });

  it('masteryRate 返回平均等级/MAX_LEVEL', () => {
    // (5+4+2) / (3 * 5) = 11/15
    expect(masteryRate(p)).toBeCloseTo(11 / 15, 5);
  });

  it('空进度 masteryRate 返回 0', () => {
    expect(masteryRate(makeProgress())).toBe(0);
  });
});

describe('srs · weakSkills()', () => {
  it('按错误率降序排列，只含有错误的知识点', () => {
    const p = makeProgress({
      a: { lv: 5, due: 0, ok: 10, ng: 0, last: 0 }, // 无错误，排除
      b: { lv: 2, due: 0, ok: 1, ng: 4, last: 0 }, // 错误率 80%
      c: { lv: 3, due: 0, ok: 3, ng: 1, last: 0 }, // 错误率 25%
    });
    const weak = weakSkills(p, 6);
    expect(weak.length).toBe(2);
    expect(weak[0]!.skill).toBe('b'); // 错误率最高排前
    expect(weak[1]!.skill).toBe('c');
  });

  it('n 参数限制返回数量', () => {
    const p = makeProgress({
      a: { lv: 1, due: 0, ok: 0, ng: 1, last: 0 },
      b: { lv: 1, due: 0, ok: 0, ng: 1, last: 0 },
      c: { lv: 1, due: 0, ok: 0, ng: 1, last: 0 },
    });
    expect(weakSkills(p, 2).length).toBe(2);
  });
});

describe('srs · 展示层', () => {
  it('skillLabel 各类别正确解析', () => {
    expect(skillLabel('letter:A')).toBe('字母 A');
    expect(skillLabel('number:5')).toBe('数字 5');
    expect(skillLabel('math:add')).toBe('加法');
    expect(skillLabel('math:sub')).toBe('减法');
    expect(skillLabel('number:count')).toBe('数字 count');
    expect(skillLabel('logic:pattern')).toBe('找规律');
    expect(skillLabel('logic:match')).toBe('图形配对');
    expect(skillLabel('logic:order')).toBe('排排序');
    expect(skillLabel('poem:abc', () => '静夜思')).toBe('静夜思');
    expect(skillLabel('poem:abc')).toBe('古诗');
  });

  it('skillCategory 返回类别信息', () => {
    expect(skillCategory('letter:A').label).toBe('字母');
    expect(skillCategory('poem:x').label).toBe('古诗');
    expect(skillCategory('unknown:x').label).toBe('其他');
  });

  it('dueText 文案正确', () => {
    expect(dueText({ lv: MAX_LEVEL, due: 0, ok: 0, ng: 0, last: 0 })).toBe('已掌握');
    expect(dueText({ lv: 2, due: NOW - 1, ok: 0, ng: 0, last: 0 }, NOW)).toBe('该复习啦');
    expect(dueText({ lv: 2, due: NOW + 2 * DAY, ok: 0, ng: 0, last: 0 }, NOW)).toBe('2 天后复习');
  });
});

describe('srs · emptyMastery()', () => {
  it('返回 lv=0 的初始掌握度', () => {
    const m = emptyMastery(NOW);
    expect(m.lv).toBe(0);
    expect(m.ok).toBe(0);
    expect(m.ng).toBe(0);
    expect(m.due).toBe(NOW);
  });
});

describe('srs · review 与 isDue 口径一致（P0-#3）', () => {
  it('答对升至 MAX_LEVEL 后，到 due 时刻即应判定到期（与成语等所有科目同口径）', () => {
    const next = review({ lv: MAX_LEVEL - 1, due: 0, ok: 3, ng: 0, last: 0 }, true, NOW, 1);
    expect(next.lv).toBe(MAX_LEVEL);

    // 一致性不变量：review 安排哪天复习，isDue 就在哪天判到期。
    expect(isDue(next, next.due ?? 0)).toBe(true);
    expect(isDue(next, (next.due ?? 0) - 1)).toBe(false);
  });

  it('MAX_LEVEL 的保温间隔由 INTERVALS[5]=30 天统一决定（P0-#3）', () => {
    expect(MAX_LEVEL).toBe(5);
    expect(INTERVALS[5]).toBe(30);
    // 复习到 lv5 时，下次复习恰好安排在 30 天后
    const next = review({ lv: MAX_LEVEL - 1, due: 0, ok: 3, ng: 0, last: 0 }, true, NOW, 1);
    expect(next.due).toBe(NOW + INTERVALS[5] * DAY);
  });
});

describe('srs · SKILL 构造器', () => {
  it('各类别 id 格式正确', () => {
    expect(SKILL.letter('a')).toBe('letter:A');
    expect(SKILL.number(7)).toBe('number:7');
    expect(SKILL.poem('jingyesi')).toBe('poem:jingyesi');
    expect(SKILL.math('add')).toBe('math:add');
    expect(SKILL.count()).toBe('number:count');
    expect(SKILL.logic('pattern')).toBe('logic:pattern');
  });
});
