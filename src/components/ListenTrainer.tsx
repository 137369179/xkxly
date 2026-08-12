import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { speak, stopSpeaking } from '@/lib/speech';
import { celebrateSmall } from '@/lib/celebrate';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 听力训练
 * 播放一段声音（数字/字母/词语/句子），孩子选正确的选项
 */

type ListenType = 'number' | 'letter' | 'word' | 'sentence';

const LISTEN_TYPES: { id: ListenType; label: string; emoji: string }[] = [
  { id: 'number', label: '听数字', emoji: '🔢' },
  { id: 'letter', label: '听字母', emoji: '🔤' },
  { id: 'word', label: '听词语', emoji: '📝' },
  { id: 'sentence', label: '听句子', emoji: '🗣️' },
];

const NUMBER_POOL = [1, 3, 5, 7, 8, 12, 15, 20, 25, 30, 50, 99, 100];
const LETTER_POOL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
const WORD_POOL = [
  { word: '苹果', emoji: '🍎' }, { word: '香蕉', emoji: '🍌' }, { word: '小狗', emoji: '🐶' },
  { word: '小猫', emoji: '🐱' }, { word: '太阳', emoji: '☀️' }, { word: '月亮', emoji: '🌙' },
  { word: '大树', emoji: '🌳' }, { word: '花朵', emoji: '🌸' }, { word: '汽车', emoji: '🚗' },
  { word: '飞机', emoji: '✈️' }, { word: '书本', emoji: '📚' }, { word: '雨伞', emoji: '☂️' },
];
const SENTENCE_POOL = [
  '小猫在院子里玩球',
  '太阳从东边升起来了',
  '我喜欢吃红红的苹果',
  '小鱼在水里游来游去',
  '今天天气真好呀',
  '妈妈给我讲故事',
  '小鸟在树上唱歌',
  '哥哥在踢足球',
];

interface ListenQuestion {
  type: ListenType;
  spoken: string;
  options: { id: string; label: string }[];
  answerId: string;
}

function makeQuestion(type: ListenType): ListenQuestion {
  if (type === 'number') {
    const nums = shuffle(NUMBER_POOL).slice(0, 4);
    const answer = nums[Math.floor(Math.random() * nums.length)]!
    return {
      type,
      spoken: String(answer),
      options: nums.map(n => ({ id: String(n), label: String(n) })),
      answerId: String(answer),
    };
  }
  if (type === 'letter') {
    const letters = shuffle(LETTER_POOL).slice(0, 4);
    const answer = letters[Math.floor(Math.random() * letters.length)]!
    return {
      type,
      spoken: answer,
      options: letters.map(l => ({ id: l, label: l })),
      answerId: answer,
    };
  }
  if (type === 'word') {
    const words = shuffle(WORD_POOL).slice(0, 4);
    const answer = words[Math.floor(Math.random() * words.length)]!
    return {
      type,
      spoken: answer.word,
      options: words.map((w, i) => ({ id: String(i), label: `${w.emoji} ${w.word}` })),
      answerId: String(words.indexOf(answer)),
    };
  }
  // sentence
  const sentences = shuffle(SENTENCE_POOL).slice(0, 3);
  const answer = sentences[Math.floor(Math.random() * sentences.length)]!
  return {
    type,
    spoken: answer,
    options: sentences.map((s, i) => ({ id: String(i), label: s.length > 10 ? s.slice(0, 10) + '…' : s })),
    answerId: String(sentences.indexOf(answer)),
  };
}

export function ListenTrainer() {
  const { t } = useTranslation();
  const [type, setType] = useState<ListenType>('number');
  const [question, setQuestion] = useState<ListenQuestion | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [, setPlaying] = useState(false);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    const q = makeQuestion(type);
    setQuestion(q);
    setChosen(null);
    setShowResult(false);
    setRound(r => r + 1);
    setPlaying(true);
    // 延迟播放，等 UI 渲染
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      speak(q.spoken, { lang: q.type === 'letter' ? 'en-US' : 'zh-CN', rate: 0.8 });
    }, 300);
  }, [type]);

  const replay = useCallback(() => {
    if (question) {
      speak(question.spoken, { lang: question.type === 'letter' ? 'en-US' : 'zh-CN', rate: 0.8 });
    }
  }, [question]);

  const answer = useCallback((optId: string) => {
    if (chosen || !question) return;
    setChosen(optId);
    setShowResult(true);
    const correct = optId === question.answerId;
    if (correct) {
      sfxCorrect();
      celebrateSmall();
      setScore(s => s + 1);
    } else {
      sfxWrong();
    }
  }, [chosen, question]);

  const next = useCallback(() => {
    setChosen(null);
    setShowResult(false);
    const q = makeQuestion(type);
    setQuestion(q);
    setRound(r => r + 1);
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      speak(q.spoken, { lang: q.type === 'letter' ? 'en-US' : 'zh-CN', rate: 0.8 });
    }, 300);
  }, [type]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    };
  }, []);

  return (
    <Panel>
      <PanelTitle emoji="👂" title={t('listen.title')} subtitle={t('listen.subtitle')} tone="blue" />

      {/* 类型选择 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {LISTEN_TYPES.map(tp => (
          <CandyButton
            key={tp.id}
            tone={type === tp.id ? 'blue' : 'purple'}
            variant={type === tp.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { setType(tp.id); setScore(0); setRound(0); setQuestion(null); }}
          >
            {tp.emoji} {t(`listen.${tp.id}`)}
          </CandyButton>
        ))}
      </div>

      {/* 得分 */}
      {round > 0 && (
        <div className="mb-2 text-center text-sm font-bold text-ink-soft">
          {t('listen.progress', { round, score })}
        </div>
      )}

      {/* 开始按钮 */}
      {!question && (
        <div className="text-center">
          <CandyButton tone="blue" size="lg" onClick={start}>
            {t('listen.start')}
          </CandyButton>
        </div>
      )}

      {/* 题目区 */}
      {question && (
        <div className="space-y-3">
          {/* 播放按钮 */}
          <div className="flex items-center justify-center gap-3">
            <button aria-label="🔊"
              onClick={replay}
              className="grid h-16 w-16 place-items-center rounded-full bg-candy-blue-main text-3xl text-white active:scale-95"
            >
              🔊
            </button>
            <span className="text-sm font-bold text-ink-soft">{t('listen.replay')}</span>
          </div>

          {/* 选项 */}
          <div className={cn('grid gap-2', question.options.length === 3 ? 'grid-cols-1' : 'grid-cols-2')}>
            {question.options.map(opt => {
              const isCorrect = opt.id === question.answerId;
              const isChosen = opt.id === chosen;
              let style = 'bg-white';
              if (showResult) {
                if (isCorrect) style = 'bg-candy-green-soft ring-2 ring-candy-green-main';
                else if (isChosen) style = 'bg-candy-orange-soft ring-2 ring-candy-orange-main opacity-60';
              } else if (isChosen) {
                style = 'bg-candy-blue-soft ring-2 ring-candy-blue-main';
              }
              return (
                <button
                  key={opt.id}
                  disabled={!!chosen}
                  onClick={() => answer(opt.id)}
                  className={cn('rounded-2xl p-3 text-center text-lg font-bold transition', style)}
                >
                  {opt.label}
                  {showResult && isCorrect && ' ✅'}
                  {showResult && isChosen && !isCorrect && ' ❌'}
                </button>
              );
            })}
          </div>

          {/* 下一题 */}
          <AnimatePresence>
            {showResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CandyButton tone="blue" size="lg" fullWidth onClick={next}>
                  {t('common.nextQuestion')}
                </CandyButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Panel>
  );
}
