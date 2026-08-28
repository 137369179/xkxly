/**
 * 动物百科卡 🦁 (R6)
 * 动物认知：分类/特征/栖息地/声音
 */
import { memo, useState } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { ANIMALS as FULL_ANIMALS, type AnimalItem } from '@/data/animals';

// 将全量动物数据映射为统一展示结构
const ANIMALS = FULL_ANIMALS.map((a: AnimalItem) => ({
  emoji: a.emoji,
  name: a.nameZh,
  en: a.nameEn,
  sound: a.sound,
  habitat: a.habitat,
  animalClass: a.animalClass,
  diet: a.diet,
  funFact: a.funFact,
}));

const HABITATS = Array.from(new Set(FULL_ANIMALS.map((a) => a.habitat)));

function AnimalCardsImpl() {
  const { t } = useTranslation();

  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);
  const a = ANIMALS[selected]!

  const filtered = filter ? ANIMALS.filter(an => an.habitat === filter || an.animalClass === filter) : ANIMALS;

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('animal.title')}</h3>

      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        <button onClick={()=>setFilter(null)} className={cn('rounded-lg px-2.5 py-1 text-xs font-extrabold', !filter?'bg-candy-green-deep text-white':'bg-white text-ink-soft shadow-sm')}>{t('animal.all')}</button>
        {HABITATS.map(h => (
          <button key={h} onClick={()=>setFilter(h)} className={cn('rounded-lg px-2.5 py-1 text-xs font-extrabold', filter===h?'bg-candy-green-deep text-white':'bg-white text-ink-soft shadow-sm')}>{t(h)}</button>
        ))}
      </div>

      <div className="mb-4 text-center">
        <motion.div key={a.emoji} initial={{scale:0.5}} animate={{scale:1}} className="mx-auto mb-2 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-lg">
          <span className="text-6xl">{a.emoji}</span>
        </motion.div>
        <p className="text-xl font-extrabold text-ink">{a.name} <span className="text-sm font-bold text-ink-soft">{a.en}</span></p>
        <button onClick={()=>speak(`${a.name}，${a.sound}`, { lang:'zh-CN', rate:0.8, module:'ai' })}
          className="mt-1 rounded-full bg-candy-green-soft px-3 py-0.5 text-xs font-extrabold text-candy-green-deep">
          🔊 {a.sound}
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-candy-blue-soft/30 p-2">
          <p className="text-xs font-bold text-ink-muted">{t('animal.habitat') || '栖息地'}</p>
          <p className="text-sm font-extrabold text-ink">{a.habitat}</p>
        </div>
        <div className="rounded-xl bg-candy-orange-soft/30 p-2">
          <p className="text-xs font-bold text-ink-muted">{t('animal.class') || '类别'}</p>
          <p className="text-sm font-extrabold text-ink">{a.animalClass}</p>
        </div>
        <div className="rounded-xl bg-candy-pink-soft/30 p-2">
          <p className="text-xs font-bold text-ink-muted">{t('animal.diet') || '食性'}</p>
          <p className="text-sm font-extrabold text-ink">{a.diet}</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-yellow-50 p-2 text-center">
        <p className="text-xs font-bold text-ink-soft">💡 {a.funFact}</p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 max-h-64 overflow-y-auto p-1">
        {filtered.map((an) => {
          const realIdx = ANIMALS.indexOf(an);

          return (
            <button key={an.en} onClick={()=>{setSelected(realIdx);speak(an.name,{lang:'zh-CN',rate:0.8,module:'ai'});}}
              className={cn('rounded-xl p-2 text-center shadow-sm transition-all hover:scale-105',
                selected===realIdx ? 'bg-candy-green-deep text-white' : 'bg-white'
              )}>
              <div className="text-2xl">{an.emoji}</div>
              <p className="mt-0.5 truncate text-xs font-extrabold">{an.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const AnimalCards = memo(AnimalCardsImpl);
