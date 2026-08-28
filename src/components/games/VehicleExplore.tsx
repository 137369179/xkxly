/**
 * 交通工具认知 🚗 (Q6)
 * 海陆空分类 + 中英双语
 */
import { memo, useState } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const VEHICLES = [
  { emoji: '🚗', name: '小汽车', en: 'Car', zone: 'land', sound: '嘀嘀' },
  { emoji: '🚌', name: '公交车', en: 'Bus', zone: 'land', sound: '嘟嘟' },
  { emoji: '🚕', name: '出租车', en: 'Taxi', zone: 'land', sound: '嘀嘀' },
  { emoji: '🚑', name: '救护车', en: 'Ambulance', zone: 'land', sound: '呜呜' },
  { emoji: '🚒', name: '消防车', en: 'Fire Truck', zone: 'land', sound: '呜呜' },
  { emoji: '🚲', name: '自行车', en: 'Bicycle', zone: 'land', sound: '叮铃' },
  { emoji: '🚂', name: '火车', en: 'Train', zone: 'land', sound: '哐当' },
  { emoji: '🛵', name: '摩托车', en: 'Motorcycle', zone: 'land', sound: '轰隆' },
  { emoji: '✈️', name: '飞机', en: 'Airplane', zone: 'sky', sound: '嗡嗡' },
  { emoji: '🚁', name: '直升机', en: 'Helicopter', zone: 'sky', sound: '突突' },
  { emoji: '🚀', name: '火箭', en: 'Rocket', zone: 'sky', sound: '嗖' },
  { emoji: '🛸', name: '飞碟', en: 'UFO', zone: 'sky', sound: '嗡嗡' },
  { emoji: '⛵', name: '帆船', en: 'Sailboat', zone: 'sea', sound: '哗啦' },
  { emoji: '🚢', name: '轮船', en: 'Ship', zone: 'sea', sound: '呜—' },
  { emoji: '🛥️', name: '游艇', en: 'Yacht', zone: 'sea', sound: '嘟嘟' },
  { emoji: '🚤', name: '快艇', en: 'Speedboat', zone: 'sea', sound: '嗖' },
];

const ZONES = [
  { id: 'land', name: '陆地', emoji: '🛣️', color: 'bg-green-200', labelKey: 'vehicleExplore.land' },
  { id: 'sky', name: '天空', emoji: '☁️', color: 'bg-sky-200', labelKey: 'vehicleExplore.air' },
  { id: 'sea', name: '海洋', emoji: '🌊', color: 'bg-blue-200', labelKey: 'vehicleExplore.water' },
];

function VehicleExploreImpl() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const v = VEHICLES[selected]!

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🚗 {t('vehicleExplore.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        {ZONES.map(z => (
          <button key={z.id} onClick={()=>setSelected(VEHICLES.findIndex(v=>v.zone===z.id))}
            className={cn(z.color, 'rounded-xl px-4 py-1.5 text-sm font-extrabold shadow-sm')}>
            {z.emoji} {t(z.labelKey)}
          </button>
        ))}
      </div>
      <div className="mb-4 text-center">
        <motion.div key={v.emoji} initial={{scale:0.5}} animate={{scale:1}} className="mx-auto mb-2 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-lg">
          <span className="text-6xl">{v.emoji}</span>
        </motion.div>
        <p className="text-xl font-extrabold text-ink">{v.name}</p>
        <p className="text-sm font-bold text-ink-soft">{v.en} · {v.sound}</p>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {VEHICLES.map((v, i) => (
          <button key={v.en} onClick={()=>{setSelected(i);speak(v.name,{lang:'zh-CN',rate:0.8,module:'ai'});}}
            className={cn('rounded-xl p-2 text-center shadow-sm transition-all hover:scale-105',
              selected===i ? 'bg-candy-blue-deep text-white' : 'bg-white'
            )}>
            <div className="text-2xl">{v.emoji}</div>
            <div className="text-xs font-bold">{v.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const VehicleExplore = memo(VehicleExploreImpl);
