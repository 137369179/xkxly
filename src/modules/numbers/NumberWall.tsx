import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { cn, range } from '@/lib/utils';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { toChineseNumber, toNumberPinyin } from '@/lib/chineseNumber';
import { useNumbersHeard, useStore } from '@/store/useStore';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { useTranslation } from '@/i18n/useTranslation';

const RANGES = [
  { id: '0-20', from: 0, to: 20, label: '0 - 20' },
  { id: '21-50', from: 21, to: 50, label: '21 - 50' },
  { id: '51-100', from: 51, to: 100, label: '51 - 100' },
] as const;

export function NumberWall() {
  const { t: tr } = useTranslation();
  const numbersHeard = useNumbersHeard();
  const heardNumber = useStore((s) => s.heardNumber);
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]['id']>('0-20');
  const [active, setActive] = useState<number | null>(null);

  const r = RANGES.find((x) => x.id === rangeId)!;
  const nums = range(r.from, r.to + 1);

  const play = (n: number) => {
    heardNumber(n);
    setActive(n);
    void speak(toChineseNumber(n), { rate: 0.75, pitch: 1.2, module: 'number' });
  };

  return (
    <div className="space-y-5">
      <Panel className="!py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink-soft">
            {tr('numbers.learned', { known: numbersHeard.length, total: 101 })}
          </span>
          {numbersHeard.length >= 101 && (
            <span className="text-sm font-extrabold text-candy-green-deep">{tr('numbers.allKnown')} 🎉</span>
          )}
        </div>
        <ProgressBar value={numbersHeard.length} max={101} tone="yellow" />
      </Panel>

      {/* 区间切换 */}
      <div className="flex gap-2.5">
        {RANGES.map((item) => (
          <CandyButton
            key={item.id}
            tone={rangeId === item.id ? 'yellow' : 'purple'}
            variant={rangeId === item.id ? 'solid' : 'soft'}
            size="sm"
            fullWidth
            onClick={() => setRangeId(item.id)}
          >
            {item.label}
          </CandyButton>
        ))}
      </div>

      {/* 数字网格 */}
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-7 sm:gap-3 md:grid-cols-10">
        {nums.map((n) => {
          const t = TONE_STYLE[toneAt(n)]!
          const learned = numbersHeard.includes(n);
          return (
            <motion.button
              key={n}
              onClick={() => play(n)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'no-select relative grid min-h-[56px] place-items-center rounded-2xl',
                'text-2xl font-extrabold transition-shadow sm:min-h-[62px] sm:text-3xl',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-yellow/70',
              )}
              style={{
                background: learned ? t.main : t.soft,
                color: learned ? t.on : t.deep,
                boxShadow: `0 4px 0 0 ${t.main}55`,
              }}
            >
              {n}
            </motion.button>
          );
        })}
      </div>

      {/* 数字详情 */}
      <Modal open={active !== null} onClose={() => setActive(null)} className="max-w-sm text-center">
        {active !== null &&
          (() => {
            const t = TONE_STYLE[toneAt(active)]!
            const dots = Math.min(active, 20);
            return (
              <>
                <div
                  className="mx-auto grid h-36 w-36 place-items-center rounded-[2rem]"
                  style={{ background: t.soft }}
                >
                  <span className="text-7xl font-extrabold" style={{ color: t.deep }}>
                    {active}
                  </span>
                </div>
                <h3 className="mt-4 text-4xl font-extrabold" style={{ color: t.deep }}>
                  {toChineseNumber(active)}
                </h3>
                <p className="mt-1 text-lg font-bold tracking-wide text-ink-soft">
                  {toNumberPinyin(active)}
                </p>

                {/* 点数可视化 */}
                {active > 0 && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-white/70 p-4">
                    {Array.from({ length: dots }, (_, i) => (
                      <motion.span
                        key={`num-${i}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.025, type: 'spring', stiffness: 400 }}
                        className="h-5 w-5 rounded-full"
                        style={{ background: t.main }}
                      />
                    ))}
                    {active > 20 && (
                      <span className="ml-1 text-sm font-extrabold" style={{ color: t.deep }}>
                        {tr('numbers.moreCount', { count: active })}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <CandyButton
                    tone="yellow"
                    size="lg"
                    fullWidth
                    onClick={() => {
                      sfxTap();
                      void speak(toChineseNumber(active), { rate: 0.7, module: 'number' });
                    }}
                  >
                    {tr('numbers.readAgain')}
                  </CandyButton>
                  <CandyButton
                    tone="purple"
                    variant="soft"
                    size="lg"
                    fullWidth
                    onClick={() => setActive(null)}
                  >
                    {tr('numbers.gotIt')}
                  </CandyButton>
                </div>

                {/* v6: AI 数字儿歌 */}
                <NumberStory n={active} />
              </>
            );
          })()}
      </Modal>
    </div>
  );
}

/* v6: AI 数字儿歌 */
import { numberStoryTask } from '@/lib/ai/tasks';
import { useAiStream } from '@/lib/ai/useAi';
import { AiPanel } from '@/components/ai';

function NumberStory({ n }: { n: number }) {
  const task = useMemo(() => numberStoryTask(n), [n]);
  const ai = useAiStream(task);
  return (
    <div className="mt-4 text-left">
      <AiPanel state={ai} tone="yellow" compact />
    </div>
  );
}
