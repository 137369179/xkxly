/**
 * 连线迷宫 🧶 (P4)
 * 手指画线连线，路径规划+空间推理
 */
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';

/** 简化版：在格子中从起点到终点画路径 */
const LEVELS = [
  { size: 4, walls: [[1,1],[2,1]], start: [0,0], end: [3,3], name: '入门' },
  { size: 5, walls: [[1,0],[1,1],[3,2],[3,3]], start: [0,0], end: [4,4], name: '简单' },
  { size: 5, walls: [[1,0],[1,1],[1,2],[3,1],[3,2],[3,3]], start: [0,0], end: [4,4], name: '中等' },
  { size: 6, walls: [[1,0],[1,1],[2,3],[3,3],[4,1],[4,2]], start: [0,0], end: [5,5], name: '挑战' },
];

type Pos = [number, number];

export function ConnectMaze() {
  const { t } = useTranslation();
  const [lvIdx, setLvIdx] = useState(0);
  const lv = LEVELS[lvIdx] ?? { size: 4, walls: [], start: [0, 0], end: [3, 3], name: '' };
  const [path, setPath] = useState<Pos[]>(() => [lv.start as Pos]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // P3: 卸载时清理待触发的反馈定时器，避免对已卸载组件 setState
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const isWall = (r:number,c:number) => lv.walls.some(([wr,wc])=>wr===r&&wc===c);
  const isStart = (r:number,c:number) => r===lv.start[0]&&c===lv.start[1];
  const isEnd = (r:number,c:number) => r===lv.end[0]&&c===lv.end[1];
  const inPath = (r:number,c:number) => path.some(([pr,pc])=>pr===r&&pc===c);

  const canMove = (from:Pos, to:Pos) => {
    const dr = Math.abs(from[0]-to[0]);
    const dc = Math.abs(from[1]-to[1]);
    return (dr===1&&dc===0) || (dr===0&&dc===1);
  };

  const handleCell = (r:number, c:number) => {
    if (lockRef.current) return;
    if (isWall(r,c)) return;
    if (isStart(r,c) && path.length > 1) { setPath([lv.start as Pos]); return; }
    if (inPath(r,c)) {
      const idx = path.findIndex(([pr,pc])=>pr===r&&pc===c);
      setPath(path.slice(0, idx+1));
      return;
    }
    const last = (path[path.length-1] ?? lv.start) as Pos;
    if (!canMove(last, [r,c])) { sfxWrong(); return; }
    sfxTap();
    const newPath = [...path, [r,c] as Pos];
    setPath(newPath);
    if (isEnd(r,c)) {
      sfxCorrect();
      setFeedback(t('connectMaze.winFeedback'));
      setScore(s=>s+1);
      void speak('太棒了！你走出了迷宫！', { lang:'zh-CN', rate:0.85, module:'praise' });
      lockRef.current = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setLvIdx((lvIdx+1)%LEVELS.length);
        setPath([[0,0]]);
        setFeedback('');
        lockRef.current = false;
      }, 1800);
    }
  };

  const reset = () => { setPath([[0,0]]); setFeedback(''); };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('connectMaze.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('connectMaze.subtitle')}</p>
      <div className="mb-3 flex justify-center gap-2">
        {LEVELS.map((l,i) => (
          <button key={`l-${i}`} onClick={()=>{setLvIdx(i);setPath([[0,0]]);setFeedback('');}}
            className={`rounded-lg px-3 py-1 text-xs font-extrabold ${lvIdx===i?'bg-candy-green-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>
            {l.name}
          </button>
        ))}
      </div>
      <div className="mx-auto mb-4" style={{maxWidth:'320px'}}>
        <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${lv.size}, 1fr)`}}>
          {Array.from({length:lv.size*lv.size}, (_,idx) => {
            const r = Math.floor(idx/lv.size), c = idx%lv.size;
            const wall = isWall(r,c);
            const start = isStart(r,c);
            const end = isEnd(r,c);
            const inP = inPath(r,c);
            return (
              <button key={`cell-${idx}`} onClick={()=>handleCell(r,c)} disabled={wall}
                className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${
                  wall ? 'bg-ink-soft/30 cursor-not-allowed' :
                  end ? 'bg-candy-pink-soft' :
                  start ? 'bg-candy-blue-soft' :
                  inP ? 'bg-candy-green-deep/40' : 'bg-white hover:bg-candy-green-soft/30'
                }`}>
                {wall ? '🧱' : start ? '🏠' : end ? '🎁' : inP ? '·' : ''}
              </button>
            );
          })}
        </div>
      </div>
      {feedback && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mb-3 text-center text-sm font-extrabold text-candy-green-deep">{feedback}</motion.div>}
      <div className="flex justify-center gap-2">
        <CandyButton tone="green" size="sm" onClick={reset}>{t('connectMaze.restart')}</CandyButton>
        <CandyButton tone="blue" size="sm" onClick={()=>{setLvIdx((lvIdx+1)%LEVELS.length);setPath([[0,0]]);setFeedback('');}}>{t('connectMaze.nextLevel')}</CandyButton>
      </div>
      <div className="mt-2 text-center text-xs font-bold text-ink-soft">{t('connectMaze.stats', { score, steps: path.length })}</div>
    </div>
  );
}
