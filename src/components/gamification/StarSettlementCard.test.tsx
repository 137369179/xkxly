// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { StarSettlementCard } from './StarSettlementCard';
import { earnStars, type EarnResult, type SessionOutcome } from '@/game/rewardEconomy';

function renderCard(
  result: EarnResult,
  extra: { moduleName?: string; reducedMotion?: boolean; masteryNote?: string | null } = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(StarSettlementCard, { result, ...extra }),
    );
  });
  return {
    container,
    root,
    text: () => container.textContent ?? '',
  };
}

describe('StarSettlementCard · 星星结算卡', () => {
  it('全对满连击：展示入账总数与「已存进口袋」的确认', () => {
    const result = earnStars({ module: 'hanzi', total: 5, correct: 5, bestCombo: 5 });
    const { container, text } = renderCard(result);
    expect(result.granted).toBeGreaterThan(0);
    expect(text()).toContain(`这节课赚到 ${result.granted} 颗星`);
    expect(text()).toContain('存进你的口袋');
    expect(container.querySelector('.ssc-total')).not.toBeNull();
  });

  it('逐项明细与 earnStars 的 breakdown 一一对应（UI 不与实际入账说两套话）', () => {
    const result = earnStars({ module: 'words', total: 5, correct: 5, bestCombo: 8 });
    const { container } = renderCard(result);
    const items = container.querySelectorAll('.ssc-item');
    expect(items).toHaveLength(result.breakdown.length);
    // 每个来源都渲染出自己那一行，且带上 +N
    result.breakdown.forEach((item, i) => {
      expect(items[i]?.getAttribute('data-source')).toBe(item.source);
      expect(items[i]?.textContent).toContain(`+${item.stars}`);
    });
    // 明细星数之和必须等于原始收益 raw（granted 可能因上限被截断，但明细说明星从哪来）
    const shownSum = result.breakdown.reduce((s, i) => s + i.stars, 0);
    expect(shownSum).toBe(result.raw);
  });

  it('当日上限触顶：绝不显示「0 颗星」，改为认可式收尾', () => {
    // earnedToday 已经打满，这节课一分钱都进不了账
    const result = earnStars(
      { module: 'numbers', total: 5, correct: 5, bestCombo: 5 },
      { earnedToday: 30, dailyCap: 30 },
    );
    expect(result.granted).toBe(0);
    expect(result.capped).toBeGreaterThan(0);

    const { container, text } = renderCard(result);
    // 关键断言：孩子看到的不是「赚到 0 颗星」
    expect(text()).not.toContain('赚到 0 颗星');
    expect(container.querySelector('.ssc-rested')).not.toBeNull();
    expect(text()).toContain('你真棒');
    // 同时如实告知还有多少星星顺延到明天，不假装什么都没发生
    expect(container.querySelector('.ssc-cap-note')?.textContent).toContain(
      String(result.capped),
    );
  });

  it('答错也绝不出现负数或扣分语义', () => {
    const outcome: SessionOutcome = { module: 'hanzi', total: 5, correct: 1, bestCombo: 1 };
    const result = earnStars(outcome);
    const { text } = renderCard(result);
    expect(result.granted).toBeGreaterThanOrEqual(0);
    expect(text()).not.toMatch(/-\d/); // 不出现 -N
    expect(text()).not.toContain('扣');
  });

  it('无障碍：role=status + aria-live=polite，模块名进入标签', () => {
    const result = earnStars({ module: 'hanzi', total: 5, correct: 5 });
    const { container } = renderCard(result, { moduleName: '汉字' });
    const section = container.querySelector('section');
    expect(section?.getAttribute('role')).toBe('status');
    expect(section?.getAttribute('aria-live')).toBe('polite');
    expect(section?.getAttribute('aria-label')).toBe('汉字本回合星星结算');
  });

  it('reducedMotion 开启时不挂逐项弹跳动画', () => {
    const result = earnStars({ module: 'words', total: 4, correct: 4, bestCombo: 4 });
    const animated = renderCard(result, { reducedMotion: false });
    const still = renderCard(result, { reducedMotion: true });

    const animatedItem = animated.container.querySelector<HTMLElement>('.ssc-item');
    const stillItem = still.container.querySelector<HTMLElement>('.ssc-item');
    expect(animatedItem?.style.animation).toBeTruthy();
    expect(stillItem?.style.animation).toBe('');
  });

  it('R164 掌握回路：传入 masteryNote 时渲染能力叙事句', () => {
    const result = earnStars({ module: 'hanzi', total: 5, correct: 5, bestCombo: 5 });
    const { container, text } = renderCard(result, {
      masteryNote: '这周你新学会了 3 个汉字，这些本领已经是你自己的啦！',
    });
    expect(container.querySelector('.ssc-mastery-note')).not.toBeNull();
    expect(text()).toContain('新学会了 3 个汉字');
  });

  it('R164 上限触顶时 masteryNote 仍然渲染（能力叙事不依赖星星是否入账）', () => {
    const result = earnStars(
      { module: 'hanzi', total: 5, correct: 5, bestCombo: 5 },
      { earnedToday: 30, dailyCap: 30 },
    );
    expect(result.granted).toBe(0);
    const { container } = renderCard(result, { masteryNote: '这周你新学会了 2 个汉字' });
    expect(container.querySelector('.ssc-mastery-note')).not.toBeNull();
  });

  it('R164 未传 / 传 null 时不渲染叙事节点（宁缺毋滥）', () => {
    const result = earnStars({ module: 'hanzi', total: 5, correct: 5 });
    expect(renderCard(result).container.querySelector('.ssc-mastery-note')).toBeNull();
    expect(
      renderCard(result, { masteryNote: null }).container.querySelector('.ssc-mastery-note'),
    ).toBeNull();
  });

  it('确定性：同一份 EarnResult 渲染结果完全一致（可快照、可复盘）', () => {
    const a = earnStars({ module: 'numbers', total: 5, correct: 4, bestCombo: 3 });
    const first = renderCard(a).text();
    const second = renderCard(a).text();
    expect(first).toBe(second);
  });
});
