/**
 * 字母描红 - 26个字母大小写描红练习
 */

import { useState, useMemo } from 'react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { TraceCanvas } from '@/components/TraceCanvas';
import { LETTERS, LETTER_MAP } from '@/data/letters';
import { speakLetter, speakPhonics } from '@/lib/speech';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { useStore } from '@/store/useStore';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const UPPER_CHARS = LETTERS.map((l) => l.upper);
const LOWER_CHARS = LETTERS.map((l) => l.lower);

export function LetterTrace({ initialLetter }: { initialLetter?: string }) {
  const { t } = useTranslation();
  // 深链 trace:<A> 进入时预选目标字母（大小写自适应），仅在挂载时生效一次
  const initial = useMemo(() => {
    if (!initialLetter) return { idx: 0, mode: 'upper' as const };
    const up = initialLetter.toUpperCase();
    const i = LETTERS.findIndex((l) => l.upper === up);
    return { idx: i >= 0 ? i : 0, mode: (initialLetter === initialLetter.toLowerCase() ? 'lower' : 'upper') as 'upper' | 'lower' };
  }, [initialLetter]);
  const [idx, setIdx] = useState(initial.idx);
  const [mode, setMode] = useState<'upper' | 'lower'>(initial.mode);
  const [passed, setPassed] = useState<Set<string>>(new Set());

  const store = useStore();
  const chars = mode === 'upper' ? UPPER_CHARS : LOWER_CHARS;
  const char = chars[idx]!;
  const letter = LETTER_MAP.get(mode === 'upper' ? char : char.toUpperCase());

  return (
    <div className="space-y-4">
      {/* 顶部模式切换与进度 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 rounded-2xl bg-white p-1 border border-pink-100 shadow-xs">
          <CandyButton
            tone={mode === 'upper' ? 'blue' : 'purple'}
            variant={mode === 'upper' ? 'solid' : 'soft'}
            size="sm"
            onClick={() => {
              sfxTap();
              setMode('upper');
            }}
          >
            {t('letterTrace.upper')} (A-Z)
          </CandyButton>
          <CandyButton
            tone={mode === 'lower' ? 'blue' : 'purple'}
            variant={mode === 'lower' ? 'solid' : 'soft'}
            size="sm"
            onClick={() => {
              sfxTap();
              setMode('lower');
            }}
          >
            {t('letterTrace.lower')} (a-z)
          </CandyButton>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-candy-green-soft px-3 py-1 text-xs font-black text-candy-green-deep">
          <span>✍️ 已描: {passed.size} / 26</span>
        </div>
      </div>

      {/* 当前字母卡片与发音示范 */}
      <Panel className="text-center !py-4">
        <div className="flex items-center justify-center gap-4">
          <div className="text-7xl font-black text-ink">{char}</div>
          {letter && (
            <div className="text-left space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-candy-blue-soft px-3 py-1 text-xs font-black text-candy-blue-deep">
                <span>{letter.emoji} {letter.word} ({letter.zh})</span>
              </div>
              <div className="text-xs font-extrabold text-amber-700">
                拼读音：<span className="text-sm font-black text-amber-900">{letter.phonicsSound}</span>
              </div>
              <div className="flex gap-2">
                <CandyButton
                  tone="blue"
                  size="sm"
                  onClick={() => {
                    sfxTap();
                    void speakLetter(char).catch(() => {});
                  }}
                >
                  🔊 字母音
                </CandyButton>
                <CandyButton
                  tone="orange"
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    sfxTap();
                    void speakPhonics(letter.phonicsRhyme, letter.upper).catch(() => {});
                  }}
                >
                  🎵 拼读口诀
                </CandyButton>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* 描红主画布 */}
      <Panel className="border-2 border-pink-200">
        <h4 className="mb-2 text-sm font-extrabold text-ink text-center">{t('letterTrace.traceTip')}</h4>
        <TraceCanvas
          char={char}
          tone="blue"
          onPass={() => {
            sfxStar();
            setPassed((p) => new Set([...p, char]));
            store.addStars(1);
            store.practice(`letter-trace:${char}`, true);
            if (letter) {
              store.markTraced(`letter:${char}`);
              store.learnSkill(`letter:${mode === 'upper' ? char : char.toUpperCase()}`);
            }
          }}
        />
      </Panel>

      {/* 26 字母快速选择矩阵 */}
      <div className="flex gap-1.5 flex-wrap justify-center p-2 rounded-2xl bg-white/70 border border-pink-100">
        {chars.map((c, i) => (
          <motion.button
            key={`c-${i}`}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              sfxTap();
              setIdx(i);
            }}
            className={cn(
              'h-9 w-9 rounded-xl text-sm font-black transition-all shadow-xs',
              i === idx
                ? 'bg-candy-blue-deep text-white scale-110 shadow-md ring-2 ring-blue-300'
                : passed.has(c)
                  ? 'bg-candy-green-soft text-candy-green-deep'
                  : 'bg-white text-ink-soft hover:bg-blue-50'
            )}
          >
            {c}
          </motion.button>
        ))}
      </div>

      {/* 上一个 / 下一个导航 */}
      <div className="flex justify-center gap-3">
        <CandyButton
          tone="blue"
          variant="soft"
          size="md"
          disabled={idx === 0}
          onClick={() => {
            sfxTap();
            setIdx((i) => i - 1);
          }}
        >
          ◀️ 上一个字母
        </CandyButton>
        <CandyButton
          tone="orange"
          size="md"
          onClick={() => {
            sfxTap();
            setIdx((i) => (i + 1) % chars.length);
          }}
        >
          {t('letterTrace.next')} (下一个) ▶️
        </CandyButton>
      </div>
    </div>
  );
}
