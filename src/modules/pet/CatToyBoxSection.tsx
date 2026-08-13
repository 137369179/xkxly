import { Panel } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { CatToyboxIcon, CatWandIcon, CatYarnIcon, CatnipIcon } from './PetIcons';
import type { CatAction } from './catData';

export function CatToyBoxSection({ onToy }: { onToy: (act: CatAction) => void }) {
  const { t } = useTranslation();
  return (
    <Panel className="border-2 border-pink-300 bg-pink-50 text-center space-y-3">
      <h3 className="text-lg font-black text-pink-950 flex items-center justify-center gap-2">
        <CatToyboxIcon size={26} /> {t('pet.toyboxTitle')}
      </h3>
      {/* 玩具箱场景横幅 */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-pink-200 shadow-xs">
        <img
          src="/cat/cat-toybox-fun.jpg"
          alt={t('pet.toyboxAlt')}
          className="w-full h-44 object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pink-950/75 via-pink-900/10 to-transparent flex items-end">
          <p className="p-3 text-white text-sm font-black text-left">
            {t('pet.toyboxBanner')}
          </p>
        </div>
      </div>
      <div className="flex justify-center flex-wrap gap-3">
        <button
          onClick={() => onToy('jump')}
          className="rounded-2xl border-2 border-pink-300 bg-white p-3 text-center shadow-xs hover:scale-105 transition-transform flex flex-col items-center"
        >
          <CatWandIcon size={40} />
          <p className="text-xs font-black text-pink-950 mt-1">{t('pet.wandName')}</p>
        </button>

        <button
          onClick={() => onToy('roll')}
          className="rounded-2xl border-2 border-pink-300 bg-white p-3 text-center shadow-xs hover:scale-105 transition-transform flex flex-col items-center"
        >
          <CatYarnIcon size={40} />
          <p className="text-xs font-black text-pink-950 mt-1">{t('pet.yarnName')}</p>
        </button>

        <button
          onClick={() => onToy('purr')}
          className="rounded-2xl border-2 border-pink-300 bg-white p-3 text-center shadow-xs hover:scale-105 transition-transform flex flex-col items-center"
        >
          <CatnipIcon size={40} />
          <p className="text-xs font-black text-pink-950 mt-1">{t('pet.catnipName')}</p>
        </button>
      </div>
    </Panel>
  );
}
