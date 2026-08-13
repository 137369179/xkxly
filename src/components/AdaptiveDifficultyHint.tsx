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
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  meta: AdaptiveDifficultyMeta;
  /** 各档位在本模块里的叫法，缺省用「启蒙/进阶/挑战」 */
  labels?: Partial<Record<1 | 2 | 3, string>>;
  className?: string;
}

export function AdaptiveDifficultyHint({ meta, labels, className }: Props) {
  const { t } = useTranslation();
  const name = labels?.[meta.recommended] ?? t(`adaptiveDifficultyHint.level${meta.recommended}`);

  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-ink-soft/80 ${className ?? ''}`}
    >
      {meta.auto && meta.pending ? (
        <>
          <span aria-hidden>✨</span>
          <span>{t('adaptiveDifficultyHint.aiSuggest', { name })}</span>
          <button
            type="button"
            onClick={meta.syncNow}
            className="rounded-full bg-white/70 px-2 py-0.5 font-bold text-ink-soft underline-offset-2 transition hover:bg-white hover:underline"
          >
            {t('adaptiveDifficultyHint.aiConfirmBtn')}
          </button>
        </>
      ) : meta.auto ? (
        <>
          <span aria-hidden>🤖</span>
          <span>{t('adaptiveDifficultyHint.aiChose', { name })}</span>
        </>
      ) : (
        <>
          <span aria-hidden>✋</span>
          <span>{t('adaptiveDifficultyHint.manualChose')}</span>
          <button
            type="button"
            onClick={meta.reset}
            className="rounded-full bg-white/70 px-2 py-0.5 font-bold text-ink-soft underline-offset-2 transition hover:bg-white hover:underline"
          >
            {t('adaptiveDifficultyHint.resetBtn')}建议「{name}」）
          </button>
        </>
      )}
    </p>
  );
}
