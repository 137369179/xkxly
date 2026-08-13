/**
 * 字母描红 - 26个字母大小写描红练习
 */

import { useState } from 'react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { TraceCanvas } from '@/components/TraceCanvas';
import { LETTERS, LETTER_MAP } from '@/data/letters';
import { speakLetter } from '@/lib/speech';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { useStore } from '@/store/useStore';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const UPPER_CHARS = LETTERS.map(l => l.upper);
const LOWER_CHARS = LETTERS.map(l => l.lower);

export function LetterTrace() {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<'upper' | 'lower'>('upper');
  const [passed, setPassed] = useState<Set<string>>(new Set());

  const store = useStore();
  const chars = mode === 'upper' ? UPPER_CHARS : LOWER_CHARS;
  const char = chars[idx]!
  const letter = LETTER_MAP.get(mode === 'upper' ? char : char.toUpperCase());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <CandyButton tone={mode === 'upper' ? 'blue' : 'purple'} variant={mode === 'upper' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setMode('upper'); }}>
            {t('letterTrace.upper')}
          </CandyButton>
          <CandyButton tone={mode === 'lower' ? 'blue' : 'purple'} variant={mode === 'lower' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setMode('lower'); }}>
            {t('letterTrace.lower')}
          </CandyButton>
        </div>
        <span className="text-xs font-bold text-ink-soft">{passed.size} / 26</span>
      </div>

      <Panel className="text-center">
        <div className="text-6xl font-black text-ink">{char}</div>
        {letter && (
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="rounded-full bg-candy-blue-soft px-2 py-0.5 text-xs font-bold text-candy-blue-deep">
              {letter.emoji} {letter.word}
            </span>
            <CandyButton tone="blue" size="sm" onClick={() => speakLetter(char)} aria-label="朗读字母">
              🔊
            </CandyButton>
          </div>
        )}
      </Panel>

      <Panel>
        <h4 className="mb-1 text-sm font-extrabold text-ink text-center">{t('letterTrace.traceTip')}</h4>
        <TraceCanvas
          char={char}
          tone="blue"
          onPass={() => {
            sfxStar();
            setPassed(p => new Set([...p, char]));
            if (letter) {
              store.markTraced(`letter:${char}`);
              store.learnSkill(`letter:${mode === 'upper' ? char : char.toUpperCase()}`);
            }
          }}
        />
      </Panel>

      {/* 进度条 */}
      <div className="flex gap-1 flex-wrap">
        {chars.map((c, i) => (
          <motion.button
            key={`c-${i}`}
            whileTap={{ scale: 0.9 }}
            onClick={() => { sfxTap(); setIdx(i); }}
            className={cn(
              'h-8 w-8 rounded-lg text-sm font-black transition-all',
              i === idx
                ? 'bg-candy-blue-deep text-white scale-110'
                : passed.has(c)
                  ? 'bg-candy-green-soft text-candy-green-deep'
                  : 'bg-white text-ink-soft'
            )}
          >
            {c}
          </motion.button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <CandyButton tone="blue" variant="soft" size="sm" disabled={idx === 0} onClick={() => { sfxTap(); setIdx(i => i - 1); }}>
          ◀️
        </CandyButton>
        <CandyButton tone="orange" size="sm" onClick={() => { sfxTap(); setIdx(i => (i + 1) % chars.length); }}>
          {t('letterTrace.next')}
        </CandyButton>
      </div>
    </div>
  );
}
