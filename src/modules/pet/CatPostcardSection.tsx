import { Panel } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';

export function CatPostcardSection({ catAffection }: { catAffection: number }) {
  const { t } = useTranslation();
  const postcardUnlocked = [
    catAffection >= 10,   // 拼音森林
    catAffection >= 25,   // 字母盒子
    catAffection >= 40,   // 羊毛毡小镇
    true,                 // 喵喵房间
  ];
  return (
    <Panel className="border-2 border-rose-300 bg-rose-50 text-center space-y-3">
      <h3 className="text-lg font-black text-rose-950 flex items-center justify-center gap-2">
        {t('pet.postcardTitle')}
      </h3>
      <p className="text-xs font-bold text-rose-700">{t('pet.postcardDesc')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-black text-rose-950">
        {[
          { img: '/icons/felt_phonics.jpg', label: t('pet.postcard1'), tip: t('pet.unlockLv', { level: 1 }) },
          { img: '/icons/felt_box.jpg', label: t('pet.postcard2'), tip: t('pet.unlockLv', { level: 2 }) },
          { img: '/icons/felt_town.jpg', label: t('pet.postcard3'), tip: t('pet.unlockLv', { level: 3 }) },
          { img: '/icons/felt_room.jpg', label: t('pet.postcard4'), tip: t('pet.initialOwned') },
        ].map((item, i) => {
          const unlocked = postcardUnlocked[i];
          return (
            <div
              key={`postcard-${i}`}
              className={`group relative overflow-hidden rounded-2xl border-2 bg-white p-2 shadow-xs hover:shadow-md transition-all ${
                unlocked ? 'border-rose-200' : 'border-slate-200'
              }`}
            >
              <div className={`relative overflow-hidden rounded-xl ${unlocked ? '' : 'grayscale opacity-60'}`}>
                <img
                  src={item.img}
                  alt={item.label}
                  className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                  decoding="async"
                />
                {!unlocked && (
                  <div className="absolute inset-0 grid place-items-center bg-black/50 text-2xl backdrop-blur-[1px]">
                    🔒
                  </div>
                )}
              </div>
              <p className="mt-2 text-center">{item.label}</p>
              <span className="text-xs text-rose-500 font-normal">{item.tip}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
