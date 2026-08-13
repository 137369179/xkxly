import { Panel } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { CatScholarMedal, CatPinyinMedal, CatMathMedal, CatNurtureMedal } from './PetMedalIcons';

export function CatMedalWallSection({
  medalScholar,
  medalPinyin,
  medalMath,
  medalNurture,
}: {
  medalScholar: boolean;
  medalPinyin: boolean;
  medalMath: boolean;
  medalNurture: boolean;
}) {
  const { t } = useTranslation();
  const medals = [
    { Medal: CatScholarMedal, unlocked: medalScholar, label: t('pet.medalScholar'), desc: t('pet.medalScholarDesc') },
    { Medal: CatPinyinMedal, unlocked: medalPinyin, label: t('pet.medalPinyin'), desc: t('pet.medalPinyinDesc') },
    { Medal: CatMathMedal, unlocked: medalMath, label: t('pet.medalMath'), desc: t('pet.medalMathDesc') },
    { Medal: CatNurtureMedal, unlocked: medalNurture, label: t('pet.medalNurture'), desc: t('pet.medalNurtureDesc') },
  ];
  return (
    <Panel className="border-2 border-amber-300 bg-amber-50 text-center space-y-3">
      <h3 className="text-lg font-black text-amber-950 flex items-center justify-center gap-2">
        {t('pet.medalWall')}
      </h3>
      <p className="text-xs font-bold text-amber-700">{t('pet.medalDesc')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-black text-amber-950">
        {medals.map(({ Medal, unlocked, label, desc }) => (
          <div key={label} className="rounded-2xl bg-white p-3 border border-amber-200 flex flex-col items-center shadow-xs">
            <Medal size={64} unlocked={unlocked} />
            <span className="mt-2 text-amber-900">{label}</span>
            <span className="text-[10px] text-amber-600 font-normal">{desc}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
