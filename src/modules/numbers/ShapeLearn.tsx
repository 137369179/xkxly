import { useState, useMemo } from 'react';
import { shuffle } from '@/lib/utils';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';

interface Shape {
  name: string;
  emoji: string;
  sides: number;
  corners: number;
  desc: string;
  examples: string[];
  color: string;
}

const SHAPES: Shape[] = [
  { name: '圆形', emoji: '⭕', sides: 0, corners: 0, desc: '圆溜溜的，没有角', examples: ['足球', '太阳', '车轮', '盘子'], color: 'from-amber-400 to-orange-500' },
  { name: '正方形', emoji: '⏹️', sides: 4, corners: 4, desc: '四条边一样长，四个直角一样大', examples: ['窗户', '手帕', '魔方', '地砖'], color: 'from-sky-400 to-blue-500' },
  { name: '长方形', emoji: '▬', sides: 4, corners: 4, desc: '对边一样长，四个角都是直角', examples: ['黑板', '书本', '手机', '门'], color: 'from-emerald-400 to-green-600' },
  { name: '三角形', emoji: '🔺', sides: 3, corners: 3, desc: '三条边，三个角，结构最稳定', examples: ['屋顶', '红领巾', '三角尺', '切片披萨'], color: 'from-rose-400 to-pink-600' },
  { name: '五角星', emoji: '⭐', sides: 10, corners: 5, desc: '五个金光闪闪的小角', examples: ['星星', '五角星勋章', '杨桃切面'], color: 'from-yellow-400 to-amber-500' },
  { name: '菱形', emoji: '🔶', sides: 4, corners: 4, desc: '四条边相等，像倾斜的正方形', examples: ['风筝', '菱形花纹', '扑克牌方块'], color: 'from-purple-400 to-indigo-600' },
  { name: '心形', emoji: '💖', sides: 0, corners: 1, desc: '爱心满满，上方有两个圆弧', examples: ['爱心卡片', '草莓', '心形糖果'], color: 'from-pink-400 to-rose-500' },
  { name: '六边形', emoji: '⬡', sides: 6, corners: 6, desc: '六条边六个角，就像神奇的蜂巢', examples: ['蜂巢', '螺母', '雪花晶体'], color: 'from-teal-400 to-cyan-600' },
];

type Mode = 'learn' | 'quiz';

export function ShapeLearn() {
  const practice = useStore((s) => s.practice);
  const [mode, setMode] = useState<Mode>('learn');
  const [idx, setIdx] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState(-1);

  const shape = SHAPES[idx]!;

  const quizItem = useMemo(() => {
    const s = SHAPES[quizIdx % SHAPES.length]!;
    const ex = s.examples[quizIdx % s.examples.length];
    const options = shuffle([s, ...SHAPES.filter((x) => x.name !== s.name)]).slice(0, 4);
    if (!options.find((o) => o.name === s.name)) options[0] = s;
    return { ex, answer: s, options: shuffle(options) };
  }, [quizIdx]);

  const handlePick = (i: number) => {
    if (answered) return;
    sfxTap();
    setPicked(i);
    setAnswered(true);
    if (quizItem.options[i]!.name === quizItem.answer.name) {
      sfxCorrect();
      celebrateSmall();
      setScore((s) => s + 1);
      practice('math:shape', true);
      speak(`答对了！${quizItem.ex}是${quizItem.answer.name}的。`, {
        lang: 'zh-CN',
        rate: 0.85,
        module: 'praise',
      }).catch(() => {});
    } else {
      sfxWrong();
      practice('math:shape', false);
      speak(`再想想，${quizItem.ex}是${quizItem.answer.name}哦。`, {
        lang: 'zh-CN',
        rate: 0.85,
        module: 'praise',
      }).catch(() => {});
    }
  };

  const next = () => {
    sfxTap();
    setAnswered(false);
    setPicked(-1);
    setQuizIdx((i) => i + 1);
  };

  if (mode === 'quiz') {
    const { ex, answer, options } = quizItem;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CandyButton
            tone="blue"
            variant="soft"
            size="sm"
            onClick={() => {
              sfxTap();
              setMode('learn');
            }}
          >
            ◀️ 返回认知
          </CandyButton>
          <span className="text-sm font-black text-candy-orange-deep">⭐ 当前得分: {score}</span>
        </div>

        <Panel className="text-center !py-6">
          <span className="inline-block rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700 mb-2">
            生活形状小侦探
          </span>
          <p className="text-xl font-black text-ink">
            生活中的“<span className="text-candy-orange-deep underline decoration-wavy decoration-orange-300">{ex}</span>”是什么形状呀？
          </p>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          {options.map((o, i) => {
            const isAnswer = o.name === answer.name;
            const isPicked = i === picked;
            return (
              <motion.button
                key={`o-${i}-${o.name}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePick(i)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-3 font-black transition-all shadow-sm ${
                  answered
                    ? isAnswer
                      ? 'border-green-500 bg-green-100 text-green-800 scale-105'
                      : isPicked
                      ? 'border-red-400 bg-red-100 text-red-700'
                      : 'border-gray-200 bg-white/70 opacity-60'
                    : 'border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <span className="text-4xl mb-1 sm:text-5xl">{o.emoji}</span>
                <span className="text-lg font-black leading-tight sm:text-xl">{o.name}</span>
              </motion.button>
            );
          })}
        </div>

        {answered && (
          <div className="flex justify-center pt-2">
            <CandyButton tone="green" size="lg" onClick={next}>
              下一题 ➔
            </CandyButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-ink">📐 几何图形认知</h3>
        <CandyButton
          tone="orange"
          size="sm"
          onClick={() => {
            sfxTap();
            setMode('quiz');
          }}
        >
          🎯 测验挑战
        </CandyButton>
      </div>

      {/* 8 大形状图标栏 */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {SHAPES.map((s, i) => (
          <button
            key={s.name}
            onClick={() => {
              sfxTap();
              setIdx(i);
              speak(`这是${s.name}。${s.desc}`, { lang: 'zh-CN', rate: 0.85 }).catch(() => {});
            }}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
              idx === i
                ? 'border-candy-purple-deep bg-candy-purple-soft/60 shadow-candy-sm scale-105'
                : 'border-purple-100 bg-white hover:bg-purple-50'
            }`}
          >
            <span className="text-2xl">{s.emoji}</span>
            <span className="text-xs font-black text-ink mt-1">{s.name}</span>
          </button>
        ))}
      </div>

      {/* 当前形状详情展示卡 */}
      <Panel className="text-center !py-6 shadow-fluffy">
        <motion.div
          key={shape.name}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-7xl mb-2 inline-block"
        >
          {shape.emoji}
        </motion.div>
        <h4 className="text-2xl font-black text-ink">{shape.name}</h4>
        <p className="text-sm font-bold text-candy-purple-deep mt-1">{shape.desc}</p>

        <div className="flex justify-center gap-4 my-4">
          <span className="rounded-xl bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
            📏 边数: {shape.sides} 条
          </span>
          <span className="rounded-xl bg-pink-100 px-3 py-1 text-xs font-black text-pink-800">
            📐 顶点/角: {shape.corners} 个
          </span>
        </div>

        {/* 生活中的例子 */}
        <div className="rounded-2xl bg-amber-50/80 p-3 max-w-sm mx-auto border border-amber-200">
          <p className="text-xs font-bold text-ink-soft mb-2">生活中有哪些也是{shape.name}呢？</p>
          <div className="flex flex-wrap justify-center gap-2">
            {shape.examples.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  sfxTap();
                  speak(`${ex}是${shape.name}的`, { lang: 'zh-CN', rate: 0.85 }).catch(() => {});
                }}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink border border-amber-300 shadow-xs hover:scale-105 active:scale-95 flex items-center gap-1"
              >
                <span>🔊</span>
                <span>{ex}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <CandyButton
            tone="blue"
            size="md"
            onClick={() => speak(`这是${shape.name}。${shape.desc}`, { lang: 'zh-CN', rate: 0.85 })}
          >
            🔊 听听解说
          </CandyButton>
        </div>
      </Panel>
    </div>
  );
}
