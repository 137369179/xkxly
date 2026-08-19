/**
 * 3D 羊毛毡音乐律动与视唱练耳馆 🎹 (Music & Rhythm)
 * ------------------------------------------------------------
 * 基于蒙台梭利音乐教育法：
 * 1. 8 音阶彩色发光小琴键 (Do Re Mi Fa Sol La Ti Do)
 * 2. 听音辨高低 (Pitch Ear Training)
 * 3. 动感节奏大鼓 (Rhythm Drum Beats)
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { getAudioContext } from '@/lib/audioContext';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { RhythmRepeat } from '@/components/RhythmRepeat';
import MusicCreatePage from './MusicCreatePage';
import { useStore, useMastery } from '@/store/useStore';

// Web Audio API 调音引擎
const FREQS = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
const NOTES = [
  { name: 'Do', note: '1', emoji: '🔴', color: 'bg-red-400 border-red-500 text-white' },
  { name: 'Re', note: '2', emoji: '🟠', color: 'bg-orange-400 border-orange-500 text-white' },
  { name: 'Mi', note: '3', emoji: '🟡', color: 'bg-amber-400 border-amber-500 text-white' },
  { name: 'Fa', note: '4', emoji: '🟢', color: 'bg-green-400 border-green-500 text-white' },
  { name: 'Sol', note: '5', emoji: '青', color: 'bg-teal-400 border-teal-500 text-white' },
  { name: 'La', note: '6', emoji: '🔵', color: 'bg-blue-400 border-blue-500 text-white' },
  { name: 'Ti', note: '7', emoji: '🟣', color: 'bg-purple-400 border-purple-500 text-white' },
  { name: 'High Do', note: 'i', emoji: '💖', color: 'bg-pink-400 border-pink-500 text-white' },
];

function playNote(freq: number) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    sfxTap();
  }
}

export default function MusicPage() {
  const { t: tr } = useTranslation();
  const practice = useStore((s) => s.practice);
  const tickTime = useStore((s) => s.tickTime);
  const mastery = useMastery();
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [quizTone, setQuizTone] = useState<{ n1: number; n2: number; ansHigh: boolean } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');
  const [activeTab, setActiveTab] = useState<'piano' | 'create' | 'rhythm'>('piano');
  const lockRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 听音准确率
  const pitchAccuracy = useMemo(() => {
    const m = mastery['music:pitch'];
    if (!m || m.ok + m.ng === 0) return null;
    return Math.round((m.ok / (m.ok + m.ng)) * 100);
  }, [mastery]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(id => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const handleKeyClick = (idx: number) => {
    setActiveKey(idx);
    playNote(FREQS[idx]!);
    tickTime(3);
    const t = setTimeout(() => setActiveKey(null), 300);
    timersRef.current.push(t);
  };

  const startPitchQuiz = () => {
    sfxTap();
    setFeedback('');
    const idx1 = Math.floor(Math.random() * 4); // 低音区
    const idx2 = Math.floor(Math.random() * 4) + 4; // 高音区
    const firstHigher = Math.random() < 0.5;
    const n1 = firstHigher ? idx2 : idx1;
    const n2 = firstHigher ? idx1 : idx2;

    setQuizTone({ n1, n2, ansHigh: firstHigher });

    speak(tr('music.listenPrompt'), { lang: 'zh-CN' });
    const t1 = setTimeout(() => playNote(FREQS[n1]!), 1000);
    const t2 = setTimeout(() => playNote(FREQS[n2]!), 2000);
    timersRef.current.push(t1, t2);
  };

  const handleAnswer = (pickFirst: boolean) => {
    if (!quizTone || lockRef.current) return;
    lockRef.current = true;

    const correct = pickFirst === quizTone.ansHigh;
    if (correct) {
      sfxCorrect();
      setFeedback('correct');
      speak(tr('music.praise'), { lang: 'zh-CN' });
      practice('music:pitch', true, 2, 2);
    } else {
      sfxWrong();
      setFeedback('wrong');
      speak(tr('music.encourage'), { lang: 'zh-CN' });
      practice('music:pitch', false, 0, 2);
    }

    const t = setTimeout(() => {
      lockRef.current = false;
    }, 1200);
    timersRef.current.push(t);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={tr('music.title')}
        subtitle={tr('music.subtitle')}
        tone="pink"
      />

      {/* 3D 羊毛毡梦幻彩色琴键 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50 text-center">
        <h3 className="mb-2 text-lg font-black text-pink-900">{tr('music.pianoTitle')}</h3>
        <p className="mb-4 text-xs font-bold text-pink-600">
          {tr('music.pianoHint')}
        </p>

        <div className="mx-auto flex max-w-xl justify-center gap-1.5 sm:gap-2">
          {NOTES.map((n, i) => (
            <button
              key={n.name}
              onClick={() => handleKeyClick(i)}
              className={`flex h-36 flex-1 flex-col items-center justify-end rounded-2xl p-2 font-black shadow-fluffy transition-all active:translate-y-2 ${n.color} ${
                activeKey === i ? 'scale-105 ring-4 ring-white' : 'hover:scale-102'
              }`}
            >
              <span className="text-2xl">{n.emoji}</span>
              <span className="text-base">{n.name}</span>
              <span className="text-xs opacity-80">{n.note}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* 模式切换 */}
      <div className="flex gap-2">
        {(['piano', 'create', 'rhythm'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${
              activeTab === tab
                ? 'bg-pink-400 text-white shadow-md'
                : 'bg-white text-pink-600 border border-pink-200'
            }`}
          >
            {tab === 'piano' ? tr('music.pianoTab') : tab === 'create' ? tr('music.createTab') : tr('music.rhythmTab')}
          </button>
        ))}
      </div>

      {activeTab === 'create' && <MusicCreatePage />}
      {activeTab === 'rhythm' && (
        <RhythmRepeat
          onComplete={(correct, star) => practice('music:rhythm', correct, star, 2)}
        />
      )}

      {/* 听音辨高低耳朵训练 */}
      <Panel className="border-2 border-purple-300 bg-purple-50 text-center">
        <h3 className="mb-2 text-lg font-black text-purple-900">{tr('music.earTitle')}</h3>
        <p className="mb-4 text-xs font-bold text-purple-600">
          {tr('music.earHint')}
        </p>

        {/* 听音准确率进度 */}
        {pitchAccuracy !== null && (
          <div className="mb-4 rounded-xl bg-white px-4 py-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-black text-purple-700">🎯 听音准确率</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-purple-100">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all"
                  style={{ width: `${pitchAccuracy}%` }}
                />
              </div>
              <span className="text-xs font-black text-purple-900">{pitchAccuracy}%</span>
            </div>
          </div>
        )}

        {!quizTone ? (
          <CandyButton tone="purple" size="md" onClick={startPitchQuiz}>
            {tr('music.startQuiz')}
          </CandyButton>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => playNote(FREQS[quizTone.n1]!)}
                className="rounded-2xl border-2 border-purple-300 bg-white px-6 py-3 text-base font-black text-purple-900 shadow-sm active:scale-95 transition-transform"
              >
                {tr('music.sound1')}
              </button>
              <button
                onClick={() => playNote(FREQS[quizTone.n2]!)}
                className="rounded-2xl border-2 border-purple-300 bg-white px-6 py-3 text-base font-black text-purple-900 shadow-sm active:scale-95 transition-transform"
              >
                {tr('music.sound2')}
              </button>
            </div>

            <div className="flex justify-center gap-3">
              <CandyButton tone="pink" size="sm" onClick={() => handleAnswer(true)}>
                {tr('music.higher1')}
              </CandyButton>
              <CandyButton tone="blue" size="sm" onClick={() => handleAnswer(false)}>
                {tr('music.higher2')}
              </CandyButton>
            </div>

            {feedback === 'correct' && (
              <div className="text-sm font-black text-green-700 animate-bounce">
                {tr('music.correct')}
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="text-sm font-black text-rose-700">
                {tr('music.wrong')}
              </div>
            )}

            <div>
              <CandyButton tone="purple" variant="soft" size="sm" onClick={startPitchQuiz}>
                {tr('music.next')}
              </CandyButton>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
