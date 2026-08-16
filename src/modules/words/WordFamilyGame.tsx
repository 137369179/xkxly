/**
 * 词族拼读练习（Word Family Game）
 * ------------------------------------------------------------
 * 自然拼读「见词能读」的核心训练：掌握一个词族规则（如 -at /æt/），
 * 就能拼读整个词族的词（cat/bat/mat/rat）。
 * 每轮：找同族词（选择）+ 点读拼读（发音），答对计入 SRS skill word:family:<id>。
 */
import { useState, useMemo } from 'react';
import { WORD_FAMILIES, type WordFamily } from '@/data/wordFamilies';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { shuffle, sampleMany } from '@/lib/utils';
import { speak } from '@/lib/speech';

const ROUNDS = 5;

export function WordFamilyGame() {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [fam, setFam] = useState<WordFamily | null>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  // 派生当前目标词
  const target = useMemo(() => {
    if (!fam || fam.words.length === 0) return '';
    return fam.words[round % fam.words.length]!;
  }, [fam, round]);

  // 生成当前轮：目标词 + 3 个异族干扰词
  const options = useMemo(() => {
    if (!fam || !target) return [];
    const others = sampleMany(
      WORD_FAMILIES.filter((f) => f.id !== fam.id).flatMap((f) => f.words),
      3,
    );
    return shuffle([target, ...others]);
  }, [fam, target]);

  const pick = (w: string) => {
    if (chosen) return;
    setChosen(w);
    const correct = w === target;
    if (correct) {
      sfxCorrect();
      celebrateSmall();
      setScore((s) => s + 1);
      practice(`word:family:${fam!.id}`, true, 1);
    } else {
      sfxWrong();
      practice(`word:family:${fam!.id}`, false, 0);
    }
  };

  const next = () => {
    sfxTap();
    if (round + 1 >= ROUNDS) {
      setDone(true);
      sfxStar();
      celebrateBig();
    } else {
      setRound((r) => r + 1);
      setChosen(null);
    }
  };

  const start = (f: WordFamily) => {
    sfxTap();
    setFam(f);
    setRound(0);
    setScore(0);
    setDone(false);
    setChosen(null);
  };

  // 结果页
  if (done && fam) {
    const stars = score === ROUNDS ? 3 : score >= Math.ceil(ROUNDS * 0.7) ? 2 : 1;
    return (
      <Panel className="text-center">
        <div className="text-6xl">{stars === 3 ? '🏆' : '🎉'}</div>
        <p className="mt-3 text-xl font-extrabold text-ink">{t('words.wordFamily.doneTitle')}</p>
        <p className="mt-1 text-base font-bold text-ink-soft">
          {t('words.wordFamily.doneDesc', { ok: String(score), total: String(ROUNDS), stars: '⭐'.repeat(stars) })}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <CandyButton tone="blue" size="sm" onClick={() => { setFam(null); setDone(false); }}>
            {t('words.wordFamily.back')}
          </CandyButton>
          <CandyButton tone="green" size="sm" onClick={() => start(fam)}>
            {t('words.wordFamily.again')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  // 练习页
  if (fam) {
    return (
      <div className="space-y-4">
        <PageHeader emoji={fam.emoji} title={`${fam.pattern} 家族`} subtitle={`${fam.sound} · ${fam.desc}`} tone="purple" />
        <ProgressBar value={round + 1} max={ROUNDS} tone="purple" />
        <Panel className="space-y-4 text-center">
          <div>
            <span className="inline-block rounded-full bg-candy-purple-soft px-4 py-1 text-sm font-extrabold text-candy-purple-deep">
              {t('words.wordFamily.hint', { pattern: fam.pattern, sound: fam.sound })}
            </span>
            <p className="mt-2 text-base font-bold text-ink">{t('words.wordFamily.question', { target })}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {options.map((w) => {
              const isChosen = chosen === w;
              const isRight = isChosen && w === target;
              const showAnswer = chosen && w === target;
              return (
                <CandyButton
                  key={w}
                  tone={isRight ? 'green' : isChosen ? 'orange' : showAnswer ? 'green' : 'purple'}
                  variant={isChosen || showAnswer ? 'solid' : 'soft'}
                  size="lg"
                  onClick={() => pick(w)}
                  disabled={!!chosen}
                >
                  <span className="text-xl font-black">{w}</span>
                </CandyButton>
              );
            })}
          </div>
          {chosen && (
            <div className="space-y-2">
              <p className={`text-sm font-bold ${chosen === target ? 'text-candy-green-deep' : 'text-candy-orange-deep'}`}>
                {chosen === target ? `✅ ${t('words.wordFamily.correct')}` : `❌ ${t('words.wordFamily.wrong', { target })}`}
              </p>
              <CandyButton tone="blue" variant="soft" size="sm" onClick={() => speak(target, { lang: 'en-US', rate: 0.7 })}>
                🔊 {t('words.wordFamily.listenWord')}
              </CandyButton>
              <CandyButton tone="green" size="md" fullWidth onClick={next}>
                {round + 1 >= ROUNDS ? t('words.wordFamily.result') : t('words.wordFamily.next')}
              </CandyButton>
            </div>
          )}
        </Panel>
      </div>
    );
  }

  // 词族选择页
  return (
    <div className="space-y-4">
      <PageHeader emoji="🔗" title={t('words.wordFamily.title')} subtitle={t('words.wordFamily.subtitle')} tone="purple" />
      <div className="flex gap-2">
        {[1, 2, 3].map((l) => (
          <CandyButton
            key={l}
            tone={level === l ? 'purple' : 'blue'}
            variant={level === l ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { sfxTap(); setLevel(l as 1 | 2 | 3); }}
          >
            {l === 1 ? t('words.wordFamily.lv1') : l === 2 ? t('words.wordFamily.lv2') : t('words.wordFamily.lv3')}
          </CandyButton>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {WORD_FAMILIES.filter((f) => f.level === level).map((f) => (
          <button
            key={f.id}
            onClick={() => start(f)}
            className="rounded-2xl border-4 border-candy-purple-soft bg-white p-3 text-center transition-all hover:bg-candy-purple-soft active:translate-y-[2px]"
          >
            <div className="text-3xl">{f.emoji}</div>
            <div className="mt-1 text-lg font-black text-ink">{f.pattern}</div>
            <div className="text-xs font-bold text-ink-soft">{f.sound}</div>
            <div className="mt-1 text-[10px] font-bold text-candy-purple-deep">{f.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
