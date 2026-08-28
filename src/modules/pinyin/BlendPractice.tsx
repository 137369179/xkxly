/**
 * 拼音对对碰 · 声母 + 韵母 = 音节拼读大闯关 (Syllable Blend Fusion)
 * ------------------------------------------------------------------
 * 1. 声母与韵母卡片支持独立点击发音（b 发 玻，a 发 啊）；
 * 2. 答对触发合体碰撞动画与粒子爆破 (Fusion Animation)；
 * 3. 自动联动发音，形成标准的“声母-韵母-整体音节”三步拼读法；
 * 4. 连击 Combo 徽标与触觉反馈。
 */

import { useState, useCallback, useRef } from 'react';
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
import { answerCorrect, answerWrong } from '@/lib/feedback';
import { StreakBar } from '@/components/study/StreakBar';
import { shuffle } from '@/lib/utils';

function pickTone(combo: SyllableCombo): string {
  if (!combo.hasTone) return combo.result;
  const base = combo.result;
  const lastChar = base[base.length - 1]!;
  const toneMap: Record<string, string[]> = {
    a: ['ā', 'á', 'ǎ', 'à'],
    o: ['ō', 'ó', 'ǒ', 'ò'],
    e: ['ē', 'é', 'ě', 'è'],
    i: ['ī', 'í', 'ǐ', 'ì'],
    u: ['ū', 'ú', 'ǔ', 'ù'],
    ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  };
  const tones = toneMap[lastChar]!;
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
  const combo = ALL_COMBOS[Math.floor(Math.random() * ALL_COMBOS.length)]!;
  const correct = combo.result;
  const wrongs = shuffle(ALL_COMBOS.filter((c) => c.result !== correct))
    .slice(0, 3)
    .map((c) => c.result);
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

  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ok, setOk] = useState(0);
  const [ng, setNg] = useState(0);
  const [combo, setCombo] = useState(0);
  // 连对闯关：连续答对点亮里程碑（目标 3），答错归零温和引导
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const [fusing, setFusing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    sfxTap();
    setIdx(0);
    setOk(0);
    setNg(0);
    setCombo(0);
    setStreak(0);
    setFinished(false);
    setRound(makeRound());
    setChosen(null);
  }, []);

  const playShengmu = () => {
    if (!round) return;
    void speak(round.combo.shengmu, { rate: 0.65, lang: 'zh-CN' }).catch(() => {});
  };

  const playYunmu = () => {
    if (!round) return;
    void speak(round.combo.yunmu, { rate: 0.65, lang: 'zh-CN' }).catch(() => {});
  };

  const playBlendSound = () => {
    if (!round) return;
    void speak(round.combo.result, { rate: 0.65, lang: 'zh-CN' }).catch(() => {});
  };

  const handlePick = (opt: string) => {
    if (chosen || !round) return;
    setChosen(opt);
    const isCorrect = opt === round.answer;

    if (isCorrect) {
      sfxCorrect();
      celebrateSmall();
      setFusing(true);
      setOk((o) => o + 1);
      setCombo((c) => c + 1);
      setStreak((s) => s + 1);
      practice(`pinyin:blend:${round.answer}`, true, 1);
      if (streak + 1 >= 3) answerCorrect('combo');
      else answerCorrect('pinyin');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 50, 40]);
      }
    } else {
      sfxWrong();
      setCombo(0);
      setStreak(0);
      setNg((n) => n + 1);
      practice(`pinyin:blend:${round.answer}`, false, 0);
      answerWrong('pinyin');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 80, 120]);
      }
    }

    // 朗读正确拼读结果
    playBlendSound();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFusing(false);
      if (idx + 1 >= TOTAL) {
        setFinished(true);
        setRound(null);
      } else {
        setIdx((i) => i + 1);
        setRound(makeRound());
        setChosen(null);
      }
    }, 1400);
  };

  if (!round && !finished) {
    return (
      <Panel className="text-center">
        <div className="text-6xl animate-bounce">🔗</div>
        <h3 className="mt-3 text-2xl font-black text-ink">{tr('blendPractice.title')}</h3>
        <p className="mt-1 text-sm font-bold text-ink-soft">
          {tr('blendPractice.subtitle', { total: TOTAL })}
        </p>
        <div className="mt-6 flex justify-center">
          <CandyButton tone="blue" size="lg" className="px-10" onClick={start}>
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
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="text-7xl"
        >
          {acc >= 80 ? '🏆' : acc >= 50 ? '🎉' : '💪'}
        </motion.div>
        <h3 className="mt-3 text-2xl font-black text-ink">{tr('blendPractice.complete')}</h3>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-candy-green-soft p-3">
            <div className="text-3xl font-black text-candy-green-deep">{ok}</div>
            <div className="text-xs font-bold text-candy-green-deep">{tr('blendPractice.correct')}</div>
          </div>
          <div className="rounded-2xl bg-candy-orange-soft p-3">
            <div className="text-3xl font-black text-candy-orange-deep">{ng}</div>
            <div className="text-xs font-bold text-candy-orange-deep">{tr('blendPractice.wrong')}</div>
          </div>
          <div className="rounded-2xl bg-candy-purple-soft p-3">
            <div className="text-3xl font-black text-candy-purple-deep">{acc}%</div>
            <div className="text-xs font-bold text-candy-purple-deep">{tr('blendPractice.accuracy')}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <CandyButton tone="blue" size="lg" className="px-10" onClick={start}>
            🔄 {tr('blendPractice.restart')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelTitle
          emoji="🔗"
          title={tr('blendPractice.title')}
          subtitle={`第 ${idx + 1} / ${TOTAL} 题`}
          tone="blue"
        />

        <ProgressBar value={idx + 1} max={TOTAL} color="blue" />

        {/* 闯关里程碑：连续答对点亮，形成"再对几题就通关"目标感 */}
        <div className="mt-2">
          <StreakBar streak={streak} target={3} tone="blue" />
        </div>

        {/* 连击 Combo 浮动徽章 */}
        <AnimatePresence>
          {combo >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mt-2 flex justify-center"
            >
              <span className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-1 text-xs font-black text-white shadow-md">
                🔥 {combo} 连击达成！拼读小能手！
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 声母 + 韵母 碰撞展示区 */}
        <div className="my-6 flex items-center justify-center gap-3 sm:gap-6">
          <motion.button
            type="button"
            animate={fusing ? { x: [0, 40, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4 }}
            onClick={playShengmu}
            className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 border-3 border-blue-300 px-6 py-5 shadow-sm active:scale-95 transition"
          >
            <span className="text-5xl sm:text-6xl font-black leading-tight text-blue-900">{round!.combo.shengmu}</span>
            <span className="text-xs font-extrabold text-blue-600 mt-1">🔊 点击听声母</span>
          </motion.button>

          <span className="text-3xl font-black text-slate-400">＋</span>

          <motion.button
            type="button"
            animate={fusing ? { x: [0, -40, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4 }}
            onClick={playYunmu}
            className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-purple-50 to-pink-100 border-3 border-purple-300 px-6 py-5 shadow-sm active:scale-95 transition"
          >
            <span className="text-5xl sm:text-6xl font-black leading-tight text-purple-900">{round!.combo.yunmu}</span>
            <span className="text-xs font-extrabold text-purple-600 mt-1">🔊 点击听韵母</span>
          </motion.button>

          <span className="text-3xl font-black text-slate-400">＝</span>

          <div className="flex flex-col items-center justify-center rounded-3xl bg-amber-50 border-3 border-dashed border-amber-300 px-6 py-5 shadow-inner">
            <span className="text-5xl sm:text-6xl font-black leading-tight text-amber-900">
              {chosen ? round!.answer : '❓'}
            </span>
            <span className="text-xs font-extrabold text-amber-700 mt-1">
              {chosen ? '已合体' : '选对合体'}
            </span>
          </div>
        </div>

        <p className="text-center text-sm font-black text-ink-soft mb-4">
          请点击正确的合体拼音选项：
        </p>

        {/* 候选选项卡片 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {round!.options.map((opt) => {
            const isSelected = chosen === opt;
            const isAnswer = round!.answer === opt;
            let btnClass = 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md';

            if (chosen !== null) {
              if (isAnswer) {
                btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400 shadow-md';
              } else if (isSelected && !isAnswer) {
                btnClass = 'border-rose-400 bg-rose-50 text-rose-900 opacity-75';
              } else {
                btnClass = 'border-slate-100 bg-slate-50/50 opacity-40';
              }
            }

            return (
              <motion.button
                key={opt}
                type="button"
                whileHover={chosen === null ? { scale: 1.03 } : {}}
                whileTap={chosen === null ? { scale: 0.95 } : {}}
                onClick={() => handlePick(opt)}
                disabled={chosen !== null}
                className={`flex flex-col items-center justify-center rounded-2xl p-4 border-2 transition-all ${btnClass}`}
              >
                <span className="text-4xl font-black leading-tight text-ink sm:text-5xl">{opt}</span>
                {chosen !== null && isAnswer && (
                  <span className="mt-1 text-xs font-black text-emerald-600">✅ 拼对啦</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
