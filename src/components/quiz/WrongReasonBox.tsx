/**
 * 错题引导面板（从 QuizCard 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：答错后展示「单题错因」（wrongReason）+「跨题薄弱诊断」（skillDiag）。
 */
import { motion } from 'motion/react';
import type { Question } from '@/types';
import { wrongReason } from '@/lib/questions/wrongReason';
import { WEAKNESS_LABEL } from '@/lib/ai/smart-practice';
import type { ErrorAnalysis } from '@/lib/ai/smart-practice';

export interface WrongReasonBoxProps {
  question: Question;
  options: Array<{ id: string; label?: string; emoji?: string }>;
  wrongIds: string[];
  solved: boolean;
  skillDiag: ErrorAnalysis | null;
}

export function WrongReasonBox({ question, options, wrongIds, solved, skillDiag }: WrongReasonBoxProps) {
  if (wrongIds.length === 0 || solved) return null;

  // M4 智能错因：答错后展示具体为什么错
  const lastWrongOpt = options.find((o) => o.id === wrongIds[wrongIds.length - 1]);
  const reason = lastWrongOpt ? wrongReason(question, lastWrongOpt.label ?? lastWrongOpt.emoji ?? '') : null;

  return (
    <>
      {reason && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-2xl bg-candy-orange-soft/60 px-4 py-2.5 text-sm font-bold text-candy-orange-deep"
        >
          💭 <span className="text-ink">{reason}</span>
        </motion.div>
      )}

      {/* 智能复习小贴士：基于该技能累计掌握度的跨题薄弱诊断（区别于单题错因 wrongReason） */}
      {skillDiag && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-2xl bg-candy-pink-soft px-4 py-2.5 text-sm font-bold text-candy-purple-deep"
        >
          🧠 小茜发现：你在这类题上{WEAKNESS_LABEL[skillDiag.weaknessType]}，试试{skillDiag.recommendedActions[0]}
        </motion.div>
      )}
    </>
  );
}

