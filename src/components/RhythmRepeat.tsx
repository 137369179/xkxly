/**
 * 音乐节奏模仿 🥁 (R1)
 * 听节奏 → 模仿敲击，听觉记忆+节奏感
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { getAudioContext } from '@/lib/audioContext';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';

type Beat = '🔴' | '🟡' | '🟢';
const BEAT_EMOJI: Beat[] = ['🔴','🟡','🟢'];

interface Pattern { beats: Beat[]; speed: number; name: string; }
const PATTERNS: Pattern[] = [
  { name: '入门', speed: 600, beats: ['🔴','🔴','🟡','🟢'] },
  { name: '简单', speed: 500, beats: ['🔴','🟡','🔴','🟢','🟡'] },
  { name: '中等', speed: 400, beats: ['🟢','🟡','🔴','🟡','🟢','🔴'] },
  { name: '挑战', speed: 300, beats: ['🔴','🟢','🟡','🔴','🟢','🟡','🔴'] },
  { name: '大师', speed: 250, beats: ['🟡','🔴','🟢','🟡','🟢','🔴','🟡','🟢'] },
];

function playDrum(type: Beat) {
  try {
    const audioCtx = getAudioContext();
    const freq = type === '🔴' ? 150 : type === '🟡' ? 250 : 400;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
  } catch {}
}

export function RhythmRepeat({ onComplete }: { onComplete?: (correct: boolean, star: number) => void }) {
  const [mode, setMode] = useState<'listen' | 'play' | 'result'>('listen');
  const [patternIdx, setPatternIdx] = useState(0);
  const [displayBeat, setDisplayBeat] = useState<Beat | null>(null);
  const [userBeats, setUserBeats] = useState<Beat[]>([]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patternTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pattern = PATTERNS[patternIdx]!!

  const playPattern = useCallback(() => {
    setMode('listen');
    setUserBeats([]);
    setFeedback('');
    let i = 0;
    const step = () => {
      if (i >= pattern.beats.length) {
        setDisplayBeat(null);
        setMode('play');
        return;
      }
      const beat = pattern.beats[i]!;
      setDisplayBeat(beat);
      playDrum(beat);
      i++;
      patternTimerRef.current = setTimeout(() => {
        setDisplayBeat(null);
        patternTimerRef.current = setTimeout(step, pattern.speed * 0.4);
      }, pattern.speed * 0.6);
    };
    step();
  }, [pattern]);

  useEffect(() => { return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (patternTimerRef.current) clearTimeout(patternTimerRef.current);
  }; }, []);

  const tapBeat = (beat: Beat) => {
    if (mode !== 'play') return;
    playDrum(beat);
    sfxTap();
    const newUser = [...userBeats, beat];
    setUserBeats(newUser);
    if (newUser.length === pattern.beats.length) {
      const correct = newUser.every((b, i) => b === pattern.beats[i]);
      if (correct) {
        sfxCorrect(); setScore(s => s + 1); setFeedback('🎉 完美！节奏感很棒！');
        void speak('太棒了！', { lang:'zh-CN', rate:0.85, module:'praise' });
        onComplete?.(true, 2);
      } else {
        sfxWrong(); setFeedback('❌ 节奏不对，再听一遍');
        void speak('再听一遍', { lang:'zh-CN', rate:0.85, module:'praise' });
        onComplete?.(false, 0);
      }
      setMode('result');
      timerRef.current = setTimeout(() => {
        setPatternIdx((patternIdx + 1) % PATTERNS.length);
      }, 1500);
    }
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🥉 节奏模仿</h3>
      <div className="mb-3 flex justify-center gap-2">
        {PATTERNS.map((p, i) => (
          <button key={p.name} onClick={() => { setPatternIdx(i); setMode('listen'); setTimeout(playPattern, 100); }}
            className={cn('rounded-xl px-3 py-1.5 text-xs font-extrabold',
              patternIdx === i ? 'bg-candy-pink-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="mb-4 text-center">
        <p className="mb-2 text-sm font-bold text-ink-soft">
          {mode === 'listen' ? '🔊 听节奏…' : mode === 'play' ? '👆 按顺序敲出来！' : feedback}
        </p>
        <div className="flex justify-center gap-2 min-h-[60px] items-center">
          {mode === 'listen' && displayBeat && (
            <motion.div key={displayBeat + Date.now()} initial={{scale:0.5}} animate={{scale:1.2}} className="text-5xl">
              {displayBeat}
            </motion.div>
          )}
          {mode === 'play' && (
            <>
              {pattern.beats.map((_b, i) => (
                <span key={`b-${i}`} className={cn('text-2xl', i < userBeats.length && 'opacity-100', i >= userBeats.length && 'opacity-30')}>
                  {i < userBeats.length ? userBeats[i] : '⚪'}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {mode === 'play' && (
        <div className="flex justify-center gap-4">
          {BEAT_EMOJI.map(b => (
            <button key={b} onClick={() => tapBeat(b)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-lg transition-all hover:scale-110 active:scale-95 active:bg-candy-pink-soft">
              {b}
            </button>
          ))}
        </div>
      )}

      {mode === 'listen' && (
        <div className="text-center">
          <CandyButton tone="pink" size="lg" onClick={playPattern}>🔊 重新听</CandyButton>
        </div>
      )}

      {mode === 'result' && (
        <div className="text-center">
          <CandyButton tone="blue" size="lg" onClick={() => { setPatternIdx((patternIdx + 1) % PATTERNS.length); setTimeout(playPattern, 200); }}>⏭️ 下一关</CandyButton>
        </div>
      )}

      <div className="mt-3 text-center text-xs font-bold text-ink-soft">得分 {score}</div>
    </div>
  );
}
