/**
 * 🐇 数学口算“小兔障碍赛跑”游戏
 * 孩子答对计算题，小兔往前跨过一个障碍跃进一步，充满吸引力！
 */
import { useState } from 'react';
import { sfxTap, sfxWin, sfxWrong } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';

export function RabbitRunMath() {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [step, setStep] = useState(0);
  const [num1, setNum1] = useState(3);
  const [num2, setNum2] = useState(2);
  const [userAns, setUserAns] = useState('');
  const [msg, setMsg] = useState('');

  const targetStep = 5;
  const isWin = step >= targetStep;

  const nextQuestion = () => {
    const n1 = Math.floor(Math.random() * 8) + 1;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAns('');
    setMsg('');
  };

  const checkAnswer = () => {
    sfxTap();
    if (parseInt(userAns, 10) === num1 + num2) {
      sfxWin();
      celebrateSmall();
      const newStep = step + 1;
      setStep(newStep);
      practice('math:rabbit', true);
      setMsg(t('rabbitRunMath.correctMsg'));
      if (newStep >= targetStep) {
        celebrateBig();
      } else {
        setTimeout(nextQuestion, 1200);
      }
    } else {
      sfxWrong();
      practice('math:rabbit', false);
      setMsg(t('rabbitRunMath.tryAgain'));
    }
  };

  const resetGame = () => {
    sfxTap();
    setStep(0);
    nextQuestion();
  };

  return (
    <div className="space-y-5 rounded-3xl border-4 border-amber-200 bg-amber-50/50 p-6 shadow-fluffy">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-amber-900">{t('rabbitRunMath.title')}</h3>
          <p className="text-sm font-bold text-amber-700">{t('rabbitRunMath.subtitle')}</p>
        </div>
        <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
          {t('rabbitRunMath.progress', { step, target: targetStep })}
        </span>
      </div>

      {/* 赛跑动画赛道 */}
      <div className="relative flex h-24 items-center rounded-2xl border-2 border-amber-300 bg-white px-4 shadow-inner overflow-hidden">
        {/* 终点大草莓 */}
        <div className="absolute right-4 text-4xl animate-bounce">🍓</div>

        {/* 跑道起点到终点 */}
        <div className="flex w-full justify-between items-center px-4">
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-col items-center">
              {step === s ? (
                <div className="text-4xl animate-bounce">🐰</div>
              ) : s < step ? (
                <div className="text-2xl">✨</div>
              ) : (
                <div className="text-xl">🍄</div>
              )}
              <span className="text-[10px] font-bold text-amber-400">Step {s}</span>
            </div>
          ))}
        </div>
      </div>

      {isWin ? (
        <div className="space-y-4 text-center">
          <div className="text-6xl animate-bounce">🏆</div>
          <h4 className="text-2xl font-black text-amber-900">{t('rabbitRunMath.winMsg')}</h4>
          <CandyButton tone="orange" size="lg" onClick={resetGame}>
            {t('rabbitRunMath.resetBtn')}
          </CandyButton>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="text-4xl font-black text-amber-900">
            {num1} + {num2} = ?
          </div>

          <div className="flex justify-center gap-2">
            <input
              type="number"
              value={userAns}
              onChange={(e) => setUserAns(e.target.value)}
              placeholder="?"
              className="w-24 rounded-2xl border-4 border-amber-300 bg-white px-3 py-2 text-center text-2xl font-black text-amber-900 outline-none"
            />
            <CandyButton tone="orange" size="md" onClick={checkAnswer}>
              {t('rabbitRunMath.submit')}
            </CandyButton>
          </div>

          {msg && <p className="text-sm font-bold text-amber-800 animate-pulse">{msg}</p>}
        </div>
      )}
    </div>
  );
}
