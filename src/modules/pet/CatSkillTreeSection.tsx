import { Panel } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { CatGlassesIcon, CatCrownIcon, CatBowIcon, CatTieIcon } from './PetIcons';
import { EVOLVE_IMG, ACTION_IMG } from './catData';

export function CatSkillTreeSection() {
  const { t } = useTranslation();
  const cells = [
    { img: EVOLVE_IMG[3], label: t('pet.skillYuwen'), desc: t('pet.skillYuwenDesc'), Icon: CatGlassesIcon, name: t('pet.skillYuwen') },
    { img: EVOLVE_IMG[4], label: t('pet.skillMath'), desc: t('pet.skillMathDesc'), Icon: CatCrownIcon, name: t('pet.skillMath') },
    { img: EVOLVE_IMG[2], label: t('pet.skillPinyin'), desc: t('pet.skillPinyinDesc'), Icon: CatBowIcon, name: t('pet.skillPinyin') },
    { img: ACTION_IMG['idle'], label: t('pet.skillScience'), desc: t('pet.skillScienceDesc'), Icon: CatTieIcon, name: t('pet.skillScience') },
  ];
  return (
    <Panel className="border-2 border-emerald-300 bg-emerald-50 text-center space-y-3">
      <h3 className="text-lg font-black text-emerald-900">{t('pet.skillTreeTitle')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-black text-emerald-900">
        {cells.map((c) => (
          <div key={c.name} className="rounded-2xl bg-white p-2 border border-emerald-200 flex flex-col items-center shadow-xs overflow-hidden">
            <div className="w-full aspect-square overflow-hidden rounded-xl bg-white mb-1">
              <img src={c.img} alt={c.label} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
            <span className="mt-1 flex items-center gap-1"><c.Icon size={16} /> {c.label}</span>
            <p className="text-[10px] text-emerald-600 mt-0.5">{c.desc}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
