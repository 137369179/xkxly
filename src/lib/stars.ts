/**
 * 统一星星评级计算（扫描 P3-1）
 * ------------------------------------------------------------
 * 此前各游戏模块各自手写 3/2/1 档位、阈值各不相同（错误数 / 正确率 / 全对加分）。
 * 这里沉淀为三个标准口径，供各模块复用，统一 UI 一致性：
 *   - starsByRate        按正确率（0~1）评级
 *   - starsByCorrect     按答对数/总数评级（perfect 单独判定）
 *   - starsByMistakes    按错误数评级（0 错满分，错误容忍度随总数放宽）
 *
 * ⚠️ 迁移注意：各模块原阈值是各自调校过的产品决策，迁移时请用可复现相同
 * 语义的参数（如 thresholds / perfectOnly3），勿盲改默认值导致游戏体验变化。
 */

export type StarCount = 1 | 2 | 3;

export interface RateStarsOptions {
  /** 3 星所需正确率（默认 0.9） */
  topRate?: number;
  /** 2 星所需正确率（默认 0.7） */
  midRate?: number;
}

/**
 * 按正确率评级：rate >= topRate → 3；>= midRate → 2；否则 1。
 * @example starsByRate(0.95) // 3
 */
export function starsByRate(rate: number, opts: RateStarsOptions = {}): StarCount {
  const { topRate = 0.9, midRate = 0.7 } = opts;
  if (rate >= topRate) return 3;
  if (rate >= midRate) return 2;
  return 1;
}

export interface CorrectStarsOptions extends RateStarsOptions {
  /** 是否「只有全对才给 3 星」（默认 false，即 topRate 判定） */
  perfectOnly3?: boolean;
}

/**
 * 按答对数/总数评级：默认 3 星看 topRate；perfectOnly3 时全对才 3 星。
 * @example starsByCorrect(10, 10)            // 3
 * @example starsByCorrect(9, 10, { perfectOnly3: true }) // 2
 */
export function starsByCorrect(correct: number, total: number, opts: CorrectStarsOptions = {}): StarCount {
  if (total <= 0) return 1;
  const rate = correct / total;
  if (opts.perfectOnly3) {
    if (correct >= total) return 3;
    return rate >= (opts.midRate ?? 0.7) ? 2 : 1;
  }
  return starsByRate(rate, opts);
}

/**
 * 按错误数评级：0 错 → 3；错误数 ≤ ceil(total/3) → 2；否则 1。
 * @example starsByMistakes(0, 6)  // 3
 * @example starsByMistakes(2, 6)  // 2（ceil(6/3)=2）
 * @example starsByMistakes(3, 6)  // 1
 */
export function starsByMistakes(mistakes: number, total: number): StarCount {
  if (mistakes <= 0) return 3;
  return mistakes <= Math.ceil(total / 3) ? 2 : 1;
}
