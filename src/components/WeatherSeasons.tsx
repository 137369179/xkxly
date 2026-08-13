/**
 * 天气与季节 🌤️ (O4)
 * 四季 + 天气类型，自然认知
 */
import { memo, useState } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const SEASONS = [
  { name:'春天', en:'Spring', emoji:'🌸', months:'3-5月', color:'bg-pink-100', desc:'万物复苏，花儿开了', weather:['晴天','小雨','多云'] },
  { name:'夏天', en:'Summer', emoji:'☀️', months:'6-8月', color:'bg-yellow-100', desc:'天气炎热，可以去游泳', weather:['晴天','雷阵雨','台风'] },
  { name:'秋天', en:'Autumn', emoji:'🍂', months:'9-11月', color:'bg-orange-100', desc:'天气凉爽，树叶黄了', weather:['晴天','多云','刮风'] },
  { name:'冬天', en:'Winter', emoji:'❄️', months:'12-2月', color:'bg-blue-100', desc:'天气寒冷，可能会下雪', weather:['下雪','阴天','晴天'] },
];

const WEATHERS = [
  { name:'晴天', en:'Sunny', emoji:'☀️', color:'bg-yellow-200', tip:'适合出去玩' },
  { name:'多云', en:'Cloudy', emoji:'⛅', color:'bg-gray-200', tip:'太阳被云遮住了' },
  { name:'下雨', en:'Rainy', emoji:'🌧️', color:'bg-blue-200', tip:'记得带雨伞' },
  { name:'下雪', en:'Snowy', emoji:'🌨️', color:'bg-white', tip:'可以堆雪人啦' },
  { name:'刮风', en:'Windy', emoji:'💨', color:'bg-green-200', tip:'树叶被风吹得沙沙响' },
  { name:'雷阵雨', en:'Thunder', emoji:'⛈️', color:'bg-purple-200', tip:'轰隆隆打雷了' },
];

function WeatherSeasonsImpl() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'season'|'weather'>('season');
  const [selected, setSelected] = useState(0);

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-1 text-center text-lg font-extrabold text-ink">🌤️ {t('weatherSeasons.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button aria-label={t('weatherSeasons.seasonsTab')} onClick={()=>setTab('season')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${tab==='season'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>🌸 {t('weatherSeasons.seasonsTab')}</button>
        <button onClick={()=>setTab('weather')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${tab==='weather'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>🌤️ {t('weatherSeasons.weatherTab')}</button>
      </div>

      {tab === 'season' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SEASONS.map((s,i) => (
              <button key={s.name} onClick={()=>{setSelected(i);speak(s.name,{lang:'zh-CN',rate:0.8,module:'ai'});}}
                className={cn(s.color,'rounded-2xl p-4 text-center shadow-sm transition-all hover:scale-105', selected===i&&'ring-3 ring-candy-orange-deep')}>
                <div className="text-3xl">{s.emoji}</div>
                <div className="mt-1 text-sm font-extrabold">{s.name}</div>
                <div className="text-[10px] font-medium opacity-70">{s.months}</div>
              </button>
            ))}
          </div>
          <motion.div key={selected} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{SEASONS[selected]!.emoji}</span>
              <div>
                <p className="font-extrabold text-ink">{SEASONS[selected]!.name} ({SEASONS[selected]!.months})</p>
                <p className="text-xs font-medium text-ink-soft">{SEASONS[selected]!.desc}</p>
                <div className="mt-1 flex gap-1">
                  {SEASONS[selected]!.weather.map(w => <span key={w} className="rounded-lg bg-ink-soft/10 px-2 py-0.5 text-[10px] font-bold">{w}</span>)}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {tab === 'weather' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WEATHERS.map(w => (
            <button key={w.name} onClick={()=>speak(w.name,{lang:'zh-CN',rate:0.8,module:'ai'})}
              className={cn(w.color,'rounded-2xl p-4 text-center shadow-sm transition-all hover:scale-105 active:scale-95')}>
              <div className="text-4xl">{w.emoji}</div>
              <div className="mt-1 text-sm font-extrabold">{w.name}</div>
              <div className="text-[10px] font-medium opacity-70">{w.en}</div>
              <div className="mt-1 text-[9px] font-medium text-ink-muted">💡 {w.tip}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const WeatherSeasons = memo(WeatherSeasonsImpl);
