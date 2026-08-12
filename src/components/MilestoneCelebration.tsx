/**
 * 里程碑庆祝弹窗 + 首页进度条（M5）
 * ------------------------------------------------------------
 * 由首页 checkIn 之后自动检查，弹出庆祝 Modal + confetti。
 * 按优先级只展示一个（避免连续弹窗），未展示的在下次打开首页时继续。
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProgress } from '@/store/useStore';
import { checkMilestones, ackMilestone, achievedCount, milestoneCount, type Milestone } from '@/lib/milestone';
import { celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';

export function MilestoneCelebration() {
  const p = useProgress();
  const [queue, setQueue] = useState<Milestone[]>([]);
  const hasFiredRef = useRef(false);

  // 每次 progress 变化时扫描未庆祝里程碑
  useEffect(() => {
    const ms = checkMilestones(p);
    if (ms.length > 0) setQueue(ms);
  }, [p.stars, p.streak, p.mastery]);

  // 第一次触发时放 confetti + 语音
  useEffect(() => {
    if (queue.length > 0 && !hasFiredRef.current) {
      hasFiredRef.current = true;
      celebrateBig();
      const m = queue[0]!!
      void speak(`🎉 ${m.title}！${m.subtitle}`, { rate: 0.85, module: 'praise' });
    }
  }, [queue]);

  const current = queue[0]!!
  const handleClose = () => {
    if (!current) return;
    ackMilestone(current.id);
    setQueue((q) => q.slice(1));
    hasFiredRef.current = false;
  };

  const achieved = achievedCount(p);
  const total = milestoneCount();
  const pct = Math.round((achieved / total) * 100);

  return (
    <>
      {/* 首页进度条（静默展示，不抢注意力） */}
      <div className="card-candy p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink-soft">🏅 里程碑进度</span>
          <span className="text-xs font-bold text-candy-purple-deep">
            {achieved} / {total}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-candy-purple-soft">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-candy-pink-deep to-candy-purple-deep"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-1.5 text-xs font-semibold text-ink-soft">
          {achieved === 0
            ? '每天学习，解锁更多里程碑吧～'
            : `已完成 ${pct}%，继续加油！`}
        </p>
      </div>

      {/* 庆祝弹窗 */}
      <AnimatePresence>
        {current && (
          <Modal
            open
            onClose={handleClose}
            className="max-w-sm text-center"
            dismissable
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              <div className="text-7xl">{current.icon}</div>
              <div className="mt-3 inline-block rounded-full bg-amber-400 px-4 py-1 text-xs font-black text-amber-950 shadow-sm">
                🎊 里程碑达成！
              </div>
              <h2 className="mt-3 text-2xl font-extrabold text-rainbow">{current.title}</h2>
              <p className="mt-2 text-base font-bold text-ink-soft">{current.subtitle}</p>
              <div className="mt-6">
                <CandyButton tone="green" size="lg" fullWidth onClick={handleClose}>
                  太棒啦！继续学习 🚀
                </CandyButton>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
