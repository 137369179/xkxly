import { describe, it, expect } from 'vitest';
import { getPrerequisites, findRootCauseSkill } from '../prerequisites';

describe('prerequisites · Knowledge Prerequisite Tree', () => {
  it('returns direct dependencies for math:sub_20', () => {
    const deps = getPrerequisites('math:sub_20');
    expect(deps).toContain('math:add_10');
    expect(deps).toContain('math:count');
  });

  it('diagnoses unmastered prerequisite as root cause', () => {
    const mockMastery = {
      'math:count': { lv: 3 },
      'math:add_10': { lv: 1 }, // 掌握度不足
    };
    const rootCause = findRootCauseSkill('math:sub_20', mockMastery);
    expect(rootCause).toBe('math:add_10');
  });

  it('returns null if all prerequisites are mastered (lv >= 2)', () => {
    const mockMastery = {
      'math:count': { lv: 3 },
      'math:add_10': { lv: 3 },
      'math:sub_10': { lv: 2 },
    };
    const rootCause = findRootCauseSkill('math:sub_20', mockMastery);
    expect(rootCause).toBeNull();
  });
});
