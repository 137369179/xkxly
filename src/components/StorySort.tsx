/**
 * 故事排序练习 📖 (N6)
 * 将打乱顺序的短故事片段按正确逻辑顺序排列，
 * 锻炼 5-6 岁幼儿因果推理 + 叙事能力
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface StoryStep {
  emoji: string;
  text: string;
}

interface Story {
  title: string;
  steps: StoryStep[];
}

const STORIES: Story[] = [
  {
    title: '小种子长大',
    steps: [
      { emoji: '🌱', text: '小种子在泥土里睡觉' },
      { emoji: '💧', text: '春雨落下来，种子喝饱了水' },
      { emoji: '🌿', text: '种子发芽了，冒出小嫩芽' },
      { emoji: '🌸', text: '嫩芽长成了美丽的花朵' },
    ],
  },
  {
    title: '小猫咪的一天',
    steps: [
      { emoji: '😴', text: '早上，小猫咪在床上睡懒觉' },
      { emoji: '🍽️', text: '它饿了，去厨房找吃的' },
      { emoji: '🐟', text: '找到了一条小鱼，开心地吃了起来' },
      { emoji: '💤', text: '吃饱了，晒着太阳睡着了' },
    ],
  },
  {
    title: '做蛋糕',
    steps: [
      { emoji: '📋', text: '妈妈拿出食谱，准备做蛋糕' },
      { emoji: '🥚', text: '打鸡蛋、加面粉、搅拌成面糊' },
      { emoji: '🔥', text: '把面糊放进烤箱烤 20 分钟' },
      { emoji: '🎂', text: '香喷喷的蛋糕出炉啦！' },
    ],
  },
  {
    title: '下雨天',
    steps: [
      { emoji: '☀️', text: '早上太阳高高挂，天气真好' },
      { emoji: '☁️', text: '天空飘来大片乌云，遮住了太阳' },
      { emoji: '🌧️', text: '哗啦啦，豆大的雨点落了下来' },
      { emoji: '🌈', text: '雨停了，天边出现一道彩虹' },
    ],
  },
  {
    title: '穿衣服',
    steps: [
      { emoji: '👕', text: '先穿上一件小背心' },
      { emoji: '👖', text: '再穿上一条长裤子' },
      { emoji: '🧥', text: '套上一件暖和的毛衣' },
      { emoji: '👟', text: '最后穿上袜子和鞋子' },
    ],
  },
  {
    title: '画小花',
    steps: [
      { emoji: '📄', text: '拿出一张白纸铺在桌上' },
      { emoji: '✏️', text: '用铅笔画一个圆圆的太阳' },
      { emoji: '🎨', text: '用彩色笔给花涂上喜欢的颜色' },
      { emoji: '🖼️', text: '把画贴在墙上给妈妈看' },
    ],
  },
];

export function StorySort() {
  const { t: tr } = useTranslation();
  const [story, setStory] = useState(() => STORIES[Math.floor(Math.random() * STORIES.length)]!);
  const [shuffled, setShuffled] = useState(() => shuffle(story.steps));
  const [userOrder, setUserOrder] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');
  const [score, setScore] = useState(0);

  const correctOrder = story.steps.map((_, i) => i);

  const selectStep = (index: number) => {
    sfxTap();
    if (userOrder.includes(index)) return;
    const newOrder = [...userOrder, index];
    setUserOrder(newOrder);
    void speak(shuffled[index]!.text, { lang: 'zh-CN', rate: 0.85, module: 'ai' });

    if (newOrder.length === correctOrder.length) {
      const isCorrect = newOrder.every((n, i) => n === correctOrder[i]!);
      if (isCorrect) {
        sfxCorrect();
        setFeedback('correct');
        setScore(s => s + 1);
        void speak('太棒了！排序完全正确！', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      } else {
        sfxWrong();
        setFeedback('wrong');
        void speak('顺序不太对哦，再来一次吧', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      }
    }
  };

  const newStory = () => {
    const s = STORIES[Math.floor(Math.random() * STORIES.length)]!
    setStory(s);
    const sh = shuffle(s.steps);
    setShuffled(sh);
    setUserOrder([]);
    setFeedback('');
  };

  const reset = () => {
    setUserOrder([]);
    setFeedback('');
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-1 text-center text-lg font-extrabold text-ink">{tr('storysort.title')}</h3>
      <p className="mb-4 text-center text-xs font-bold text-ink-soft">
        {tr('storysort.subtitle')}
      </p>

      <div className="mb-3 text-center">
        <span className="inline-block rounded-xl bg-candy-blue-soft px-4 py-1.5 text-sm font-extrabold text-candy-blue-deep">
          📖 {story.title}
        </span>
      </div>

      {/* 已选顺序 */}
      <div className="mb-4 min-h-[80px] rounded-2xl border-2 border-dashed border-candy-blue-soft bg-candy-blue-soft/50 p-3">
        {userOrder.length === 0 && (
          <p className="text-center text-xs font-bold text-ink-muted">{tr('storysort.tapOrder')}</p>
        )}
        <div className="flex flex-col gap-2">
          {userOrder.map((idx, order) => {
            const step = shuffled[idx]!
            const isCorrectPos = feedback === 'correct' || (feedback === 'wrong' && correctOrder[order] === idx);
            return (
              <motion.div
                key={order}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold shadow-sm',
                  feedback === 'correct' ? 'bg-candy-green-soft text-candy-green-deep' :
                  feedback === 'wrong' && !isCorrectPos ? 'bg-candy-pink-soft text-candy-pink-deep' :
                  'bg-white text-ink'
                )}
              >
                <span className="text-lg">{step.emoji}</span>
                <span className="flex-1">{step.text}</span>
                <span className="text-xs font-extrabold text-ink-muted">#{order + 1}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 待选卡片 */}
      <div className="grid grid-cols-2 gap-2">
        {shuffled.map((step, i) => {
          const selected = userOrder.includes(i);
          return (
            <button
              key={`step-${i}`}
              onClick={() => selectStep(i)}
              disabled={selected}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all shadow-sm',
                selected ? 'opacity-30 bg-gray-100' : 'bg-white hover:scale-105 active:scale-95 hover:bg-pink-50'
              )}
            >
              <span className="text-2xl">{step.emoji}</span>
              <span className="text-xs font-bold text-ink-soft">{step.text}</span>
            </button>
          );
        })}
      </div>

      {/* 按钮 */}
      <div className="mt-4 flex gap-2">
        <button aria-label={tr('common.reset')} onClick={reset} className="flex-1 rounded-xl bg-white py-2 text-sm font-extrabold shadow-sm hover:bg-pink-50">
          🔄 {tr('common.reset')}
        </button>
        <button onClick={newStory} className="flex-1 rounded-xl bg-candy-blue-deep py-2 text-sm font-extrabold text-white shadow-sm">
          {tr('storysort.newStory')}
        </button>
      </div>

      {/* 反馈 */}
      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div initial={{ opacity: 0, y:5 }} animate={{ opacity:1, y:0 }} exit={{opacity:0}} className="mt-4 text-center">
            <span className="text-4xl">🎉🌟🎉</span>
            <p className="text-lg font-extrabold text-candy-green-deep">{tr('storysort.correct')}</p>
          </motion.div>
        )}
        {feedback === 'wrong' && (
          <motion.div initial={{ opacity: 0, y:5 }} animate={{ opacity:1, y:0 }} exit={{opacity:0}} className="mt-4 text-center">
            <span className="inline-block rounded-xl bg-candy-pink-soft px-4 py-2 text-sm font-extrabold text-candy-pink-deep">
              {tr('storysort.wrongHint')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-3 text-center text-xs font-bold text-ink-soft">{tr('common.score')} {score}</div>
    </div>
  );
}
