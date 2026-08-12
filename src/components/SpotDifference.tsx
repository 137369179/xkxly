/**
 * 找不同 🔍 (P1)
 * 两幅图找差异，锻炼观察力与专注力
 */
import { useState, useRef } from 'react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { CandyButton } from '@/components/ui/Button';

/** 用 emoji 组合做"图片"，每关6格，其中2-3格不同 */
interface Scene { id: string; emoji: string; }
interface Level { left: Scene[]; right: Scene[]; diffCount: number; }

const THEMES = [
  { name: '动物乐园', emojis: ['🐱','🐶','🐰','🐻','🐸','🦊','🐼','🦁','🐮','🐷','🐵','🐔'] },
  { name: '水果派对', emojis: ['🍎','🍌','🍇','🍓','🍊','🍉','🥝','🍑','🍈','🍒','🥭','🍍'] },
  { name: '天气风景', emojis: ['☀️','🌙','⭐','☁️','🌧️','🌈','⛄','🌊','🌸','🍂','🍃','🔥'] },
  { name: '交通工具', emojis: ['🚗','🚌','✈️','🚂','🚲','🚀','⛵','🚁','🛵','🚜','🚢','🏍️'] },
];

function genLevel(): Level {
  const theme = THEMES[Math.floor(Math.random()*THEMES.length)]!
  const picks = [...theme.emojis].sort(()=>Math.random()-0.5).slice(0,6);
  const diffPositions = new Set<number>();
  const diffCount = 2 + Math.floor(Math.random()*2); // 2-3 differences
  while (diffPositions.size < diffCount) {
    diffPositions.add(Math.floor(Math.random()*6));
  }
  const left = picks.map((e,i)=>({ id:`l-${i}`, emoji:e }));
  const right = picks.map((e,i)=>{
    if (diffPositions.has(i)) {
      const alt = theme.emojis[Math.floor(Math.random()*theme.emojis.length)];
      return { id:`r-${i}`, emoji: alt === e ? '⭐' : (alt ?? '⭐') };
    }
    return { id:`r-${i}`, emoji:e };
  });
  return { left, right, diffCount };
}

export function SpotDifference() {
  const [level, setLevel] = useState<Level>(()=>genLevel());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);

  const handleClick = (pos: number) => {
    if (lockRef.current || found.has(pos)) return;
    lockRef.current = true;
    sfxTap();
    const isDiff = level.left[pos]!.emoji !== level.right[pos]!.emoji;
    if (isDiff) {
      sfxCorrect();
      const newFound = new Set(found);
      newFound.add(pos);
      setFound(newFound);
      setScore(s=>s+1);
      void speak('找到了！', { lang:'zh-CN', rate:0.85, module:'praise' });
      if (newFound.size >= level.diffCount) {
        setTimeout(() => {
          setLevel(genLevel());
          setFound(new Set());
        }, 1200);
      }
      setTimeout(() => lockRef.current = false, 400);
    } else {
      sfxWrong();
      setWrong(pos);
      void speak('这里一样哦，再找找', { lang:'zh-CN', rate:0.85, module:'praise' });
      setTimeout(() => { setWrong(null); lockRef.current = false; }, 600);
    }
  };

  const Cell = ({ scene, pos }: { scene: Scene; pos: number }) => (
    <button onClick={()=>handleClick(pos)}
      className={cn('aspect-square rounded-2xl flex items-center justify-center text-4xl shadow-sm transition-all hover:scale-105 active:scale-95',
        found.has(pos) ? 'bg-candy-green-soft ring-2 ring-candy-green-deep' :
        wrong === pos ? 'bg-candy-pink-soft animate-shake' : 'bg-white'
      )}>
      {scene.emoji}
      {found.has(pos) && <span className="absolute -top-1 -right-1 text-lg">✅</span>}
    </button>
  );

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🔍 找不同</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">找出两幅图不同的地方</p>
      <div className="mb-4 flex justify-between text-xs font-bold text-ink-soft">
        <span>找到 {found.size}/{level.diffCount}</span><span>得分 {score}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-2 text-center text-xs font-extrabold text-candy-blue-deep">图 A</p>
          <div className="grid grid-cols-3 gap-2">
            {level.left.map((s,i)=><Cell key={s.id} scene={s} pos={i} />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-center text-xs font-extrabold text-candy-pink-deep">图 B</p>
          <div className="grid grid-cols-3 gap-2">
            {level.right.map((s,i)=><Cell key={s.id} scene={s} pos={i} />)}
          </div>
        </div>
      </div>
      <CandyButton tone="blue" size="sm" className="mt-4 w-full" onClick={()=>{setLevel(genLevel());setFound(new Set());}}>
        🔄 换一题
      </CandyButton>
    </div>
  );
}
