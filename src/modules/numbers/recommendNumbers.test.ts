// @vitest-environment node
/**
 * 数字王国 · 个性化推荐纯逻辑单测
 */
import { describe, it, expect } from 'vitest';
import type { MasteryItem } from '@/types';
import { recommendNumberSkill, gameForSkill } from './recommendNumbers';

const m = (ok: number, ng: number): MasteryItem => ({ lv: 1, due: 0, ok, ng, last: 0 });

describe('gameForSkill 技能→子玩法映射', () => {
  it('精确键映射到正确 subTabId', () => {
    expect(gameForSkill('math:tenframe')).toBe('tenframe');
    expect(gameForSkill('math:skip')).toBe('skip');
    expect(gameForSkill('math:word')).toBe('word');
    expect(gameForSkill('math:fraction')).toBe('fraction');
    expect(gameForSkill('math:money')).toBe('money');
    expect(gameForSkill('math:rabbit')).toBe('run');
    expect(gameForSkill('math:mul')).toBe('extra');
    expect(gameForSkill('math:div')).toBe('extra');
    expect(gameForSkill('number:count')).toBe('count');
    expect(gameForSkill('compare')).toBe('measure');
    expect(gameForSkill('time')).toBe('clock');
  });

  it('非数字域技能返回 null', () => {
    expect(gameForSkill('poem:i1')).toBeNull();
    expect(gameForSkill('hanzi:x')).toBeNull();
    expect(gameForSkill('letter:a')).toBeNull();
  });
});

describe('recommendNumberSkill 推荐', () => {
  it('数字域无练习记录时回退基础「数数乐」', () => {
    expect(recommendNumberSkill({})).toEqual({ skill: 'number:count', game: 'count' });
    expect(recommendNumberSkill({ 'poem:i1': m(1, 0) })).toEqual({ skill: 'number:count', game: 'count' });
  });

  it('返回作答错误率最高的数字域子玩法', () => {
    const rec = recommendNumberSkill({
      'math:word': m(5, 5), // 错误率 50%
      'math:skip': m(9, 1), // 错误率 10%
    })!;
    expect(rec.game).toBe('word');
    expect(rec.skill).toBe('math:word');
  });

  it('同子玩法多技能合并作答后进行弱项排序', () => {
    // 跑游戏整体更弱：1/2 vs 8/18 = 0.5 vs 0.444 → 推荐 run(rabbit)
    const rec = recommendNumberSkill({
      'math:rabbit': m(1, 1),
      'math:word': m(8, 6),
    })!;
    expect(rec.game).toBe('run');
    expect(rec.skill).toBe('math:rabbit');
  });

  it('错误率相同时取答错次数更多的子玩法', () => {
    const rec = recommendNumberSkill({
      'math:shape': m(5, 2),
      'compare': m(3, 2),
    })!;
    // shape 2/7≈0.286，compare 2/5≈0.4 → compare 更弱
    expect(rec.game).toBe('measure');
  });
});