/**
 * 听力辨音训练 👂 (N6)
 * Phonics 听音选字母/组合，锻炼英语语音辨识能力
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { getAllPhonicsRules } from '@/data/phonics';
import { speak, stopSpeaking } from '@/lib/speech';
import { shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface Question {
  rule: { letter: string; sound: string; examples: string[] };
  options: string[];
  correctIndex: number;
}

const allRules = getAllPhonicsRules();

function generateQ(): Question {
  const rule = allRules[Math.floor(Math.random() * allRules.length)]!
  const others = allRules.filter(r => r.letter !== rule.letter);
  const shuffled = shuffle(others).slice(0, 3);
  const opts = shuffle([rule, ...shuffled]);
  return {
    rule,
    options: opts.map(o => o.letter),
    correctIndex: opts.findIndex(o => o.letter === rule.letter),
  };
}

export function PhonicsListen() {
  const { t } = useTranslation();
  const [q, setQ] = useState<Question>(generateQ);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [showSound, setShowSound] = useState(false);
  const lockRef = useRef(false);

  // 卸载时停止朗读，避免离开页面后仍在播放
  useEffect(() => () => stopSpeaking(), []);

  const speakPhonics = () => {
    if (!q) return;
    setShowSound(true);
    // 核心加强 T：统一走 speech.ts，享受多音字纠音、用户偏好、模块微调、引擎降级
    // 原 window.speechSynthesis.speak 绕过统一入口，无法跟随家长设置
    const example = q.rule.examples[0] || q.rule.letter;
    void speak(example, { lang: 'en-US', rate: 0.7, module: 'letter' });
  };

  const handlePick = (index: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    if (index === q.correctIndex) {
      sfxCorrect();
      setFeedback('correct');
      setScore(s => s + 1);
    } else {
      sfxWrong();
      setFeedback('wrong');
    }
    setRound(r => r + 1);
    setTimeout(() => {
      setFeedback('');
      setShowSound(false);
      setQ(generateQ());
      lockRef.current = false;
    }, 1200);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('phonicsListen.title')}</h3>
      <p className="mb-4 text-center text-xs font-bold text-ink-soft">
        {t('phonicsListen.subtitle')}
      </p>

      {/* 发音区 */}
      <div className="mb-6 text-center">
        <button
          onClick={speakPhonics}
          className="mx-auto flex items-center gap-2 rounded-2xl bg-candy-purple-soft px-6 py-4 text-2xl font-extrabold text-candy-purple-deep shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          {t('phonicsListen.listenBtn')}
        </button>
        <AnimatePresence>
          {showSound && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2"
            >
              <span className="inline-block rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                {t('phonicsListen.soundInfo', { sound: q.rule.sound, example: q.rule.examples[0] || q.rule.letter })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 选项 */}
      <div className="grid grid-cols-2 gap-3">
        {q.options.map((letter, i) => (
          <CandyButton
            key={`${letter}-${round}`}
            tone={
              feedback === 'correct' && i === q.correctIndex ? 'green' :
              feedback === 'wrong' && i === q.correctIndex ? 'green' :
              'purple'
            }
            size="lg"
            onClick={() => handlePick(i)}
          >
            {letter}
          </CandyButton>
        ))}
      </div>

      {/* 反馈 */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center"
          >
            {feedback === 'correct' ? (
              <span className="inline-block rounded-xl bg-candy-green-soft px-4 py-2 text-sm font-extrabold text-candy-green-deep">
                {t('phonicsListen.correctFeedback', { sound: q.rule.sound })}
              </span>
            ) : (
              <span className="inline-block rounded-xl bg-candy-pink-soft px-4 py-2 text-sm font-extrabold text-candy-pink-deep">
                {t('phonicsListen.wrongFeedback', { answer: q.options[q.correctIndex] ?? '', sound: q.rule.sound })}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 text-center text-xs font-bold text-ink-soft">
        {t('phonicsListen.progress', { round: round + 1, score })}
      </div>
    </div>
  );
}
