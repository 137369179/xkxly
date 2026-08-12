/**
 * 亲子同屏双人竞技场 ⚔️ (F4)
 * ------------------------------------------------------------
 * 支持 iPad / 触屏上二人同屏（上方：家长，下方：孩子），
 * 实时进行 🧮 数学速算 / 🔤 英语单词 / 🦖 常识百科 抢答竞技！
 */

import { useState, useRef } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';

interface PKQuestion {
  title: string;
  options: string[];
  answer: number;
}

const MATH_PK: PKQuestion[] = [
  { title: '5 + 3 = ?', options: ['7', '8', '9'], answer: 1 },
  { title: '8 - 2 = ?', options: ['5', '6', '7'], answer: 1 },
  { title: '4 + 6 = ?', options: ['10', '9', '11'], answer: 0 },
  { title: '7 + 4 = ?', options: ['10', '11', '12'], answer: 1 },
  { title: '9 - 5 = ?', options: ['3', '4', '5'], answer: 1 },
];

const ENG_PK: PKQuestion[] = [
  { title: 'engPK.cat', options: ['Dog', 'Cat', 'Pig'], answer: 1 },
  { title: 'engPK.sun', options: ['Sun', 'Moon', 'Star'], answer: 0 },
  { title: 'engPK.apple', options: ['Banana', 'Apple', 'Orange'], answer: 1 },
  { title: 'engPK.bus', options: ['Car', 'Bus', 'Bike'], answer: 1 },
  { title: 'engPK.panda', options: ['Tiger', 'Lion', 'Panda'], answer: 2 },
];

const SCIENCE_PK: PKQuestion[] = [
  { title: 'sciencePK.dino', options: ['sciencePK.yes', 'sciencePK.no', 'sciencePK.unsure'], answer: 0 },
  { title: 'sciencePK.bigPlanet', options: ['sciencePK.earth', 'sciencePK.jupiter', 'sciencePK.mars'], answer: 1 },
  { title: 'sciencePK.rainbow', options: ['sciencePK.5colors', 'sciencePK.6colors', 'sciencePK.7colors'], answer: 2 },
  { title: 'sciencePK.kangaroo', options: ['sciencePK.snacks', 'sciencePK.baby', 'sciencePK.toys'], answer: 1 },
  { title: 'sciencePK.penguinHome', options: ['sciencePK.arctic', 'sciencePK.antarctica', 'sciencePK.equator'], answer: 1 },
];

export function ParentChildPK() {
  const { t } = useTranslation();
  const [subject, setSubject] = useState<'math' | 'eng' | 'science'>('math');
  const [qIdx, setQIdx] = useState(0);
  const [p1Score, setP1Score] = useState(0); // 家长
  const [p2Score, setP2Score] = useState(0); // 宝贝
  const [winner, setWinner] = useState<string | null>(null);
  const lockRef = useRef(false);
  const { practice, tickTime } = useStore();

  const questions = subject === 'math' ? MATH_PK : subject === 'eng' ? ENG_PK : SCIENCE_PK;
  const q = questions[qIdx % questions.length]!

  const handlePick = (player: 'p1' | 'p2', optionIdx: number) => {
    if (lockRef.current || winner) return;
    lockRef.current = true;

    if (optionIdx === q.answer) {
      sfxCorrect();
      practice(`fun:pk-${subject}`, true, 2, 2);
      tickTime(5);
      if (player === 'p1') setP1Score(s => s + 1);
      else setP2Score(s => s + 1);

      if (p1Score + (player === 'p1' ? 1 : 0) >= 5) {
        setWinner('👨‍👩‍👧 家长获胜！真厉害！');
        speak(t('fun.parentPk.parentWinSpeak'), { lang: 'zh-CN' });
      } else if (p2Score + (player === 'p2' ? 1 : 0) >= 5) {
        setWinner(t('fun.parentPk.childWin'));
        speak(t('fun.parentPk.childWinSpeak'), { lang: 'zh-CN' });
      } else {
        setTimeout(() => {
          setQIdx(i => i + 1);
          lockRef.current = false;
        }, 800);
      }
    } else {
      sfxWrong();
      practice(`fun:pk-${subject}`, false, 0, 2);
      setTimeout(() => {
        lockRef.current = false;
      }, 500);
    }
  };

  const handleReset = () => {
    sfxTap();
    setQIdx(0);
    setP1Score(0);
    setP2Score(0);
    setWinner(null);
    lockRef.current = false;
  };

  return (
    <div className="card-candy space-y-4 p-5 text-center">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-800">
          {t('fun.parentPk.title')} ({t('fun.parentPk.subtitle')})
        </span>
        
        {/* 学科选择 */}
        <div className="flex gap-1.5">
          <button aria-label={t('fun.parentPk.math')}
            onClick={() => { setSubject('math'); handleReset(); }}
            className={`rounded-xl px-2.5 py-1 text-xs font-black transition-all ${subject === 'math' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t('fun.parentPk.math')}
          </button>
          <button aria-label={t('fun.parentPk.eng')}
            onClick={() => { setSubject('eng'); handleReset(); }}
            className={`rounded-xl px-2.5 py-1 text-xs font-black transition-all ${subject === 'eng' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t('fun.parentPk.eng')}
          </button>
          <button aria-label={t('fun.parentPk.science')}
            onClick={() => { setSubject('science'); handleReset(); }}
            className={`rounded-xl px-2.5 py-1 text-xs font-black transition-all ${subject === 'science' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t('fun.parentPk.science')}
          </button>
        </div>
      </div>

      {!winner ? (
        <div className="space-y-4">
          {/* 上半屏：家长 Player 1 (颠倒方向以便对面坐) */}
          <div className="rotate-180 rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-emerald-800">
              <span>👨‍👩‍👧 家长 (得分: {p1Score})</span>
              <span>{t('fun.parentPk.question', { title: q.title })}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {q.options.map((opt, i) => (
                <button
                  key={`opt-${i}`}
                  onClick={() => handlePick('p1', i)}
                  className="rounded-2xl border-2 border-emerald-200 bg-white p-3 text-base font-black text-emerald-900 shadow-sm active:scale-95 transition-transform"
                >
                  {opt.startsWith('sciencePK.') ? t(opt) : opt}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-extrabold text-ink-soft">
            {t('fun.parentPk.countdown')}
          </div>

          {/* 下半屏：宝贝 Player 2 */}
          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-amber-800">
              <span>🌟 {t('fun.parentPk.child')} ({t('fun.parentPk.parentScore', { score: p2Score })})</span>
              <span>{t('fun.parentPk.question', { title: q.title })}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {q.options.map((opt, i) => (
                <button
                  key={`opt-${i}`}
                  onClick={() => handlePick('p2', i)}
                  className="rounded-2xl border-2 border-amber-200 bg-white p-3 text-base font-black text-amber-900 shadow-sm active:scale-95 transition-transform"
                >
                  {opt.startsWith('sciencePK.') ? t(opt) : opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border-4 border-pink-300 bg-pink-50 p-6 text-center shadow-fluffy">
          <div className="text-6xl animate-bounce">🏆</div>
          <h2 className="mt-2 text-2xl font-black text-ink">{winner}</h2>
          <p className="mt-1 text-xs font-bold text-ink-soft">
            {t('fun.parentPk.陪伴', { p1Score, p2Score })}
          </p>
          <div className="mt-5">
            <CandyButton tone="orange" size="md" onClick={handleReset}>
              {t('fun.parentPk.playAgain')}
            </CandyButton>
          </div>
        </div>
      )}
    </div>
  );
}
