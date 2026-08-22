import { useState, useEffect, useRef } from 'react';
import { Panel } from '@/components/ui/Card';
import { CandyButton, IconButton } from '@/components/ui/Button';
import { type Tone } from '@/lib/tones';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { useAiStream } from '@/lib/ai/useAi';
import { companionChatTask } from '@/lib/ai/tasks/companion';

type MathMode = 'within10' | 'within20' | 'within100';

interface MathQuestion {
  num1: number;
  num2: number;
  op: '+' | '-';
  answer: number;
  options: number[];
  emoji: string;
}

const EMOJIS = ['🍎', '🍓', '🐶', '🐱', '⭐', '🎈', '🚗', '🐥'];

function generateQuestion(mode: MathMode): MathQuestion {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!;
  let num1: number;
  let num2: number;
  const op: '+' | '-' = Math.random() > 0.5 ? '+' : '-';

  if (mode === 'within10') {
    if (op === '+') {
      num1 = Math.floor(Math.random() * 5) + 1;
      num2 = Math.floor(Math.random() * 5) + 1;
    } else {
      num1 = Math.floor(Math.random() * 6) + 4;
      num2 = Math.floor(Math.random() * num1) + 1;
    }
  } else if (mode === 'within20') {
    if (op === '+') {
      num1 = Math.floor(Math.random() * 9) + 2;
      num2 = Math.floor(Math.random() * 9) + 2;
    } else {
      num1 = Math.floor(Math.random() * 10) + 10;
      num2 = Math.floor(Math.random() * 9) + 1;
    }
  } else {
    // 100 以内整十/简单算术
    if (op === '+') {
      num1 = (Math.floor(Math.random() * 8) + 1) * 10;
      num2 = Math.floor(Math.random() * 10) + 1;
    } else {
      num1 = (Math.floor(Math.random() * 8) + 2) * 10;
      num2 = (Math.floor(Math.random() * (num1 / 10)) + 1) * 10;
    }
  }

  const answer = op === '+' ? num1 + num2 : num1 - num2;

  // 生成 3 个混淆项
  const optionsSet = new Set<number>([answer]);
  while (optionsSet.size < 4) {
    const diff = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
    const wrong = answer + diff;
    if (wrong >= 0 && wrong !== answer) {
      optionsSet.add(wrong);
    }
  }

  const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

  return { num1, num2, op, answer, options, emoji };
}

export function MathChallengeGame() {
  const addFish = useStore((s) => s.addFish);
  const recordMath = useStore((s) => s.recordMath);

  const [mode, setMode] = useState<MathMode>('within10');
  const [question, setQuestion] = useState<MathQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [stars, setStars] = useState(0);
  const [showAiHelp, setShowAiHelp] = useState(false);

  const { text: aiExplanation, run: runAiStream } = useAiStream();

  // 待处理自动跳题计时器引用：用于组件卸载 / 切模式时清理，避免卸载后 setState 与旧题覆盖新题
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPendingTimer = () => {
    if (nextTimerRef.current !== null) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  };

  useEffect(() => {
    nextQuestion();
    // 切换难度或组件卸载时清理挂起的计时器，防止旧定时器用陈旧状态覆盖新题
    return clearPendingTimer;
  }, [mode]);

  const nextQuestion = () => {
    clearPendingTimer();
    const q = generateQuestion(mode);
    setQuestion(q);
    setSelected(null);
    setIsCorrect(null);
    setShowAiHelp(false);

    const promptText = `${q.num1} ${q.op === '+' ? '加' : '减'} ${q.num2} 等于几？`;
    speak(promptText);
  };

  const handleSelect = (val: number) => {
    if (selected !== null || !question) return;

    sfxTap();
    setSelected(val);
    const correct = val === question.answer;
    setIsCorrect(correct);

    if (correct) {
      celebrateSmall();
      setStreak((prev) => prev + 1);
      setStars((prev) => prev + 1);
      addFish(1);
      recordMath(true);
      speak(`答对啦！${question.num1} ${question.op === '+' ? '加' : '减'} ${question.num2} 等于 ${val}！真棒！`);
    } else {
      setStreak(0);
      recordMath(false);
      speak(`差一点点哦，正确答案是 ${question.answer}`);
    }

    nextTimerRef.current = setTimeout(() => {
      nextQuestion();
    }, 1600);
  };

  const handleAskAiHelp = () => {
    if (!question) return;
    sfxTap();
    setShowAiHelp(true);
    runAiStream(
      companionChatTask(
        `请用最生动趣味、适合幼儿园小朋友听懂的苹果比喻法，解释算式：“${question.num1} ${question.op} ${question.num2} = ${question.answer}”的计算思路（40字以内）！`,
        []
      )
    );
  };

  if (!question) return null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* 模式选择与连胜积分栏 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-white/90 p-3 rounded-2xl border border-amber-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          {(['within10', 'within20', 'within100'] as MathMode[]).map((m) => (
            <CandyButton
              key={m}
              size="sm"
              tone="yellow"
              variant={mode === m ? 'solid' : 'soft'}
              silent
              onClick={() => setMode(m)}
            >
              {m === 'within10' ? '10以内加减' : m === 'within20' ? '20以内进退位' : '100以内速算'}
            </CandyButton>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs font-black text-amber-900">
          {streak > 1 && (
            <span className="text-candy-red-deep animate-bounce-soft">🔥 连胜 x{streak}</span>
          )}
          <span>⭐ 积分: {stars}</span>
        </div>
      </div>

      {/* 算式与具象实物显示 */}
      <Panel className="text-center p-6 space-y-4 bg-gradient-to-b from-amber-50 to-orange-50 border-4 border-amber-300">
        <div className="text-xs font-black text-amber-700 uppercase tracking-wider">
          🎲 趣味数学心算闯关
        </div>

        {/* 算式展示 */}
        <div className="flex items-center justify-center gap-3 text-4xl sm:text-5xl font-black text-candy-yellow-deep font-mono">
          <span>{question.num1}</span>
          <span className="text-candy-red">{question.op}</span>
          <span>{question.num2}</span>
          <span>=</span>
          <span className="text-candy-yellow-deep font-extrabold underline decoration-wavy decoration-candy-yellow">
            ?
          </span>
        </div>

        {/* 10 以内具象图形实物辅助数数 */}
        {mode === 'within10' && question.num1 <= 10 && (
          <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-white/70 rounded-2xl border border-amber-200">
            <div className="flex flex-wrap gap-1 items-center bg-amber-100/60 p-2 rounded-xl">
              {Array.from({ length: question.num1 }).map((_, i) => (
                <span
                  key={`n1-${i}`}
                  onClick={() => speak(`${i + 1}`)}
                  className="text-2xl cursor-pointer hover:scale-125 transition-transform"
                >
                  {question.emoji}
                </span>
              ))}
            </div>

            <span className="text-xl font-black text-amber-800">{question.op}</span>

            <div className="flex flex-wrap gap-1 items-center bg-rose-100/60 p-2 rounded-xl">
              {Array.from({ length: question.num2 }).map((_, i) => (
                <span
                  key={`n2-${i}`}
                  onClick={() => speak(`${i + 1}`)}
                  className="text-2xl cursor-pointer hover:scale-125 transition-transform"
                >
                  {question.emoji}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 语音重复播放 */}
        <div className="flex justify-center">
          <CandyButton
            size="sm"
            tone="yellow"
            variant="soft"
            silent
            onClick={() =>
              speak(`${question.num1} ${question.op === '+' ? '加' : '减'} ${question.num2} 等于几？`)
            }
          >
            🔊 读出题目
          </CandyButton>
        </div>
      </Panel>

      {/* 4 选项按钮网格 */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((val) => {
          const isSelected = selected === val;

          const optionTone: Tone = (isSelected
            ? isCorrect
              ? 'green'
              : 'red'
            : 'yellow') as Tone;

          return (
            <CandyButton
              key={val}
              size="lg"
              variant="soft"
              silent
              fullWidth
              disabled={selected !== null}
              onClick={() => handleSelect(val)}
              aria-label={`选项 ${val}`}
              className={`text-3xl font-black jelly-shine ${
                isSelected
                  ? isCorrect
                    ? '!bg-candy-green-soft !border-candy-green-deep !text-candy-green-deep'
                    : '!bg-candy-red-soft !border-candy-red-deep !text-candy-red-deep'
                  : ''
              }`}
              tone={optionTone}
            >
              {val}
            </CandyButton>
          );
        })}
      </div>

      {/* AI 小智数学解题讲解 */}
      <div className="pt-1">
        {!showAiHelp ? (
          <CandyButton
            size="sm"
            tone="yellow"
            variant="soft"
            fullWidth
            silent
            onClick={handleAskAiHelp}
          >
            🐱 让 AI 小智教我怎么算
          </CandyButton>
        ) : (
          <div className="bg-white/90 p-3 rounded-2xl border border-amber-300 text-xs font-bold text-amber-900 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-700">
              <span>🐱 AI 小智解题思路：</span>
              <IconButton
                tone="yellow"
                silent
                minTouchTarget
                label="关闭讲解"
                onClick={() => setShowAiHelp(false)}
                className="!h-8 !w-8 text-sm"
              >
                ✕
              </IconButton>
            </div>
            <div className="text-slate-800 text-xs leading-relaxed animate-pulse">
              {aiExplanation || '喵喵正在思考简单算法中...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
