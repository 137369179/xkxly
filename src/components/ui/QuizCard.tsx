import { useState, useCallback } from "react";
import { AccessibleButton } from './AccessibleButton';
import { ProgressBar } from './ProgressBar';
import { StarRating } from './StarRating';
import { useTranslation } from '@/i18n/useTranslation';

export interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
  isCorrect?: boolean; // 用于显示正确答案（可选）
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  difficulty?: number; // 1-5 星级难度
  explanation?: string; // 答案解析
}

interface QuizCardProps {
  /** 题目数据 */
  question: QuizQuestion;
  /** 当前题号 */
  currentIndex: number;
  /** 总题数 */
  totalQuestions: number;
  /** 选择答案回调 */
  onSelectAnswer: (optionId: string) => void;
  /** 是否已回答（显示结果） */
  isAnswered?: boolean;
  /** 已选答案 ID */
  selectedAnswerId?: string;
  /** 是否显示解析 */
  showExplanation?: boolean;
}

export function QuizCard({
  question,
  currentIndex,
  totalQuestions,
  onSelectAnswer,
  isAnswered = false,
  selectedAnswerId,
  showExplanation = true,
}: QuizCardProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedAnswerId);

  const handleSelect = useCallback(
    (optionId: string) => {
      if (!isAnswered) {
        setSelectedId(optionId);
        onSelectAnswer(optionId);
      }
    },
    [isAnswered, onSelectAnswer]
  );

  return (
    <div
      className="card-candy p-6 space-y-4"
      role="region"
      aria-label={t('quizCard.progressAria', { current: currentIndex + 1, total: totalQuestions })}
    >
      {/* 进度条 */}
      <ProgressBar
        value={currentIndex + 1}
        max={totalQuestions}
        label={t('quizCard.progressLabel')}
        showValue={true}
        color="blue"
        size="sm"
      />

      {/* 难度星级（可选） */}
      {question.difficulty && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('quizCard.difficulty')}</span>
          <StarRating rating={question.difficulty} size="sm" />
        </div>
      )}

      {/* 题目文本 */}
      <h3 className="text-lg font-bold text-gray-800" id={`question-${question.id}`}>
        {question.question}
      </h3>

      {/* 选项列表 */}
      <div
        className="space-y-3"
        role="radiogroup"
        aria-labelledby={`question-${question.id}`}
        aria-describedby={isAnswered ? `explanation-${question.id}` : undefined}
      >
        {question.options.map((option, index) => {
          const isSelected = selectedId === option.id;
          const showResult = isAnswered && option.isCorrect !== undefined;

          let optionStyle = 'border-2 border-gray-200 hover:border-blue-300';
          if (isSelected && !showResult) {
            optionStyle = 'border-2 border-blue-500 bg-blue-50';
          }
          if (showResult && option.isCorrect) {
            optionStyle = 'border-2 border-green-500 bg-green-50';
          }
          if (showResult && isSelected && !option.isCorrect) {
            optionStyle = 'border-2 border-red-500 bg-red-50';
          }

          return (
            <AccessibleButton
              key={option.id}
              ariaLabel={t('quizCard.optionAria', { letter: String.fromCharCode(65 + index), label: option.label })}
              icon={option.emoji}
              variant={isSelected ? 'primary' : 'secondary'}
              size="lg"
              disabled={isAnswered}
              onClick={() => handleSelect(option.id)}
              className={`w-full justify-start text-left p-4 rounded-xl transition-all ${optionStyle}`}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="font-bold mr-3">{String.fromCharCode(65 + index)}</span>
              <span>{option.label}</span>
              {showResult && option.isCorrect && (
                <span className="ml-auto text-green-600 font-bold">✓ {t('quizCard.correct')}</span>
              )}
              {showResult && isSelected && !option.isCorrect && (
                <span className="ml-auto text-red-600 font-bold">✗ {t('quizCard.wrong')}</span>
              )}
            </AccessibleButton>
          );
        })}
      </div>

      {/* 答案解析（答题后显示） */}
      {isAnswered && showExplanation && question.explanation && (
        <div
          id={`explanation-${question.id}`}
          className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-yellow-800 mb-1">{t('quizCard.explanation')}</p>
          <p className="text-sm text-yellow-700">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

// 使用示例：
/*
<QuizCard
  question={{
    id: 'q1',
    question: '"春眠不觉晓"的下一句是？',
    options: [
      { id: 'a', label: '处处闻啼鸟', emoji: '🐦', isCorrect: true },
      { id: 'b', label: '花落知多少', emoji: '🌸' },
      { id: 'c', label: '夜来风雨声', emoji: '🌧️' },
      { id: 'd', label: '红豆生南国', emoji: '🫘' },
    ],
    difficulty: 2,
    explanation: '出自孟浩然《春晓》，描写春天早晨醒来听到鸟叫声的场景。',
  }}
  currentIndex={0}
  totalQuestions={10}
  onSelectAnswer={() => {}}
  isAnswered={true}
  selectedAnswerId="a"
/>
*/

export default QuizCard;
