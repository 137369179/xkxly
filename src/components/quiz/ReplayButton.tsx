/**
 * 听音重听按钮（从 QuizCard 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：点击重新朗读题干。
 */
import type { MouseEvent } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

export function ReplayButton({ onClick }: { onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  const { t: translate } = useTranslation();
  return (
    <div className="mt-2 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 rounded-full bg-candy-purple-soft px-4 py-1.5 text-sm font-extrabold text-candy-purple-deep shadow-candy-sm transition active:translate-y-[1px]"
        aria-label={translate('quiz.listenAgainBtn')}
        data-replay="audio"
      >
        {translate('quiz.listenAgainBtn')}
      </button>
    </div>
  );
}
