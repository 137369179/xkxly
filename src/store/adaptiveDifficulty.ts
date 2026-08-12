/**
 * 自适应难度 · React 钩子层（store 层，允许依赖 lib 与 store）
 * ------------------------------------------------------------
 * 把 lib/adaptChain 的纯逻辑（recommendDifficulty / getSlot / applyRecentSignals）
 * 接到全局 store 的响应式进度上。迁移自此前的 lib/adaptChain，目的是消除
 * lib→store 的层倒置循环依赖：纯逻辑留在 lib，需要订阅 store 的钩子放在本层。
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useProgress } from '@/store/useStore';
import { getSlot, recommendDifficulty, type AdaptiveDifficultyMeta } from '@/lib/adaptChain';

export { type AdaptiveDifficultyMeta } from '@/lib/adaptChain';

/** 读取某类难度链槽位（非响应式快照，用于非渲染期） */
export function useChainSlot(cat: string) {
  const p = useProgress();
  return useMemo(() => getSlot(cat), [cat, p.stars]);
}

/** 某类学科的"小智建议难度"（响应式跟随 DDA 推荐） */
export function useAdaptiveDifficulty(cat: string): 1 | 2 | 3 {
  const p = useProgress();
  return useMemo(() => recommendDifficulty(p, cat), [p, cat]);
}

/**
 * P1-1：全站统一的自适应难度状态。
 *
 * 取代各模块 `useState<Difficulty>(1)` 的硬编码写法——那会让孩子每次进模块
 * 都从最低档重来，DDA 引擎形同虚设。
 *
 * 语义：
 *   - 孩子没手动选档时（auto=true），难度**实时跟随** DDA 推荐，
 *     答对变快就自动升档、连错/依赖提示就自动降档；
 *   - 孩子一旦手动选档，立即转为手动模式并尊重其选择（孩子仍是主人），
 *     直到调用 `meta.reset()` 才回到跟随。
 *
 * 为什么是"锁存"而不是每次 render 直接取推荐值：
 *   孩子每答一题都会 `recordAttempt`，推荐档位可能在**一轮做题中途**变化。
 *   多数模块用 `key={`${tab}-${diff}`}` 驱动出题器，难度一变就整轮重挂，
 *   孩子做到第 4 题会被打回第 1 题——那是比"难度不自适应"更糟的体验。
 *   所以正在用的档位被锁存，只在安全边界（`syncNow()`：一轮结束 / 重新开局）
 *   或孩子主动接受建议时才切换；`meta.pending` 用来提示"小智想给你换档了"。
 */
export function useAdaptiveDifficultyState(
  cat: string,
): [1 | 2 | 3, (d: 1 | 2 | 3) => void, AdaptiveDifficultyMeta] {
  const recommended = useAdaptiveDifficulty(cat);
  const recommendedRef = useRef(recommended);
  recommendedRef.current = recommended;

  const [manual, setManual] = useState<1 | 2 | 3 | null>(null);
  const [latched, setLatched] = useState<1 | 2 | 3>(recommended);

  // 学科切换（如 MathExtra 在 乘除/图形/时间/钱币 之间切子页）时重新起算
  const [prevCat, setPrevCat] = useState(cat);
  if (prevCat !== cat) {
    setPrevCat(cat);
    setLatched(recommended);
    setManual(null);
  }

  const set = useCallback((d: 1 | 2 | 3) => setManual(d), []);
  const reset = useCallback(() => {
    setManual(null);
    setLatched(recommendedRef.current);
  }, []);
  const syncNow = useCallback(() => {
    setLatched(recommendedRef.current);
  }, []);

  const value = manual ?? latched;
  const auto = manual === null;
  const meta = useMemo<AdaptiveDifficultyMeta>(
    () => ({ auto, recommended, pending: auto && latched !== recommended, reset, syncNow }),
    [auto, recommended, latched, reset, syncNow],
  );
  return [value, set, meta];
}
