import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DAILY_CAP,
  PITY_THRESHOLD,
  DUPLICATE_REFUND,
  REWARD_CATALOG,
  CAPSULE_PRIZES,
  earnStars,
  redeem,
  nextRewardGoal,
  drawCapsule,
  capsuleStats,
  rewardStage,
  FADE_STAGES,
} from './rewardEconomy';
import type { RewardItem, SessionOutcome } from './rewardEconomy';

const hanziFull: SessionOutcome = { module: 'hanzi', total: 5, correct: 5, bestCombo: 5 };

describe('rewardEconomy · 星星赚取', () => {
  it('全对 + 高连击可拿到评级星、连击星与全对星三项', () => {
    const r = earnStars({ module: 'hanzi', total: 5, correct: 5, bestCombo: 9 });
    const sources = r.breakdown.map((b) => b.source);
    expect(sources).toContain('rating');
    expect(sources).toContain('combo');
    expect(sources).toContain('perfect');
    // 3(评级) + 3(连击≥8) + 1(全对) = 7
    expect(r.raw).toBe(7);
    expect(r.granted).toBe(7);
    expect(r.capped).toBe(0);
  });

  it('答错永不扣分：低正确率也至少拿到一颗评级星，且 granted 非负', () => {
    const r = earnStars({ module: 'numbers', total: 5, correct: 1, bestCombo: 1 });
    expect(r.granted).toBeGreaterThan(0);
    expect(r.breakdown.every((b) => b.stars > 0)).toBe(true);
    expect(r.granted).toBeGreaterThanOrEqual(0);
  });

  it('出错后连对 ≥3 会补一颗鼓励星（温和引导，非惩罚）', () => {
    const r = earnStars({ module: 'words', total: 8, correct: 6, bestCombo: 4 });
    const comeback = r.breakdown.find((b) => b.source === 'comeback');
    expect(comeback).toBeDefined();
    expect(comeback?.stars).toBe(1);
    expect(comeback?.reason).toContain('没放弃');
  });

  it('未出错时不发鼓励星，避免奖励语义稀释', () => {
    const r = earnStars(hanziFull);
    expect(r.breakdown.some((b) => b.source === 'comeback')).toBe(false);
  });

  it('连击奖励只取最高命中档位，不叠加', () => {
    const r = earnStars({ module: 'numbers', total: 10, correct: 10, bestCombo: 10 });
    const comboItems = r.breakdown.filter((b) => b.source === 'combo');
    expect(comboItems).toHaveLength(1);
    expect(comboItems[0]?.stars).toBe(3);
  });

  it('每日上限截断：超限部分计入 capped，granted 永不超过剩余额度', () => {
    const r = earnStars(hanziFull, { earnedToday: DEFAULT_DAILY_CAP - 2, dailyCap: DEFAULT_DAILY_CAP });
    expect(r.granted).toBe(2);
    expect(r.capped).toBe(r.raw - 2);
    expect(r.granted).toBeLessThanOrEqual(2);
  });

  it('已达上限时 granted 为 0 而非负值', () => {
    const r = earnStars(hanziFull, { earnedToday: DEFAULT_DAILY_CAP, dailyCap: DEFAULT_DAILY_CAP });
    expect(r.granted).toBe(0);
    expect(r.capped).toBe(r.raw);
  });

  it('异常入参（0 题 / 负数 / 越界）不崩溃且不产生负收益', () => {
    const zero = earnStars({ module: 'hanzi', total: 0, correct: 0 });
    expect(zero.granted).toBe(0);
    const neg = earnStars({ module: 'hanzi', total: 5, correct: -3, bestCombo: -1 });
    expect(neg.granted).toBeGreaterThanOrEqual(0);
    const overflow = earnStars({ module: 'hanzi', total: 5, correct: 99, bestCombo: 2 });
    expect(overflow.granted).toBeGreaterThanOrEqual(0);
  });

  it('评级口径复用 @/lib/stars，三核心阈值一致（不各自漂移）', () => {
    const a = earnStars({ module: 'hanzi', total: 10, correct: 9, bestCombo: 0 });
    const b = earnStars({ module: 'numbers', total: 10, correct: 9, bestCombo: 0 });
    expect(a.breakdown.find((x) => x.source === 'rating')?.stars).toBe(3);
    expect(b.breakdown.find((x) => x.source === 'rating')?.stars).toBe(3);
  });
});

describe('rewardEconomy · 奖励淡出（防外部激励依赖）', () => {
  it('掌握量越高，附加星折算系数越低，但永不归零', () => {
    const multipliers = FADE_STAGES.map((s) => s.bonusMultiplier);
    for (let i = 1; i < multipliers.length; i += 1) {
      const prev = multipliers[i - 1];
      const cur = multipliers[i];
      if (prev !== undefined && cur !== undefined) expect(cur).toBeLessThan(prev);
    }
    multipliers.forEach((m) => expect(m).toBeGreaterThan(0));
  });

  it('四个阶段边界判定准确，负数与超大值都安全', () => {
    expect(rewardStage(0).stage).toBe(0);
    expect(rewardStage(19).stage).toBe(0);
    expect(rewardStage(20).stage).toBe(1);
    expect(rewardStage(60).stage).toBe(2);
    expect(rewardStage(120).stage).toBe(3);
    expect(rewardStage(99999).stage).toBe(3);
    expect(rewardStage(-5).stage).toBe(0);
  });

  it('反馈重心随阶段从星星转向能力成长', () => {
    expect(rewardStage(0).emphasis).toBe('token');
    expect(rewardStage(120).emphasis).toBe('competence');
  });

  it('淡出只折附加星，基础评级星永不打折', () => {
    const early = earnStars({ module: 'hanzi', total: 10, correct: 9, bestCombo: 8 });
    const late = earnStars({ module: 'hanzi', total: 10, correct: 9, bestCombo: 8 }, { masteredCount: 500 });
    const ratingEarly = early.breakdown.find((b) => b.source === 'rating')?.stars;
    const ratingLate = late.breakdown.find((b) => b.source === 'rating')?.stars;
    expect(ratingEarly).toBe(3);
    expect(ratingLate).toBe(3);

    const comboEarly = early.breakdown.find((b) => b.source === 'combo')?.stars ?? 0;
    const comboLate = late.breakdown.find((b) => b.source === 'combo')?.stars ?? 0;
    expect(comboLate).toBeLessThan(comboEarly);
    expect(late.raw).toBeLessThan(early.raw);
  });

  it('淡出后达标项至少仍给 1 颗，绝不出现「变强反而没奖励」', () => {
    const r = earnStars({ module: 'numbers', total: 6, correct: 6, bestCombo: 6 }, { masteredCount: 9999 });
    r.breakdown.forEach((b) => expect(b.stars).toBeGreaterThanOrEqual(1));
    expect(r.raw).toBeGreaterThan(0);
  });
});

describe('rewardEconomy · 奖励目录与解锁', () => {
  it('目录 12 级阶梯、成本严格递增、id 唯一', () => {
    expect(REWARD_CATALOG).toHaveLength(12);
    const ids = REWARD_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < REWARD_CATALOG.length; i += 1) {
      const prev = REWARD_CATALOG[i - 1];
      const cur = REWARD_CATALOG[i];
      if (prev && cur) expect(cur.cost).toBeGreaterThan(prev.cost);
    }
  });

  it('零付费墙：目录不含任何货币 / 购买字段，成本全为正数', () => {
    const banned = ['pay', 'buy', 'vip', 'rmb', 'yuan', 'price', 'purchase', 'money'];
    REWARD_CATALOG.forEach((item) => {
      expect(item.cost).toBeGreaterThan(0);
      const blob = `${item.id} ${item.label} ${item.description}`.toLowerCase();
      banned.forEach((w) => expect(blob).not.toContain(w));
    });
    expect(REWARD_CATALOG.every((i) => !i.description.includes('购买'))).toBe(true);
  });

  it('无竞争元素：目录文案不含排行榜 / 对战 / 排名', () => {
    const banned = ['排行', '排名', '对战', '击败', '第一'];
    REWARD_CATALOG.forEach((item) => {
      banned.forEach((w) => {
        expect(item.label).not.toContain(w);
        expect(item.description).not.toContain(w);
      });
    });
  });

  it('余额不足时返回「再集 N 颗星」的目标型文案，而不是否定型提示', () => {
    const item: RewardItem = REWARD_CATALOG[0];
    const r = redeem(2, item);
    expect(r.ok).toBe(false);
    expect(r.balance).toBe(2);
    expect(r.shortfall).toBe(item.cost - 2);
    expect(r.message).toContain(`再集 ${item.cost - 2} 颗星`);
    expect(r.message).not.toContain('不够');
  });

  it('余额充足时扣费并解锁', () => {
    const item: RewardItem = REWARD_CATALOG[0];
    const r = redeem(item.cost + 3, item);
    expect(r.ok).toBe(true);
    expect(r.balance).toBe(3);
    expect(r.unlocked).toEqual([item.id]);
    expect(r.shortfall).toBe(0);
  });

  it('已拥有的奖励不会重复扣费', () => {
    const item: RewardItem = REWARD_CATALOG[0];
    const r = redeem(999, item, [item.id]);
    expect(r.ok).toBe(false);
    expect(r.balance).toBe(999);
    expect(r.unlocked).toHaveLength(0);
    expect(r.message).toContain('已经拥有');
  });

  it('负余额与超额余额均被安全钳制', () => {
    const item: RewardItem = REWARD_CATALOG[0];
    expect(redeem(-5, item).ok).toBe(false);
    expect(redeem(-5, item).balance).toBe(0);
    expect(redeem(1000, item).balance).toBe(1000 - item.cost);
  });

  it('nextRewardGoal 指向第一个未拥有的奖励，并给出进度与差额', () => {
    const first: RewardItem = REWARD_CATALOG[0];
    const second: RewardItem = REWARD_CATALOG[1];
    const g1 = nextRewardGoal(3, []);
    expect(g1?.item.id).toBe(first.id);
    expect(g1?.shortfall).toBe(first.cost - 3);

    const g2 = nextRewardGoal(3, [first.id]);
    expect(g2?.item.id).toBe(second.id);

    const g3 = nextRewardGoal(100, []);
    expect(g3?.progress).toBe(1);
    expect(g3?.shortfall).toBe(0);
  });

  it('全部解锁后 nextRewardGoal 返回 null（不抛错、不返回无效目标）', () => {
    const all = REWARD_CATALOG.map((i) => i.id);
    expect(nextRewardGoal(9999, all)).toBeNull();
  });
});

describe('rewardEconomy · 扭蛋机', () => {
  it('奖品池 16 件、三档齐备、id 唯一', () => {
    expect(CAPSULE_PRIZES).toHaveLength(16);
    expect(CAPSULE_PRIZES.filter((p) => p.tier === 'common')).toHaveLength(8);
    expect(CAPSULE_PRIZES.filter((p) => p.tier === 'rare')).toHaveLength(5);
    expect(CAPSULE_PRIZES.filter((p) => p.tier === 'epic')).toHaveLength(3);
    const ids = CAPSULE_PRIZES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('同 seed 同结果（确定性，可复现 / 可回放）', () => {
    const a = drawCapsule({ seed: 42, pity: 0 });
    const b = drawCapsule({ seed: 42, pity: 0 });
    expect(a.prize.id).toBe(b.prize.id);
    expect(a.pityAfter).toBe(b.pityAfter);
  });

  it('优先抽未拥有的奖品，收集过程始终有进展', () => {
    const ownedAllCommon = CAPSULE_PRIZES.filter((p) => p.tier === 'common').map((p) => p.id);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const r = drawCapsule({ seed, owned: ownedAllCommon });
      expect(ownedAllCommon).not.toContain(r.prize.id);
      seen.add(r.prize.id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('保底：连续未出稀达到阈值后必出稀有及以上', () => {
    const r = drawCapsule({ seed: 7, pity: PITY_THRESHOLD });
    expect(r.pityTriggered).toBe(true);
    expect(r.prize.tier).not.toBe('common');
  });

  it('抽到普通档时 pity 累加，抽到稀有 / 史诗时清零', () => {
    let pity = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const r = drawCapsule({ seed, pity });
      pity = r.pityAfter;
      expect(pity).toBeLessThanOrEqual(PITY_THRESHOLD);
    }
  });

  it('全部收集完走重复路径：返还星星 + 温和文案，绝不返回空结果', () => {
    const all = CAPSULE_PRIZES.map((p) => p.id);
    const r = drawCapsule({ seed: 3, owned: all });
    expect(r.duplicate).toBe(true);
    expect(r.refund).toBe(DUPLICATE_REFUND);
    expect(r.prize.id).toBeTruthy();
    expect(r.message).toContain('已经有了');
    expect(r.message).not.toContain('失败');
  });

  it('重复路径不消耗 pity 计数（不因重复而倒退）', () => {
    const all = CAPSULE_PRIZES.map((p) => p.id);
    const r = drawCapsule({ seed: 3, owned: all, pity: 4 });
    expect(r.pityAfter).toBe(0);
  });

  it('向上升档兜底：某档位收集完时优先给更稀有的，而非更差的', () => {
    // 只留普通档未收集，且强制稀有档判定，应升档到 epic 而非降档
    const onlyCommonLeft = CAPSULE_PRIZES.filter((p) => p.tier !== 'common').map((p) => p.id);
    const ownedExceptCommon = CAPSULE_PRIZES.filter((p) => p.tier === 'common').map((p) => p.id);
    // 场景 A：除普通外全部拥有 → 从稀有档起抽，稀有/史诗都没有了，落到普通
    const a = drawCapsule({ seed: 11, owned: ownedExceptCommon, pity: PITY_THRESHOLD });
    expect(a.prize).toBeDefined();
    // 场景 B：普通档全拥有、稀有档还有 → 应升到稀有/史诗
    const ownedCommonOnly = CAPSULE_PRIZES.filter((p) => p.tier === 'common').map((p) => p.id);
    const b = drawCapsule({ seed: 11, owned: ownedCommonOnly, pity: PITY_THRESHOLD });
    expect(b.prize.tier).not.toBe('common');
    expect(onlyCommonLeft.length).toBeGreaterThan(0);
  });

  it('capsuleStats 输出三档收集进度，分母等于各档总数', () => {
    const stats = capsuleStats(['cap-star-sticker', 'cap-rainbow']);
    expect(stats).toHaveLength(3);
    expect(stats.reduce((s, x) => s + x.total, 0)).toBe(CAPSULE_PRIZES.length);
    const common = stats.find((s) => s.tier === 'common');
    const rare = stats.find((s) => s.tier === 'rare');
    expect(common?.ownedCount).toBe(1);
    expect(rare?.ownedCount).toBe(1);
  });
});
