/**
 * 谜语猜猜游戏
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { randomPraise } from '@/lib/speech';
import { shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface Riddle {
  q: string;
  a: string;
  hint: string;
  category: 'animal' | 'plant' | 'object' | 'char';
}

const RIDDLES: Riddle[] = [
  // 动物
  { q: '耳朵长，尾巴短，红眼睛，白毛衫，三瓣嘴儿胆子小，青菜萝卜吃个饱。', a: '兔子', hint: '红眼睛白毛', category: 'animal' },
  { q: '头戴红帽子，身穿五彩衣，从来不唱戏，喜欢唤人起。', a: '公鸡', hint: '早晨叫人起床', category: 'animal' },
  { q: '小小姑娘满身黑，秋去江南春来归，从小立志除害虫，身带剪刀满天飞。', a: '燕子', hint: '尾巴像剪刀', category: 'animal' },
  { q: '名字叫做牛，不会拉犁头，说它力气小，背着房子走。', a: '蜗牛', hint: '背着房子', category: 'animal' },
  { q: '身穿黄袍头戴绿，满身尖刺真威风，遇到敌人缩成球，遇到朋友笑嘻嘻。', a: '刺猬', hint: '满身尖刺', category: 'animal' },
  { q: '远看像只猫，近看像只鸟，晚上捉老鼠，白天睡大觉。', a: '猫头鹰', hint: '晚上活动', category: 'animal' },
  { q: '八只脚，抬面鼓，两把剪刀鼓前舞，生来横行霸道，嘴里常吐泡泡。', a: '螃蟹', hint: '横着走路', category: 'animal' },
  { q: '小小虫儿真勤劳，团结合作本领高，排队搬运粮食走，一起过冬真热闹。', a: '蚂蚁', hint: '排队搬运', category: 'animal' },
  // 植物
  { q: '麻屋子，红帐子，里面住着白胖子。', a: '花生', hint: '红皮白心', category: 'plant' },
  { q: '弯弯像月亮，甜甜像糖果，剥皮吃果肉，猴子最爱它。', a: '香蕉', hint: '猴子爱吃', category: 'plant' },
  { q: '红红脸蛋圆又圆，咬一口来甜又甜，核儿硬硬不能吃，果肉软软味道鲜。', a: '桃子', hint: '毛茸茸的红水果', category: 'plant' },
  { q: '绿衣裳，红肚肠，里面住着黑小子。切开一看水汪汪，夏天吃了真凉爽。', a: '西瓜', hint: '夏天水果', category: 'plant' },
  { q: '身穿紫长袍，头戴绿帽子，切开肚皮看，里面全是籽。', a: '茄子', hint: '紫色蔬菜', category: 'plant' },
  // 物品
  { q: '一间小木房，没门也没窗，要想看里面，须得拆房墙。', a: '鸡蛋', hint: '硬壳要打破', category: 'object' },
  { q: '弟兄六七个，围着柱子坐，大家一分开，衣服都扯破。', a: '蒜头', hint: '厨房调味品', category: 'object' },
  { q: '白胖胖，四方方，能写字，能画画，小朋友们都爱它。', a: '橡皮', hint: '擦字用的', category: 'object' },
  { q: '两只小船一样长，五个客人在里面，白天走来夜里停，风雨无阻向前行。', a: '鞋子', hint: '穿在脚上', category: 'object' },
  { q: '一座桥，地上架，雨过天晴顶呱呱，不走路来不跑车，只在雨后开满花。', a: '彩虹', hint: '雨后天上', category: 'object' },
  // 字谜
  { q: '一加一不是二。', a: '王', hint: '组合起来看', category: 'char' },
  { q: '十张口，一颗心。', a: '思', hint: '十+口+心', category: 'char' },
  { q: '一个人搬两个土。', a: '佳', hint: '人+土+土', category: 'char' },
  { q: '太阳挂在树顶上。', a: '果', hint: '日+木', category: 'char' },
  { q: '一口咬掉牛尾巴。', a: '告', hint: '牛去尾+口', category: 'char' },
];

const CAT_LABELS: Record<Riddle['category'], { label: string; emoji: string }> = {
  animal: { label: '动物', emoji: '🐾' },
  plant: { label: '植物', emoji: '🌱' },
  object: { label: '物品', emoji: '📦' },
  char: { label: '字谜', emoji: '🔤' },
};

export function RiddleGame() {
  const { t } = useTranslation();
  const [pool, setPool] = useState<Riddle[]>([]);
  const [idx, setIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'select' | 'playing' | 'result'>('select');
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理答题定时器
  useEffect(() => () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, []);

  const startCategory = useCallback((cat: Riddle['category'] | 'all') => {
    sfxTap();
    triggerHaptic(30);
    const filtered = cat === 'all' ? RIDDLES : RIDDLES.filter((r) => r.category === cat);
    const shuffled = shuffle(filtered);
    setPool(shuffled.slice(0, Math.min(5, shuffled.length)));
    setIdx(0);
    setCorrect(0);
    setShowHint(false);
    setRevealed(false);
    setPhase('playing');
  }, []);

  const current = pool[idx] ?? pool[0] ?? { q: '', a: '', hint: '', category: 'object' };

  const handleReveal = useCallback((gotIt: boolean) => {
    sfxTap();
    if (gotIt) {
      sfxCorrect();
      triggerHaptic(45);
      celebrateSmall();
      randomPraise();
      setCorrect((c) => c + 1);
    } else {
      sfxWrong();
      triggerHaptic(20);
    }
    setRevealed(true);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      if (idx + 1 < pool.length) {
        setIdx((i) => i + 1);
        setShowHint(false);
        setRevealed(false);
      } else {
        setPhase('result');
        const finalCorrect = correct + (gotIt ? 1 : 0);
        if (finalCorrect >= pool.length * 0.8) {
          sfxStar();
          triggerHaptic([60, 40, 60, 40, 100]);
          celebrateBig();
        }
      }
    }, 1500);
  }, [idx, pool.length, correct]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (phase === 'select') {
        const cats: (Riddle['category'] | 'all')[] = ['animal', 'plant', 'object', 'char', 'all'];
        if (['1', '2', '3', '4', '5'].includes(e.key)) {
          const cat = cats[parseInt(e.key, 10) - 1];
          if (cat) {
            e.preventDefault();
            startCategory(cat);
          }
        }
      } else if (phase === 'playing' && !revealed) {
        if (e.key === '1' || e.key === 'y' || e.key === 'Y' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleReveal(true);
        } else if (e.key === '2' || e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handleReveal(false);
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          sfxTap();
          triggerHaptic(25);
          setShowHint(true);
        }
      } else if (phase === 'result') {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          sfxTap();
          triggerHaptic(30);
          setPhase('select');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, revealed, startCategory, handleReveal]);

  if (phase === 'select') {
    return (
      <div className="space-y-4">
        <PageHeader emoji="🧩" title={t('riddle.pageTitle')} subtitle={t('riddle.subtitle')} tone="orange" />
        {/* 快捷操作提示条 */}
        <div className="flex items-center justify-between text-xs text-candy-orange-deep font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
          <span>⌨️ 键盘快捷操作：数字键 1-5 快速选择谜语分类</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="谜语分类选择">
          {(['animal', 'plant', 'object', 'char', 'all'] as const).map((cat, idx) => {
            const count = cat === 'all' ? RIDDLES.length : RIDDLES.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => startCategory(cat)}
                className="flex flex-col items-center min-h-[96px] rounded-2xl border-4 border-candy-orange-soft bg-white p-4 transition-all hover:bg-candy-orange-soft active:translate-y-[1px] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
              >
                <span className="text-3xl">{CAT_LABELS[cat === 'all' ? 'animal' : cat].emoji}</span>
                <span className="mt-1 text-sm font-extrabold text-ink flex items-center gap-1">
                  <span className="text-xs text-candy-orange-deep font-bold">[{idx + 1}]</span>
                  {cat === 'all' ? t('riddle.mixed') : t(`riddle.${cat}`)}
                </span>
                <span className="text-xs font-bold text-ink-soft">{t('riddle.count', { count })}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const rate = pool.length > 0 ? Math.round((correct / pool.length) * 100) : 0;
    return (
      <Panel className="text-center">
        <div className="text-6xl">{rate >= 80 ? '🏆' : rate >= 60 ? '🎉' : '💪'}</div>
        <p className="mt-3 text-xl font-extrabold text-ink">{t('riddle.guessed', { correct, total: pool.length })}</p>
        <p className="text-3xl font-black text-candy-orange-deep">{rate}%</p>
        <CandyButton tone="orange" size="sm" className="mt-4 min-h-[48px]" onClick={() => { sfxTap(); triggerHaptic(30); setPhase('select'); }}>
          🔄 {t('riddle.again')}
        </CandyButton>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink">
          {t('riddle.qnum', { current: idx + 1, total: pool.length, correct })}
        </span>
        <span className="rounded-full bg-candy-orange-soft px-3 py-1 text-xs font-extrabold text-candy-orange-deep">
          {CAT_LABELS[current.category].emoji} {t(`riddle.${current.category}`)}
        </span>
      </div>

      {/* 快捷操作提示条 */}
      <div className="flex items-center justify-between text-xs text-candy-orange-deep font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
        <span>⌨️ 键盘快捷操作：空格/Enter/1 我猜到了 · 2 看答案 · H 提示</span>
      </div>

      <Panel className="text-center">
        <div className="my-4 text-lg font-extrabold leading-relaxed text-ink">
          🧩 {current.q}
        </div>

        {!revealed && (
          <>
            {showHint && (
              <p className="mb-2 text-sm font-bold text-candy-orange-deep">
                💡 {t('riddle.hintText', { hint: current.hint })}
              </p>
            )}
            <div className="flex justify-center gap-2">
              {!showHint && (
                <CandyButton tone="purple" variant="soft" size="sm" className="min-h-[44px]" onClick={() => { sfxTap(); triggerHaptic(25); setShowHint(true); }}>
                  💡 {t('riddle.hint')}
                </CandyButton>
              )}
              <CandyButton tone="green" size="sm" className="min-h-[44px]" onClick={() => handleReveal(true)}>
                ✅ {t('riddle.gotIt')}
              </CandyButton>
              <CandyButton tone="orange" variant="soft" size="sm" className="min-h-[44px]" onClick={() => handleReveal(false)}>
                🤔 {t('riddle.showAnswer')}
              </CandyButton>
            </div>
          </>
        )}

        {revealed && (
          <div className="my-3">
            <p className="text-xs font-bold text-ink-soft">{t('riddle.answerIs')}</p>
            <p className="text-4xl font-black text-candy-orange-deep">{current.a}</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
