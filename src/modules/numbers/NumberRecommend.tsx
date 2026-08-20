/**
 * 数字王国 · 页面内"猜你接下来想练"推荐卡片
 * ------------------------------------------------------------------
 * 由 NumbersPage 依据 recommendNumberSkill(mastery) 计算结果传入，点击直接切到对应子玩法。
 * 与深链「专项训练」(TrainingBanner) 互补；本卡片在非专项深链场景常驻展示。
 */
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  emoji: string;
  label: string;
  /** true=薄弱点优先推荐；false=尚无记录的上手建议 */
  weakness: boolean;
  onGo: () => void;
}

export function NumberRecommend({ emoji, label, weakness, onGo }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-candy-yellow-soft bg-gradient-to-r from-amber-50 to-yellow-50/70 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
          {emoji}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-extrabold text-candy-yellow-deep">{t('numbers.recommendTitle')}</p>
          <p className="text-sm font-black text-ink">
            {weakness ? t('numbers.recommendWeak', { label }) : t('numbers.recommendFallback')}
          </p>
        </div>
      </div>
      <CandyButton tone="yellow" size="sm" onClick={onGo}>
        {t('numbers.recommendGo')}
      </CandyButton>
    </div>
  );
}