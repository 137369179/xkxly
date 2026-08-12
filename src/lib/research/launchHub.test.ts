import { describe, it, expect } from 'vitest';
import { createInitialProgress } from '@/lib/progress';
import {
  topicResearchState,
  launchSummary,
  MAX_MASTERY,
} from './launchHub';
import type { Progress } from '@/types';

function base(): Progress {
  return createInitialProgress();
}

describe('topicResearchState', () => {
  it('默认：未探索、掌握度 0、无笔记', () => {
    const p = base();
    const s = topicResearchState(p, 'dino');
    expect(s.explored).toBe(false);
    expect(s.masteryLv).toBe(0);
    expect(s.hasNote).toBe(false);
    expect(s.mastered).toBe(false);
  });

  it('探索过 → explored=true', () => {
    const p = base();
    p.researchStats = { ...(p.researchStats as object), topicsExplored: ['dino'] } as Progress['researchStats'];
    expect(topicResearchState(p, 'dino').explored).toBe(true);
    expect(topicResearchState(p, 'space').explored).toBe(false);
  });

  it('mastery 等级正确映射', () => {
    const p = base();
    p.mastery = { 'research:dino': { lv: 3, due: 0, ok: 0, ng: 0, last: 0 } };
    expect(topicResearchState(p, 'dino').masteryLv).toBe(3);
    expect(topicResearchState(p, 'dino').mastered).toBe(false);
  });

  it('满级 → mastered=true', () => {
    const p = base();
    p.mastery = { 'research:dino': { lv: MAX_MASTERY, due: 0, ok: 0, ng: 0, last: 0 } };
    expect(topicResearchState(p, 'dino').mastered).toBe(true);
  });

  it('非空笔记 → hasNote=true；空串 → false', () => {
    const p = base();
    p.researchNotes = { dino: '恐龙生活在很久以前' };
    expect(topicResearchState(p, 'dino').hasNote).toBe(true);
    p.researchNotes = { dino: '   ' };
    expect(topicResearchState(p, 'dino').hasNote).toBe(false);
  });
});

describe('launchSummary', () => {
  it('默认全 0', () => {
    const s = launchSummary(base());
    expect(s.exploredCount).toBe(0);
    expect(s.totalTopics).toBe(6);
    expect(s.discoveryCount).toBe(0);
    expect(s.noteCount).toBe(0);
    expect(s.sessionsCompleted).toBe(0);
  });

  it('正确统计已探索/收藏/笔记/完成会话', () => {
    const p = base();
    p.researchStats = {
      topicsExplored: ['dino', 'space'],
      exploreActions: 10,
      cardsRead: 4,
      sessionsCompleted: 2,
      exploreSeconds: 120,
    };
    p.discoveries = ['k1', 'k2', 'k3'];
    p.researchNotes = { dino: '笔记一', color: '', space: '笔记二' };
    const s = launchSummary(p);
    expect(s.exploredCount).toBe(2);
    expect(s.discoveryCount).toBe(3);
    expect(s.noteCount).toBe(2);
    expect(s.sessionsCompleted).toBe(2);
  });
});
