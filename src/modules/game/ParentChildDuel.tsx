import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { PageHeader } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';

type DuelMode = 'math' | 'hanzi';

interface Question {
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
}

const MATH_QUESTIONS: Question[] = [
  { prompt: '3 + 4 = ?', options: ['6', '7', '8'], answer: '7', hint: '小手查一查' },
  { prompt: '8 - 3 = ?', options: ['4', '5', '6'], answer: '5', hint: '数一数剩下的' },
  { prompt: '5 + 5 = ?', options: ['9', '10', '11'], answer: '10', hint: '双手手指头' },
  { prompt: '9 - 4 = ?', options: ['5', '6', '7'], answer: '5', hint: '倒数四步' },
  { prompt: '6 + 2 = ?', options: ['7', '8', '9'], answer: '8', hint: '往后数两个' },
  { prompt: '10 - 6 = ?', options: ['3', '4', '5'], answer: '4', hint: '十个减六个' },
];

const HANZI_QUESTIONS: Question[] = [
  { prompt: '哪个字是“太阳”？', options: ['日', '月', '水'], answer: '日', hint: '圆圆的红太阳' },
  { prompt: '哪个字是“弯弯的月亮”？', options: ['山', '月', '火'], answer: '月', hint: '夜空中的月牙' },
  { prompt: '哪个字和“水流”有关？', options: ['河', '木', '火'], answer: '河', hint: '三点水在左边' },
  { prompt: '哪个字代表“高高的大山”？', options: ['土', '山', '石'], answer: '山', hint: '三个山峰耸立' },
  { prompt: '哪个字是“火苗”？', options: ['火', '木', '水'], answer: '火', hint: '热热的红火苗' },
];

export default function ParentChildDuel() {
  const addStars = useStore((s) => s.addStars);
  const childName = '宝贝';

  const [mode, setMode] = useState<DuelMode>('math');
  const [handicapMs, setHandicapMs] = useState<number>(1000);
  const [qIndex, setQIndex] = useState(0);
  const [childScore, setChildScore] = useState(0);
  const [parentScore, setParentScore] = useState(0);
  const [childStreak, setChildStreak] = useState(0);
  const [parentLocked, setParentLocked] = useState(false);
  const [winner, setWinner] = useState<'child' | 'parent' | 'draw' | null>(null);

  const questions = mode === 'math' ? MATH_QUESTIONS : HANZI_QUESTIONS;
  const currentQ = questions[qIndex] ?? questions[0];

  const handleStartNextRound = useCallback(() => {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setParentLocked(false);
    } else {
      // 结算
      if (childScore > parentScore) {
        setWinner('child');
        addStars(10);
        celebrateBig();
        sfxStar();
      } else if (parentScore > childScore) {
        setWinner('parent');
        addStars(5);
      } else {
        setWinner('draw');
        addStars(8);
        celebrateBig();
      }
    }
  }, [qIndex, questions.length, childScore, parentScore, addStars]);

  if (!currentQ) return null;

  const handleChildAnswer = (opt: string) => {
    sfxTap();
    if (opt === currentQ.answer) {
      sfxCorrect();
      setChildScore((s) => s + 1);
      setChildStreak((st) => st + 1);
      handleStartNextRound();
    } else {
      sfxWrong();
      setChildStreak(0);
    }
  };

  const handleParentAnswer = (opt: string) => {
    if (parentLocked) return;
    sfxTap();
    setParentLocked(true);
    setTimeout(() => {
      if (opt === currentQ.answer) {
        sfxCorrect();
        setParentScore((s) => s + 1);
        handleStartNextRound();
      } else {
        sfxWrong();
        setParentLocked(false);
      }
    }, handicapMs);
  };

  const restart = () => {
    setQIndex(0);
    setChildScore(0);
    setParentScore(0);
    setChildStreak(0);
    setWinner(null);
    setParentLocked(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <PageHeader
        iconType="gamecenter"
        title="👨‍👩‍👧 亲子同屏趣味对战 · 智慧擂台"
        subtitle="爸爸妈妈与宝贝在同一屏幕PK答题！智能让步保护，乐享亲子共学好时光"
        tone="pink"
      />

      {/* 模式与让步设置 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 p-4 rounded-3xl border-2 border-pink-200 shadow-sm">
        <div className="flex gap-2">
          <CandyButton
            tone={mode === 'math' ? 'purple' : 'orange'}
            variant={mode === 'math' ? 'solid' : 'soft'}
            size="sm"
            onClick={() => {
              sfxTap();
              setMode('math');
              restart();
            }}
          >
            🔢 速算天平对决
          </CandyButton>
          <CandyButton
            tone={mode === 'hanzi' ? 'pink' : 'green'}
            variant={mode === 'hanzi' ? 'solid' : 'soft'}
            size="sm"
            onClick={() => {
              sfxTap();
              setMode('hanzi');
              restart();
            }}
          >
            📖 识字找茬大PK
          </CandyButton>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">家长让步缓冲：</span>
          <select
            value={handicapMs}
            onChange={(e) => setHandicapMs(Number(e.target.value))}
            className="text-xs font-bold bg-pink-50 border border-pink-300 rounded-xl px-2.5 py-1 text-pink-900 focus:outline-none"
          >
            <option value={1500}>宽松 (1.5秒缓冲)</option>
            <option value={1000}>标准 (1.0秒缓冲)</option>
            <option value={500}>高手 (0.5秒缓冲)</option>
            <option value={0}>无让步 (0秒抢答)</option>
          </select>
        </div>
      </div>

      {/* 比分牌与连击指示 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white rounded-[2rem] p-5 shadow-fluffy font-black text-center border-4 border-white/90">
        <div className="flex items-center justify-between relative z-10">
          <div className="w-1/3">
            <span className="text-xs opacity-85 block mb-0.5">👨‍🦰 家长端</span>
            <span className="text-4xl font-mono tracking-wider">{parentScore}</span>
          </div>
          <div className="w-1/3">
            <span className="text-xs bg-white/25 px-3.5 py-1 rounded-full uppercase tracking-wider font-bold">
              第 {qIndex + 1} / {questions.length} 局
            </span>
            <p className="text-2xl mt-1.5 animate-pulse">⚔️ VS ⚔️</p>
          </div>
          <div className="w-1/3">
            <span className="text-xs opacity-85 block mb-0.5">👶 宝贝端 ({childName})</span>
            <span className="text-4xl font-mono text-yellow-300 tracking-wider">{childScore}</span>
          </div>
        </div>

        {/* 宝贝连击徽标 */}
        {childStreak >= 2 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-2 text-xs font-black text-amber-200 flex items-center justify-center gap-1"
          >
            <span>🔥</span>
            <span>宝贝连对 {childStreak} 题！势不可挡！</span>
          </motion.div>
        )}
      </div>

      {/* 结算获奖证书 */}
      {winner && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="border-4 border-amber-300 bg-gradient-to-b from-amber-50 via-yellow-50 to-pink-50 rounded-[2.5rem] p-8 text-center shadow-fluffy space-y-4"
        >
          <span className="text-7xl block filter drop-shadow-md">
            {winner === 'child' ? '🏆' : winner === 'draw' ? '🤝' : '💖'}
          </span>
          <div className="border-2 border-dashed border-amber-300 p-6 rounded-3xl bg-white/80 max-w-md mx-auto">
            <span className="text-xs font-black text-pink-600 tracking-widest uppercase">
              亲子智慧奖状
            </span>
            <h2 className="text-2xl font-black text-amber-950 mt-1">
              {winner === 'child'
                ? `恭喜 ${childName} 荣获小擂主！`
                : winner === 'draw'
                  ? '亲子默契大奖！'
                  : '亲子共学温情奖！'}
            </h2>
            <p className="text-xs font-bold text-amber-800 mt-2 leading-relaxed">
              在本次亲子对决中，宝贝与家长积极互动、奋勇答题，不仅收获了知识，更见证了温馨家庭陪伴的美好时光！
            </p>
            <div className="mt-4 pt-3 border-t border-amber-100 flex justify-around text-xs font-black text-amber-900">
              <span>🌟 星星奖励: +{winner === 'child' ? 10 : winner === 'draw' ? 8 : 5}⭐</span>
              <span>📅 记录已存入荣誉馆</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <CandyButton tone="green" size="lg" onClick={restart} className="shadow-md">
              再战一局 🚀
            </CandyButton>
          </div>
        </motion.div>
      )}

      {/* 对战主区域（左右分屏） */}
      {!winner && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左侧：家长端 */}
          <div className="rounded-[2.2rem] border-4 border-blue-200 bg-gradient-to-b from-blue-50/70 to-indigo-50/50 p-6 flex flex-col items-center justify-between shadow-sm">
            <div className="text-center w-full mb-4">
              <span className="text-xs font-black text-blue-700 bg-blue-100/90 px-3.5 py-1 rounded-full">
                👨‍🦰 家长端 ({handicapMs / 1000}s 让步保护)
              </span>
              <h3 className="text-3xl font-black text-gray-800 mt-3">{currentQ.prompt}</h3>
            </div>

            <div className="w-full space-y-3">
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={parentLocked}
                  onClick={() => handleParentAnswer(opt)}
                  className={`w-full min-h-[56px] rounded-2xl border-2 text-2xl font-black transition-all ${
                    parentLocked
                      ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-blue-900 border-blue-200 hover:border-blue-400 active:scale-95 shadow-sm'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {parentLocked && (
              <p className="text-xs text-blue-600 font-bold mt-3 animate-pulse">
                ⏳ 正在确认作答，给宝贝留出思考时间...
              </p>
            )}
          </div>

          {/* 右侧：儿童端 */}
          <div className="rounded-[2.2rem] border-4 border-pink-300 bg-gradient-to-b from-pink-50/90 to-rose-50/70 p-6 flex flex-col items-center justify-between shadow-fluffy">
            <div className="text-center w-full mb-4">
              <span className="text-xs font-black text-pink-700 bg-pink-100/90 px-3.5 py-1 rounded-full">
                👶 宝贝端 (点击即抢答)
              </span>
              <h3 className="text-4xl font-black text-pink-900 mt-3">{currentQ.prompt}</h3>
              <p className="text-xs text-pink-600 font-bold mt-1.5">💡 小提示：{currentQ.hint}</p>
            </div>

            <div className="w-full space-y-3">
              {currentQ.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChildAnswer(opt)}
                  className="w-full min-h-[64px] rounded-2xl border-4 border-pink-400 bg-gradient-to-r from-pink-400 to-rose-400 text-white text-3xl font-black shadow-lg hover:scale-103 active:scale-95 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>

            <p className="text-xs text-pink-700 font-black mt-3 flex items-center gap-1">
              <span>🐾</span>
              <span>宝贝加油！抢先答对领星星！</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
