import { useState, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LETTERS, type LetterItem } from '@/data/letters';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { speakLetter, speakPhonics, playWordVoice } from '@/lib/speech';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { useLettersHeard, useMastery, useStore } from '@/store/useStore';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { FluffyLetterVisual } from '@/modules/letters/FluffyLetterVisual';
import { useTranslation } from '@/i18n/useTranslation';
import { letterStoryTask } from '@/lib/ai/tasks';
import { useAiStream } from '@/lib/ai/useAi';
import { AiPanel } from '@/components/ai';
import { SpeechEvalButton } from '@/components/feedback/SpeechEvalButton';
import { ExploreReward } from '@/components/study/ExploreReward';

type CategoryFilter = 'all' | 'vowel' | 'consonant1' | 'consonant2';
type CaseDisplay = 'both' | 'upper' | 'lower';

export function LetterWall() {
  const { t: tr } = useTranslation();
  const lettersHeard = useLettersHeard();
  const mastery = useMastery();
  const heardLetter = useStore((s) => s.heardLetter);
  const practice = useStore((s) => s.practice);
  const [active, setActive] = useState<LetterItem | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [caseMode, setCaseMode] = useState<CaseDisplay>('both');
  /** 发音播放锁：防止快速连点不同字母时本地音频重叠 */
  const playingRef = useRef(false);

  const filteredLetters = useMemo(() => {
    if (filter === 'all') return LETTERS;
    return LETTERS.filter((l) => l.category === filter);
  }, [filter]);

  const play = async (item: LetterItem) => {
    if (playingRef.current) return;
    playingRef.current = true;
    try {
      sfxTap();
      heardLetter(item.upper);
      setActive(item);
      // 3段式离线纯正发音：Letter Name -> Word 例词
      await speakLetter(item.upper);
      await playWordVoice(item.upper);
    } finally {
      playingRef.current = false;
    }
  };

  const playPhonics = async (item: LetterItem) => {
    sfxStar();
    await speakPhonics(item.phonicsRhyme, item.upper);
  };

  return (
    <div className="space-y-5">
      {/* 3D 羊毛毡 26 字母艺术作品看板 */}
      <div className="relative overflow-hidden rounded-[2rem] border-4 border-pink-200 bg-pink-100/80 shadow-fluffy p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-64 h-40 overflow-hidden rounded-2xl border-2 border-white shadow-md shrink-0">
          <img src="/alphabet_felt_poster.jpg" alt="3D Felt Alphabet Art" loading="lazy" decoding="async" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center space-x-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-pink-600 shadow-sm">
            <span>{tr('letters.wallBadge')}</span>
          </div>
          <h3 className="text-xl font-extrabold text-rainbow">{tr('letters.wallTitle')}</h3>
          <p className="text-xs font-bold text-ink-soft">{tr('letters.wallSubtitle')}</p>
        </div>
      </div>

      {/* 学习进度与过滤器 */}
      <Panel className="!py-4 border-2 border-pink-200 bg-white/90 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink-soft">
            {tr('letters.knownCount', { current: lettersHeard.length, total: 26 })}
          </span>
          {lettersHeard.length >= 26 ? (
            <span className="text-sm font-extrabold text-candy-pink-deep">🎉 {tr('letters.allKnown')}</span>
          ) : (
            <span className="text-xs font-bold text-candy-blue-deep">
              🌟 探索全部 26 个魔法字母
            </span>
          )}
        </div>
        <ProgressBar value={lettersHeard.length} max={26} tone="pink" />

        {/* 阶段分类筛选与大小写模式切换 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-pink-100">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { sfxTap(); setFilter('all'); }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
                filter === 'all'
                  ? 'bg-candy-pink-deep text-white shadow-sm'
                  : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
              )}
            >
              全部 (26)
            </button>
            <button
              onClick={() => { sfxTap(); setFilter('vowel'); }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
                filter === 'vowel'
                  ? 'bg-candy-orange-deep text-white shadow-sm'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              )}
            >
              🍎 魔法元音 (5)
            </button>
            <button
              onClick={() => { sfxTap(); setFilter('consonant1'); }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
                filter === 'consonant1'
                  ? 'bg-candy-blue-deep text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              )}
            >
              🐱 常用辅音 (15)
            </button>
            <button
              onClick={() => { sfxTap(); setFilter('consonant2'); }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
                filter === 'consonant2'
                  ? 'bg-candy-purple-deep text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              )}
            >
              🦄 进阶辅音 (6)
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => { sfxTap(); setCaseMode('both'); }}
              className={cn(
                'rounded-lg px-2 py-0.5 text-xs font-black transition',
                caseMode === 'both' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft'
              )}
            >
              Aa
            </button>
            <button
              onClick={() => { sfxTap(); setCaseMode('upper'); }}
              className={cn(
                'rounded-lg px-2 py-0.5 text-xs font-black transition',
                caseMode === 'upper' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft'
              )}
            >
              A
            </button>
            <button
              onClick={() => { sfxTap(); setCaseMode('lower'); }}
              className={cn(
                'rounded-lg px-2 py-0.5 text-xs font-black transition',
                caseMode === 'lower' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft'
              )}
            >
              a
            </button>
          </div>
        </div>
      </Panel>

      {/* 字母网格 */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
        {filteredLetters.map((item, i) => {
          const t = TONE_STYLE[toneAt(i)]!;
          const skill = mastery[`letter:${item.upper}`];
          const lv = skill?.lv ?? 0;
          const isMastered = lv >= 5;
          const learned = lettersHeard.includes(item.upper) || lv > 0;
          return (
            <motion.button
              key={item.upper}
              onClick={() => void play(item)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.93 }}
              className={cn(
                'no-select relative flex min-h-[118px] flex-col items-center justify-center gap-0.5',
                'rounded-[1.6rem] py-3 transition-all border-3 border-white shadow-fluffy sm:min-h-[136px]',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-pink/60',
              )}
              style={{ background: t.soft }}
            >
              {/* 掌握度 SRS 徽标 */}
              {isMastered ? (
                <span className="absolute top-1.5 right-2 text-sm drop-shadow-xs" title="已熟练掌握">
                  👑
                </span>
              ) : lv > 0 ? (
                <span className="absolute top-1.5 right-2 rounded-full bg-amber-300/90 px-1 py-0.2 text-[9px] font-black text-amber-950 shadow-xs">
                  ⭐ Lv.{lv}
                </span>
              ) : learned ? (
                <span className="absolute top-1.5 right-2 text-sm" title={tr('letters.learned')}>
                  🌸
                </span>
              ) : null}

              {/* 自然拼读音标小浮标 */}
              <span className="absolute top-1.5 left-2 rounded-md bg-white/80 px-1 py-0.2 text-[10px] font-black text-ink-soft shadow-xs">
                {item.phonicsSound}
              </span>

              <span
                className="mt-1 text-4xl leading-tight font-extrabold sm:text-5xl text-center"
                style={{ color: t.deep }}
              >
                {caseMode === 'both' ? (
                  <>
                    {item.upper}
                    <span className="opacity-70">{item.lower}</span>
                  </>
                ) : caseMode === 'upper' ? (
                  item.upper
                ) : (
                  item.lower
                )}
              </span>

              {/* 统一羊毛毡风格图标 */}
              <img
                src={item.iconSrc}
                alt={item.word}
                loading="lazy"
                decoding="async"
                className="mt-1 h-9 w-9 rounded-full border-2 border-white bg-white object-cover shadow-md sm:h-11 sm:w-11"
              />
              <span className="text-[11px] font-bold tracking-tight" style={{ color: t.deep }}>
                {item.word}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* 字母详情弹窗 */}
      <Modal open={!!active} onClose={() => setActive(null)} className="max-w-sm text-center">
        <AnimatePresence mode="wait">
          {active && (
            <motion.div key={active.upper} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              {/* 3D 羊毛毡统一风格字母与自然拼读单词卡片 */}
              <FluffyLetterVisual
                upper={active.upper}
                lower={active.lower}
                word={active.word}
                zh={active.zh}
                emoji={active.emoji}
                size="lg"
                className="mx-auto my-2 max-w-xs"
              />

              {/* 自然拼读音标标牌 */}
              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-1.5">
                <span className="text-sm">🎵</span>
                <span className="text-xs font-extrabold text-amber-800">
                  Phonics 自然拼读：<strong className="text-sm text-amber-900">{active.phonicsSound}</strong>
                </span>
              </div>

              <div className="mt-4">
                <CandyButton
                  tone="pink"
                  size="md"
                  fullWidth
                  onClick={() => {
                    sfxTap();
                    void speakLetter(active.upper);
                  }}
                >
                  {tr('letters.readLetter')} ({active.upper})
                </CandyButton>
              </div>

              {/* 自然拼读口诀跟读按钮 */}
              <div className="mt-2">
                <CandyButton
                  tone="orange"
                  variant="soft"
                  size="sm"
                  fullWidth
                  onClick={() => void playPhonics(active)}
                >
                  🎶 听自然拼读口诀 ({active.phonicsRhyme})
                </CandyButton>
              </div>

              {/* 🎤 开口跟读挑战 */}
              <div className="mt-3 rounded-2xl bg-indigo-50/80 p-3 border border-indigo-100 flex flex-col items-center gap-1.5">
                <span className="text-xs font-black text-indigo-900">🎤 开口大声读出字母 {active.upper}</span>
                <SpeechEvalButton
                  targetText={active.upper}
                  lang="en-US"
                  onPass={() => {
                    practice(`letter:${active.upper}`, true);
                  }}
                  className="w-full"
                />
              </div>

              <CandyButton
                tone="purple"
                variant="solid"
                size="md"
                fullWidth
                className="mt-3"
                onClick={() => setActive(null)}
              >
                {tr('letters.gotIt')} ✨
              </CandyButton>

              {/* v6: AI 字母故事 */}
              <LetterStory upper={active.upper} word={active.word} zh={active.zh} />
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </div>
  );
}

/* v6: AI 字母故事 */
function LetterStory({ upper, word, zh }: { upper: string; word: string; zh: string }) {
  const task = useMemo(() => letterStoryTask(upper, word, zh), [upper, word, zh]);
  const ai = useAiStream(task);
  return (
    <div className="mt-4 text-left">
      <AiPanel state={ai} tone="pink" compact />
    
      <ExploreReward rewardKey="letter-wall" scene="letter" tone="purple" /></div>
  );
}
