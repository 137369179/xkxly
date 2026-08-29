import { useStore } from '@/store/useStore';
import { LETTER_MAP } from '@/data/letters';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { QuizCard } from '@/components/QuizCard';
import { TraceCanvas } from '@/components/TraceCanvas';
import { CandyButton } from '@/components/ui/Button';
import { makeLetterQuestion } from '@/lib/questions';
import { speak, speakLetter, speakPhonics, playWordVoice } from '@/lib/speech';
import { AiPanel } from '@/components/ai';
import { useAiStream } from '@/lib/ai/useAi';
import { letterStoryTask } from '@/lib/ai/tasks';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';

/**
 * 字母五步学习闭环：玩 → 认 → 练 → 写 → 说
 * 同时被「今日课程」与「字母乐园 · 精学」复用。
 */
export function LetterLearn({ upper, onDone }: { upper: string; onDone?: () => void }) {
  const { t: tr } = useTranslation();
  const item = LETTER_MAP.get(upper);
  const heardLetter = useStore((s) => s.heardLetter);
  const practice = useStore((s) => s.practice);
  const learnSkill = useStore((s) => s.learnSkill);
  const markTraced = useStore((s) => s.markTraced);
  const addStars = useStore((s) => s.addStars);
  const skill = `letter:${upper}`;

  // 顺口溜：26 个字母各生成一次，之后长期走本地缓存，不重复等待
  // 非法字母（空 refs / 越界字符）时传 undefined，避免 letterStoryTask(undefined) 抛错
  const story = useAiStream(item ? letterStoryTask(item.upper, item.word, item.zh) : undefined);

  // 兜底：字母不存在（例如今日课程里字母任务的 refs 为空）时友好提示，不让整页崩
  if (!item) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-center">
        <div>
          <div className="text-5xl">🔤</div>
          <p className="mt-3 font-extrabold text-ink">{tr('letters.loadingError')}</p>
          {onDone && (
            <button
              onClick={onDone}
              className="mt-4 rounded-2xl bg-candy-purple-soft px-5 py-2 font-extrabold text-candy-purple-deep"
            >
              {tr('common.back')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const steps: FlowStep[] = [
    {
      key: 'play',
      label: '玩',
      emoji: '🎈',
      // gate: 必须点击"听一听，我认识它啦"按钮触发 api.ready() 后才能解锁"认"步骤
      gate: true,
      autoAdvanceMs: 1400,
      render: (api) => (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="relative grid h-36 w-36 sm:h-40 sm:w-40 place-items-center rounded-[2.2rem] border-4 border-white bg-gradient-to-br from-candy-blue-soft to-blue-100 shadow-pop">
            <span className="text-6xl sm:text-7xl font-black text-candy-blue-deep">
              {item.upper}
              <span className="opacity-70">{item.lower}</span>
            </span>
            <span className="absolute bottom-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-black text-blue-700 shadow-xs">
              {item.phonicsSound}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <img
              src={item.iconSrc}
              alt={item.word}
              className="h-10 w-10 rounded-full border-2 border-white bg-white object-cover shadow-sm"
            />
            <span className="text-2xl font-black text-candy-blue-deep">{item.word}</span>
            <span className="text-sm font-bold text-ink-soft">({item.zh})</span>
          </div>

          <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-xs font-extrabold text-amber-800 flex items-center justify-between">
            <span>🎶 拼读助记：{item.phonicsRhyme}</span>
            <button
              onClick={() => {
                sfxTap();
                void speakPhonics(item.phonicsRhyme, item.upper);
              }}
              className="rounded-lg bg-amber-200 px-2 py-1 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-300"
            >
              🔊 播放
            </button>
          </div>

          <AiPanel state={story} tone="blue" title={tr('letters.aiStoryTitle')} className="w-full" compact />

          <CandyButton
            tone="blue"
            size="lg"
            fullWidth
            onClick={() => {
              sfxTap();
              heardLetter(upper);
              learnSkill(skill);
              addStars(1);
              void speakLetter(upper);
              void playWordVoice(upper);
              api.ready();
            }}
          >
            {tr('letters.listenAndKnow')} ✨
          </CandyButton>
        </div>
      ),
    },
    {
      key: 'know',
      label: '认',
      emoji: '👀',
      gate: true,
      autoAdvanceMs: 1400,
      render: (api) => (
        <QuizCard
          question={makeLetterQuestion(1, upper)}
          autoSpeak={false}
          onAnswer={(correct) => {
            if (correct) {
              practice(skill, true);
              addStars(1);
              api.ready();
            } else {
              practice(skill, false);
            }
          }}
        />
      ),
    },
    {
      key: 'practice',
      label: '练',
      emoji: '✏️',
      gate: true,
      autoAdvanceMs: 1400,
      render: (api) => (
        <QuizCard
          question={makeLetterQuestion(2, upper)}
          autoSpeak={false}
          onAnswer={(correct) => {
            if (correct) {
              practice(skill, true);
              addStars(1);
              api.ready();
            } else {
              practice(skill, false);
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
      autoAdvanceMs: 1400,
      render: (api) => (
        <div className="py-2">
          <TraceCanvas
            char={upper}
            tone="blue"
            hint={tr('letters.traceHint')}
            onPass={() => {
              markTraced(`trace:${upper}`);
              learnSkill(skill);
              addStars(1);
              api.ready();
            }}
          />
        </div>
      ),
    },
    {
      key: 'speak',
      label: '说',
      emoji: '🗣️',
      render: (api) => (
        <div className="flex flex-col items-center gap-4 py-3 text-center">
          <div className="text-3xl font-black text-candy-blue-deep">{item.word}</div>
          <p className="text-base font-bold text-ink-soft">
            {tr('letters.readAlong')}<span className="font-extrabold text-candy-blue-deep">{item.word}</span>
          </p>

          <div className="flex gap-2 w-full">
            <CandyButton
              tone="blue"
              size="lg"
              fullWidth
              onClick={() => {
                sfxTap();
                void speak(item.word, { lang: 'en-US', rate: 0.7, module: 'letter' });
              }}
            >
              {tr('common.listen')}
            </CandyButton>
            <CandyButton
              tone="orange"
              size="lg"
              variant="soft"
              fullWidth
              onClick={() => {
                sfxTap();
                void speakPhonics(item.phonicsRhyme);
              }}
            >
              🎶 拼读音
            </CandyButton>
          </div>

          <CandyButton
            tone="green"
            size="lg"
            fullWidth
            onClick={() => {
              learnSkill(skill);
              addStars(2);
              api.ready();
            }}
          >
            {tr('pinyin.readDone2')} 🎉
          </CandyButton>
        </div>
      ),
    },
  ];

  return <LearnFlow steps={steps} tone="blue" onFinish={onDone} finishLabel={tr('letters.finishLesson')} />;
}
