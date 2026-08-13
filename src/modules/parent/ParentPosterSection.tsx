import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useProgress } from '@/store/useStore';
import { generateAchievementPoster } from '@/lib/posterGenerator';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';

export function ParentPosterSection() {
  const { t: translate } = useTranslation();
  const progress = useProgress();
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  const handleGeneratePoster = async () => {
    setIsGeneratingPoster(true);
    try {
      const url = await generateAchievementPoster({
        progress,
        childName: translate('parent.childName'),
        aiRemark: '学习专注度极高，古诗与数学表现突出，继续加油哦！',
      });
      setPosterUrl(url);
    } catch (e) {
      if (import.meta.env.DEV) console.error('Poster gen error:', e);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  return (
    <>
      {/* 海报生成入口 */}
      <Panel className="bg-gradient-to-r from-candy-purple-soft via-candy-blue-soft to-candy-green-soft">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-ink-main flex items-center gap-2">
              {translate('parent.posterTitle')}
            </h3>
            <p className="text-xs font-bold text-ink-soft mt-1">
              {translate('parent.posterDesc')}
            </p>
          </div>
          <CandyButton
            tone="purple"
            size="md"
            onClick={handleGeneratePoster}
            disabled={isGeneratingPoster}
          >
            {isGeneratingPoster ? translate('parent.posterGenerating') : translate('parent.posterGenerate')}
          </CandyButton>
        </div>
      </Panel>

      {/* 海报预览模态框 */}
      {posterUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] flex-col items-center overflow-hidden rounded-3xl bg-white p-4 shadow-2xl">
            <h3 className="mb-2 text-xl font-extrabold text-ink-main">{translate('parent.posterCardTitle')}</h3>
            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-candy-purple/30">
              <img src={posterUrl} alt={translate('parent.posterAlt')} loading="lazy" decoding="async" className="h-auto w-[320px] rounded-xl sm:w-[420px]" />
            </div>
            <div className="mt-4 flex w-full gap-3">
              <a
                href={posterUrl}
                download={translate('parent.posterFileName')}
                className="flex-1 rounded-2xl bg-candy-purple py-2.5 text-center font-extrabold text-white shadow-md hover:bg-candy-purple-deep transition-colors"
              >
                {translate('parent.downloadPoster')}
              </a>
              <button
                onClick={() => setPosterUrl(null)}
                className="rounded-2xl bg-cream-dark px-5 py-2.5 font-bold text-ink-soft hover:bg-candy-yellow"
              >
                {translate('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
