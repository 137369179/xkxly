/**
 * 家长学习建议引擎（核心加强 G - M8）
 * ------------------------------------------------------------
 * 设计依据：Khan Kids 给家长的学习路径建议 +
 *          洪恩识字家长中心的弹性学习速度设置。
 *
 * 模块基于 srs（间隔重复）、dailyPlan（课程包）、adaptChain（适应链）
 * 和 dailyLog（每日记录）的综合数据，生成 3 类家长建议：
 *
 *   1. 紧迫提醒（due data 过期知识点太多 / 某模块连续一周停顿）
 *   2. 优化建议（某模块学太快质量低 / 某模块难度可提升）
 *   3. 表扬亮点（连对记录、掌握率提升、坚持天数）
 */
import type { Progress } from '@/types';
import { dueSkills, subjectLabel } from '@/lib/srs';
import { getChainSnapshot } from '@/lib/adaptChain';
import { achievedCount, milestoneCount } from '@/lib/milestone';

export interface ParentAdvice {
  kind: 'urgent' | 'suggest' | 'praise';
  emoji: string;
  title: string;
  detail: string;
}

/** 生成家长端的智能学习建议 */
export function generateAdvice(p: Progress): ParentAdvice[] {
  const results: ParentAdvice[] = [];

  // ── 紧迫提醒 ──
  const pending = dueSkills(p).length;
  if (pending >= 10) {
    results.push({
      kind: 'urgent',
      emoji: '⏰',
      title: `${pending} 个知识点待复习`,
      detail: '已远超建议复习窗口。建议今天安排一轮"错题智能复习"或延长每日学习时长，避免长期遗忘。',
    });
  } else if (pending >= 5) {
    results.push({
      kind: 'urgent',
      emoji: '🔔',
      title: `${pending} 个知识点待复习`,
      detail: '短期遗忘风险中等。连续 3 天不复习这些内容，孩子可能忘掉大半。建议尽快安排。',
    });
  }

  // ── 检查是否有模块停顿 ──
  const chain = getChainSnapshot();
  const stalledCategories: string[] = [];
  for (const c of chain) {
    if (c.lv === 0 || c.streak <= -2) {
      stalledCategories.push(subjectLabel(c.category));
    }
  }
  if (stalledCategories.length >= 2) {
    results.push({
      kind: 'urgent',
      emoji: '⚠️',
      title: `${stalledCategories.slice(0, 2).join('、')}停滞中`,
      detail: `连续回退或未推进超过 2 次。建议切换到该模块重点练习，或降低一档难度先从基础题开始。`,
    });
  }

  // ── 优化建议 ──
  const totalMastered = Object.values(p.mastery).filter((m) => m.lv >= 3).length;
  const totalTouched = Object.values(p.mastery).length;

  if (totalTouched > 30 && totalMastered / totalTouched < 0.3) {
    results.push({
      kind: 'suggest',
      emoji: '🎯',
      title: '建议放慢节奏 · 加深巩固',
      detail: `当前 ${totalTouched} 个知识点中只有 ${Math.round((totalMastered / totalTouched) * 100)}% 真正掌握。建议每天少学新课、增加复习比重，等掌握率到 50% 后再加速。`,
    });
  }

  // 检查薄弱模块 vs 强势模块对比
  const chainLvs = chain.filter((c) => c.lv > 0);
  if (chainLvs.length >= 4) {
    const maxLv = Math.max(...chainLvs.map((c) => c.lv));
    const minLv = Math.min(...chainLvs.map((c) => c.lv));
    if (maxLv - minLv >= 3) {
      const lowCats = chainLvs
        .filter((c) => c.lv <= minLv + 0.5)
        .map((c) => subjectLabel(c.category));
      results.push({
        kind: 'suggest',
        emoji: '⚖️',
        title: '模块间差距偏大',
        detail: `${lowCats.slice(0, 3).join('、')}明显落后其他模块。可以考虑每天先从这些弱项开始，趁精力充沛时攻克。`,
      });
    }
  }

  // ── 亮点表扬 ──
  const milestones = achievedCount(p);
  const total = milestoneCount();
  if (milestones >= total * 0.5) {
    results.push({
      kind: 'praise',
      emoji: '🏆',
      title: `里程碑达成 ${milestones}/${total}`,
      detail: '孩子在多个维度上都取得了长足进步，学习热情和自信心在持续增长！',
    });
  }

  if ((p.streak ?? 0) >= 7) {
    results.push({
      kind: 'praise',
      emoji: '🔥',
      title: `连续 ${p.streak} 天坚持学习`,
      detail: '自律习惯已经养成。持续的日积月累比突击式学习效果好几倍。孩子真的很棒！',
    });
  }

  // 检查本周新增知识点
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  let weekStars = 0;
  let weekMinutes = 0;
  for (let d = new Date(weekAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const log = p.dailyLog[key];
    if (log) {
      weekStars += log.stars ?? 0;
      weekMinutes += log.minutes ?? Math.round((log.sec ?? 0) / 60);

    }
  }
  if (weekMinutes >= 90) {
    results.push({
      kind: 'praise',
      emoji: '⏱️',
      title: `本周累计 ${weekMinutes} 分钟`,
      detail: `超过建议的每日 15 分钟线。孩子本周平均每天 ${Math.round(weekMinutes / 7)} 分钟，学习动力充沛！`,
    });
  }

  return results;
}
