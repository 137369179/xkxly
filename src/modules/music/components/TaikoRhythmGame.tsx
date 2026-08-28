import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { getAudioContext } from '@/lib/audioContext';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';

interface Note {
  id: number;
  time: number; // in seconds from start
  type: 'don' | 'ka';
  hit?: 'perfect' | 'great' | 'miss';
}

interface Song {
  id: string;
  title: string;
  bpm: number;
  duration: number; // in seconds
  notes: Array<{ at: number; type: 'don' | 'ka' }>;
}

const SONGS: Song[] = [
  {
    id: 'two-tigers',
    title: '🐯 两只老虎 (欢快律动)',
    bpm: 100,
    duration: 16,
    notes: [
      { at: 1.0, type: 'don' },
      { at: 2.0, type: 'don' },
      { at: 3.0, type: 'ka' },
      { at: 4.0, type: 'don' },
      { at: 5.0, type: 'don' },
      { at: 6.0, type: 'don' },
      { at: 7.0, type: 'ka' },
      { at: 8.0, type: 'don' },
      { at: 9.0, type: 'don' },
      { at: 10.0, type: 'ka' },
      { at: 11.0, type: 'don' },
      { at: 12.0, type: 'don' },
      { at: 13.0, type: 'don' },
      { at: 14.0, type: 'ka' },
    ],
  },
  {
    id: 'twinkle-star',
    title: '⭐ 小星星 (柔和节奏)',
    bpm: 80,
    duration: 16,
    notes: [
      { at: 1.5, type: 'don' },
      { at: 2.5, type: 'don' },
      { at: 3.5, type: 'ka' },
      { at: 4.5, type: 'ka' },
      { at: 5.5, type: 'don' },
      { at: 6.5, type: 'don' },
      { at: 7.5, type: 'ka' },
      { at: 9.0, type: 'don' },
      { at: 10.0, type: 'don' },
      { at: 11.0, type: 'ka' },
      { at: 12.0, type: 'ka' },
      { at: 13.5, type: 'don' },
    ],
  },
  {
    id: 'counting-ducks',
    title: '🦆 数鸭子 (门前大桥下)',
    bpm: 110,
    duration: 16,
    notes: [
      { at: 1.0, type: 'don' },
      { at: 2.0, type: 'ka' },
      { at: 3.0, type: 'don' },
      { at: 4.0, type: 'don' },
      { at: 5.5, type: 'ka' },
      { at: 6.5, type: 'ka' },
      { at: 7.5, type: 'don' },
      { at: 9.0, type: 'don' },
      { at: 10.0, type: 'ka' },
      { at: 11.5, type: 'don' },
      { at: 13.0, type: 'ka' },
      { at: 14.5, type: 'don' },
    ],
  },
  {
    id: 'pull-radish',
    title: '🥕 拔萝卜 (合力大合唱)',
    bpm: 95,
    duration: 16,
    notes: [
      { at: 1.0, type: 'don' },
      { at: 2.0, type: 'don' },
      { at: 3.5, type: 'ka' },
      { at: 5.0, type: 'don' },
      { at: 6.5, type: 'ka' },
      { at: 8.0, type: 'don' },
      { at: 9.5, type: 'don' },
      { at: 11.0, type: 'ka' },
      { at: 12.5, type: 'don' },
      { at: 14.0, type: 'ka' },
    ],
  },
];

// 太鼓 WebAudio 合成音效
function playTaikoSound(type: 'don' | 'ka') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'don') {
      // 咚：低沉雄厚鼓心震动 (150Hz -> 40Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // 咔：清脆木质鼓边敲击 (800Hz -> 300Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch (e) {
    console.warn('Taiko WebAudio error', e);
  }
}

export function TaikoRhythmGame() {
  const [selectedSongIdx, setSelectedSongIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [lastHitJudge, setLastHitJudge] = useState<'PERFECT' | 'GREAT' | null>(null);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const currentSong = SONGS[selectedSongIdx] ?? SONGS[0] ?? {
    id: 'default',
    title: '太鼓节奏',
    bpm: 90,
    duration: 10,
    notes: [],
  };
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    speak('欢迎来到动感太鼓达人！当音符到达左侧圆圈判定区时，敲击红色鼓心或蓝色鼓边，跟随节拍一起律动吧！');
  }, []);

  const handleStartSong = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setIsPlaying(true);
    setIsGameOver(false);
    setCombo(0);
    setScore(0);
    setLastHitJudge(null);

    const initialNotes: Note[] = currentSong.notes.map((n, idx) => ({
      id: idx,
      time: n.at,
      type: n.type,
    }));
    setNotes(initialNotes);

    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      setNotes((prevNotes) =>
        prevNotes.map((n) => {
          if (!n.hit && elapsed - n.time > 0.4) {
            return { ...n, hit: 'miss' };
          }
          return n;
        })
      );

      if (elapsed >= currentSong.duration) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsPlaying(false);
        setIsGameOver(true);
        sfxWin();
        triggerHaptic([50, 40, 50, 40, 80]);
        celebrateBig();
        addStars(6);
        addFish(2);
        speak(`太棒啦！节拍感非常精准，恭喜获得 6 颗节奏之星！`);
      }
    }, 50);
  }, [currentSong, addStars, addFish]);

  const handleStopSong = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleHitDrum = useCallback((type: 'don' | 'ka') => {
    playTaikoSound(type);
    triggerHaptic(type === 'don' ? 30 : 20);

    if (!isPlaying) return;

    // 寻找在当前时间 ±0.45s 内最近且未命中的音符
    const candidate = notes.find(
      (n) => !n.hit && Math.abs(n.time - currentTime) <= 0.45 && n.type === type
    );

    if (candidate) {
      const diff = Math.abs(candidate.time - currentTime);
      let judge: 'perfect' | 'great' = 'great';
      let pts = 50;

      if (diff <= 0.18) {
        judge = 'perfect';
        pts = 100;
        celebrateSmall();
      }

      sfxCorrect();
      setCombo((c) => c + 1);
      setScore((s) => s + pts);
      setLastHitJudge(judge.toUpperCase() as 'PERFECT' | 'GREAT');

      setNotes((prev) =>
        prev.map((n) => (n.id === candidate.id ? { ...n, hit: judge } : n))
      );
    }
  }, [isPlaying, notes, currentTime]);

  // 太鼓键盘交互快捷键 (F/J 咚, D/K 咔, 空格开始/暂停)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'j' || e.key === 'J' || e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleHitDrum('don');
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'k' || e.key === 'K' || e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleHitDrum('ka');
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isPlaying) {
          handleStartSong();
        } else {
          handleStopSong();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHitDrum, handleStartSong, handleStopSong, isPlaying]);

  return (
    <div className="space-y-6">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-rose-900 font-bold bg-rose-50/90 px-3 py-1 rounded-xl border border-rose-200">
          ⌨️ 键盘快捷操作：F/J 敲鼓心 · D/K 敲鼓边 · 空格/Enter 开启/暂停演奏
        </span>
      </div>

      {/* 歌曲快速切换 */}
      <div className="flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="曲目选择">
        {SONGS.map((song, idx) => (
          <button
            key={song.id}
            type="button"
            role="tab"
            aria-selected={selectedSongIdx === idx}
            onClick={() => {
              if (!isPlaying) {
                sfxTap();
                triggerHaptic(20);
                setSelectedSongIdx(idx);
              }
            }}
            className={`min-h-[44px] px-4 py-2 rounded-2xl font-black text-xs transition-all focus-visible:ring-4 focus-visible:ring-rose-300 focus:outline-none ${
              selectedSongIdx === idx
                ? 'bg-rose-500 text-white shadow-md scale-105'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95'
            }`}
          >
            {song.title}
          </button>
        ))}
      </div>

      {/* 顶部歌曲选择与分数看板 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white rounded-3xl shadow-xl border-2 border-red-300">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🥁</span>
          <div>
            <h3 className="text-xl font-black">{currentSong.title}</h3>
            <p className="text-xs text-red-100 font-medium">
              BPM: {currentSong.bpm} · 节奏打击乐
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center bg-white/20 px-3 py-1.5 rounded-2xl">
            <span className="text-xs font-bold block text-red-100">COMBO</span>
            <span className="text-2xl font-black text-amber-300">{combo}</span>
          </div>
          <div className="text-center bg-white/20 px-4 py-1.5 rounded-2xl">
            <span className="text-xs font-bold block text-red-100">SCORE</span>
            <span className="text-2xl font-black">{score}</span>
          </div>

          {!isPlaying ? (
            <button
              type="button"
              onClick={handleStartSong}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-2xl font-black text-sm shadow-md transition-transform active:scale-95"
            >
              ▶️ 开始演奏
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopSong}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-black text-sm"
            >
              ⏸️ 暂停
            </button>
          )}
        </div>
      </div>

      {/* 太鼓跑道与判定区 (Taiko Runway) */}
      <div className="relative w-full h-40 bg-slate-900 rounded-3xl border-4 border-amber-400 shadow-2xl overflow-hidden flex items-center">
        {/* 左侧圆圈判定区 (Hit Zone Target) */}
        <div className="absolute left-8 z-10 w-20 h-20 rounded-full border-4 border-dashed border-amber-300 bg-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)]">
          <span className="text-xs font-black text-amber-300 tracking-wider">
            HIT!
          </span>
        </div>

        {/* 判定浮动反馈 (PERFECT / GREAT) */}
        {lastHitJudge && (
          <motion.div
            key={Date.now()}
            initial={{ scale: 0.5, y: 0, opacity: 1 }}
            animate={{ scale: 1.2, y: -20, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute left-8 z-20 font-black text-lg ${
              lastHitJudge === 'PERFECT' ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {lastHitJudge}!
          </motion.div>
        )}

        {/* 跑道音符 */}
        <div className="absolute inset-0">
          {notes.map((note) => {
            // 计算音符水平偏移位置：目标位置在 left: 8 + 40px (约 72px)
            // 距离判定时间还有 diff 秒，以 180px/s 速度从右向左滑动
            const diff = note.time - currentTime;
            const leftPx = 72 + diff * 200;

            if (leftPx < -50 || leftPx > 800 || note.hit) return null;

            return (
              <div
                key={note.id}
                style={{ left: `${leftPx}px` }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-3 flex items-center justify-center text-xl shadow-lg transition-transform ${
                  note.type === 'don'
                    ? 'bg-rose-500 border-white text-white shadow-rose-500/50'
                    : 'bg-sky-500 border-white text-white shadow-sky-500/50'
                }`}
              >
                <span>{note.type === 'don' ? '🔴 咚' : '🔵 咔'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部物理大鼓敲击板 (Taiko Drum Controller) */}
      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => handleHitDrum('don')}
          className="h-28 bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl border-4 border-rose-300 shadow-xl flex flex-col items-center justify-center text-white font-black active:shadow-inner cursor-pointer focus-visible:ring-4 focus-visible:ring-rose-300 focus:outline-none select-none"
        >
          <span className="text-4xl">🥁</span>
          <span className="text-lg mt-1">🔴 咚 (敲鼓心 · F/J)</span>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => handleHitDrum('ka')}
          className="h-28 bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl border-4 border-sky-300 shadow-xl flex flex-col items-center justify-center text-white font-black active:shadow-inner cursor-pointer focus-visible:ring-4 focus-visible:ring-sky-300 focus:outline-none select-none"
        >
          <span className="text-4xl">🥢</span>
          <span className="text-lg mt-1">🔵 咔 (敲鼓边 · D/K)</span>
        </motion.button>
      </div>

      {/* 结算弹窗 */}
      {isGameOver && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-gradient-to-br from-amber-50 to-orange-100 rounded-3xl border-4 border-amber-400 text-center space-y-3 shadow-2xl"
        >
          <div className="text-6xl animate-bounce">🏆</div>
          <h4 className="text-2xl font-black text-slate-800">
            演奏大成功！得分：{score}
          </h4>
          <p className="text-xs text-slate-600">
            节拍节奏感超强，你就是乐园的小小鼓手！
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <span className="px-4 py-1.5 bg-amber-500 text-white font-black text-xs rounded-xl shadow">
              ⭐ +6 节奏星
            </span>
            <span className="px-4 py-1.5 bg-orange-500 text-white font-black text-xs rounded-xl shadow">
              🐟 +2 小鱼干
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
