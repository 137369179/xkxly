import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { EQUIPMENT } from '@/data/equipment';
import { getOwnedEquipment, calcTotalBonus } from '@/data/equipment';
import { cn } from '@/lib/utils';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

interface EquipmentPanelProps {
  ownedFragments: string[];
  ownedEquipment: string[];
  equippedItems: Record<string, string>;
  onToggle: (equipmentId: string) => void;
}

const SLOT_LABELS: Record<string, { label: string; emoji: string }> = {
  hat: { label: '帽子', emoji: '🎩' },
  cape: { label: '披风', emoji: '🦸' },
  sword: { label: '武器', emoji: '⚔️' },
  shield: { label: '盾牌', emoji: '🛡️' },
  crown: { label: '王冠', emoji: '👑' },
  robe: { label: '长袍', emoji: '✨' },
};

export function EquipmentPanel({ ownedFragments, ownedEquipment, equippedItems, onToggle }: EquipmentPanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const owned = getOwnedEquipment(ownedFragments);
  const bonus = calcTotalBonus(ownedFragments);

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-50 p-4">
      <button
        onClick={() => { sfxTap(); setExpanded(!expanded); }}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎒</span>
          <span className="text-base font-extrabold text-ink">装备背包</span>
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">
            {owned.length}/{EQUIPMENT.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Object.values(equippedItems).map(eid => {
            const eq = EQUIPMENT.find(e => e.id === eid);
            return eq ? <span key={eid} className="text-lg">{eq.emoji}</span> : null;
          })}
          <span className="text-ink-soft">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {(bonus.extraHp || bonus.extraTime || bonus.extraHints || bonus.starBonus) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bonus.extraHp ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">❤️ +{bonus.extraHp}</span> : null}
          {bonus.extraTime ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">⏰ +{bonus.extraTime}s</span> : null}
          {bonus.extraHints ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-600">💡 +{bonus.extraHints}</span> : null}
          {bonus.starBonus ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-600">⭐ +{bonus.starBonus}</span> : null}
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EQUIPMENT.map((eq) => {
                const isOwned = ownedEquipment.includes(eq.id);
                const isEquipped = equippedItems[eq.slot] === eq.id;
                const slotInfo = SLOT_LABELS[eq.slot]!;
                return (
                  <motion.button
                    key={eq.id}
                    disabled={!isOwned}
                    onClick={() => { sfxTap(); onToggle(eq.id); }}
                    whileTap={isOwned ? { scale: 0.95 } : undefined}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all',
                      isEquipped ? 'border-amber-400 bg-amber-100 shadow-md' :
                      isOwned ? 'border-white bg-white/70 hover:border-amber-200' :
                      'border-gray-200 bg-gray-50 opacity-50 grayscale'
                    )}
                  >
                    <span className="text-3xl">{isOwned ? eq.emoji : '❓'}</span>
                    <span className="text-[11px] font-extrabold text-ink">{isOwned ? eq.name : '???'}</span>
                    <span className="text-[9px] font-bold text-ink-soft">{slotInfo.emoji} {t(`equipmentPanel.${eq.slot}`)}</span>
                    {isOwned && (
                      <span className="text-[9px] font-bold text-amber-600">
                        {eq.bonus.extraHp ? `❤️+${eq.bonus.extraHp} ` : ''}
                        {eq.bonus.extraTime ? `⏰+${eq.bonus.extraTime}s ` : ''}
                        {eq.bonus.extraHints ? `💡+${eq.bonus.extraHints} ` : ''}
                        {eq.bonus.starBonus ? `⭐+${eq.bonus.starBonus}` : ''}
                      </span>
                    )}
                    {isEquipped && <span className="text-[9px] font-black text-amber-600">✓ 已装备</span>}
                  </motion.button>
                );
              })}
            </div>
            {!owned.length && (
              <p className="mt-2 text-center text-xs font-bold text-ink-soft">
                击败Boss获得碎片，解锁装备！🗺️
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
