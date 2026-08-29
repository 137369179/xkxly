import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { poemScorer, type ScoreResult } from '@/lib/poemScorer';
import { sfxTap, sfxWin } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

interface VoiceScoreModalProps {
  isOpen: boolean;
  poemTitle: string;
  onClose: () => void;
}

export function VoiceScoreModal({ isOpen, poemTitle, onClose }: VoiceScoreModalProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setResult(null);
    }
  }, [isOpen]);

  const handleStartRecording = async () => {
    sfxTap();
    setIsRecording(true);
    setResult(null);

    try {
      await poemScorer.start((_vol, freqData) => {
        // 绘制 Canvas 彩虹声波波浪
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        // 背景彩虹流线
        const barWidth = (width / freqData.length) * 2;
        let x = 0;

        for (let i = 0; i < freqData.length; i++) {
          const barHeight = ((freqData[i] ?? 0) / 255) * height;

          const hue = (i / freqData.length) * 360;
          ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;

          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, 6);
          ctx.fill();

          x += barWidth;
        }
      });
    } catch (e) {
      if (import.meta.env.DEV) console.error('Mic access failed:', e);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    sfxTap();
    const res = poemScorer.stop();
    setIsRecording(false);
    setResult(res);
    sfxWin();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border-4 border-candy-purple/40 bg-gradient-to-b from-white to-purple-50 p-6 shadow-2xl"
        >
          {/* 关闭按钮 */}
          <button
            onClick={() => {
              sfxTap();
              if (isRecording) poemScorer.stop();
              onClose();
            }}
            aria-label={t('voiceScoreModal.closeAria')}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-black/5 text-lg font-bold text-ink/60 hover:bg-black/10"
          >
            ✕
          </button>

          <div className="text-center space-y-3">
            <div className="inline-block rounded-full bg-candy-purple/20 px-4 py-1 text-xs font-black text-candy-purple">
              {t('voiceScoreModal.badge')}
            </div>
            <h3 className="text-2xl font-black text-ink-main">
              {t('voiceScoreModal.reciteTitle', { title: poemTitle })}
            </h3>
            <p className="text-sm font-extrabold text-ink-soft">
              {t('voiceScoreModal.desc')}
            </p>
          </div>

          {/* 彩虹声波画板 */}
          <div className="my-6 relative overflow-hidden rounded-2xl border-2 border-candy-purple/30 bg-black/90 p-2 h-36 flex items-center justify-center">
            <canvas ref={canvasRef} width={400} height={120} className="w-full h-full" />
            {!isRecording && !result && (
              <div className="absolute text-white/60 font-bold text-sm">
                {t('voiceScoreModal.hint')}
              </div>
            )}
          </div>

          {/* 背诵阶段控制按钮 */}
          {!result ? (
            <div className="flex justify-center">
              {!isRecording ? (
                <CandyButton tone="purple" size="lg" onClick={handleStartRecording}>
                  {t('voiceScoreModal.start')}
                </CandyButton>
              ) : (
                <CandyButton tone="pink" size="lg" className="animate-pulse" onClick={handleStopRecording}>
                  {t('voiceScoreModal.stop')}
                </CandyButton>
              )}
            </div>
          ) : (
            /* 背诵结算打分卡片 */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4 text-center space-y-3 shadow-inner"
            >
              <div className="text-4xl animate-bounce">
                {'⭐'.repeat(result.stars)}
              </div>
              <h4 className="text-xl font-black text-amber-900">{result.title}</h4>
              <p className="text-sm font-extrabold text-amber-800">{result.feedback}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold text-ink/70">
                <div className="rounded-xl bg-white p-2 border border-amber-200">
                  {t('voiceScoreModal.fluency', { score: result.fluencyScore })}
                </div>
                <div className="rounded-xl bg-white p-2 border border-amber-200">
                  {t('voiceScoreModal.pitch', { score: result.pitchScore })}
                </div>
              </div>

              <div className="pt-2">
                <CandyButton tone="purple" size="sm" onClick={handleStartRecording}>
                  {t('voiceScoreModal.retry')}
                </CandyButton>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
