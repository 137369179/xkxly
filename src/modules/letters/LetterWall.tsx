import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LETTERS, type LetterItem } from '@/data/letters';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { speak, speakLetter } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { useProgress, useStore } from '@/store/useStore';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { FluffyLetterVisual } from '@/components/letters/FluffyLetterVisual';
import { useTranslation } from '@/i18n/useTranslation';

import { letterStoryTask } from '@/lib/ai/tasks';
import { useAiStream } from '@/lib/ai/useAi';
import { AiPanel } from '@/components/ai';

export function LetterWall() {
  const { t: tr } = useTranslation();
  const progress = useProgress();
  const heardLetter = useStore((s) => s.heardLetter);
  const [active, setActive] = useState<LetterItem | null>(null);

  const play = async (item: LetterItem) => {
    heardLetter(item.upper);
    setActive(item);
    await speakLetter(item.upper);
    await speak(item.word, { lang: 'en-US', rate: 0.72, module: 'letter' });
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

      {/* 进度 */}
      <Panel className="!py-4 border-2 border-pink-200 bg-white/90">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink-soft">
            {tr('letters.knownCount', { current: progress.lettersHeard.length, total: 26 })}
          </span>
          {progress.lettersHeard.length >= 26 && (
            <span className="text-sm font-extrabold text-candy-pink-deep">{tr('letters.allKnown')}</span>
          )}
        </div>
        <ProgressBar value={progress.lettersHeard.length} max={26} tone="pink" />
      </Panel>

      {/* 字母墙 */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
        {LETTERS.map((item, i) => {
          const t = TONE_STYLE[toneAt(i)]!
          const learned = progress.lettersHeard.includes(item.upper);
          return (
            <motion.button
              key={item.upper}
              onClick={() => void play(item)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              className={cn(
                'no-select relative flex min-h-[110px] flex-col items-center justify-center gap-0.5',
                'rounded-[1.6rem] py-3 transition-all border-3 border-white shadow-fluffy sm:min-h-[130px]',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-pink/60',
              )}
              style={{ background: t.soft }}
            >
              {learned && (
                <span className="absolute top-1.5 right-2 text-sm" title={tr('letters.learned')}>
                  🌸
                </span>
              )}

              <span
                className="text-3xl leading-none font-extrabold sm:text-4xl"
                style={{ color: t.deep }}
              >
                {item.upper}
                <span className="opacity-70">{item.lower}</span>
              </span>
              {/* 统一羊毛毡风格图标（替代原 emoji span） */}
              <img
                src={item.iconSrc}
                alt={item.word}
                loading="lazy"
                decoding="async"
                className="mt-1 h-9 w-9 rounded-full border-2 border-white bg-white object-cover shadow-md sm:h-11 sm:w-11"
              />
              <span className="text-[11px] font-bold" style={{ color: t.deep }}>
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
            <motion.div key={active.upper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <>
                {/* 3D 羊毛毡统一风格字母与自然拼读单词卡片 */}

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


                    <div className="mt-6 flex gap-3">
                      <CandyButton
                        tone="pink"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          sfxTap();
                          void speakLetter(active.upper);
                        }}
                      >
                        {tr('letters.readLetter')}
                      </CandyButton>
                      <CandyButton
                        tone="green"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          sfxTap();
                          void speak(active.word, { lang: 'en-US', rate: 0.7, module: 'letter' });
                        }}
                      >
                        {tr('letters.readWord')}
                      </CandyButton>
                    </div>
                    <CandyButton
                      tone="purple"
                      variant="soft"
                      size="md"
                      fullWidth
                      className="mt-3"
                      onClick={() => setActive(null)}
                    >
                      {tr('letters.gotIt')}
                    </CandyButton>

                    {/* v6: AI 字母故事 */}
                    <LetterStory upper={active.upper} word={active.word} zh={active.zh} />
                  </>
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
    </div>
  );
}
