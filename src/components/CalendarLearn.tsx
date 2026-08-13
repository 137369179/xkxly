/**
 * 日历认知 📅 (S4)
 * 看日期找星期、月份认知
 */
import { memo, useState, useRef, useEffect } from 'react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const MONTHS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const WEEKDAYS = ['日','一','二','三','四','五','六'];
const MONTH_EMOJI = ['❄️','🌸','🌱','🌷','☀️','🌈','🏖️','🌾','🍂','🎃','🦃','🎄'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function CalendarLearnImpl() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'view' | 'quiz'>('view');
  const [year] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [quizDay, setQuizDay] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // P3: 卸载时清理待触发的反馈定时器，避免对已卸载组件 setState
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const days = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const startQuiz = () => {
    setQuizDay(Math.floor(Math.random() * days) + 1);
    setFeedback('');
  };

  const clickDay = (day: number) => {
    if (mode === 'view') {
      const date = new Date(year, month, day);
      const weekday = WEEKDAYS[date.getDay()]!
      void speak(`${month + 1}月${day}日，星期${weekday}`, { lang: 'zh-CN', rate: 0.8, module: 'ai' });
      return;
    }
    // quiz mode: find weekday
    sfxTap();
    const date = new Date(year, month, day);
    const correctWeekday = date.getDay();
    if (day === quizDay) {
      sfxCorrect(); setScore(s => s + 1);
      setFeedback(`✅ ${t('calendarLearn.correct', { month: month + 1, day, weekday: WEEKDAYS[correctWeekday]! })}`);
      void speak(`对了！`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { timerRef.current = null; startQuiz(); setFeedback(''); }, 1500);
    } else {
      sfxWrong(); setFeedback(t('calendarLearn.wrong'));
    }
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">📅 {t('calendarLearn.title')}</h3>

      <div className="mb-3 flex justify-center gap-2">
        <button onClick={()=>setMode('view')} className={cn('rounded-xl px-4 py-1.5 text-sm font-extrabold', mode==='view'?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm')}>📖 {t('calendarLearn.viewMode')}</button>
        <button onClick={()=>{setMode('quiz');startQuiz();}} className={cn('rounded-xl px-4 py-1.5 text-sm font-extrabold', mode==='quiz'?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm')}>🎯 {t('calendarLearn.quizMode')}</button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={()=>setMonth(m => (m - 1 + 12) % 12)}
          aria-label={t('calendarLearn.prevMonth')}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white px-3 text-lg font-extrabold shadow-sm transition active:translate-y-[2px]"
        >◀️</button>
        <span className="text-lg font-extrabold text-ink">{MONTH_EMOJI[month]} {t('calendarLearn.yearMonth', { year, month: MONTHS[month]! })}</span>
        <button
          onClick={()=>setMonth(m => (m + 1) % 12)}
          aria-label={t('calendarLearn.nextMonth')}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white px-3 text-lg font-extrabold shadow-sm transition active:translate-y-[2px]"
        >▶️</button>
      </div>

      {mode === 'quiz' && (
        <div className="mb-3 rounded-xl bg-candy-orange-soft/30 p-2 text-center">
          <p className="text-sm font-extrabold text-candy-orange-deep">🎯 {t('calendarLearn.findDay', { month: month + 1, day: quizDay })}</p>
        </div>
      )}

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-xs font-extrabold text-ink-soft">{t('calendarLearn.weekday', { day: w })}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <button key={`day-${i}`} onClick={() => day && clickDay(day)} disabled={!day}
            className={cn('aspect-square rounded-lg text-sm font-extrabold transition-all',
              !day ? 'bg-transparent' :
              isCurrentMonth && day === today.getDate() ? 'bg-candy-pink-deep text-white ring-2 ring-candy-pink-deep' :
              mode === 'quiz' && day === quizDay ? 'bg-candy-orange-soft ring-2 ring-candy-orange-deep' :
              'bg-white hover:bg-candy-blue-soft/30 shadow-sm'
            )}>
            {day || ''}
          </button>
        ))}
      </div>

      {feedback && <p className="mt-2 text-center text-sm font-extrabold text-ink-soft">{feedback}</p>}
      {mode === 'quiz' && <p className="mt-1 text-center text-xs font-bold text-ink-soft">{t('calendarLearn.score', { score })}</p>}
    </div>
  );
}

export const CalendarLearn = memo(CalendarLearnImpl);
