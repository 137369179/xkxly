import { useState, lazy, Suspense, useEffect } from 'react';
import { PINYIN_GROUPS, getPinyinByType, nextPinyin, type PinyinEntry } from '@/data/pinyinIndex';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { TONE_STYLE } from '@/lib/tones';
import { useStore } from '@/store/useStore';
import { PinyinLearn } from './PinyinLearn';
import { useTranslation } from '@/i18n/useTranslation';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';

// ── 懒加载各练习与闯关组件 ──
const PinyinPractice = lazy(() => import('./PinyinPractice').then((m) => ({ default: m.PinyinPractice })));
const BlendPractice = lazy(() => import('./BlendPractice').then((m) => ({ default: m.BlendPractice })));
const TonePractice = lazy(() => import('./TonePractice').then((m) => ({ default: m.TonePractice })));
const Dictation = lazy(() => import('./Dictation').then((m) => ({ default: m.Dictation })));
const PinyinGroup = lazy(() => import('./PinyinGroup').then((m) => ({ default: m.PinyinGroup })));
const PhonicsSlide = lazy(() => import('./PhonicsSlide').then((m) => ({ default: m.PhonicsSlide })));
const ConfusionBuster = lazy(() => import('./ConfusionBuster').then((m) => ({ default: m.ConfusionBuster })));

type MainCategory = 'chart' | 'slide_fusion' | 'confusion' | 'quiz_dictation';
type QuizSubCategory = 'blend' | 'tone' | 'group' | 'practice' | 'dictation';

export default function PinyinPage() {
  const { t: tr } = useTranslation();
  const [mainCat, setMainCat] = useState<MainCategory>('chart');
  const [chartType, setChartType] = useState<'shengmu' | 'yunmu' | 'zhengti'>('shengmu');
  const [quizType, setQuizType] = useState<QuizSubCategory>('blend');

  const [selected, setSelected] = useState<PinyinEntry | null>(null);
  const mastery = useStore((s) => s.progress.mastery);
  const { target, clear } = useTrainingTarget('pinyin');

  // 今日推荐拼音
  const recommended = nextPinyin(mastery);

  // 全局键盘快捷键响应 (1-4 专区切换，空格开启推荐字，Esc 返回)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (selected) return; // 单字学习状态交由 PinyinLearn 处理
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(20);
        setMainCat('chart');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(20);
        setMainCat('slide_fusion');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(20);
        setMainCat('confusion');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(20);
        setMainCat('quiz_dictation');
      } else if (e.key === ' ' && mainCat === 'chart' && recommended) {
        e.preventDefault();
        triggerHaptic(35);
        setSelected(recommended);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mainCat, recommended, selected]);

  // 深链 param → 对应练习：slide 滑滑梯 / confusion 易混 / tone 四声调 / blend 拼读 / dictation 听写 / group 分类连线
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    if (p === 'slide') {
      setMainCat('slide_fusion');
    } else if (p === 'confusion') {
      setMainCat('confusion');
    } else if (p === 'tone') {
      setMainCat('quiz_dictation');
      setQuizType('tone');
    } else if (p === 'blend') {
      setMainCat('quiz_dictation');
      setQuizType('blend');
    } else if (p === 'group') {
      setMainCat('quiz_dictation');
      setQuizType('group');
    } else if (p === 'dictation') {
      setMainCat('quiz_dictation');
      setQuizType('dictation');
    }
  }, [target]);

  if (selected) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => {
            triggerHaptic(20);
            setSelected(null);
          }}
          className="text-sm font-bold text-ink-soft hover:text-ink flex items-center gap-1"
        >
          ← {tr('pinyinPage.back') || '返回拼音表'}
        </button>
        <PinyinLearn entry={selected} onDone={() => setSelected(null)} />
      </div>
    );
  }

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
        subtitle={tr('pinyinPage.subtitle') || '声母 · 韵母 · 整体认读 · 声韵滑梯 · 易混辨析'}
        tone="blue"
      />

      {/* 快捷操作提示条 */}
      <div className="text-center relative z-10">
        <span className="inline-block text-xs text-blue-900 font-bold bg-blue-50/90 px-3 py-1 rounded-xl border border-blue-200">
          ⌨️ 键盘快捷操作：数字 1-4 切换专区 (字母表/滑滑梯/易混辨析/闯关听写) · 空格 开启今日推荐拼音
        </span>
      </div>

      <TrainingBanner target={target} onClose={clear} />

      {/* 👑 一级大分类导航 (4 大核心模式) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setMainCat('chart');
          }}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
            mainCat === 'chart'
              ? 'border-candy-blue-deep bg-gradient-to-b from-sky-50 to-blue-100/70 shadow-candy-sm scale-[1.02]'
              : 'border-sky-200/70 bg-white/90 hover:border-sky-300'
          }`}
        >
          <span className="text-2xl mb-0.5">📋</span>
          <span className="text-sm font-black text-ink">拼音字母表</span>
          <span className="text-xs font-semibold text-ink-soft">声母 · 韵母 · 整体认读</span>
        </button>

        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setMainCat('slide_fusion');
          }}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
            mainCat === 'slide_fusion'
              ? 'border-candy-pink-deep bg-gradient-to-b from-pink-50 to-rose-100/70 shadow-candy-sm scale-[1.02]'
              : 'border-pink-200/70 bg-white/90 hover:border-pink-300'
          }`}
        >
          <span className="text-2xl mb-0.5">🎢</span>
          <span className="text-sm font-black text-ink">声韵滑滑梯</span>
          <span className="text-xs font-semibold text-ink-soft">小车合体 · 汉字拼读</span>
        </button>

        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setMainCat('confusion');
          }}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
            mainCat === 'confusion'
              ? 'border-amber-400 bg-gradient-to-b from-amber-50 to-orange-100/70 shadow-candy-sm scale-[1.02]'
              : 'border-amber-200/70 bg-white/90 hover:border-amber-300'
          }`}
        >
          <span className="text-2xl mb-0.5">⚡</span>
          <span className="text-sm font-black text-ink">易混大辨析</span>
          <span className="text-xs font-semibold text-ink-soft">平翘舌 · 前后鼻音</span>
        </button>

        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setMainCat('quiz_dictation');
          }}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
            mainCat === 'quiz_dictation'
              ? 'border-candy-purple-deep bg-gradient-to-b from-purple-50 to-violet-100/70 shadow-candy-sm scale-[1.02]'
              : 'border-purple-200/70 bg-white/90 hover:border-purple-300'
          }`}
        >
          <span className="text-2xl mb-0.5">🎯</span>
          <span className="text-sm font-black text-ink">闯关与听写</span>
          <span className="text-xs font-semibold text-ink-soft">声调 · 连线 · 听写</span>
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
                <CandyButton tone="pink" size="md" onClick={() => { sfxTap(); triggerHaptic(30); setSelected(recommended); }}>
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
                <CandyButton tone="blue" size="sm" onClick={() => { sfxTap(); triggerHaptic(20); setMainCat('slide_fusion'); }}>
                  {tr('pinyinPage.blendPractice') || '去拼读'}
                </CandyButton>
              </div>
            </Panel>
          )}

          {/* 二级分类切换：声母/韵母/整体认读 */}
          <div className="flex justify-center gap-2 p-1.5 rounded-2xl bg-sky-100/60 border border-sky-200">
            <button
              onClick={() => { sfxTap(); triggerHaptic(20); setChartType('shengmu'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                chartType === 'shengmu'
                  ? 'bg-candy-blue-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🗣️ 声母 (23)
            </button>
            <button
              onClick={() => { sfxTap(); triggerHaptic(20); setChartType('yunmu'); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                chartType === 'yunmu'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎶 韵母 (24)
            </button>
            <button
              onClick={() => { sfxTap(); triggerHaptic(20); setChartType('zhengti'); }}
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
                    onClick={() => { sfxTap(); triggerHaptic(20); setSelected(item); }}
                    className="flex flex-col items-center justify-center rounded-2xl p-3 min-h-[64px] shadow-candy-sm transition-all hover:scale-105 active:scale-95"
                    style={{ background: TONE_STYLE[g.tone].soft }}
                  >
                    <span className="text-2xl font-black text-ink">{item.p}</span>
                    <span className="text-xs font-bold" style={{ color: TONE_STYLE[g.tone].deep }}>{item.rhyme.slice(0, 6)}</span>
                  </button>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* 🎢 2. 声韵滑滑梯主视图 */}
      {mainCat === 'slide_fusion' && (
        <Suspense fallback={<div className="py-16 text-center text-3xl animate-bounce">🎢</div>}>
          <PhonicsSlide />
        </Suspense>
      )}

      {/* ⚡ 3. 易混大辨析主视图 */}
      {mainCat === 'confusion' && (
        <Suspense fallback={<div className="py-16 text-center text-3xl animate-bounce">⚡</div>}>
          <ConfusionBuster />
        </Suspense>
      )}

      {/* 🎯 4. 闯关与听写主视图 */}
      {mainCat === 'quiz_dictation' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-1.5 p-1.5 rounded-2xl bg-purple-100/60 border border-purple-200">
            <button
              onClick={() => { sfxTap(); setQuizType('blend'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                quizType === 'blend'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🔗 声韵对对碰
            </button>
            <button
              onClick={() => { sfxTap(); setQuizType('tone'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                quizType === 'tone'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎵 四声调练调
            </button>
            <button
              onClick={() => { sfxTap(); setQuizType('group'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                quizType === 'group'
                  ? 'bg-candy-pink-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎶 拼音分类连线
            </button>
            <button
              onClick={() => { sfxTap(); setQuizType('practice'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                quizType === 'practice'
                  ? 'bg-candy-purple-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎯 综合辨音
            </button>
            <button
              onClick={() => { sfxTap(); setQuizType('dictation'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                quizType === 'dictation'
                  ? 'bg-candy-purple-deep text-white shadow-candy-sm'
                  : 'bg-white/80 text-ink-soft hover:bg-white'
              }`}
            >
              🎧 听音默写
            </button>
          </div>

          <Suspense fallback={<div className="py-16 text-center text-3xl animate-bounce">🎯</div>}>
            {quizType === 'blend' && <BlendPractice />}
            {quizType === 'tone' && <TonePractice />}
            {quizType === 'group' && <PinyinGroup />}
            {quizType === 'practice' && <PinyinPractice />}
            {quizType === 'dictation' && <Dictation />}
          </Suspense>
        </div>
      )}
    </div>
  );
}

