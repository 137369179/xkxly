/**
 * 复习客观题型卡（T-3.3 V2）：fillBlank 填空 / contextPick 语境选词
 * ----------------------------------------------------------------
 * - fillBlank：把成语 word 藏一字，选择候选字（自动判对错）
 * - contextPick：读例句（成语处留空），选最贴达成语（自动判对错）
 * 选中即调用 onAnswer(correct)，由父级 practice 写回并进入下一题。
 */
import { useMemo } from 'react';
import { IDIOMS, type Idiom } from '@/data/idioms';
import { useTranslation } from '@/i18n/useTranslation';
import { buildFillBlank, buildContextPick, pickDistractors, objectiveAnswer } from './drill';

interface Props {
  variant: 'fillBlank' | 'contextPick';
  idiom: Idiom;
  onAnswer: (correct: boolean) => void;
}

export function DrillObjective({ variant, idiom, onAnswer }: Props) {
  const { t } = useTranslation();
  const distractors = useMemo(() => pickDistractors(idiom, 3, IDIOMS), [idiom]);
  const fill = useMemo(() => (variant === 'fillBlank' ? buildFillBlank(idiom, distractors, 2) : null), [variant, idiom, distractors]);
  const pick = useMemo(() => (variant === 'contextPick' ? buildContextPick(idiom, distractors) : null), [variant, idiom, distractors]);

  if (variant === 'fillBlank' && fill) {
    const chars = Array.from(idiom.word);
    return (
      <div className="text-center">
        <p className="text-sm font-extrabold text-ink-soft">{t('idioms.reviewObjFill')}</p>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-3xl font-black text-ink">
          {chars.map((c, i) => (
            <span key={i} className={i === fill.missingIndex ? 'inline-block h-9 w-9 rounded-lg bg-slate-100' : ''}>
              {i === fill.missingIndex ? '__' : c}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {fill.chars.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onAnswer(objectiveAnswer('fillBlank', c, { correct: fill.correct }))}
              className="grid h-12 w-12 place-items-center rounded-xl bg-purple-100 text-xl font-black text-purple-700 transition active:scale-90"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'contextPick' && pick) {
    return (
      <div className="text-center">
        <p className="text-sm font-extrabold text-ink-soft">{t('idioms.reviewObjPick')}</p>
        <p className="mt-3 text-base font-bold leading-relaxed text-ink">
          {pick.sentence.replace(idiom.word, '____')}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {pick.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onAnswer(objectiveAnswer('contextPick', o.id, pick))}
              className="rounded-xl bg-purple-100 px-3 py-2 text-base font-black text-purple-700 transition active:scale-95"
            >
              {o.word}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 兜底：无法构建客观题时，给一个可结束该题的按钮（极少触发）
  return (
    <div className="text-center">
      <p className="text-sm font-extrabold text-ink-soft">{idiom.word}</p>
      <div className="mt-4">
        <button type="button" onClick={() => onAnswer(false)} className="rounded-full bg-slate-200 px-4 py-2 text-sm font-bold text-ink-soft">
          下一题
        </button>
      </div>
    </div>
  );
}