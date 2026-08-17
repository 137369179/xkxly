import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { useAiStream } from '@/lib/ai/useAi';
import { companionChatTask } from '@/lib/ai/tasks/companion';
import type { HanziEntry } from '@/data/hanziIndex';
import { useTranslation } from '@/i18n/useTranslation';
import { ensureStrokeData } from '@/lib/strokes';
import { gradeHanziWriting, canvasToStroke1024 } from '@/lib/hanziWriting';

interface HanziStrokeWriterProps {
  hanzi: HanziEntry;
  onComplete?: () => void;
  onClose?: () => void;
}

export function HanziStrokeWriter({ hanzi, onComplete, onClose }: HanziStrokeWriterProps) {
  const { t } = useTranslation();
  const addFish = useStore((s) => s.addFish);
  const [gridType, setGridType] = useState<'tian' | 'mi'>('tian');
  const [isAnimating, setIsAnimating] = useState(false);
  const [strokeProgress, setStrokeProgress] = useState(0);
  const [showAiStory, setShowAiStory] = useState(false);
  const [, setWrittenStrokes] = useState<number>(0);
  const [stars, setStars] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  // 手写轨迹（1024 书法坐标），用于真实评分
  const trailRef = useRef<[number, number][]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { text: aiStoryText, run: runAiStream } = useAiStream();

  // 清空画布
  const clearCanvas = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    setWrittenStrokes(0);
    setStars(null);
    trailRef.current = [];
  };

  useEffect(() => {
    clearCanvas();
    // 自动发音
    speak(`${hanzi.c}，${hanzi.p}`);
  }, [hanzi]);

  // 模拟笔画动画播放
  const handlePlayStrokes = () => {
    if (isAnimating) return;
    sfxTap();
    setIsAnimating(true);
    setStrokeProgress(0);
    speak(`${hanzi.c}，按顺时针书写，共 ${hanzi.strokes} 画`);

    const strokeCount = hanzi.strokes || 5;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setStrokeProgress(step);
      if (step >= strokeCount) {
        clearInterval(timer);
        setIsAnimating(false);
      }
    }, 600);
  };

  // 画布绘图处理
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const rect = cvs.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]!.clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (cvs.width / rect.width),
      y: (clientY - rect.top) * (cvs.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPosRef.current) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.strokeStyle = '#e05a80'; // 果冻粉深粉笔迹
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // 记录轨迹点（转 1024 书法坐标供评分）
    trailRef.current.push(canvasToStroke1024(pos.x, pos.y, cvs.width));

    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPosRef.current = null;
      setWrittenStrokes((prev) => prev + 1);
    }
  };

  // 提交笔画书写验证（真实笔顺数据评分）
  const handleVerifyWriting = async () => {
    if (submitting) return;
    sfxTap();
    setSubmitting(true);
    try {
      const data = await ensureStrokeData(hanzi.c);
      const grade = gradeHanziWriting(trailRef.current, data);
      setStars(grade.stars);
      if (grade.fish > 0) addFish(grade.fish);
      if (grade.stars >= 2) celebrateSmall();
      const msg =
        grade.stars >= 3
          ? t('hanziStrokeWriter.rewardPerfect', { char: hanzi.c, fish: grade.fish })
          : grade.stars === 2
            ? t('hanziStrokeWriter.rewardGood', { char: hanzi.c, fish: grade.fish })
            : t('hanziStrokeWriter.rewardTry', { char: hanzi.c });
      speak(msg, { lang: 'zh-CN' });
      onComplete?.();
    } finally {
      setSubmitting(false);
    }
  };

  // AI 故事生成
  const handleGenerateAiStory = () => {
    sfxTap();
    setShowAiStory(true);
    runAiStream(
      companionChatTask(`请用适合3-6岁孩子的童趣口吻，围绕汉字“${hanzi.c}”（拼音：${hanzi.p}，含义：${hanzi.origin}）编一段30字以内超可爱的微故事！`, [])
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-candy-pink-light to-candy-pink-soft rounded-3xl p-4 sm:p-6 border-4 border-candy-pink-soft shadow-jelly space-y-4 jelly-shine">
      {/* 头部信息与语音控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3 py-1 bg-candy-pink-soft text-candy-pink-deep rounded-full">
            {t('hanziStrokeWriter.radicalMeta', { radical: hanzi.radical, strokes: hanzi.strokes })}
          </span>
          <span className="text-xs font-bold text-candy-pink-deep">{hanzi.origin}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sfxTap();
              setGridType(gridType === 'tian' ? 'mi' : 'tian');
            }}
            className="text-xs font-black px-2.5 py-1 bg-white border border-candy-pink-soft text-candy-pink-deep rounded-lg shadow-xs active:scale-95"
          >
            {gridType === 'tian' ? t('hanziStrokeWriter.miGrid') : t('hanziStrokeWriter.tianGrid')}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-candy-pink-deep hover:text-candy-red text-lg font-black px-2"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 田字格 / 米字格 描红书写舞台 */}
      <div className="relative w-64 h-64 mx-auto bg-candy-pink-light rounded-2xl border-4 border-candy-red shadow-inner flex items-center justify-center overflow-hidden touch-none">
        {/* 田字格 / 米字格 红色虚线网格（果冻红保持田字格语义） */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
          <line x1="50" y1="0" x2="50" y2="100" stroke="#ffb6c9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#ffb6c9" strokeWidth="1" strokeDasharray="3 3" />
          {gridType === 'mi' && (
            <>
              <line x1="0" y1="0" x2="100" y2="100" stroke="#ffe9ee" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#ffe9ee" strokeWidth="1" strokeDasharray="2 2" />
            </>
          )}
        </svg>

        {/* 汉字轮廓浅灰底字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-[120px] font-black text-slate-200/90 leading-none tracking-widest font-serif">
            {hanzi.c}
          </span>
        </div>

        {/* 笔画动画高亮字 */}
        {isAnimating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <motion.span
              key={strokeProgress}
              initial={{ scale: 0.95, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[120px] font-black text-candy-red/80 leading-none tracking-widest font-serif"
            >
              {hanzi.c}
            </motion.span>
          </div>
        )}

        {/* 手写 Canvas 绘图层 */}
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        />
      </div>

      {/* 拼音发音与操作栏 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
            sfxTap();
            speak(`${hanzi.c}，${hanzi.p}`);
          }}
          className="px-4 py-2 bg-candy-pink hover:bg-candy-pink-deep text-white font-black rounded-xl shadow-jelly active:scale-95 flex items-center gap-1.5 text-sm"
        >
          <span>🔊 {hanzi.p}</span>
        </button>

        <button
          onClick={handlePlayStrokes}
          disabled={isAnimating}
          className="px-4 py-2 bg-candy-blue hover:bg-candy-blue-deep text-white font-black rounded-xl shadow-jelly active:scale-95 flex items-center gap-1.5 text-sm disabled:opacity-50"
        >
          <span>{t('hanziStrokeWriter.playStrokes')}</span>
        </button>

        <button
          onClick={clearCanvas}
          className="px-3 py-2 bg-white border border-candy-pink-soft hover:bg-candy-pink-light text-candy-pink-deep font-bold rounded-xl active:scale-95 text-xs"
        >
          {t('hanziStrokeWriter.rewrite')}
        </button>
      </div>

      {/* 提交验证与星级结算 */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-candy-pink-soft">
        {stars === null ? (
          <CandyButton
            tone="green"
            size="md"
            className="w-full max-w-xs"
            onClick={handleVerifyWriting}
            disabled={submitting}
          >
            {t('hanziStrokeWriter.submit')}
          </CandyButton>
        ) : (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-1 bg-white/80 p-3 rounded-2xl border border-candy-green w-full"
          >
            <div className="flex items-center gap-1 text-2xl">
              {[1, 2, 3].map((s) => (
                <motion.span
                  key={s}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ delay: s * 0.15 }}
                  className={s <= (stars ?? 0) ? '' : 'opacity-25 grayscale'}
                >
                  ⭐
                </motion.span>
              ))}
            </div>
            <span className="text-xs font-black text-candy-green-deep">{t('hanziStrokeWriter.reward')}</span>
          </motion.div>
        )}
      </div>

      {/* AI 小智汉字微故事 */}
      <div className="pt-2 border-t border-candy-pink-soft">
        {!showAiStory ? (
          <button
            onClick={handleGenerateAiStory}
            className="w-full text-center text-xs font-black text-candy-pink-deep hover:text-candy-red bg-candy-pink-soft/80 hover:bg-candy-pink-light border border-candy-pink-soft transition-all flex items-center justify-center gap-1.5"
          >
            <span>{t('hanziStrokeWriter.aiStoryBtn', { char: hanzi.c })}</span>
          </button>
        ) : (
          <div className="bg-white/90 p-3 rounded-2xl border border-candy-pink-soft text-xs font-bold text-candy-pink-deep space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-black text-candy-pink-deep">
              <span>{t('hanziStrokeWriter.aiStoryTitle')}</span>
              <button onClick={() => setShowAiStory(false)} className="text-candy-pink-deep hover:text-candy-red">
                ✕
              </button>
            </div>
            <div className="text-slate-800 text-xs leading-relaxed animate-pulse">
              {aiStoryText || t('hanziStrokeWriter.aiStoryLoading')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
