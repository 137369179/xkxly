import { useStore } from '@/store/useStore';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { QuizCard } from '@/components/QuizCard';
import { TraceCanvas } from '@/components/TraceCanvas';
import { CandyButton } from '@/components/ui/Button';
import { makeCountQuestion, makeNumberQuestion } from '@/lib/questions';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 数字四步学习闭环：认 → 数 → 写 → 说
 * 被「今日课程」与「数字王国 · 描红」复用。
 */
export function NumberLearn({ nums, onDone }: { nums: string[]; onDone?: () => void }) {
  const { t } = useTranslation();
  const first = Number(nums[0] ?? '0');
  const heardNumber = useStore((s) => s.heardNumber);
  const practice = useStore((s) => s.practice);
  const learnSkill = useStore((s) => s.learnSkill);
  const markTraced = useStore((s) => s.markTraced);
  const skill = `number:${first}`;

  const steps: FlowStep[] = [
    {
      key: 'know',
      label: '认',
      emoji: '🔢',
      render: (api) => (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex flex-wrap justify-center gap-2">
            {nums.map((n) => (
              <span
                key={n}
                className="grid h-14 w-14 place-items-center rounded-2xl bg-candy-yellow-soft text-3xl font-extrabold text-candy-yellow-deep"
              >
                {n}
              </span>
            ))}
          </div>
          <CandyButton
            tone="yellow"
            size="lg"
            fullWidth
            onClick={() => {
              nums.forEach((n) => {
                heardNumber(Number(n));
                learnSkill(`number:${Number(n)}`);
              });
              void speak(nums.join('、'), { rate: 0.7, module: 'number' });
              api.ready();
            }}
          >
            {t('numberLearn.listenNumbers')}
          </CandyButton>
        </div>
      ),
    },
    {
      key: 'count',
      label: '数',
      emoji: '🍎',
      gate: true,
      render: (api) => (
        <QuizCard
          question={makeCountQuestion(1)}
          autoSpeak={false}
          onAnswer={(correct) => {
            if (correct) {
              practice('number:count', true);
              api.ready();
            } else {
              practice('number:count', false);
            }
          }}
        />
      ),
    },
    {
      key: 'write',
      label: '写',
      emoji: '✍️',
      gate: true,
      render: (api) => (
        <div className="py-2">
          <TraceCanvas
            char={String(first)}
            tone="yellow"
            hint={t('numberLearn.traceHint')}
            onPass={() => {
              markTraced(`trace:${first}`);
              learnSkill(skill);
              api.ready();
            }}
          />
        </div>
      ),
    },
    {
      key: 'say',
      label: '说',
      emoji: '🗣️',
      gate: true,
      render: (api) => (
        <QuizCard
          question={makeNumberQuestion(1, first)}
          autoSpeak={false}
          onAnswer={(correct) => {
            if (correct) {
              nums.forEach((n) => {
                const num = Number(n);
                practice(`number:${num}`, true);
                heardNumber(num);
              });
              api.ready();
            } else {
              practice(skill, false);
            }
          }}
        />
      ),
    },
  ];

  return <LearnFlow steps={steps} tone="yellow" onFinish={onDone} finishLabel={t('numberLearn.finish')} />;
}
