/**
 * 即时反馈气泡（无障碍 · 成长型话术载体）
 * ------------------------------------------------------------
 * 即时反馈机制（任务要求 #3）：正确给予积极强化、错误给予温和引导。
 * 话术由 feedback.answerCorrect/Wrong 统一供给（成长型、非人格表扬、禁用红叉），
 * 本组件只负责「无障碍呈现」：aria-live 让读屏软件即时播报，
 * 色彩区分对错但不依赖颜色 alone（含 emoji 与文案），尊重 reduced-motion。
 */
import { useReducedMotion } from '@/game/useReducedMotion';

interface Props {
  correct: boolean;
  /** 反馈话术（来自 feedback.answerCorrect/Wrong） */
  message: string;
  className?: string;
}

export function GentleFeedback({ correct, message, className }: Props) {
  const reduced = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'rounded-2xl px-4 py-3 text-center font-bold',
        correct ? 'bg-[#e7fbe9] text-[#1f8a3b]' : 'bg-[#fff3e0] text-[#a85b00]',
        reduced ? '' : 'transition-transform',
        className ?? '',
      ].join(' ')}
    >
      <span aria-hidden>{correct ? '🌟' : '💡'}</span> {message}
    </div>
  );
}
