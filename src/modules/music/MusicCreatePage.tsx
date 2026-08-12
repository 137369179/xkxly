/**
 * 音乐创作工作室 🎹 (B1 音乐升级)
 * ------------------------------------------------------------
 * 1. 自由创作：8 音彩色琴键 + 录制回放
 * 2. AI 创作点评：敲完一段让 AI 点评
 * 3. 节奏模仿：集成 RhythmRepeat
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useAiStream } from '@/lib/ai/useAi';
import { musicCreateTask } from '@/lib/ai/tasks/music';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

// 8 音阶
const NOTES = [
  { name: 'Do',  freq: 261.63, color: 'bg-red-400',    border: 'border-red-500',    label: '🔴' },
  { name: 'Re',  freq: 293.66, color: 'bg-orange-400', border: 'border-orange-500', label: '🟠' },
  { name: 'Mi',  freq: 329.63, color: 'bg-amber-400',  border: 'border-amber-500',  label: '🟡' },
  { name: 'Fa',  freq: 349.23, color: 'bg-green-400',  border: 'border-green-500',  label: '🟢' },
  { name: 'Sol', freq: 392.00, color: 'bg-teal-400',  border: 'border-teal-500',  label: '🔵' },
  { name: 'La',  freq: 440.00, color: 'bg-blue-400',  border: 'border-blue-500',  label: '🟣' },
  { name: 'Ti',  freq: 493.88, color: 'bg-purple-400',border: 'border-purple-500', label: '💜' },
  { name: 'HiDo',freq: 523.25, color: 'bg-pink-400',  border: 'border-pink-500',  label: '💖' },
];

function playFreq(freq: number, duration = 0.5) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { sfxTap(); }
}

export default function MusicCreatePage() {
  const { t: tr } = useTranslation();
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [recordedNotes, setRecordedNotes] = useState<{ freq: number; time: number }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const aiStream = useAiStream();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const startTimeRef = useRef(0);

  // 清理
  useEffect(() => {
    return () => timersRef.current.forEach((t) => clearTimeout(t));
  }, []);

  // 敲琴键
  const handleKeyClick = useCallback(
    (idx: number) => {
      setActiveKey(idx);
      playFreq(NOTES[idx]!.freq);
      const t = setTimeout(() => setActiveKey(null), 300);
      timersRef.current.push(t);

      if (isRecording) {
        setRecordedNotes((prev) => [...prev, { freq: NOTES[idx]!.freq, time: Date.now() - startTimeRef.current }]);
      }
      sfxTap();
    },
    [isRecording],
  );

  // 开始录制
  const startRecording = () => {
    setRecordedNotes([]);
    startTimeRef.current = Date.now();
    setIsRecording(true);
    setShowFeedback(false);
    sfxTap();
  };

  // 停止录制
  const stopRecording = () => {
    setIsRecording(false);
    sfxCorrect();
  };

  // 回放
  const playBack = useCallback(() => {
    if (recordedNotes.length === 0) return;
    setIsPlaying(true);
    let prev = 0;
    recordedNotes.forEach((note) => {
      const t = setTimeout(() => {
        const idx = NOTES.findIndex((n) => n.freq === note.freq);
        if (idx >= 0) {
          setActiveKey(idx);
          playFreq(note.freq);
          setTimeout(() => setActiveKey(null), 400);
        }
      }, prev);
      prev += 500; // 每个音符 500ms
      timersRef.current.push(t);
    });
    const endT = setTimeout(() => setIsPlaying(false), prev + 200);
    timersRef.current.push(endT);
  }, [recordedNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // 清除
  const clearRecording = () => {
    setRecordedNotes([]);
    setShowFeedback(false);
    sfxTap();
  };

  // AI 点评创作
  const askAiFeedback = () => {
    if (recordedNotes.length === 0) return;
    const noteStr = recordedNotes.map((n) => NOTES.find((x) => x.freq === n.freq)?.name ?? '?').join(' → ');
    aiStream.run(musicCreateTask(noteStr));
    setShowFeedback(true);
  };

  const noteCount = recordedNotes.length;

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={tr('music.createTitle', { defaultValue: '🎹 音乐创作小舞台' })}
        subtitle={tr('music.createSubtitle', { defaultValue: '自由创作 · 录制回放 · AI 点评' })}
        tone="pink"
      />

      {/* 琴键区 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50 text-center">
        <h3 className="mb-2 text-lg font-black text-pink-900">{tr('music.createKeys', { defaultValue: '🎵 彩色小琴键' })}</h3>

        <div className="mx-auto flex max-w-xl justify-center gap-1.5 sm:gap-2">
          {NOTES.map((n, i) => (
            <button
              key={n.name}
              onClick={() => handleKeyClick(i)}
              className={cn(
                'flex h-36 flex-1 flex-col items-center justify-end rounded-2xl p-2 font-black shadow-fluffy transition-all active:translate-y-2',
                n.color, n.border,
                activeKey === i ? 'scale-110 ring-4 ring-white' : 'hover:scale-102',
              )}
            >
              <span className="text-2xl">{n.label}</span>
              <span className="text-sm text-white">{n.name}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* 录制控制 */}
      <Panel className="border-2 border-purple-200 bg-purple-50 text-center">
        <h3 className="mb-3 text-base font-black text-purple-900">
          {tr('music.recordPanel', { defaultValue: '🎙️ 录制我的创作' })}
        </h3>
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {!isRecording ? (
            <CandyButton tone="pink" size="sm" onClick={startRecording}>
              {tr('music.startRecord', { defaultValue: '🔴 开始录制' })}
            </CandyButton>
          ) : (
            <CandyButton tone="orange" size="sm" onClick={stopRecording}>
              ⏹ {tr('music.stopRecord', { defaultValue: '停止录制' })}
            </CandyButton>
          )}
          <CandyButton
            tone="purple"
            size="sm"
            onClick={playBack}
            disabled={noteCount === 0 || isPlaying}
          >
            {isPlaying ? tr('music.playing', { defaultValue: '▶ 播放中…' }) : tr('music.playback', { defaultValue: '▶ 回放' })}
          </CandyButton>
          <CandyButton tone="blue" size="sm" onClick={clearRecording} disabled={noteCount === 0}>
            {tr('music.clear', { defaultValue: '🗑 清除' })}
          </CandyButton>
          <CandyButton
            tone="blue"
            size="sm"
            onClick={askAiFeedback}
            disabled={noteCount === 0}
          >
            {tr('music.aiFeedback', { defaultValue: '🤖 AI 点评' })}
          </CandyButton>
        </div>

        {/* 录制状态指示 */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 flex items-center justify-center gap-2"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-2xl"
              >🔴</motion.span>
              <span className="text-sm font-black text-red-600">
                {tr('music.recording', { defaultValue: '正在录制…' })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 录制音符可视化 */}
        {noteCount > 0 && (
          <div className="rounded-xl bg-white p-3 text-center">
            <div className="mb-1 text-xs font-black text-purple-600">
              {tr('music.recorded', { defaultValue: '已录制' })} {noteCount} {tr('music.notes', { defaultValue: '个音符' })}
            </div>
            <div className="flex flex-wrap justify-center gap-1 text-xl">
              {recordedNotes.map((n, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-lg"
                >
                  {NOTES.find((x) => x.freq === n.freq)?.label ?? '?'}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* AI 点评 */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Panel className="border-2 border-blue-300 bg-blue-50">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <span className="font-black text-blue-900">{tr('music.aiSays', { defaultValue: '小智说' })}</span>
                {aiStream.status === 'thinking' && (
                  <span className="text-xs text-blue-500">{tr('music.thinking', { defaultValue: '正在点评…' })}</span>
                )}
              </div>
              <div className="min-h-10 rounded-xl bg-white p-3 text-sm leading-relaxed text-gray-700">
                {aiStream.text || tr('music.aiHint', { defaultValue: '点击「AI 点评」让小智来听你的创作！' })}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
