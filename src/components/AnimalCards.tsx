/**
 * 动物百科卡 🦁 (R6)
 * 动物认知：分类/特征/栖息地/声音
 */
import { memo, useState } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const ANIMALS = [
  { emoji: '🦁', name: 'animal.lion.name', en: 'Lion', sound: 'animal.lion.sound', habitat: 'animal.habitatGrassland', animalClass: 'animal.lion.class', diet: 'animal.lion.diet', funFact: 'animal.lion.fact' },
  { emoji: '🐘', name: 'animal.elephant.name', en: 'Elephant', sound: 'animal.elephant.sound', habitat: 'animal.habitatGrassland', animalClass: 'animal.elephant.class', diet: 'animal.elephant.diet', funFact: 'animal.elephant.fact' },
  { emoji: '🐧', name: 'animal.penguin.name', en: 'Penguin', sound: 'animal.penguin.sound', habitat: 'animal.habitatAntarctica', animalClass: 'animal.penguin.class', diet: 'animal.penguin.diet', funFact: 'animal.penguin.fact' },
  { emoji: '🐬', name: 'animal.dolphin.name', en: 'Dolphin', sound: 'animal.dolphin.sound', habitat: 'animal.habitatOcean', animalClass: 'animal.dolphin.class', diet: 'animal.dolphin.diet', funFact: 'animal.dolphin.fact' },
  { emoji: '🦒', name: 'animal.giraffe.name', en: 'Giraffe', sound: 'animal.giraffe.sound', habitat: 'animal.habitatGrassland', animalClass: 'animal.giraffe.class', diet: 'animal.giraffe.diet', funFact: 'animal.giraffe.fact' },
  { emoji: '🐼', name: 'animal.panda.name', en: 'Panda', sound: 'animal.panda.sound', habitat: 'animal.habitatBamboo', animalClass: 'animal.panda.class', diet: 'animal.panda.diet', funFact: 'animal.panda.fact' },
  { emoji: '🦊', name: 'animal.fox.name', en: 'Fox', sound: 'animal.fox.sound', habitat: 'animal.habitatForest', animalClass: 'animal.fox.class', diet: 'animal.fox.diet', funFact: 'animal.fox.fact' },
  { emoji: '🐸', name: 'animal.frog.name', en: 'Frog', sound: 'animal.frog.sound', habitat: 'animal.habitatPond', animalClass: 'animal.frog.class', diet: 'animal.frog.diet', funFact: 'animal.frog.fact' },
  { emoji: '🦅', name: 'animal.eagle.name', en: 'Eagle', sound: 'animal.eagle.sound', habitat: 'animal.habitatSky', animalClass: 'animal.eagle.class', diet: 'animal.eagle.diet', funFact: 'animal.eagle.fact' },
  { emoji: '🐍', name: 'animal.snake.name', en: 'Snake', sound: 'animal.snake.sound', habitat: 'animal.habitatForest', animalClass: 'animal.snake.class', diet: 'animal.snake.diet', funFact: 'animal.snake.fact' },
  { emoji: '🐝', name: 'animal.bee.name', en: 'Bee', sound: 'animal.bee.sound', habitat: 'animal.habitatGarden', animalClass: 'animal.bee.class', diet: 'animal.bee.diet', funFact: 'animal.bee.fact' },
  { emoji: '🦈', name: 'animal.shark.name', en: 'Shark', sound: 'animal.shark.sound', habitat: 'animal.habitatOcean', animalClass: 'animal.shark.class', diet: 'animal.shark.diet', funFact: 'animal.shark.fact' },
];

const HABITATS = ['animal.habitatGrassland', 'animal.habitatForest', 'animal.habitatOcean', 'animal.habitatAntarctica', 'animal.habitatBamboo', 'animal.habitatPond', 'animal.habitatSky', 'animal.habitatGarden'];

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
        <p className="text-xl font-extrabold text-ink">{t(a.name)} <span className="text-sm font-bold text-ink-soft">{a.en}</span></p>
        <button onClick={()=>speak(`${t(a.name)}，${t(a.sound)}`, { lang:'zh-CN', rate:0.8, module:'ai' })}
          className="mt-1 rounded-full bg-candy-green-soft px-3 py-0.5 text-xs font-extrabold text-candy-green-deep">
          🔊 {t(a.sound)}
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-candy-blue-soft/30 p-2">
          <p className="text-[10px] font-bold text-ink-muted">{t('animal.habitat')}</p>
          <p className="text-sm font-extrabold">{t(a.habitat)}</p>
        </div>
        <div className="rounded-xl bg-candy-orange-soft/30 p-2">
          <p className="text-[10px] font-bold text-ink-muted">{t('animal.class')}</p>
          <p className="text-sm font-extrabold">{t(a.animalClass)}</p>
        </div>
        <div className="rounded-xl bg-candy-pink-soft/30 p-2">
          <p className="text-[10px] font-bold text-ink-muted">{t('animal.diet')}</p>
          <p className="text-sm font-extrabold">{t(a.diet)}</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-yellow-50 p-2 text-center">
        <p className="text-xs font-bold text-ink-soft">💡 {t(a.funFact)}</p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {filtered.map((an) => {
          const realIdx = ANIMALS.indexOf(an);

          return (
            <button key={an.en} onClick={()=>{setSelected(realIdx);speak(t(an.name),{lang:'zh-CN',rate:0.8,module:'ai'});}}
              className={cn('rounded-xl p-2 text-center shadow-sm transition-all hover:scale-105',
                selected===realIdx ? 'bg-candy-green-deep text-white' : 'bg-white'
              )}>
              <div className="text-2xl">{an.emoji}</div>
              <div className="text-[9px] font-bold">{t(an.name)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const AnimalCards = memo(AnimalCardsImpl);
