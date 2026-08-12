/** 合并 className，过滤掉 falsy */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** [min, max] 闭区间随机整数 */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 洗牌（不修改原数组） */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 随机取一个元素 */
export function sample<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 随机取 n 个不重复元素 */
export function sampleMany<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

/** 生成 [start, end) 的整数数组 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 生成一组「干扰项」：围绕正确答案取邻近的错误数字
 */
export function makeNumberOptions(correct: number, count: number, min = 0, max = 20): number[] {
  const set = new Set<number>([correct]);
  let guard = 0;
  while (set.size < count && guard++ < 200) {
    const delta = randInt(1, 4) * (Math.random() < 0.5 ? -1 : 1);
    const v = correct + delta;
    if (v >= min && v <= max) set.add(v);
  }
  // 仍不够就线性补齐
  let fill = min;
  while (set.size < count && fill <= max) {
    set.add(fill++);
  }
  return shuffle([...set]);
}
