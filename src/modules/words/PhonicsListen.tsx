/**
 * 听力辨音训练 👂 (N6)
 * Phonics 听音选字母/组合，锻炼英语语音辨识能力。
 *
 * 现基于统一 QuizSessionRunner 驱动：出题循环 / 进度 / 连对 / 结算由 Runner 托管，
 * 复用 QuizCard 的 AI 讲解 / 卡顿提示 / 薄弱诊断；听音通过 question.speak 自动朗读，
 * 并借 QuizCard 的 🔊 重听按钮可手动复听。答对后揭示「发音 / 例词」(hint)。
 */
import { useCallback, useState } from 'react';
import { QuizSessionRunner } from '@/components/QuizSessionRunner';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { getAllPhonicsRules } from '@/data/phonics';
import { shuffle } from '@/lib/utils';
import { sfxTap } from '@/lib/sfx';
import type { Question } from '@/types';

const allRules = getAllPhonicsRules();

export function PhonicsListen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);

  const genQuestion = useCallback((): Question | null => {
    if (!allRules.length) return null;
    const rule = allRules[Math.floor(Math.random() * allRules.length)]!;
    const others = allRules.filter((r) => r.letter !== rule.letter);
    const shuffled = shuffle(others).slice(0, 3);
    const opts = shuffle([rule, ...shuffled]);
    const correctIndex = opts.findIndex((o) => o.letter === rule.letter);
    const example = rule.examples[0] || rule.letter;
    return {
      id: `phonics-${rule.letter}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'letter',
      skill: `word:phonics:${rule.letter}`,
      difficulty: 1,
      prompt: t('phonicsListen.title'),
      speak: example,
      speakLang: 'en-US',
      hint: t('phonicsListen.soundInfo', { sound: rule.sound, example }),
      options: opts.map((o, i) => ({ id: `opt-${i}`, label: o.letter })),
      answerId: `opt-${correctIndex}`,
    };
  }, [t]);

  if (!started) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-8 text-center">
        <h1 className="text-3xl font-extrabold text-ink">{t('phonicsListen.title')}</h1>
        <p className="text-ink-soft">{t('phonicsListen.subtitle')}</p>
        <CandyButton tone="purple" size="lg" onClick={() => { sfxTap(); setStarted(true); }}>
          {t('phonicsListen.start')}
        </CandyButton>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <QuizSessionRunner
        genQuestion={genQuestion}
        count={10}
        tone="purple"
        title={t('phonicsListen.title')}
        onExit={() => setStarted(false)}
      />
    </div>
  );
}
