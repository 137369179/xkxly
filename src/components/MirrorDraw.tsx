/**
 * 镜像画 🪞 (S1)
 * 镜像对称绘画 — 左边画，右边自动镜像
 */
import { memo, useState, useRef } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const COLORS = ['#ff5c7a','#ff9f5a','#ffc93c','#5fd68b','#55aee0','#8b6ef0','#ff6b96','#000000'];

function MirrorDrawImpl() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(3);
  const drawing = useRef(false);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const drawDot = (x: number, y: number) => {
    const ctx = (canvasRef.current as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
    const mid = (canvasRef.current as HTMLCanvasElement).width / 2;
    ctx.fillStyle = color ?? '#000000';
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    // 镜像
    ctx.beginPath(); ctx.arc(2 * mid - x, y, size, 0, Math.PI * 2); ctx.fill();
  };

  const onDown = (e: React.PointerEvent) => { drawing.current = true; const {x,y} = getPos(e); drawDot(x,y); sfxTap(); };
  const onMove = (e: React.PointerEvent) => { if (!drawing.current) return; const {x,y} = getPos(e); drawDot(x,y); };
  const onUp = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 画中线
    ctx.strokeStyle = '#e2c4cb';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('mirrorDraw.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('mirrorDraw.subtitle')}</p>

      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {COLORS.map(c => (
          <button key={c} onClick={()=>{setColor(c);sfxTap();}}
            className={cn('h-7 w-7 rounded-full shadow-sm transition-all', color===c && 'ring-2 ring-offset-2 ring-candy-purple-deep scale-110')}
            style={{ background: c }} />
        ))}
      </div>

      <div className="mb-3 flex justify-center items-center gap-3">
        <span className="text-xs font-bold text-ink-soft">{t('mirrorDraw.brushSize')}</span>
        {[2,3,5,8].map(s => (
          <button key={s} onClick={()=>{setSize(s);sfxTap();}}
            className={cn('rounded-lg px-2 py-1 text-xs font-extrabold', size===s?'bg-candy-purple-deep text-white':'bg-white shadow-sm')}>
            {s}
          </button>
        ))}
      </div>

      <div className="mx-auto" style={{ maxWidth: '400px' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onPointerDown={(e)=>{e.currentTarget.setPointerCapture(e.pointerId);onDown(e);}}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="w-full rounded-2xl bg-white shadow-lg touch-none"
        />
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <CandyButton tone="purple" size="sm" onClick={clear}>{t('mirrorDraw.clear')}</CandyButton>
      </div>
    </div>
  );
}

export const MirrorDraw = memo(MirrorDrawImpl);
