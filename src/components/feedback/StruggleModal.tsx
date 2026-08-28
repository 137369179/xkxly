/**
 * 学习困难干预弹窗
 * ------------------------------------------------------------
 * 当 useStruggle 检测到连错达到阈值时弹出，提供两个选项：
 *   - 继续加油：重置连错计数，让孩子重新尝试当前题
 *   - 跳过这题：直接进入下一题，避免卡死打击积极性
 *
 * 话语来自 pickStruggleMessage()，比单题答错的鼓励语更温和、更具引导性。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { pickStruggleMessage } from '@/lib/struggle';
import { speak } from '@/lib/speech';

export interface StruggleModalProps {
  /** 是否显示 */
  open: boolean;
  /** 连续答错次数（用于展示） */
  wrongStreak: number;
  /** 选择「继续加油」：重置连错计数，留在当前题 */
  onContinue: () => void;
  /** 选择「跳过这题」：进入下一题并重置连错计数 */
  onSkip: () => void;
}

export function StruggleModal({ open, wrongStreak: _wrongStreak, onContinue, onSkip }: StruggleModalProps) {
  const { t } = useTranslation();
  // 弹窗打开时锁定一条话语，避免重渲染时换文案；同时语音朗读
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (open) {
      const msg = pickStruggleMessage();
      setMessage(msg);
      void speak(msg, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onContinue} className="max-w-sm text-center" dismissable={false}>
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <div className="text-6xl">🤗</div>
        <h3 className="mt-3 text-2xl font-extrabold text-candy-purple-deep">
          {t('struggleModal.restTitle')}
        </h3>
        <p className="mt-2 text-base font-bold text-ink-soft leading-relaxed">
          {message}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <CandyButton tone="green" size="md" fullWidth onClick={onContinue}>
            {t('struggleModal.continueBtn')}
          </CandyButton>
          <CandyButton tone="orange" variant="soft" size="md" fullWidth onClick={onSkip}>
            {t('struggleModal.skipBtn')}
          </CandyButton>
        </div>
      </motion.div>
    </Modal>
  );
}
