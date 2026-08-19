/**
 * 古诗诵读录音回放
 * MediaRecorder API 录音 + 回放对比
 */

import { useState, useRef, useEffect } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import POEMS from '@/data/poems';
import { moodOfPoem } from '@/lib/chant';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import type { Poem } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

interface ReciteRecorderProps {
  poem: Poem;
}

type Phase = 'idle' | 'recording' | 'recorded' | 'playing';

export function ReciteRecorder({ poem }: ReciteRecorderProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 跟踪最新 audioUrl，避免 cleanup 闭包捕获首次渲染的 null 导致 blob 内存泄漏
  const audioUrlRef = useRef<string | null>(null);

  const lines = poem.lines.map(l => l.text);

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setPhase('recorded');
        stream.getTracks().forEach(t => t.stop());
        stopTimer();
      };

      mr.start();
      setPhase('recording');
      startTimeRef.current = Date.now();
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch {
      setError(t('reciteRecorder.micError'));
      setPhase('idle');
    }
  };

  const stopRecording = () => {
    sfxTap();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const playOriginal = () => {
    sfxTap();
    const pm = POEMS.find(p => p.id === poem.id);
    const moodKey = pm ? moodOfPoem(pm).key : undefined;
    speak(lines.join(' '), { rate: 0.7, lang: 'zh-CN', module: 'poem', moodKey });
  };

  const playRecording = () => {
    sfxTap();
    if (audioRef.current) {
      void audioRef.current.play().catch(() => undefined);
      setPhase('playing');
    }
  };

  const reset = () => {
    sfxTap();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setDuration(0);
    setPhase('idle');
    setError(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Panel>
      <PanelTitle emoji="🎙️" title={t('reciteRecorder.title')} subtitle={t('reciteRecorder.subtitle')} tone="pink" />

      {/* 诗文展示 */}
      <div className="mb-4 rounded-2xl bg-candy-pink-soft p-3">
        {lines.map((line, i) => (
          <p key={`line-${i}`} className="text-center text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{line}</p>
        ))}
      </div>

      {/* 范读 */}
      <div className="mb-3 flex justify-center">
        <CandyButton tone="blue" variant="soft" size="sm" onClick={playOriginal}>
          {t('reciteRecorder.listen')}
        </CandyButton>
      </div>

      {/* 录音控制 */}
      {phase === 'idle' && (
        <div className="text-center">
          <CandyButton tone="pink" size="lg" onClick={startRecording}>
            {t('reciteRecorder.start')}
          </CandyButton>
          {error && <p className="mt-2 text-sm font-bold text-candy-red-deep">{error}</p>}
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-candy-red-deep" />
            <span className="text-lg font-extrabold text-candy-red-deep">录音中… {formatTime(duration)}</span>
          </div>
          <CandyButton tone="pink" size="lg" onClick={stopRecording}>
            {t('reciteRecorder.stop')}
          </CandyButton>

        </div>
      )}

      {(phase === 'recorded' || phase === 'playing') && audioUrl && (
        <div className="space-y-3 text-center">
          <p className="text-sm font-bold text-ink-soft">{t('reciteRecorder.duration', { time: formatTime(duration) })}</p>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setPhase('recorded')}
            className="w-full"
          />
          <div className="flex justify-center gap-2">
            <CandyButton tone="green" size="sm" onClick={playRecording}>
              {t('reciteRecorder.play')}
            </CandyButton>
            <CandyButton tone="blue" variant="soft" size="sm" onClick={playOriginal}>
              {t('reciteRecorder.listen')}
            </CandyButton>
            <CandyButton tone="purple" variant="soft" size="sm" onClick={reset}>
              {t('reciteRecorder.retry')}
            </CandyButton>
          </div>
          <CandyButton tone="green" size="lg" fullWidth onClick={() => { sfxStar(); celebrateSmall(); }}>
            {t('reciteRecorder.done')}
          </CandyButton>
        </div>
      )}
    </Panel>
  );
}
