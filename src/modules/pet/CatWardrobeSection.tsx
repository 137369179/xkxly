import { Panel } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { CatFishIcon, CatWardrobeIcon } from './PetIcons';
import { OUTFITS, type Outfit } from './catData';

export function CatWardrobeSection({
  fishCount,
  unlockedOutfits,
  equippedOutfits,
  onOutfitClick,
}: {
  fishCount: number;
  unlockedOutfits: readonly string[];
  equippedOutfits: Record<string, string>;
  onOutfitClick: (o: Outfit) => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel className="border-2 border-purple-300 bg-purple-50 text-center space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
          <CatWardrobeIcon size={26} /> {t('pet.wardrobeTitle')}
        </h3>
        <span className="text-sm font-black text-amber-600 bg-white px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
          <CatFishIcon size={18} /> {t('pet.haveFishShort')} {fishCount}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {OUTFITS.map((o) => {
          const isUnlocked = unlockedOutfits.includes(o.id);
          const isEquipped = equippedOutfits[o.type] === o.id;
          const canAfford = fishCount >= o.cost;
          const IconComp = o.icon;

          return (
            <button
              key={o.id}
              onClick={() => onOutfitClick(o)}
              className={`rounded-2xl border-2 p-3 text-center shadow-sm hover:scale-105 active:scale-95 transition-transform w-28 relative flex flex-col items-center justify-between ${
                isEquipped
                  ? 'border-pink-500 bg-pink-100 ring-2 ring-pink-300'
                  : isUnlocked
                  ? 'border-emerald-400 bg-emerald-50'
                  : canAfford
                  ? 'border-purple-200 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-70'
              }`}
            >
              <div className="my-1"><IconComp size={42} /></div>
              <p className="text-xs font-black text-purple-950 mt-1">{t(o.name)}</p>
              {!isUnlocked && (
                <div className={`badge-chip ${canAfford ? 'badge-chip--amber' : 'badge-chip--gray'}`}>
                  <CatFishIcon size={12} /> {o.cost}
                </div>
              )}
              {isEquipped && (
                <div className="badge-chip badge-chip--pink">
                  {t('pet.wearing')}
                </div>
              )}
              {isUnlocked && !isEquipped && (
                <div className="badge-chip badge-chip--emerald">
                  {t('pet.owned')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
