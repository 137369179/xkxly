import { useState, lazy, Suspense } from 'react';
import { PINYIN_GROUPS, getPinyinByType, nextPinyin, type PinyinEntry } from '@/data/pinyinIndex';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { TONE_STYLE } from '@/lib/tones';
import { useStore } from '@/store/useStore';
import { PinyinLearn } from './PinyinLearn';
import { useTranslation } from '@/i18n/useTranslation';

// ── 懒加载各练习与闯关组件 ──
const PinyinPractice = lazy(() => import('./PinyinPractice').then((m) => ({ default: m.PinyinPractice })));
const BlendPractice = lazy(() => import('./BlendPractice').then((m) => ({ default: m.BlendPractice })));
const TonePractice = lazy(() => import('./TonePractice').then((m) => ({ default: m.TonePractice })));
const Dictation = lazy(() => import('./Dictation').then((m) => ({ default: m.Dictation })));
const PinyinGroup = lazy(() => import('./PinyinGroup').then((m) => ({ default: m.PinyinGroup })));

type MainCategory = 'chart' | 'blend_tone' | 'quiz_dictation';

export default function PinyinPage() {
  const { t: tr } = useTranslation();
  const [mainCat, setMainCat] = useState<MainCategory>('chart');
  const [chartType, setChartType] = useState<'shengmu' | 'yunmu' | 'zhengti'>('shengmu');
  const [blendType, setBlendType] = useState<'blend' | 'tone' | 'group'>('blend');
  const [quizType, setQuizType] = useState<'practice' | 'dictation'>('practice');

  const [selected, setSelected] = useState<PinyinEntry | null>(null);
  const mastery = useStore((s) => s.progress.mastery);

  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="text-sm font-bold text-ink-soft hover:text-ink">
          ← {tr('pinyinPage.back') || '返回拼音表'}
        </button>
        <PinyinLearn entry={selected} onDone={() => setSelected(null)} />
      </div>
    );
  }

  // 今日推荐拼音
  const recommended = nextPinyin(mastery);
  // 已学完的类型
  const completedTypes = (['shengmu', 'yunmu', 'zhengti'] as const).filter((tp) => {
    const items = getPinyinByType(tp);
    return items.length > 0 && items.every((p) => {
      const m = mastery[`pinyin:${p.p}`];
      return !!m && m.lv >= 1;
    });
  });

  const currentGroups = chartType === 'yunmu'
    ? PINYIN_GROUPS.filter((g) => g.id.startsWith('yunmu'))
    : PINYIN_GROUPS.filter((g) => g.id === chartType);

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="📋"
        title={tr('pinyinPage.title') || '拼音学习'}
        subtitle={tr('pinyinPage.subtitle') || '声母 · 韵母 · 整体认读 · 声韵拼读 · 四声调'}
        tone="blue"
      />

      {/* 👑 一级大分类导航 */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => { sfxTap(); setMainCat('chart'); }}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
            mainCat === 'chart'
              ? 'border-candy-blue-deep bg-gradient-to-b from-sky-50 to-blue-100/70 shadow-candy-sm scale-[1.02]'
              : 'border-sky-200/70 bg-white/90 hover:border-sky-300'
          }`}
        >
          <span className="text-2xl mb-0.5">📋</span>
          <span className="text-base font-black text-ink">拼音字母表</span>
          <span className="text-[11px] font-semibold text-ink-soft">声母 · 韵母 · 整体认读</span>
        </button>

        <button
          onClick={() => { sfxTap(); setMainCat('blend_tone'); }}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
            mainCat === 'blend_tone'
              ? 'border-candy-pink-deep bg-gradient-to-b from-pink-50 to-rose-100/70 shadow-candy-sm scale-[1.02]'
              : 'border-pink-200/70 bg-white/90 hover:border-pink-300'
          }`}
        >
          <span className="text-2xl mb-0.5">🔗</span>
          <span className="text-base font-black text-ink">拼读与声调</span>
          <span className="text-[11px] font-semibold text-ink-soft">声韵大作战 · 四声调</span>
        </button>

        <button
          onClick={() => { sfxTap(); setMainCat('quiz_dictation'); }}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
            mainCat === 'quiz_dictation'
              ? 'border-candy-purple-deep bg-gradient-to-b from-purple-50 to-violet-100/70 shadow-candy-sm scale-[1.02]'
              : 'border-purple-200/70 bg-white/90 hover:border-purple-300'
          }`}
        >
          <span className="text-2xl mb-0.5">🎯</span>
          <span className="text-base font-black text-ink">辨音与听写</span>
          <span className="text-[11px] font-semibold text-ink-soft">辨音闯关 · 听音默写</span>
        </button>
      </div>

      {/* 📋 1. 拼音字母表主视图 */}
      {mainCat === 'chart' && (
        <div className="space-y-4">
          {/* 今日推荐拼音卡片 */}
          {recommended ? (
            <Panel className="relative overflow-hidden border-2 border-pink-200 bg-pink-50/50">
              <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-pink-200 bg-white shadow-candy-sm">
                  <span className="text-5xl font-black text-candy-pink-deep">{recommended.p}</span>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-sm font-extrabold text-candy-pink-deep">🌟 {tr('pinyinPage.todayRec') || '今日推荐'}</p>
                  <p className="mt-0.5 text-base font-bold text-ink">{recommended.sound}</p>
                  <p className="mt-0.5 text-sm font-semibold text-candy-purple-deep">🎵 {recommended.rhyme}</p>
                </div>
                <CandyButton tone="pink" size="md" onClick={() => { sfxTap(); setSelected(recommended); }}>
                  {tr('pinyinPage.clickLearn') || '开始精学'}
                </CandyButton>
              </div>
            </Panel>
          ) : (
            <Panel className="text-center bg-purple-50">
              <div className="text-4xl">🎉</div>
              <p className="mt-1 text-lg font-extrabold text-candy-purple-deep">{tr('pinyinPage.allDone') || '太棒啦！全部拼音都学完啦！'}</p>
            </Panel>
          )}

          {/* 拼读解锁提示 */}
          {completedTypes.length > 0 && (
            <Panel className="bg-blue-50/70 border-2 border-blue-200">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-base font-extrabold text-candy-blue-deep">🔗 {tr('pinyinPage.blendUnlocked') || '拼读练习已解锁！'}</p>
                  <p className="mt-0.5 text-xs font-bold text-ink-soft">
                    已掌握基础拼音，快来开启声韵拼读吧！
                  </p>
                </div>
                <CandyButton tone="blue" size="sm" onClick={() => { sfxTap(); setMainCat('blend_tone'); }}>
                  {tr('pinyinPage.blendPractice') || '去拼读'}
                </CandyButton>
              </div>
            </Panel>
          )}

          {/* 二级分类切换：声母/韵母/整体认读 */}
          <div className="flex justify-center gap-2 p-1.5 rounded-2xl bg-sky-100/60 border border-sky-200">
            <button
              onClick={() => { sfxTap(); setChartType('shengmu'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                chartType === 'shengmu'
                  ? 'bg-candy-blue-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🗣️ 声母 (23)
            </button>
            <button
              onClick={() => { sfxTap(); setChartType('yunmu'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                chartType === 'yunmu'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎶 韵母 (24)
            </button>
            <button
              onClick={() => { sfxTap(); setChartType('zhengti'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                chartType === 'zhengti'
                  ? 'bg-candy-purple-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              ⭐ 整体认读 (16)
            </button>
          </div>

          {/* 拼音卡片网格 */}
          {currentGroups.map((g) => (
            <Panel key={g.id}>
              <PanelTitle emoji={g.emoji} title={g.name} subtitle={g.desc} tone={g.tone} />
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                {g.items.map((item) => (
                  <button
                    key={item.p}
                    onClick={() => { sfxTap(); setSelected(item); }}
                    className="flex flex-col items-center justify-center rounded-2xl p-3 min-h-[64px] shadow-candy-sm transition-all hover:scale-105 active:scale-95"
                    style={{ background: TONE_STYLE[g.tone].soft }}
                  >
                    <span className="text-2xl font-black text-ink">{item.p}</span>
                    <span className="text-[10px] font-bold" style={{ color: TONE_STYLE[g.tone].deep }}>{item.rhyme.slice(0, 6)}</span>
                  </button>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* 🔗 2. 拼读与声调主视图 */}
      {mainCat === 'blend_tone' && (
        <div className="space-y-4">
          <div className="flex justify-center gap-2 p-1.5 rounded-2xl bg-pink-100/60 border border-pink-200">
            <button
              onClick={() => { sfxTap(); setBlendType('blend'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                blendType === 'blend'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🔗 声韵拼读大作战
            </button>
            <button
              onClick={() => { sfxTap(); setBlendType('tone'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                blendType === 'tone'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎵 四声调练调
            </button>
            <button
              onClick={() => { sfxTap(); setBlendType('group'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                blendType === 'group'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎶 拼音分类连线
            </button>
          </div>

          <Suspense fallback={<div className="py-16 text-center text-3xl animate-bounce">🎶</div>}>
            {blendType === 'blend' && <BlendPractice />}
            {blendType === 'tone' && <TonePractice />}
            {blendType === 'group' && <PinyinGroup />}
          </Suspense>
        </div>
      )}

      {/* 🎯 3. 辨音与听写主视图 */}
      {mainCat === 'quiz_dictation' && (
        <div className="space-y-4">
          <div className="flex justify-center gap-2 p-1.5 rounded-2xl bg-purple-100/60 border border-purple-200">
            <button
              onClick={() => { sfxTap(); setQuizType('practice'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                quizType === 'practice'
                  ? 'bg-candy-purple-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎯 综合辨音冲关
            </button>
            <button
              onClick={() => { sfxTap(); setQuizType('dictation'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                quizType === 'dictation'
                  ? 'bg-candy-purple-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎧 听音默写测试
            </button>
          </div>

          <Suspense fallback={<div className="py-16 text-center text-3xl animate-bounce">🎯</div>}>
            {quizType === 'practice' && <PinyinPractice />}
            {quizType === 'dictation' && <Dictation />}
          </Suspense>
        </div>
      )}
    </div>
  );
}
