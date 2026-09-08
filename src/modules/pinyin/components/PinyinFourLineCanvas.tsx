import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { type FourLineGridSpec } from '@/data/pinyinKingdomData';

interface PinyinFourLineCanvasProps {
  symbol: string;
  gridSpec?: FourLineGridSpec;
  onPass?: () => void;
  className?: string;
}

type BrushMode = 'rainbow' | 'star' | 'jelly';

export function PinyinFourLineCanvas({
  symbol,
  gridSpec,
  onPass,
  className = '',
}: PinyinFourLineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const [strokeProgress, setStrokeProgress] = useState(0); // 0~100
  const [brushMode, setBrushMode] = useState<BrushMode>('rainbow');
  const [guideStep, setGuideStep] = useState(0);
  const [isGuiding, setIsGuiding] = useState(false);

  const strokes = gridSpec?.strokeNames || ['第一笔', '第二笔'];
  const guides = gridSpec?.strokeGuides || ['顺着四线三格指引书写'];

  // 初始化绘制标准的四线三格
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // 四线三格高质感本子底色
    ctx.fillStyle = '#FFFDF5';
    ctx.fillRect(0, 0, width, height);

    // 四线高度计算 (间距均匀)
    const paddingY = height * 0.14;
    const gridHeight = (height - paddingY * 2) / 3;
    const lineY = [
      paddingY,
      paddingY + gridHeight,
      paddingY + gridHeight * 2,
      paddingY + gridHeight * 3,
    ];

    // 绘制中格背景高亮色 (暖粉黄色)
    ctx.fillStyle = '#FFF8E1';
    ctx.fillRect(0, lineY[1]!, width, gridHeight);

    // 绘制四条规范基准线
    // 第 1 线（顶线）：浅红实线
    ctx.strokeStyle = '#FCA5A5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, lineY[0]!);
    ctx.lineTo(width - 10, lineY[0]!);
    ctx.stroke();

    // 第 2 线（上基线）：红色实线（重点基准）
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, lineY[1]!);
    ctx.lineTo(width - 10, lineY[1]!);
    ctx.stroke();

    // 第 3 线（下基线）：蓝色实线（重点基准）
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, lineY[2]!);
    ctx.lineTo(width - 10, lineY[2]!);
    ctx.stroke();

    // 第 4 线（底线）：浅蓝实线
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, lineY[3]!);
    ctx.lineTo(width - 10, lineY[3]!);
    ctx.stroke();

    // 标尺文字
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('上格', 12, lineY[0]! + 14);
    ctx.fillText('中格', 12, lineY[1]! + 14);
    ctx.fillText('下格', 12, lineY[2]! + 14);

    // 绘制浅色字形底模（供描红）
    ctx.save();
    ctx.fillStyle = 'rgba(203, 213, 225, 0.42)';
    ctx.font = `bold ${height * 0.6}px "Baloo 2", -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(symbol, width / 2, lineY[2]! - 4);
    ctx.restore();
  }, [symbol]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBackground(ctx, canvas.width, canvas.height);
  }, [drawBackground]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : (e as React.MouseEvent).clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getStrokeColor = () => {
    if (brushMode === 'star') return '#F59E0B'; // 黄金星尘
    if (brushMode === 'jelly') return '#EC4899'; // 果冻粉
    return '#2563EB'; // 经典皇家蓝
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPassed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = getStrokeColor();
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isPassed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    setStrokeProgress((prev) => {
      const next = Math.min(100, prev + 2.5);
      if (next >= 100 && !isPassed) {
        setIsPassed(true);
        sfxCorrect();
        sfxWin();
        triggerHaptic([50, 40, 80]);
        celebrateSmall();
        onPass?.();
      }
      return next;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    sfxTap();
    triggerHaptic(20);
    setStrokeProgress(0);
    setHasDrawn(false);
    setIsPassed(false);
    redraw();
  };

  const handleDemonstrate = () => {
    if (isGuiding) return;
    sfxTap();
    setIsGuiding(true);
    setGuideStep(1);

    const timer = setTimeout(() => {
      setGuideStep(2);
      const timer2 = setTimeout(() => {
        setIsGuiding(false);
        setGuideStep(0);
      }, 1600);
      return () => clearTimeout(timer2);
    }, 1600);

    return () => clearTimeout(timer);
  };

  return (
    <div className={`flex flex-col items-center select-none w-full max-w-md mx-auto ${className}`}>
      {/* ── 顶部四线三格规范指引栏 ── */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl border-2 border-amber-300 shadow-sm mb-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/hongen_pinyin/magic_brush.jpg"
            alt="魔法画笔"
            className="w-10 h-10 rounded-xl object-cover border border-amber-400 shadow-md"
          />
          <div>
            <div className="text-xs sm:text-sm font-black text-amber-950">
              {gridSpec?.gridDesc || '四线三格规范书写'}
            </div>
            <div className="text-[11px] font-bold text-amber-800">
              共 {gridSpec?.strokeCount || 2} 笔 · {guides[guideStep] || guides[0]}
            </div>
          </div>
        </div>
        <button
          onClick={handleDemonstrate}
          disabled={isGuiding}
          className="text-xs font-black px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
        >
          {isGuiding ? '✨ 演示中...' : '🪄 手把手演示'}
        </button>
      </div>

      {/* ── 魔法画笔切换条 ── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-black text-ink-soft">魔法画笔：</span>
        {[
          { id: 'rainbow', name: '彩虹笔', icon: '🌈' },
          { id: 'star', name: '金星笔', icon: '✨' },
          { id: 'jelly', name: '果冻笔', icon: '🍭' },
        ].map((b) => (
          <button
            key={b.id}
            onClick={() => {
              sfxTap();
              setBrushMode(b.id as BrushMode);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 border transition-all cursor-pointer ${
              brushMode === b.id
                ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm scale-105'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{b.icon}</span>
            <span>{b.name}</span>
          </button>
        ))}
      </div>

      {/* ── 3D 画布容器 ── */}
      <div className="relative w-[340px] h-[230px] max-w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-300 bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={510}
          height={345}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* 动态小爪子/小手演示动画 */}
        <AnimatePresence>
          {isGuiding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 60, y: 80 }}
              animate={{
                opacity: 1,
                scale: [1, 1.15, 1],
                x: [80, 170, 250],
                y: [90, 130, 110],
              }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="absolute pointer-events-none text-4xl filter drop-shadow-lg"
            >
              🐾
            </motion.div>
          )}
        </AnimatePresence>

        {/* 通关勋章与评价 */}
        <AnimatePresence>
          {isPassed && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="text-6xl animate-bounce">🌟</div>
              <div className="text-xl font-black text-candy-purple-deep mt-2">
                太棒啦！书写满分！
              </div>
              <div className="text-xs font-bold text-ink-soft">
                四线三格住得正，笔顺规范顶呱呱！
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 底部完成度与操作条 ── */}
      <div className="w-full max-w-[340px] mt-3 space-y-2.5">
        {/* 描红进度条 */}
        <div className="flex items-center gap-2">
          <div className="text-xs font-black text-ink-soft min-w-14">完成度</div>
          <div className="flex-1 h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-yellow-400 transition-all duration-200"
              style={{ width: `${strokeProgress}%` }}
            />
          </div>
          <span className="text-xs font-black text-candy-blue-deep min-w-8 text-right">
            {Math.round(strokeProgress)}%
          </span>
        </div>

        {/* 笔画名称提示胶囊 */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {strokes.map((name, i) => (
            <span
              key={name + i}
              className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs"
            >
              {name}
            </span>
          ))}
        </div>

        {/* 底部按钮栏 */}
        <div className="flex justify-center gap-3 pt-1">
          <CandyButton
            tone="orange"
            size="sm"
            variant="soft"
            onClick={handleClear}
            disabled={!hasDrawn}
          >
            🧹 擦掉重写
          </CandyButton>
          {isPassed && (
            <CandyButton
              tone="green"
              size="sm"
              onClick={() => {
                sfxTap();
                onPass?.();
              }}
            >
              下一步 ➔
            </CandyButton>
          )}
        </div>
      </div>
    </div>
  );
}
