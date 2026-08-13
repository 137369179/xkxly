/**
 * 用眼与时长守护 —— 挂在 App 根部的全局提醒层
 * ------------------------------------------------------------------
 * 只在真正需要打断时才出现，其余时间完全不占位、不渲染任何 DOM。
 * 文案面向 5 岁孩子：不说"超时违规"，说"眼睛累啦，我们看看远处"。
 */
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';
import { useStudyClock } from '@/store/studyClock';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';

export function StudyGuard() {
  const { t } = useTranslation();
  const { todaySec, overLimit, needBreak, snooze, takeBreak } = useStudyClock();

  const show = overLimit || needBreak;
  // 时长上限优先级高于护眼提醒
  const kind: 'limit' | 'break' = overLimit ? 'limit' : 'break';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={kind}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-[#2A2340]/55 px-5 backdrop-blur-sm"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 14 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full max-w-sm rounded-[1.8rem] bg-white p-6 text-center shadow-2xl"
          >
            <div className="text-6xl">{kind === 'limit' ? '🌙' : '👀'}</div>
            <h2 className="mt-3 text-2xl font-extrabold text-ink">
              {kind === 'limit' ? t('studyGuard.limitTitle') : t('studyGuard.breakTitle')}
            </h2>
            <p className="mt-2 text-base font-medium leading-relaxed text-ink-soft">
              {kind === 'limit'
                ? t('studyGuard.limitBody', { minutes: Math.round(todaySec / 60) })
                : t('studyGuard.breakBody')}
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <CandyButton
                tone="green"
                onClick={() => {
                  sfxTap();
                  if (kind === 'limit') snooze();
                  else takeBreak();
                }}
              >
                {kind === 'limit' ? t('studyGuard.limitBtn') : t('studyGuard.breakBtn')}
              </CandyButton>
              {kind === 'break' && (
                <p className="text-xs font-bold text-ink-soft/80">
                  {t('studyGuard.settingsHint')}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
