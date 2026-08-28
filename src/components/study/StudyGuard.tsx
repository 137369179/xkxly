/**
 * 用眼与时长守护 —— 挂在 App 根部的全局提醒层
 * ------------------------------------------------------------------
 * 只在真正需要打断时才出现，其余时间完全不占位、不渲染任何 DOM。
 * 文案面向 5 岁孩子：不说"超时违规"，说"眼睛累啦，我们看看远处"。
 */
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';
import { useStudyClock } from '@/store/studyClock';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { AdultGateModal } from '@/components/parent/AdultGateModal';

export function StudyGuard() {
  const { t } = useTranslation();
  const { todaySec, overLimit, needBreak, snooze, takeBreak } = useStudyClock();
  const [showGate, setShowGate] = useState(false);
  const [relaxPhase, setRelaxPhase] = useState<'breathe' | 'lookFar'>('breathe');

  const show = overLimit || needBreak;
  // 时长上限优先级高于护眼提醒
  const kind: 'limit' | 'break' = overLimit ? 'limit' : 'break';

  // 护眼模式下每 3 秒切换一次眼保健指引
  useEffect(() => {
    if (kind !== 'break' || !show) return undefined;
    const timer = setInterval(() => {
      setRelaxPhase((p) => (p === 'breathe' ? 'lookFar' : 'breathe'));
    }, 3500);
    return () => clearInterval(timer);
  }, [kind, show]);

  const handleAction = () => {
    sfxTap();
    triggerHaptic(35);
    if (kind === 'limit') {
      // 超时延长需要家长成人门禁验证
      setShowGate(true);
    } else {
      takeBreak();
    }
  };

  const handleGateSuccess = () => {
    setShowGate(false);
    snooze();
  };

  return (
    <>
      <AdultGateModal
        isOpen={showGate}
        title="家长专属时长延时验证"
        subtitle="宝贝今日学习时长已达上限，如需延长 5 分钟，请家长完成验证："
        onSuccess={handleGateSuccess}
        onClose={() => setShowGate(false)}
      />
      <AnimatePresence>
        {show && (
          <motion.div
            key={kind}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-[#2A2340]/60 px-5 backdrop-blur-md"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl border-4 border-emerald-100"
            >
              {kind === 'limit' ? (
                <motion.div
                  animate={{ rotate: [-4, 4, -4], y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-6xl"
                >
                  🌙
                </motion.div>
              ) : (
                <div className="relative mx-auto my-2 flex h-24 w-24 items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-emerald-200/60 blur-md"
                  />
                  <motion.div
                    animate={{ scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100/90 text-4xl shadow-inner"
                  >
                    {relaxPhase === 'breathe' ? '👀' : '🌳'}
                  </motion.div>
                </div>
              )}

              <h2 className="mt-3 text-2xl font-black text-ink">
                {kind === 'limit' ? t('studyGuard.limitTitle') : t('studyGuard.breakTitle')}
              </h2>

              <p className="mt-2 text-base font-medium leading-relaxed text-ink-soft">
                {kind === 'limit'
                  ? t('studyGuard.limitBody', { minutes: Math.round(todaySec / 60) })
                  : t('studyGuard.breakBody')}
              </p>

              {kind === 'break' && (
                <div className="my-3 rounded-2xl bg-emerald-50/80 p-3 border border-emerald-200/60 text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                  <span>🍃</span>
                  <span>
                    {relaxPhase === 'breathe'
                      ? '跟着圆圈深呼吸，眨一眨明亮的大眼睛～'
                      : '望向窗外 6 米外的远方绿植，放松眼肌～'}
                  </span>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                <CandyButton
                  tone="green"
                  onClick={handleAction}
                  className="w-full text-base font-black py-3 rounded-2xl shadow-candy-sm"
                >
                  {kind === 'limit' ? t('studyGuard.limitBtn') : '🌿 我休息好啦，继续学习'}
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
    </>
  );
}
