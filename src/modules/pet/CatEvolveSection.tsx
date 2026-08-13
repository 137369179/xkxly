import { Panel } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { EVOLVE_IMG, EVOLVE_INFO, EVOLVE_THRESHOLDS } from './catData';

export function CatEvolveSection({
  catLevel,
  stars,
  catAffection,
  onEvolve,
}: {
  catLevel: number;
  stars: number;
  catAffection: number;
  onEvolve: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 text-center space-y-3">
      <h3 className="text-lg font-black text-amber-950 flex items-center justify-center gap-2">
        <span className="icon-chip">🌟</span> {t('pet.evolveTitle')}
        <span className="ml-1 rounded-full bg-amber-500 px-3 py-0.5 text-sm text-white shadow-sm">
          Lv.{catLevel} · {t(EVOLVE_INFO[catLevel]?.title ?? 'pet.unknownForm')}
        </span>
      </h3>

      {/* 四级进化图鉴 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((lv) => {
          const info = EVOLVE_INFO[lv]!;
          const unlocked = catLevel >= lv;
          const current = catLevel === lv;
          return (
            <div
              key={lv}
              className={`relative overflow-hidden rounded-2xl border-2 p-2 text-center transition-all ${
                current
                  ? 'border-amber-500 bg-amber-100 shadow-md scale-[1.02]'
                  : unlocked
                  ? 'border-green-300 bg-white shadow-xs'
                  : 'border-gray-200 bg-gray-50 grayscale opacity-70'
              }`}
            >
              {current && (
                <div className="badge-chip badge-chip--pink animate-pulse">
                  CURRENT
                </div>
              )}
              <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
                <img
                  src={EVOLVE_IMG[lv]}
                  alt={t(info.title)}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {!unlocked && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-2xl">
                    🔒
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs font-black text-amber-950 flex items-center justify-center gap-1">
                {info.emoji} Lv.{lv} {t(info.title)}
              </p>
              <p className="text-[10px] text-amber-700 font-bold">{t(info.desc)}</p>
            </div>
          );
        })}
      </div>

      {/* 进化进度 + 按钮 */}
      {catLevel < 4 && (() => {
        const threshold = EVOLVE_THRESHOLDS[catLevel];
        if (!threshold) return null;
        const starsProgress = Math.min(100, (stars / threshold.stars) * 100);
        const affProgress = Math.min(100, (catAffection / threshold.affection) * 100);
        const canEvolve = stars >= threshold.stars && catAffection >= threshold.affection;

        return (
          <>
            <p className="text-xs font-bold text-amber-700">
              {t('pet.evolveProgress')} <span className="text-amber-900">{t(EVOLVE_THRESHOLDS[catLevel]?.title ?? '')}</span>
            </p>
            <div className="space-y-2 rounded-2xl bg-white/70 p-3 text-left text-xs font-bold text-amber-900">
              <div>
                <div className="flex justify-between">
                  <span>⭐ {t('pet.starsLabel')}</span>
                  <span className={stars >= threshold.stars ? 'text-green-600' : 'text-amber-700'}>
                    {stars} / {threshold.stars}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${starsProgress}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <span className="icon-chip icon-chip--static icon-chip--sm">💖</span>
                    {t('pet.affectionLabel')}
                  </span>
                  <span className={catAffection >= threshold.affection ? 'text-green-600' : 'text-amber-700'}>
                    {catAffection} / {threshold.affection}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full bg-pink-500 rounded-full transition-all"
                    style={{ width: `${affProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={onEvolve}
              disabled={!canEvolve}
              className={`mt-2 w-full rounded-xl py-2 text-base font-black transition active:scale-95 ${
                canEvolve
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 animate-pulse shadow-md'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              {canEvolve ? t('pet.evolveBtn') : t('pet.evolveNeed', { stars: Math.max(0, threshold.stars - stars), aff: Math.max(0, threshold.affection - catAffection) })}
            </button>
          </>
        );
      })()}

      {catLevel >= 4 && (
        <p className="text-sm font-black text-amber-950 bg-gradient-to-r from-pink-100 via-amber-100 to-yellow-100 inline-block px-4 py-1.5 rounded-full border border-amber-300 shadow-sm">
          {t('pet.maxLevel')}
        </p>
      )}
    </Panel>
  );
}
