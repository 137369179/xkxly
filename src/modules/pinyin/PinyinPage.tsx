import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { getAllPinyin, nextPinyin, type PinyinEntry } from '@/data/pinyinIndex';
import { getKingdomLevel } from '@/data/pinyinKingdomData';
import { PageHeader } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { useStore } from '@/store/useStore';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';

import { PinyinKingdomMap } from './components/PinyinKingdomMap';
import { PinyinCodexModal } from './components/PinyinCodexModal';
import { PinyinLearn } from './PinyinLearn';

// ── 懒加载拼读实验室与专项闯关 ──
const PhonicsSlide = lazy(() => import('./PhonicsSlide').then((m) => ({ default: m.PhonicsSlide })));
const BlendPractice = lazy(() => import('./BlendPractice').then((m) => ({ default: m.BlendPractice })));
const TonePractice = lazy(() => import('./TonePractice').then((m) => ({ default: m.TonePractice })));
const ConfusionBuster = lazy(() => import('./ConfusionBuster').then((m) => ({ default: m.ConfusionBuster })));
const Dictation = lazy(() => import('./Dictation').then((m) => ({ default: m.Dictation })));
const PinyinGroup = lazy(() => import('./PinyinGroup').then((m) => ({ default: m.PinyinGroup })));

type MainTabMode = 'kingdom_map' | 'phonics_lab' | 'confusion_buster' | 'quiz_dictation';
type QuizSubCategory = 'blend' | 'tone' | 'group' | 'dictation';

export default function PinyinPage() {
  const [tabMode, setTabMode] = useState<MainTabMode>('kingdom_map');
  const [quizType, setQuizType] = useState<QuizSubCategory>('blend');
  const [selectedPinyin, setSelectedPinyin] = useState<PinyinEntry | null>(null);
  const [isCodexOpen, setIsCodexOpen] = useState(false);

  const mastery = useStore((s) => s.progress.mastery);
  const { target, clear } = useTrainingTarget('pinyin');

  // 今日推荐拼音关卡
  const recommended = useMemo(() => nextPinyin(mastery), [mastery]);

  // 全局快捷键响应 (1: 王国地图, 2: 拼读游乐场, 3: 易混消消乐, 4: 听写闯关, Space: 今日推荐, Esc: 返回地图)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (selectedPinyin) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedPinyin(null);
        }
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(20);
        setTabMode('kingdom_map');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(20);
        setTabMode('phonics_lab');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(20);
        setTabMode('confusion_buster');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(20);
        setTabMode('quiz_dictation');
      } else if (e.key === ' ' && tabMode === 'kingdom_map' && recommended) {
        e.preventDefault();
        triggerHaptic(35);
        setSelectedPinyin(recommended);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabMode, recommended, selectedPinyin]);

  // 深链 param 处理
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    if (p === 'slide') {
      setTabMode('phonics_lab');
    } else if (p === 'confusion') {
      setTabMode('confusion_buster');
    } else if (p === 'tone') {
      setTabMode('quiz_dictation');
      setQuizType('tone');
    } else if (p === 'blend') {
      setTabMode('quiz_dictation');
      setQuizType('blend');
    } else if (p === 'dictation') {
      setTabMode('quiz_dictation');
      setQuizType('dictation');
    } else if (p === 'group') {
      setTabMode('quiz_dictation');
      setQuizType('group');
    } else {
      // 特定拼音字母学习直达
      const all = getAllPinyin();
      const found = all.find((item) => item.p === p);
      if (found) {
        setSelectedPinyin(found);
      }
    }
  }, [target]);

  // 处于具体单字五步学习流程中
  if (selectedPinyin) {
    return (
      <div className="space-y-4">
        <PinyinLearn
          entry={selectedPinyin}
          onDone={() => {
            setSelectedPinyin(null);
            clear();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* 顶部标题栏 */}
      <PageHeader
        emoji="🔤"
        title="小莤拼音王国"
        subtitle="玩·认·读·写·练五步超级闭环 · 63关趣味全景探险"
      />

      {/* 专项训练横幅 */}
      <TrainingBanner target={target} onClose={clear} />

      {/* 今日推荐学习任务横幅 */}
      {recommended && (
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">✨</span>
            <div>
              <div className="text-xs font-black text-amber-950">
                今日推荐关卡：{recommended.p}（{getKingdomLevel(recommended.p).personification.character}）
              </div>
              <div className="text-[11px] font-bold text-amber-800 line-clamp-1">
                {recommended.rhyme}
              </div>
            </div>
          </div>
          <CandyButton
            tone="orange"
            size="sm"
            onClick={() => {
              sfxTap();
              triggerHaptic(30);
              setSelectedPinyin(recommended);
            }}
          >
            立即闯关 ➔
          </CandyButton>
        </div>
      )}

      {/* 顶部核心导航标签栏 (小莤王国 / 拼读游乐场 / 易混消消乐 / 听音闯关) */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gradient-to-r from-pink-50 via-purple-50 to-sky-50 rounded-3xl border-2 border-purple-200 shadow-xs">
        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setTabMode('kingdom_map');
          }}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            tabMode === 'kingdom_map'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md scale-102'
              : 'text-purple-950 hover:bg-white/80'
          }`}
        >
          <span>🏰</span>
          <span>拼音王国</span>
        </button>

        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setTabMode('phonics_lab');
          }}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            tabMode === 'phonics_lab'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-102'
              : 'text-purple-950 hover:bg-white/80'
          }`}
        >
          <span>🎢</span>
          <span>拼读游乐场</span>
        </button>

        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setTabMode('confusion_buster');
          }}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            tabMode === 'confusion_buster'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md scale-102'
              : 'text-purple-950 hover:bg-white/80'
          }`}
        >
          <span>⚡</span>
          <span>易混消消乐</span>
        </button>

        <button
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setTabMode('quiz_dictation');
          }}
          className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            tabMode === 'quiz_dictation'
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md scale-102'
              : 'text-purple-950 hover:bg-white/80'
          }`}
        >
          <span>🎯</span>
          <span>听音挑战</span>
        </button>
      </div>

      {/* ── 视图 1：小莤拼音王国大冒险地图 ── */}
      {tabMode === 'kingdom_map' && (
        <PinyinKingdomMap
          onSelectLevel={(level) => {
            const all = getAllPinyin();
            const found = all.find((p) => p.p === level.p) || {
              p: level.p,
              type: level.type,
              sound: level.mouthGuide,
              mouth: level.mouthGuide,
              rhyme: level.rhyme,
              examples: level.examples.map((e) => e.hanzi),
              syllables: level.syllables || [],
              order: level.order,
            };
            setSelectedPinyin(found as PinyinEntry);
          }}
          onOpenCodex={() => setIsCodexOpen(true)}
          onOpenPhonicsLab={() => setTabMode('phonics_lab')}
        />
      )}

      {/* ── 视图 2：声韵拼读游乐场 ── */}
      {tabMode === 'phonics_lab' && (
        <Suspense fallback={<div className="text-center py-12 text-ink-soft">🎢 拼读游乐场准备中...</div>}>
          <PhonicsSlide />
        </Suspense>
      )}

      {/* ── 视图 3：易混消消乐 ── */}
      {tabMode === 'confusion_buster' && (
        <Suspense fallback={<div className="text-center py-12 text-ink-soft">⚡ 易混消消乐加载中...</div>}>
          <ConfusionBuster />
        </Suspense>
      )}

      {/* ── 视图 4：听音与测验挑战 ── */}
      {tabMode === 'quiz_dictation' && (
        <div className="space-y-4">
          {/* 子分类切换 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { id: 'blend', label: '两拼三拼闯关', emoji: '🚂' },
              { id: 'tone', label: '四声调听音辨识', emoji: '🎵' },
              { id: 'dictation', label: '拼音听写实战', emoji: '✍️' },
              { id: 'group', label: '韵母归类连线', emoji: '📦' },
            ].map((q) => (
              <CandyButton
                key={q.id}
                tone={quizType === q.id ? 'blue' : 'purple'}
                variant={quizType === q.id ? 'solid' : 'soft'}
                size="sm"
                onClick={() => {
                  sfxTap();
                  setQuizType(q.id as QuizSubCategory);
                }}
              >
                <span>{q.emoji}</span>
                <span>{q.label}</span>
              </CandyButton>
            ))}
          </div>

          <Suspense fallback={<div className="text-center py-12 text-ink-soft">🎯 挑战加载中...</div>}>
            {quizType === 'blend' && <BlendPractice />}
            {quizType === 'tone' && <TonePractice />}
            {quizType === 'dictation' && <Dictation />}
            {quizType === 'group' && <PinyinGroup />}
          </Suspense>
        </div>
      )}

      {/* 63 张全量拼音宝典弹窗 */}
      <PinyinCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        onSelectLevel={(lvl) => {
          const all = getAllPinyin();
          const found = all.find((p) => p.p === lvl.p) || {
            p: lvl.p,
            type: lvl.type,
            sound: lvl.mouthGuide,
            mouth: lvl.mouthGuide,
            rhyme: lvl.rhyme,
            examples: lvl.examples.map((e) => e.hanzi),
            syllables: lvl.syllables || [],
            order: lvl.order,
          };
          setSelectedPinyin(found as PinyinEntry);
        }}
      />
    </div>
  );
}
