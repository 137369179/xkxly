import { describe, it, expect } from 'vitest';
import { errorAnalyzer, WEAKNESS_LABEL } from './smart-practice';
import type { MasteryItem } from '@/types';

function mk(partial: Partial<MasteryItem>): MasteryItem {
  return { lv: 0, due: 0, ok: 0, ng: 0, last: 0, ...partial };
}

describe('ErrorAnalysisEngine.diagnoseSkill', () => {
  it('无错误记录时返回 null', () => {
    const m = mk({ lv: 2, ok: 5, ng: 0 });
    expect(errorAnalyzer.diagnoseSkill('math:add', m)).toBeNull();
  });

  it('回填真实 skillId（修复：不再为空串）', () => {
    const m = mk({ lv: 1, ok: 1, ng: 4 });
    const r = errorAnalyzer.diagnoseSkill('math:add', m);
    expect(r).not.toBeNull();
    expect(r!.skillId).toBe('math:add');
  });

  it('基础不牢且错误率极高 → calculation', () => {
    const m = mk({ lv: 0, ok: 1, ng: 9 }); // errorRate=0.9, lv<=1
    const r = errorAnalyzer.diagnoseSkill('math:add', m);
    expect(r!.weaknessType).toBe('calculation');
  });

  it('已熟练却错 → carelessness', () => {
    const m = mk({ lv: 4, ok: 20, ng: 9 }); // errorRate≈0.31>0.3, lv>=3
    const r = errorAnalyzer.diagnoseSkill('math:sub', m);
    expect(r!.weaknessType).toBe('carelessness');
  });

  it('高频错误但已有基础 → memory', () => {
    const m = mk({ lv: 3, ok: 2, ng: 8 }); // errorRate=0.8>0.6, lv>1
    const r = errorAnalyzer.diagnoseSkill('hanzi:水', m);
    expect(r!.weaknessType).toBe('memory');
  });

  it('WEAKNESS_LABEL 覆盖全部 5 种类型', () => {
    expect(Object.keys(WEAKNESS_LABEL)).toEqual([
      'conceptual',
      'calculation',
      'memory',
      'application',
      'carelessness',
    ]);
  });

  it('generatePracticePlan 使用真实 skillId', () => {
    const a = errorAnalyzer.diagnoseSkill('math:add', mk({ lv: 0, ok: 0, ng: 8 }))!;
    const b = errorAnalyzer.diagnoseSkill('hanzi:水', mk({ lv: 1, ok: 1, ng: 5 }))!;
    const plan = errorAnalyzer.generatePracticePlan([a, b], 15);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0]!.skillId).toBe('math:add');
    expect(plan[0]!.reason).toContain('累计错');
  });
});
