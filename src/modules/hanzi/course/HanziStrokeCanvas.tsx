import { useState, useRef, useEffect, useCallback } from 'react';
import type { HanziEntry } from '@/data/hanzi';
import { gradeHanziWriting, type WritingGrade } from '@/lib/hanziWriting';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

interface Props {
  char: HanziEntry;
  onComplete: (stars: number) => void;
}

type Pt = [number, number];

export function HanziStrokeCanvas({ char, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [trail, setTrail] = useState<Pt[]>([]);
  const [grade, setGrade] = useState<WritingGrade | null>(null);
  const [isDemonstrating, setIsDemonstrating] = useState(false);

  useEffect(() => {
    speak(`第四步：写笔顺。请按照笔顺在田字格里认真描红「${char.c}」字，一共${char.strokes}画。`);
  }, [char]);

  // 重置并绘制田字格
  const redrawCanvas = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const w = cvs.width;
    const h = cvs.height;

    // 清空背景
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, w, h);

    // 绘制田字格红线 (米字格/田字格)
    ctx.strokeStyle = '#fca5a5'; // light red
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // 虚线十字
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#fecaca';
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2, h - 4);
    ctx.moveTo(4, h / 2);
    ctx.lineTo(w - 4, h / 2);
    // 斜虚线
    ctx.moveTo(4, 4);
    ctx.lineTo(w - 4, h - 4);
    ctx.moveTo(w - 4, 4);
    ctx.lineTo(4, h - 4);
    ctx.stroke();
    ctx.restore();

    // 绘制浅色水印底字供描红
    ctx.save();
    ctx.font = `bold ${Math.floor(w * 0.72)}px "Kaiti SC", "STKaiti", "KaiTi", serif`;
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char.c, w / 2, h / 2 + 8);
    ctx.restore();
  }, [char.c]);

  useEffect(() => {
    redrawCanvas();
    setTrail([]);
    setGrade(null);
  }, [char, redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Pt => {
    const cvs = canvasRef.current;
    if (!cvs) return [0, 0];
    const rect = cvs.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return [x, y];
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (grade) return;
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    setTrail((prev) => [...prev, pt]);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e1b4b'; // dark ink
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt[0], pt[1]);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || grade) return;
    const pt = getCanvasCoords(e);
    setTrail((prev) => [...prev, pt]);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(pt[0], pt[1]);
    ctx.stroke();
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    sfxTap();
    setTrail([]);
    setGrade(null);
    redrawCanvas();
  };

  const handleDemonstrate = () => {
    sfxTap();
    setIsDemonstrating(true);
    speak(`正在演示「${char.c}」的书写笔顺，注意看运笔方向哦。`);
    setTimeout(() => {
      setIsDemonstrating(false);
    }, 2000);
  };

  const handleEvaluate = () => {
    if (trail.length < 5) {
      speak('笔画太少啦，请在田字格里把字完整描红一遍哦！');
      return;
    }

    // 转换坐标为 1024 归一化书法坐标评测
    const cvs = canvasRef.current;
    const w = cvs?.width || 300;
    const h = cvs?.height || 300;
    const normalizedTrail: Pt[] = trail.map(([x, y]) => [
      (x / w) * 1024,
      ((h - y) / h) * 1024,
    ]);

    const result = gradeHanziWriting(normalizedTrail, null);
    setGrade(result);

    if (result.stars >= 2) {
      sfxCorrect();
      sfxStar();
      celebrateSmall();
      speak(`太棒了！字写得非常工整漂亮，获得 ${result.stars} 颗星！`);
    } else {
      speak(`写得不错，再熟练一下笔顺会更棒哦！`);
    }
  };

  const handleFinish = () => {
    onComplete(grade?.stars ?? 3);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[460px] p-4 text-slate-800">
      {/* 顶部标题 */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100/80 border border-purple-300 rounded-full text-purple-900 font-bold text-sm">
          <span>✍️ 笔顺描红 · 规范书写</span>
          <span className="text-xs bg-purple-200 px-2 py-0.5 rounded-full font-mono">{char.strokes} 画</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800">
          在田字格中工整临摹「{char.c}」
        </h2>
      </div>

      {/* 田字格书写画布 (Tianzige Writing Canvas) */}
      <div className="relative my-3 flex flex-col items-center">
        <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl border-4 border-amber-300/90 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className="touch-none rounded-2xl cursor-crosshair bg-[#fffdf7] border border-amber-200 shadow-inner"
          />
        </div>

        {/* 笔画演示中提示 */}
        {isDemonstrating && (
          <div className="absolute inset-0 bg-purple-900/20 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-none">
            <span className="bg-purple-600 text-white font-bold px-3 py-1.5 rounded-full text-xs animate-bounce shadow-lg">
              ✨ 演示笔画运笔中...
            </span>
          </div>
        )}
      </div>

      {/* 操作按钮组 (Actions) */}
      <div className="w-full max-w-md space-y-2.5">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleDemonstrate}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold border border-purple-200 transition-colors flex items-center gap-1"
          >
            <span>▶️</span>
            <span>演示笔顺</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors flex items-center gap-1"
          >
            <span>🔄</span>
            <span>清空重写</span>
          </button>

          {!grade && (
            <button
              type="button"
              onClick={handleEvaluate}
              className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1"
            >
              <span>⭐</span>
              <span>写好啦，为我评分</span>
            </button>
          )}
        </div>

        {/* 评分结果与下一步按钮 */}
        {grade && (
          <div className="flex items-center justify-between gap-3 p-3 bg-purple-50 rounded-2xl border border-purple-200 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">{'⭐'.repeat(grade.stars)}</span>
              <span className="text-xs font-black text-purple-900">
                {grade.stars >= 3 ? '书法大师！' : '书写工整！'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-transform active:scale-95 flex items-center gap-1"
            >
              <span>🗣️ 进入「大声读」</span>
              <span>➔</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
