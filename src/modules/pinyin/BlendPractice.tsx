/**
 * {tr('blendPractice.title')}器 · 声母 + 韵母 = 音节
 * ------------------------------------------------------------------
 * 从 ALL_COMBOS 中随机出题，孩子选正确的拼读结果
 * 答对写入 mastery（skill: pinyin:blend:result）
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore } from '@/store/useStore';
import { ALL_COMBOS, type SyllableCombo } from '@/data/pinyin';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { cn, shuffle } from '@/lib/utils';

function pickTone(combo: SyllableCombo): string {
  if (!combo.hasTone) return combo.result;
  // 给结果加一个随机声调
  const base = combo.result;
  const lastChar = base[base.length - 1]!
  const toneMap: Record<string, string[]> = {
    a: ['ā', 'á', 'ǎ', 'à'],
    o: ['ō', 'ó', 'ǒ', 'ò'],
    e: ['ē', 'é', 'ě', 'è'],
    i: ['ī', 'í', 'ǐ', 'ì'],
    u: ['ū', 'ú', 'ǔ', 'ù'],
    ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  };
  const tones = toneMap[lastChar]!!
  if (!tones) return base;
  return base.slice(0, -1) + tones[Math.floor(Math.random() * tones.length)];
}

interface Round {
  combo: SyllableCombo;
  options: string[];
  answer: string;
  display: string;
}

function makeRound(): Round {
  const combo = ALL_COMBOS[Math.floor(Math.random() * ALL_COMBOS.length)]!
  const correct = combo.result;
  // 生成 3 个干扰项
  const wrongs = shuffle(ALL_COMBOS.filter(c => c.result !== correct))
    .slice(0, 3)
    .map(c => c.result);
  const options = shuffle([correct, ...wrongs]);
  return {
    combo,
    options,
    answer: correct,
    display: pickTone(combo),
  };
}

const TOTAL = 10;

export function BlendPractice() {
  const { t: tr } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [round, setRound] = useState<Round | null>(null);
  const [idx, setIdx] = useState(0);
  const [ok, setOk] = useState(0);
  const [ng, setNg] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const start = useCallback(() => {
    sfxTap();
    setIdx(0);
    setOk(0);
    setNg(0);
    setFinished(false);
    setRound(makeRound());
    setChosen(null);
  }, []);

  const handlePick = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    const correct = opt === round!.answer;
    if (correct) {
      sfxCorrect();
      celebrateSmall();
      setOk(o => o + 1);
      practice(`pinyin:blend:${round!.answer}`, true, 1);
    } else {
      sfxWrong();
      setNg(n => n + 1);
      practice(`pinyin:blend:${round!.answer}`, false, 0);
    }
    // 朗读正确读音
    speak(round!.combo.result, { rate: 0.6, lang: 'zh-CN' });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (idx + 1 >= TOTAL) {
        setFinished(true);
        setRound(null);
      } else {
        setIdx(i => i + 1);
        setRound(makeRound());
        setChosen(null);
      }
    }, 1200);
  };

  if (!round && !finished) {
    return (
      <Panel className="text-center">
        <div className="text-5xl">🔗</div>
        <h3 className="mt-2 text-lg font-extrabold text-ink">{tr('blendPractice.title')}</h3>
        <p className="mt-1 text-sm font-bold text-ink-soft">
          {tr('blendPractice.subtitle', { total: TOTAL })}
        </p>
        <div className="mt-4">
          <CandyButton tone="blue" size="lg" fullWidth onClick={start}>
            🚀 {tr('blendPractice.start')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  if (finished) {
    const total = ok + ng;
    const acc = total > 0 ? Math.round((ok / total) * 100) : 0;
    return (
      <Panel className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-6xl">
          {acc >= 80 ? '🏆' : acc >= 50 ? '🎉' : '💪'}
        </motion.div>
        <h3 className="mt-2 text-xl font-extrabold text-ink">{tr('blendPractice.complete')}</h3>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-candy-green-soft p-3">
            <div className="text-2xl font-black text-candy-green-deep">{ok}</div>
            <div className="text-xs font-bold text-candy-green-deep">{tr('blendPractice.correct')}</div>
          </div>
          <div className="rounded-2xl bg-candy-orange-soft p-3">
            <div className="text-2xl font-black text-candy-orange-deep">{ng}</div>
            <div className="text-xs font-bold text-candy-orange-deep">{tr('blendPractice.wrong')}</div>
          </div>
          <div className="rounded-2xl bg-candy-purple-soft p-3">
            <div className="text-2xl font-black text-candy-purple-deep">{acc}%</div>
            <div className="text-xs font-bold text-candy-purple-deep">{tr('blendPractice.accuracy')}</div>
          </div>
        </div>
        <div className="mt-4">
          <CandyButton tone="blue" size="lg" fullWidth onClick={start}>
            🔁 {tr('blendPractice.again')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink-soft">{tr('blendPractice.questionN', { current: idx + 1, total: TOTAL })}</span>
        <span className="text-xs font-bold text-ink-soft">✅ {ok} · ❌ {ng}</span>
      </div>
      <ProgressBar value={idx} max={TOTAL} tone="blue" />

      <Panel className="text-center">
        <PanelTitle emoji="🔗" title={tr('blendPractice.panelTitle')} subtitle={tr('blendPractice.panelSub')} tone="blue" />
        <AnimatePresence mode="wait">
          <motion.div
            key={`combo-${idx}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="py-4"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="rounded-2xl bg-candy-blue-soft px-6 py-4 text-4xl font-black text-candy-blue-deep">
                {round!.combo.shengmu}
              </span>
              <span className="text-3xl font-bold text-ink-soft">+</span>
              <span className="rounded-2xl bg-candy-pink-soft px-6 py-4 text-4xl font-black text-candy-pink-deep">
                {round!.combo.yunmu}
              </span>
              <span className="text-3xl font-bold text-ink-soft">=</span>
              <span className="rounded-2xl bg-candy-green-soft px-6 py-4 text-4xl font-black text-candy-green-deep">
                ？
              </span>
            </div>
            {round!.display !== round!.answer && (
              <p className="mt-2 text-sm font-bold text-candy-purple-deep">
                {tr('blendPractice.toneHint', { display: round!.display })}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          {round!.options.map(opt => {
            const isAnswer = opt === round!.answer;
            const isChosen = opt === chosen;
            return (
              <CandyButton
                key={opt}
                tone={isChosen ? (isAnswer ? 'green' : 'orange') : 'purple'}
                variant={isChosen ? 'solid' : 'soft'}
                size="lg"
                fullWidth
                onClick={() => handlePick(opt)}
              >
                {opt}
              </CandyButton>
            );
          })}
        </div>

        {chosen && (
          <p className={cn('mt-3 text-sm font-bold', chosen === round!.answer ? 'text-candy-green-deep' : 'text-candy-orange-deep')}>
            {chosen === round!.answer ? `✅ ${tr('blendPractice.correct2')}` : `❌ ${tr('blendPractice.answerIs', { answer: round!.answer })}`}
          </p>
        )}
      </Panel>
    </div>
  );
}
