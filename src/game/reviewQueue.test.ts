import { describe, it, expect } from 'vitest';
import {
  selectReviewQueue,
  hasDueReview,
  nextReviewHint,
  type Reviewable,
  type ReviewItem,
} from './reviewQueue';
import type { MasteryItem } from '@/types';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function item(lv: number, dueOffset: number): MasteryItem {
  return { lv, due: NOW + dueOffset, ok: 1, ng: 0 };
}

function base(): Reviewable {
  return { mastery: {}, wrongBook: [] };
}

describe('selectReviewQueue', () => {
  it('空进度返回空队列、无上限、无下次到期', () => {
    const q = selectReviewQueue(base(), { now: NOW });
    expect(q.items).toHaveLength(0);
    expect(q.capped).toBe(0);
    expect(q.fromWrongBook).toBe(0);
    expect(q.nextDueAt).toBe(0);
  });

  it('到期（非错字本）skill 标记为 due', () => {
    const p = base();
    p.mastery = { 'hanzi:水': item(3, 0) }; // due 恰好等于 now → 「到期」
    const q = selectReviewQueue(p, { now: NOW });
    expect(q.items).toHaveLength(1);
    expect(q.items[0]!.reason).toBe('due');
    expect(q.fromWrongBook).toBe(0);
  });

  it('错字本 skill 优先级最高、来源标记为 wrong', () => {
    const p = base();
    p.mastery = {
      'hanzi:水': item(4, -DAY), // 已到期但记得牢
      'hanzi:火': item(2, -DAY),
    };
    p.wrongBook = ['hanzi:火'];
    const q = selectReviewQueue(p, { now: NOW });
    expect(q.items[0]!.skill).toBe('hanzi:火');
    expect(q.items[0]!.reason).toBe('wrong');
    expect(q.fromWrongBook).toBe(1);
  });

  it('逾期越久越靠前（在非错字本内按逾期排序）', () => {
    const p = base();
    p.mastery = {
      'hanzi:近': item(2, -1 * DAY),
      'hanzi:远': item(2, -10 * DAY),
    };
    const q = selectReviewQueue(p, { now: NOW });
    expect(q.items.map((i: ReviewItem) => i.skill)).toEqual(['hanzi:远', 'hanzi:近']);
  });

  it('每日上限裁剪并报告被顺延数量', () => {
    const p = base();
    p.mastery = {};
    for (let i = 0; i < 15; i++) p.mastery[`hanzi:字${i}`] = item(2, -DAY);
    const q = selectReviewQueue(p, { now: NOW, dailyCap: 10 });
    expect(q.items).toHaveLength(10);
    expect(q.capped).toBe(5);
  });

  it('dailyCap 下限为 1', () => {
    const p = base();
    p.mastery = { 'hanzi:水': item(2, -DAY) };
    const q = selectReviewQueue(p, { now: NOW, dailyCap: 0 });
    expect(q.items).toHaveLength(1);
  });

  it('nextDueAt 取最小未来到期', () => {
    const p = base();
    p.mastery = {
      'hanzi:近': item(2, 2 * DAY),
      'hanzi:远': item(2, 9 * DAY),
      'hanzi:过': item(2, -DAY),
    };
    const q = selectReviewQueue(p, { now: NOW });
    expect(q.nextDueAt).toBe(NOW + 2 * DAY);
  });

  it('错字本 skill 不在 mastery 中仍纳入（合成已到期）', () => {
    const p = base();
    p.wrongBook = ['hanzi:缺'];
    const q = selectReviewQueue(p, { now: NOW });
    expect(q.items).toHaveLength(1);
    expect(q.items[0]!.skill).toBe('hanzi:缺');
    expect(q.items[0]!.reason).toBe('wrong');
  });

  it('includeWrongBook=false 时错字本不优先', () => {
    const p = base();
    p.mastery = { 'hanzi:水': item(3, -DAY) };
    p.wrongBook = ['hanzi:火'];
    const q = selectReviewQueue(p, { now: NOW, includeWrongBook: false });
    expect(q.fromWrongBook).toBe(0);
    expect(q.items.some((i) => i.skill === 'hanzi:火')).toBe(false);
  });

  it('兼容历史上的 dueAt 命名', () => {
    const p = base();
    p.mastery = { 'hanzi:旧': { lv: 2, dueAt: NOW, ok: 1, ng: 0 } as MasteryItem };
    const q = selectReviewQueue(p, { now: NOW });
    expect(q.items).toHaveLength(1);
    expect(q.items[0]!.reason).toBe('due');
  });

  it('确定性：相同入参相同输出（无随机）', () => {
    const p = base();
    p.mastery = { 'hanzi:水': item(2, -DAY), 'hanzi:火': item(2, -2 * DAY) };
    const a = selectReviewQueue(p, { now: NOW });
    const b = selectReviewQueue(p, { now: NOW });
    expect(a).toEqual(b);
  });
});

describe('hasDueReview / nextReviewHint', () => {
  it('有错字本即视为有到期', () => {
    const p = base();
    p.wrongBook = ['hanzi:火'];
    expect(hasDueReview(p, NOW)).toBe(true);
  });

  it('无到期且无错字本返回 false', () => {
    const p = base();
    p.mastery = { 'hanzi:水': item(3, 5 * DAY) };
    expect(hasDueReview(p, NOW)).toBe(false);
    expect(nextReviewHint(p, NOW)).toEqual({ hasDue: false, nextDueAt: NOW + 5 * DAY });
  });

  it('到期 mastery 触发红点', () => {
    const p = base();
    p.mastery = { 'hanzi:水': item(2, -DAY) };
    expect(hasDueReview(p, NOW)).toBe(true);
    expect(nextReviewHint(p, NOW).hasDue).toBe(true);
  });
});
