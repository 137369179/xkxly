/**
 * 自适应难度提示条（DDA 可视化）
 * ------------------------------------------------------------
 * 让「小智偷偷调难度」这件事对孩子和家长可见、可撤销：
 *   - auto  = true  → 显示当前是小智根据最近表现自动选的档位
 *   - auto  = false → 孩子自己选过档，给一个「回到小智推荐」的回退入口
 *
 * 设计取向：不抢戏。只有一行小字，颜色压得比正文淡，
 * 不打断做题心流；但家长扫一眼就知道系统在动态适配。
 */

import type { AdaptiveDifficultyMeta } from '@/lib/adaptChain';

const DEFAULT_LABELS: Record<1 | 2 | 3, string> = {
  1: '启蒙',
  2: '进阶',
  3: '挑战',
};

interface Props {
  meta: AdaptiveDifficultyMeta;
  /** 各档位在本模块里的叫法，缺省用「启蒙/进阶/挑战」 */
  labels?: Partial<Record<1 | 2 | 3, string>>;
  className?: string;
}

export function AdaptiveDifficultyHint({ meta, labels, className }: Props) {
  const name = labels?.[meta.recommended] ?? DEFAULT_LABELS[meta.recommended];

  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-ink-soft/80 ${className ?? ''}`}
    >
      {meta.auto && meta.pending ? (
        <>
          <span aria-hidden>✨</span>
          <span>小智觉得你可以试试「{name}」了</span>
          <button
            type="button"
            onClick={meta.syncNow}
            className="rounded-full bg-white/70 px-2 py-0.5 font-bold text-ink-soft underline-offset-2 transition hover:bg-white hover:underline"
          >
            好，换过去
          </button>
        </>
      ) : meta.auto ? (
        <>
          <span aria-hidden>🤖</span>
          <span>小智根据你最近的表现，选了「{name}」</span>
        </>
      ) : (
        <>
          <span aria-hidden>✋</span>
          <span>你自己选的难度</span>
          <button
            type="button"
            onClick={meta.reset}
            className="rounded-full bg-white/70 px-2 py-0.5 font-bold text-ink-soft underline-offset-2 transition hover:bg-white hover:underline"
          >
            交给小智（建议「{name}」）
          </button>
        </>
      )}
    </p>
  );
}
