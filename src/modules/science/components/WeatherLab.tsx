/**
 * 🌈 天气百科（天气生成器 + 季节配对 + AI 讲解）
 * ------------------------------------------------------------
 * 拖拽元素组合天气 + 季节配对小游戏 + AI 天气讲解
 */
import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { sfxTap, sfxStar, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { ScienceAiPanel } from './ScienceAiPanel';
import { useTranslation } from '@/i18n/useTranslation';

// ── 天气类型 ──────────────────────────────────────────────
export interface WeatherType {
  id: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  desc: string;
  formation: string;
  activity: string;
  gear: string[];
  color: string;
}

export const WEATHERS: WeatherType[] = [
  { id: 'sunny', nameZh: '晴天', nameEn: 'Sunny', emoji: '☀️', desc: '太阳公公出来了，天空蓝蓝的！', formation: '天空中没有云遮挡，阳光直接照到地面', activity: '适合出去玩、晒太阳', gear: ['遮阳帽', '防晒霜'], color: 'bg-yellow-100' },
  { id: 'cloudy', nameZh: '多云', nameEn: 'Cloudy', emoji: '⛅', desc: '云朵遮住了太阳，天有点灰灰的', formation: '水汽在天上聚成云，遮住了太阳', activity: '适合散步', gear: ['薄外套'], color: 'bg-gray-100' },
  { id: 'rainy', nameZh: '下雨', nameEn: 'Rainy', emoji: '🌧️', desc: '云里的水滴太重了，掉下来变成雨', formation: '云里的水滴越聚越多，太重就掉下来', activity: '适合在室内看书', gear: ['雨伞', '雨鞋'], color: 'bg-blue-100' },
  { id: 'storm', nameZh: '暴风雨', nameEn: 'Storm', emoji: '⛈️', desc: '又下雨又打雷，风也很大！', formation: '云里的水汽和风都很多，形成大风暴', activity: '待在家里最安全', gear: ['不要出门'], color: 'bg-purple-100' },
  { id: 'snowy', nameZh: '下雪', nameEn: 'Snowy', emoji: '🌨️', desc: '天上飘下白色的雪花，好美！', formation: '天气很冷，云里的水滴冻成冰晶落下来', activity: '可以堆雪人', gear: ['棉袄', '手套'], color: 'bg-blue-50' },
  { id: 'rainbow', nameZh: '彩虹', nameEn: 'Rainbow', emoji: '🌈', desc: '雨后阳光穿过水滴，变成七色光！', formation: '阳光穿过雨后的水滴，折射成七种颜色', activity: '赶紧拍照留念', gear: ['相机'], color: 'bg-gradient-to-r from-red-100 via-yellow-100 to-purple-100' },
];

// ── 天气元素 ──────────────────────────────────────────────
export const ELEMENTS = [
  { id: 'sun', emoji: '☀️', name: '太阳' },
  { id: 'cloud', emoji: '☁️', name: '云' },
  { id: 'water', emoji: '💧', name: '水' },
  { id: 'cold', emoji: '❄️', name: '冷气' },
  { id: 'wind', emoji: '💨', name: '风' },
];

// 组合规则
export const COMBOS: Record<string, { weather: WeatherType; message: string }> = {
  'sun': { weather: WEATHERS[0]!, message: '太阳出来了，是晴天！' },
  'cloud+sun': { weather: WEATHERS[1]!, message: '太阳加云朵，多云啦！' },
  'cloud+water': { weather: WEATHERS[2]!, message: '云加水，下雨啦！' },
  'cloud+water+wind': { weather: WEATHERS[3]!, message: '云加水加风，暴风雨来了！' },
  'cloud+cold': { weather: WEATHERS[4]!, message: '云加冷气，下雪啦！' },
  'sun+water': { weather: WEATHERS[5]!, message: '太阳加水，彩虹出现！' },
};

export function getCombo(elements: string[]): { weather: WeatherType; message: string } | null {
  const sorted = [...elements].sort();
  const key = sorted.join('+');
  return COMBOS[key] || null;
}

// ── 季节数据 ──────────────────────────────────────────────
export const SEASONS = [
  { id: 'spring', name: '春天', emoji: '🌸', months: '3-5月', color: 'bg-pink-100', phenomena: ['花开', '小雨', '燕子回来'] },
  { id: 'summer', name: '夏天', emoji: '☀️', months: '6-8月', color: 'bg-yellow-100', phenomena: ['游泳', '冰淇淋', '雷阵雨'] },
  { id: 'autumn', name: '秋天', emoji: '🍂', months: '9-11月', color: 'bg-orange-100', phenomena: ['落叶', '丰收', '凉爽'] },
  { id: 'winter', name: '冬天', emoji: '❄️', months: '12-2月', color: 'bg-blue-100', phenomena: ['下雪', '堆雪人', '穿棉袄'] },
];

// 季节配对游戏选项
export const SEASON_ITEMS = [
  { id: '花开', season: 'spring', emoji: '🌷' },
  { id: '游泳', season: 'summer', emoji: '🏊' },
  { id: '落叶', season: 'autumn', emoji: '🍂' },
  { id: '下雪', season: 'winter', emoji: '❄️' },
  { id: '燕子回来', season: 'spring', emoji: '🐦' },
  { id: '冰淇淋', season: 'summer', emoji: '🍦' },
  { id: '丰收', season: 'autumn', emoji: '🌾' },
  { id: '穿棉袄', season: 'winter', emoji: '🧥' },
];

// ── 天气生成器 ────────────────────────────────────────────
function WeatherGenerator() {
  const { t } = useTranslation();
  const [dropped, setDropped] = useState<string[]>([]);
  const [result, setResult] = useState<{ weather: WeatherType; message: string } | null>(null);
  const [error, setError] = useState(false);

  const handleDrop = useCallback((elementId: string) => {
    sfxTap();
    if (dropped.includes(elementId)) return;
    const newElements = [...dropped, elementId];
    setDropped(newElements);
    const combo = getCombo(newElements);
    if (combo) {
      setResult(combo);
      sfxStar();
      speak(combo.message, { lang: 'zh-CN', rate: 0.9 });
    } else if (newElements.length >= 3) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  }, [dropped]);

  const handleReset = () => {
    sfxTap();
    setDropped([]);
    setResult(null);
  };

  return (
    <Panel className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-yellow-50 to-sky-50">
      <h3 className="mb-2 text-center text-lg font-extrabold text-orange-900">{t('weather.generatorTitle')}</h3>
      <p className="mb-3 text-center text-xs text-ink-soft">{t('weather.generatorHint')}</p>

      {/* 画布区域 */}
      <div
        className={cn(
          'mb-3 min-h-[140px] rounded-2xl border-2 border-dashed p-4 transition-all',
          result ? 'border-orange-300 bg-white/80' : 'border-orange-200 bg-white/50',
          error && 'border-red-300 bg-red-50 animate-pulse'
        )}
      >
        {result ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="text-6xl">{result.weather.emoji}</div>
            <p className="mt-2 text-lg font-black text-orange-900">{result.weather.nameZh}</p>
            <p className="text-xs font-bold text-orange-600">{result.weather.nameEn}</p>
            <p className="mt-1 text-xs text-ink-soft">{result.message}</p>
            <p className="mt-1 text-[10px] text-ink-muted">💡 {result.weather.formation}</p>
            <p className="text-[10px] text-green-700">🎯 {result.weather.activity}</p>
            <div className="mt-1 flex gap-1">
              {result.weather.gear.map(g => (
                <span key={g} className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-700">🎒 {g}</span>
              ))}
            </div>
          </motion.div>
        ) : dropped.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {dropped.map(id => {
              const el = ELEMENTS.find(e => e.id === id)!;
              return (
                <motion.div
                  key={id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-4xl">{el.emoji}</span>
                  <span className="text-[9px] font-bold">{el.name}</span>
                </motion.div>
              );
            })}
            {error && <p className="text-xs font-bold text-red-500">{t('weather.tryOther')}</p>}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-ink-muted">{t('weather.tapToCombine')}</p>
          </div>
        )}
      </div>

      {/* 元素栏 */}
      <div className="flex justify-center gap-2">
        {ELEMENTS.map(el => (
          <button
            key={el.id}
            onClick={() => handleDrop(el.id)}
            disabled={dropped.includes(el.id) || !!result}
            className={cn(
              'flex flex-col items-center rounded-xl p-2 transition-all',
              dropped.includes(el.id)
                ? 'opacity-30'
                : 'bg-white shadow-sm hover:scale-110 active:scale-95'
            )}
          >
            <span className="text-3xl">{el.emoji}</span>
            <span className="text-[9px] font-bold">{el.name}</span>
          </button>
        ))}
      </div>

      {dropped.length > 0 && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={handleReset}
            className="rounded-lg bg-orange-200 px-3 py-1 text-xs font-bold text-orange-800 hover:bg-orange-300"
          >
            {t('weather.restart')}
          </button>
        </div>
      )}

      {/* 组合提示 */}
      <div className="mt-2 rounded-xl bg-white/60 p-2 text-center text-[10px] text-ink-muted">
        {t('weather.comboHint')}
      </div>
    </Panel>
  );
}

// ── 季节配对游戏 ──────────────────────────────────────────
function SeasonMatchGame() {
  const { t } = useTranslation();
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const handleMatch = (itemId: string, seasonId: string) => {
    sfxTap();
    const item = SEASON_ITEMS.find(i => i.id === itemId)!;
    if (item.season === seasonId) {
      sfxCorrect();
      speak(`对啦！${item.id}是${SEASONS.find(s => s.id === seasonId)!.name}的`, { lang: 'zh-CN', rate: 0.9 });
      setMatched(new Set([...matched, itemId]));
      setScore(score + 1);
    } else {
      sfxWrong();
      setWrong(itemId);
      setTimeout(() => setWrong(null), 1000);
    }
  };

  const reset = () => {
    sfxTap();
    setMatched(new Set());
    setScore(0);
  };

  const allDone = matched.size === SEASON_ITEMS.length;
  return (
    <Panel className="border-2 border-pink-200 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <h3 className="mb-2 text-center text-lg font-extrabold text-pink-900">{t('weather.matchTitle')}</h3>
      <p className="mb-3 text-center text-xs text-ink-soft">{t('weather.matchHint')}</p>

      <div className="mb-3 flex justify-center gap-2">
        {SEASONS.map(s => (
          <div key={s.id} className={cn('rounded-2xl p-3 text-center min-w-[70px]', s.color)}>
            <div className="text-3xl">{s.emoji}</div>
            <div className="text-xs font-black">{s.name}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {SEASON_ITEMS.map(item => (
          <div
            key={item.id}
            className={cn(
              'rounded-xl bg-white p-2 text-center shadow-sm transition-all',
              matched.has(item.id) && 'opacity-30',
              wrong === item.id && 'bg-red-100 animate-shake'
            )}
          >
            <div className="text-2xl">{item.emoji}</div>
            <div className="text-[10px] font-bold">{item.id}</div>
            {!matched.has(item.id) && (
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {SEASONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleMatch(item.id, s.id)}
                    className="rounded px-1 py-0.5 text-[8px] font-bold bg-gray-100 hover:bg-gray-200"
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {allDone && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-3 rounded-xl bg-yellow-100 p-3 text-center"
        >
          <p className="text-lg font-black text-orange-700">{t('weather.allMatched')}</p>
          <p className="text-sm font-bold text-orange-600">⭐⭐⭐ {t('learning.excellent')}</p>
          <button onClick={reset} className="mt-2 rounded-lg bg-orange-300 px-3 py-1 text-xs font-bold text-white hover:bg-orange-400">
            {t('weather.playAgain')}
          </button>
        </motion.div>
      )}

      {!allDone && score > 0 && (
        <p className="mt-2 text-center text-xs font-bold text-green-600">
          {t('weather.matched', { count: score, total: SEASON_ITEMS.length })}
        </p>
      )}
    </Panel>
  );
}

// ── 主组件 ────────────────────────────────────────────────
function WeatherLabImpl() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'generator' | 'match' | 'info'>('generator');
  const [selectedWeather, setSelectedWeather] = useState<WeatherType | null>(null);

  return (
    <div className="space-y-4">
      {/* Tab 切换 */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => { sfxTap(); setTab('generator'); }}
          className={cn('rounded-xl px-4 py-2 text-sm font-extrabold transition-all', tab === 'generator' ? 'bg-orange-400 text-white shadow-md' : 'bg-white text-ink-soft shadow-sm')}
        >
          {t('weather.tabGenerator')}
        </button>
        <button
          onClick={() => { sfxTap(); setTab('match'); }}
          className={cn('rounded-xl px-4 py-2 text-sm font-extrabold transition-all', tab === 'match' ? 'bg-pink-400 text-white shadow-md' : 'bg-white text-ink-soft shadow-sm')}
        >
          {t('weather.tabMatch')}
        </button>
        <button
          onClick={() => { sfxTap(); setTab('info'); }}
          className={cn('rounded-xl px-4 py-2 text-sm font-extrabold transition-all', tab === 'info' ? 'bg-blue-400 text-white shadow-md' : 'bg-white text-ink-soft shadow-sm')}
        >
          {t('weather.tabInfo')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'generator' && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WeatherGenerator />
            {/* AI 天气讲解 */}
            <div className="mt-4">
              <ScienceAiPanel
                topic={{
                  id: 'sci-weather-rain',
                  emoji: '☔',
                  label: '为什么会下雨',
                  stars: 1,
                  tags: ['科学', '认知'],
                  prompt: '给宝贝讲为什么会下雨：太阳把水晒成水汽飞上天变成云，云里水滴太多太重就掉下来变成雨',
                  fallback: '我是小雨滴！太阳公公把河里的水晒得暖暖的，水就变成看不见的水汽飞上天，聚在一起变成白云。云朵越来越重，挤呀挤，就变成雨点落下来啦！宝贝摸摸雨滴，凉凉的就是我！',
                }}
              />
            </div>
          </motion.div>
        )}

        {tab === 'match' && (
          <motion.div key="match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SeasonMatchGame />
          </motion.div>
        )}

        {tab === 'info' && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Panel className="border-2 border-blue-200 bg-white/80">
              <h3 className="mb-3 text-center text-lg font-extrabold text-blue-900">{t('weather.infoTitle')}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {WEATHERS.map(w => (
                  <button
                    key={w.id}
                    onClick={() => { sfxTap(); setSelectedWeather(w); speak(w.nameZh, { lang: 'zh-CN', rate: 0.8, module: 'ai' }); }}
                    className={cn(
                      'rounded-2xl p-4 text-center shadow-sm transition-all hover:scale-105 active:scale-95',
                      w.color,
                      selectedWeather?.id === w.id && 'ring-3 ring-blue-400'
                    )}
                  >
                    <div className="text-4xl">{w.emoji}</div>
                    <div className="mt-1 text-sm font-extrabold">{w.nameZh}</div>
                    <div className="text-[10px] font-medium opacity-70">{w.nameEn}</div>
                  </button>
                ))}
              </div>

              {selectedWeather && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedWeather.emoji}</span>
                    <div>
                      <p className="font-extrabold text-ink">{selectedWeather.nameZh} ({selectedWeather.nameEn})</p>
                      <p className="text-xs font-medium text-ink-soft">{selectedWeather.desc}</p>
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg bg-blue-50 p-2 text-xs">
                    <p className="font-bold text-blue-700">{t('weather.formation')}</p>
                    <p className="text-ink-soft">{selectedWeather.formation}</p>
                  </div>
                  <div className="mt-1 rounded-lg bg-green-50 p-2 text-xs">
                    <p className="font-bold text-green-700">{t('weather.activity')}</p>
                    <p className="text-ink-soft">{selectedWeather.activity}</p>
                  </div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {selectedWeather.gear.map(g => (
                      <span key={g} className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">🎒 {g}</span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* AI 彩虹讲解 */}
              <div className="mt-3">
                <ScienceAiPanel
                  topic={{
                    id: 'sci-weather-rainbow',
                    emoji: '🌈',
                    label: '彩虹的秘密',
                    stars: 2,
                    tags: ['科学', '认知'],
                    prompt: '给宝贝讲彩虹的秘密：雨后阳光穿过水滴，分成七种颜色，红橙黄绿青蓝紫',
                    fallback: '我是彩虹！雨刚停，空气里有很多小水滴。阳光穿过小水滴的时候，会弯折，分成七种颜色：红、橙、黄、绿、青、蓝、紫！就像一条彩色的拱桥挂在天上。从飞机上看，我其实是一个完整的圆圈哦！',
                  }}
                />
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const WeatherLab = memo(WeatherLabImpl);
