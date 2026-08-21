/**
 * AI 调用量 · 每日 token 预算（成本封顶）
 * ------------------------------------------------------------------
 * 背景：Agnes 等推理模型 reasoning 占大头（70~85% completion token），
 * 若不加预算，流量一起来就是不可控的账单。本模块提供按「自然日」累计
 * 完成 token 的硬上限，超限即拒绝新请求（前端会整体降级到本地兜底）。
 *
 * 纯逻辑、可注入时钟，便于单测；内存 Map 只保留最近两天，防膨胀。
 */
export function createTokenBudget({ dailyLimit = 0, now = () => Date.now() } = {}) {
  const byDay = new Map(); // '2026-08-21' -> 累计 token
  const keyOf = (t) => new Date(t).toISOString().slice(0, 10); // UTC 日界，稳定且易测

  const prune = (t) => {
    const today = keyOf(t);
    const yesterday = keyOf(t - 86_400_000);
    for (const k of byDay.keys()) {
      if (k !== today && k !== yesterday) byDay.delete(k);
    }
  };

  return {
    /** 是否启用预算（dailyLimit>0 才计入） */
    enabled: dailyLimit > 0,
    /** 记录一次成功调用的用量（text+reasoning+prompt），幂等累加 */
    charge(cost) {
      if (cost <= 0) return;
      const k = keyOf(now());
      byDay.set(k, (byDay.get(k) || 0) + cost);
      prune(now());
    },
    /** 当日是否已达上限 */
    overBudget() {
      if (!this.enabled) return false;
      return (byDay.get(keyOf(now())) || 0) >= dailyLimit;
    },
    /** 当日累计用量（仅当 enabled 时有意义） */
    currentCost() {
      return byDay.get(keyOf(now())) || 0;
    },
    /** 测试/诊断用：当前桶 */
    _data() {
      return byDay;
    },
  };
}

export default createTokenBudget;