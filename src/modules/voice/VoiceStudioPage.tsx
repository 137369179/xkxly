/**
 * 🎙️ Phase 4 · 多音色 TTS 角色面板 + 儿童跟读发音评测雷达图
 * ----------------------------------------------------------------
 * VoiceCharacterPanel  —— 三角色音色切换 + 示范朗读
 * PronunciationRadar   —— SVG 五维雷达图（准确度/流畅度/韵律/音调/完整度）
 * FollowReadStudio     —— 儿童跟读练习台（词句逐级、星级评分、进度追踪）
 * VoiceStudioPage      —— 汇总入口页
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import {
  evaluatePronunciation,
  type PronunciationResult,
  type CharEval,
} from '@/lib/pronunciationEval';
import {
  getSpeechRecognitionCtor,
  requestMicPermission,
  detectVoiceOnce,
  classifyRecogError,
} from '@/lib/ai/speechRecog';
import { ArticulationGuideModal } from './components/ArticulationGuideModal';

// ─────────────────────────────────────────────────────────────────────────────
// 1. 音色角色定义
// ─────────────────────────────────────────────────────────────────────────────

interface VoiceCharacter {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  rate: number;
  pitch: number;
  desc: string;
  greeting: string;
}

const VOICE_CHARACTERS: VoiceCharacter[] = [
  {
    id: 'qiqi',
    name: '茜茜',
    emoji: '👧',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    rate: 0.82,
    pitch: 1.15,
    desc: '活泼小女孩·甜美童声',
    greeting: '你好呀！我是茜茜，让我们一起读吧！',
  },
  {
    id: 'teacher',
    name: '温柔老师',
    emoji: '👩‍🏫',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    rate: 0.75,
    pitch: 1.05,
    desc: '温柔亲切·标准普通话',
    greeting: '小朋友好！跟着老师一起来朗读吧！',
  },
  {
    id: 'rabbit',
    name: '活泼小兔',
    emoji: '🐰',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    rate: 0.88,
    pitch: 1.2,
    desc: '蹦蹦跳跳·欢快少儿声',
    greeting: '嗨！小兔子来啦！一起读读读！蹦蹦蹦！',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. 跟读内容库（分级）
// ─────────────────────────────────────────────────────────────────────────────

interface ReadItem {
  id: string;
  level: 1 | 2 | 3;
  text: string;
  pinyin?: string;
  hint?: string;
}

const READ_ITEMS: ReadItem[] = [
  // Level 1: 双字词
  { id: 'w1', level: 1, text: '苹果', pinyin: 'píng guǒ', hint: '🍎 红红的苹果' },
  { id: 'w2', level: 1, text: '小猫', pinyin: 'xiǎo māo', hint: '🐱 喵喵叫的小猫' },
  { id: 'w3', level: 1, text: '太阳', pinyin: 'tài yáng', hint: '☀️ 暖暖的太阳' },
  { id: 'w4', level: 1, text: '花朵', pinyin: 'huā duǒ', hint: '🌸 美丽的花朵' },
  { id: 'w5', level: 1, text: '蝴蝶', pinyin: 'hú dié', hint: '🦋 翩翩起舞的蝴蝶' },
  // Level 2: 短句
  { id: 's1', level: 2, text: '小兔子跳跳跳', pinyin: 'xiǎo tù zi tiào tiào tiào', hint: '🐰 兔子怎么走路？' },
  { id: 's2', level: 2, text: '我爱我的祖国', pinyin: 'wǒ ài wǒ de zǔ guó', hint: '❤️ 爱国情' },
  { id: 's3', level: 2, text: '春天来了真美丽', pinyin: 'chūn tiān lái le zhēn měi lì', hint: '🌸 春天到了' },
  { id: 's4', level: 2, text: '太阳当空照花儿对我笑', hint: '🌞 上学歌' },
  { id: 's5', level: 2, text: '小白兔白又白', pinyin: 'xiǎo bái tù bái yòu bái', hint: '🐰 儿歌' },
  // Level 3: 古诗
  { id: 'p1', level: 3, text: '床前明月光，疑是地上霜', hint: '🌙 李白《静夜思》' },
  { id: 'p2', level: 3, text: '春眠不觉晓，处处闻啼鸟', hint: '🐦 孟浩然《春晓》' },
  { id: 'p3', level: 3, text: '锄禾日当午，汗滴禾下土', hint: '☀️ 李绅《悯农》' },
  { id: 'p4', level: 3, text: '欲穷千里目，更上一层楼', hint: '🏯 王之涣《登鹳雀楼》' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. 雷达图组件
// ─────────────────────────────────────────────────────────────────────────────

interface RadarDim {
  label: string;
  emoji: string;
  value: number;
}

function computeRadarDims(result: PronunciationResult): RadarDim[] {
  const { score, correctCount: _cc, targetCount, chars } = result;
  void _cc;

  const accuracy = score;

  const spoken = chars.filter((c) => c.status !== 'missing').length;
  const completeness = targetCount > 0 ? Math.round((spoken / targetCount) * 100) : 0;

  let maxStreak = 0;
  let cur = 0;
  for (const c of chars) {
    if (c.status === 'correct') { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  }
  const fluency = targetCount > 0 ? Math.min(100, Math.round((maxStreak / targetCount) * 130)) : 0;

  const correctIndices = chars
    .map((c, i) => (c.status === 'correct' ? i : -1))
    .filter((i) => i >= 0);
  let rhythm = 50;
  if (correctIndices.length >= 2) {
    const gaps = correctIndices.slice(1).map((v, i) => v - (correctIndices[i] ?? 0));
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + Math.abs(b - avgGap), 0) / gaps.length;
    rhythm = Math.max(0, Math.min(100, Math.round(100 - variance * 20)));
  } else if (correctIndices.length === 1) {
    rhythm = 60;
  }

  const tone = Math.round(accuracy * 0.6 + completeness * 0.4);

  return [
    { label: '准确度', emoji: '🎯', value: accuracy },
    { label: '流畅度', emoji: '💨', value: fluency },
    { label: '韵律感', emoji: '🎵', value: rhythm },
    { label: '音调', emoji: '🎶', value: tone },
    { label: '完整度', emoji: '✅', value: completeness },
  ];
}

function PronunciationRadar({ result, color = '#6366f1' }: { result: PronunciationResult; color?: string }) {
  const dims = computeRadarDims(result);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const n = dims.length;
  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const ptFor = (i: number, ratio: number) => ({
    x: cx + r * ratio * Math.cos(angleFor(i)),
    y: cy + r * ratio * Math.sin(angleFor(i)),
  });

  const rings = [0.25, 0.5, 0.75, 1];
  const scorePts = dims.map((d, i) => ptFor(i, d.value / 100)).map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ratio) => {
          const pts = dims.map((_, i) => ptFor(i, ratio)).map((p) => `${p.x},${p.y}`).join(' ');
          return <polygon key={ratio} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {dims.map((_, i) => {
          const end = ptFor(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#cbd5e1" strokeWidth="1" />;
        })}
        <polygon points={scorePts} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {dims.map((d, i) => {
          const p = ptFor(i, d.value / 100);
          return <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="1.5" />;
        })}
        {dims.map((d, i) => {
          const a = angleFor(i);
          const lx = cx + (r + 24) * Math.cos(a);
          const ly = cy + (r + 24) * Math.sin(a);
          return <text key={i} x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#475569">{d.emoji}</text>;
        })}
      </svg>
      <div className="grid grid-cols-5 gap-1 w-full max-w-xs">
        {dims.map((d) => (
          <div key={d.label} className="flex flex-col items-center">
            <span className="text-xs font-black text-slate-500">{d.label}</span>
            <span className="text-sm font-black" style={{ color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 音色角色面板
// ─────────────────────────────────────────────────────────────────────────────

function VoiceCharacterPanel({
  selected,
  onSelect,
}: {
  selected: VoiceCharacter;
  onSelect: (c: VoiceCharacter) => void;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const handlePreview = useCallback(async (char: VoiceCharacter) => {
    if (speaking) { stopSpeaking(); setSpeaking(false); setSpeakingId(null); return; }
    sfxTap();
    triggerHaptic(25);
    setSpeaking(true);
    setSpeakingId(char.id);
    try {
      await speak(char.greeting, { lang: 'zh-CN', rate: char.rate, pitch: char.pitch, module: 'quiz' });
    } finally {
      setSpeaking(false);
      setSpeakingId(null);
    }
  }, [speaking]);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-black text-slate-700">🎭 选择朗读角色</h3>
      <div className="grid grid-cols-3 gap-3">
        {VOICE_CHARACTERS.map((char) => {
          const isSel = selected.id === char.id;
          return (
            <motion.button
              key={char.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sfxTap();
                triggerHaptic(30);
                onSelect(char);
              }}
              className={`min-h-[96px] flex flex-col items-center justify-center gap-1.5 rounded-2xl border-3 p-3 transition-all focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none ${
                isSel ? `${char.bgColor} ${char.borderColor} shadow-lg scale-[1.02]` : 'bg-white border-slate-200 hover:border-indigo-200'
              }`}
            >
              <span className="text-3xl">{char.emoji}</span>
              <span className={`text-xs font-black ${isSel ? char.color : 'text-slate-600'}`}>{char.name}</span>
              <span className="text-xs text-slate-400 text-center leading-tight">{char.desc}</span>
            </motion.button>
          );
        })}
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => handlePreview(selected)}
        className={`min-h-[44px] w-full rounded-2xl py-3 text-sm font-black transition-all flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none ${
          speaking && speakingId === selected.id
            ? `${selected.bgColor} ${selected.color} animate-pulse border-2 ${selected.borderColor}`
            : 'bg-gradient-to-r from-slate-700 to-slate-900 text-white hover:opacity-95'
        }`}
      >
        <span>{speaking && speakingId === selected.id ? '⏹️' : '▶️'}</span>
        {speaking && speakingId === selected.id
          ? `${selected.name} 正在说…`
          : `试听 ${selected.name} ${selected.emoji} 的声音`}
      </motion.button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 自定义朗读框
// ─────────────────────────────────────────────────────────────────────────────

function CustomSpeakBox({ character }: { character: VoiceCharacter }) {
  const [text, setText] = useState('');
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = async () => {
    const t = text.trim() || character.greeting;
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    sfxTap();
    setSpeaking(true);
    try {
      await speak(t, { lang: 'zh-CN', rate: character.rate, pitch: character.pitch, module: 'quiz' });
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`让 ${character.name} ${character.emoji} 来读…`}
        className="flex-1 rounded-2xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-300"
        maxLength={80}
      />
      <button
        type="button"
        onClick={handleSpeak}
        className={`px-4 py-2 rounded-2xl text-sm font-black transition-all ${
          speaking ? `${character.bgColor} ${character.color} animate-pulse border-2 ${character.borderColor}` : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        {speaking ? '⏹️' : '▶️'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 跟读练习台
// ─────────────────────────────────────────────────────────────────────────────

type RecPhase = 'idle' | 'listening' | 'evaluating' | 'done';
type RecMode = 'recog' | 'loudread';

function FollowReadStudio({ character }: { character: VoiceCharacter }) {
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [itemIdx, setItemIdx] = useState(0);
  const [phase, setPhase] = useState<RecPhase>('idle');
  const [mode, setMode] = useState<RecMode>('recog');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [playCount, setPlayCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const sessionRef = useRef(0);
  const listenTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quietTRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceDetRef = useRef<{ promise: Promise<boolean>; stop: () => void } | null>(null);
  const recoRef = useRef<InstanceType<NonNullable<Window['SpeechRecognition']>> | null>(null);

  const fallbackItem: ReadItem = READ_ITEMS[0] ?? { id: 'default', level: 1, text: '苹果', pinyin: 'píng guǒ', hint: '🍎 红红的苹果' };
  const levelItems = READ_ITEMS.filter((i) => i.level === level);
  const item = levelItems[itemIdx] ?? levelItems[0] ?? fallbackItem;

  const clearTimers = useCallback(() => {
    if (listenTRef.current) { clearTimeout(listenTRef.current); listenTRef.current = null; }
    if (quietTRef.current) { clearTimeout(quietTRef.current); quietTRef.current = null; }
  }, []);

  const stopDet = useCallback(() => {
    if (voiceDetRef.current) { try { voiceDetRef.current.stop(); } catch { /**/ } voiceDetRef.current = null; }
  }, []);

  const handleTranscript = useCallback((transcript: string, session: number) => {
    if (sessionRef.current !== session) return;
    setPhase('evaluating');
    const res = evaluatePronunciation(item.text, transcript, 'zh-CN', 60);
    setResult(res);
    setPhase('done');
    const s = res.score >= 90 ? 3 : res.score >= 70 ? 2 : res.score >= 50 ? 1 : 0;
    setStars((prev) => ({ ...prev, [item.id]: Math.max(prev[item.id] ?? 0, s) }));
    setPlayCount((p) => p + 1);
    setTotalScore((p) => p + res.score);
    if (res.passed) {
      if (res.score >= 90) {
        sfxWin();
        celebrateBig();
        triggerHaptic([50, 40, 50, 40, 80]);
      } else {
        sfxCorrect();
        celebrateSmall();
        triggerHaptic(45);
      }
      void speak(res.score >= 90 ? '太棒了！满分！' : '读得很好！继续加油！', {
        lang: 'zh-CN', rate: character.rate, pitch: character.pitch, module: 'praise',
      });
    } else {
      sfxWrong();
      triggerHaptic(20);
      void speak('再试一次，你可以的！', { lang: 'zh-CN', rate: character.rate, pitch: character.pitch, module: 'praise' });
    }
  }, [item, character]);

  const goLoudRead = useCallback((session: number) => {
    if (sessionRef.current !== session) return;
    stopDet();
    setMode('loudread');
    setPhase('listening');
    clearTimers();
    const det = detectVoiceOnce(20000);
    voiceDetRef.current = det;
    void det.promise.then((heard) => {
      if (sessionRef.current !== session) return;
      voiceDetRef.current = null;
      if (heard) handleTranscript(item.text, session);
      else { setError('没有听到声音，请大声说哦～'); setPhase('idle'); }
    });
  }, [item.text, clearTimers, stopDet, handleTranscript]);

  const startListening = useCallback(() => {
    sfxTap();
    triggerHaptic([30, 40, 50]);
    stopDet();
    setError(null);
    setResult(null);
    setMode('recog');
    setPhase('listening');
    clearTimers();
    const session = ++sessionRef.current;
    void (async () => {
      const mic = await requestMicPermission();
      if (sessionRef.current !== session) return;
      if (mic === 'denied') { setError('需要麦克风权限才能跟读哦～'); setPhase('idle'); return; }
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) { goLoudRead(session); return; }
      const reco = new Ctor();
      reco.continuous = false;
      reco.interimResults = false;
      reco.maxAlternatives = 3;
      reco.lang = 'zh-CN';
      recoRef.current = reco;
      const startedAt = Date.now();
      let gotResult = false;
      let ended = false;

      listenTRef.current = setTimeout(() => {
        try { reco.abort(); } catch { /**/ }
        clearTimers();
        if (sessionRef.current === session && !gotResult && !ended) { setError('没有听到，请再试～'); setPhase('idle'); }
      }, 12000);

      quietTRef.current = setTimeout(() => {
        if (sessionRef.current !== session || gotResult || ended) return;
        clearTimers();
        try { reco.abort(); } catch { /**/ }
        goLoudRead(session);
      }, 2500);

      reco.onstart = () => {
        if (quietTRef.current) { clearTimeout(quietTRef.current); quietTRef.current = null; }
        quietTRef.current = setTimeout(() => {
          if (sessionRef.current !== session || gotResult || ended) return;
          clearTimers();
          try { reco.abort(); } catch { /**/ }
          goLoudRead(session);
        }, 2500);
      };

      reco.onresult = (event: Event & { results: SpeechRecognitionResultList }) => {
        clearTimers();
        if (sessionRef.current !== session) return;
        gotResult = true; ended = true;
        const tr = event.results[0]?.[0]?.transcript ?? '';
        if (tr.trim()) handleTranscript(tr, session);
        else if (Date.now() - startedAt < 1500) goLoudRead(session);
        else { setError('没有听到，请再试～'); setPhase('idle'); }
      };

      reco.onerror = (event: Event & { error?: string }) => {
        clearTimers();
        if (sessionRef.current !== session || gotResult) return;
        ended = true;
        const e = classifyRecogError(event.error ?? '');
        if (e === 'no-speech') {
          if (Date.now() - startedAt < 1500) goLoudRead(session);
          else { setError('没有听到，请再试～'); setPhase('idle'); }
        } else if (e === 'denied') {
          setError('需要麦克风权限～'); setPhase('idle');
        } else {
          goLoudRead(session);
        }
      };

      reco.onend = () => {
        clearTimers();
        if (sessionRef.current !== session || gotResult || ended) return;
        ended = true;
        if (Date.now() - startedAt < 1500) goLoudRead(session);
        else { setError('没有听到，请再试～'); setPhase('idle'); }
      };

      try { reco.start(); } catch {
        clearTimers();
        if (sessionRef.current === session && !gotResult && !ended) goLoudRead(session);
      }
    })();
  }, [goLoudRead, clearTimers, stopDet, handleTranscript]);

  const stopListening = useCallback(() => {
    sfxTap();
    triggerHaptic(25);
    sessionRef.current++;
    clearTimers();
    stopDet();
    try { recoRef.current?.abort(); } catch { /**/ }
    recoRef.current = null;
    setPhase('idle');
  }, [clearTimers, stopDet]);

  const reset = useCallback(() => {
    stopSpeaking();
    sessionRef.current++;
    clearTimers();
    stopDet();
    try { recoRef.current?.abort(); } catch { /**/ }
    recoRef.current = null;
    setResult(null);
    setError(null);
    setPhase('idle');
  }, [clearTimers, stopDet]);

  const nextItem = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    reset();
    setItemIdx((i) => (i + 1) % levelItems.length);
  }, [reset, levelItems.length]);

  const prevItem = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    reset();
    setItemIdx((i) => (i - 1 + levelItems.length) % levelItems.length);
  }, [reset, levelItems.length]);

  const isListening = phase === 'listening';
  const isEvaluating = phase === 'evaluating';
  const inLoudRead = mode === 'loudread' && isListening;
  const itemStars = stars[item.id] ?? 0;
  const avgScore = playCount > 0 ? Math.round(totalScore / playCount) : 0;

  const charColor = character.id === 'qiqi' ? '#e11d48' : character.id === 'teacher' ? '#6366f1' : '#10b981';

  return (
    <div className="space-y-4">
      {/* Level tabs */}
      <div className="flex gap-2" role="tablist" aria-label="跟读难度选择">
        {([1, 2, 3] as const).map((lv) => (
          <button
            key={lv}
            type="button"
            role="tab"
            aria-selected={level === lv}
            onClick={() => {
              sfxTap();
              triggerHaptic(30);
              setLevel(lv);
              setItemIdx(0);
              reset();
            }}
            className={`flex-1 min-h-[44px] rounded-2xl py-2 text-sm font-black border-2 transition-all focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none ${
              level === lv ? 'bg-indigo-500 text-white border-indigo-500 shadow-md scale-[1.02]' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
            }`}
          >
            {lv === 1 ? '🟢 词语' : lv === 2 ? '🟡 句子' : '🔴 古诗'}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{itemIdx + 1}/{levelItems.length}</span>
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${((itemIdx + 1) / levelItems.length) * 100}%` }} />
        </div>
        <span>均分 {avgScore}</span>
      </div>

      {/* Text card */}
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl border-3 ${character.borderColor} ${character.bgColor} p-6 text-center space-y-3`}
      >
        <p className="text-xs text-slate-400 font-medium">{item.hint}</p>
        <div className="space-y-1">
          <p className="text-4xl font-black tracking-widest text-slate-800">{item.text}</p>
          {item.pinyin && <p className="text-sm text-slate-400 tracking-widest">{item.pinyin}</p>}
        </div>
        <div className="flex justify-center gap-1 text-2xl">
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= itemStars ? 'text-amber-400' : 'text-slate-200'}>★</span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            sfxTap();
            triggerHaptic(25);
            void speak(item.text, { lang: 'zh-CN', rate: character.rate, pitch: character.pitch, module: 'quiz' });
          }}
          className={`min-h-[44px] flex items-center gap-2 mx-auto px-4 py-1.5 rounded-full border-2 ${character.borderColor} ${character.color} bg-white/80 text-xs font-black hover:bg-white active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none`}
        >
          <span>{character.emoji}</span>
          <span>听 {character.name} 说一遍</span>
        </button>
      </motion.div>

      {/* Mic button */}
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={isEvaluating}
        className={`min-h-[56px] w-full rounded-3xl py-4 text-lg font-black transition-all flex items-center justify-center gap-3 focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none ${
          isListening
            ? 'animate-pulse bg-rose-500 text-white shadow-xl shadow-rose-300'
            : isEvaluating
              ? 'bg-amber-400 text-white'
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:shadow-xl active:scale-[0.99]'
        }`}
      >
        <span className="text-2xl">{isEvaluating ? '⏳' : isListening ? '⏹️' : '🎙️'}</span>
        {isEvaluating ? '正在评分…'
          : isListening ? (inLoudRead ? '🔊 大声读出来就算过！' : '🔴 正在听… 点击停止')
          : `跟 ${character.name} 一起读！`}
      </button>

      {/* Error / LoudRead tip */}
      <AnimatePresence>
        {(error || inLoudRead) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center text-xs font-bold py-1.5 px-3 rounded-full border ${
              inLoudRead ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}
          >
            {error ?? '🔈 没找到语音识别，大声读出来就算通过！'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result + Radar */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Score */}
            <div className="flex items-center justify-center gap-4">
              <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-full text-white ${result.passed ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                <span className="text-3xl font-black">{result.score}</span>
                <span className="text-xs">分</span>
              </div>
              <div>
                <p className="font-black text-slate-800 text-base">{result.feedback}</p>
                <p className="text-xs text-slate-500">正确 {result.correctCount}/{result.targetCount} 字</p>
              </div>
            </div>

            {/* Radar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <p className="text-xs font-black text-slate-500 mb-3 text-center">📊 五维发音雷达图</p>
              <PronunciationRadar result={result} color={charColor} />
            </div>

            {/* Char eval */}
            <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl bg-white/80 p-3 border border-slate-100">
              {result.chars.map((c: CharEval, i: number) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className={`inline-flex flex-col items-center rounded-xl px-2.5 py-1.5 text-xl font-black ${
                    c.status === 'correct' ? 'bg-emerald-100 text-emerald-700'
                    : c.status === 'wrong' ? 'bg-rose-100 text-rose-700'
                    : 'bg-gray-100 text-gray-400'
                  }`}
                  title={c.status === 'wrong' && c.heard ? `听到「${c.heard}」` : ''}
                >
                  {c.ch}
                  <span className="text-xs font-bold">
                    {c.status === 'correct' ? '✓' : c.status === 'wrong' ? '✗' : '…'}
                  </span>
                </motion.span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(25);
                  reset();
                }}
                className="min-h-[44px] px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-2xl text-sm font-black active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-rose-300"
              >
                🔄 再读一次
              </button>
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  triggerHaptic(25);
                  void speak(item.text, { lang: 'zh-CN', rate: character.rate, pitch: character.pitch, module: 'quiz' });
                }}
                className="min-h-[44px] px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-2xl text-sm font-black active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-indigo-300"
              >
                👂 再听一遍
              </button>
              {result.passed && (
                <button
                  type="button"
                  onClick={nextItem}
                  className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-black active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-emerald-300"
                >
                  ➡️ 下一题
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation (when idle) */}
      {phase === 'idle' && !result && (
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={prevItem}
            className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-sm font-bold active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            ← 上一题
          </button>
          <button
            type="button"
            onClick={nextItem}
            className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-sm font-bold active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            下一题 →
          </button>
        </div>
      )}

      {/* Session stats */}
      {playCount > 0 && (
        <div className="flex justify-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
          <span>练习 {playCount} 次</span>
          <span>平均 {avgScore} 分</span>
          <span>★{Object.values(stars).reduce((a, b) => a + b, 0)} 颗星</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 主页面
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_CHAR: VoiceCharacter = {
  id: 'qiqi',
  name: '茜茜',
  emoji: '👧',
  color: 'text-rose-600',
  bgColor: 'bg-rose-50',
  borderColor: 'border-rose-300',
  rate: 0.82,
  pitch: 1.15,
  desc: '活泼小女孩·甜美童声',
  greeting: '你好呀！我是茜茜，让我们一起读吧！',
};

export default function VoiceStudioPage() {
  const [selectedChar, setSelectedChar] = useState<VoiceCharacter>(VOICE_CHARACTERS[0] ?? FALLBACK_CHAR);
  const [activeTab, setActiveTab] = useState<'voice' | 'followread'>('voice');
  const [showGuide, setShowGuide] = useState(false);

  const handleSelectChar = useCallback((char: VoiceCharacter) => {
    sfxCorrect();
    triggerHaptic(30);
    setSelectedChar(char);
    celebrateSmall();
  }, []);

  // 键盘快捷漫游
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1' && VOICE_CHARACTERS[0]) {
        e.preventDefault();
        handleSelectChar(VOICE_CHARACTERS[0]);
      } else if (e.key === '2' && VOICE_CHARACTERS[1]) {
        e.preventDefault();
        handleSelectChar(VOICE_CHARACTERS[1]);
      } else if (e.key === '3' && VOICE_CHARACTERS[2]) {
        e.preventDefault();
        handleSelectChar(VOICE_CHARACTERS[2]);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(25);
        setActiveTab('voice');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(25);
        setActiveTab('followread');
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(25);
        setShowGuide((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showGuide) {
          e.preventDefault();
          setShowGuide(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectChar, showGuide]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 pb-24">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎙️</span>
          <div>
            <h1 className="text-2xl font-black text-slate-800">声音工坊</h1>
            <p className="text-xs text-slate-500">多音色朗读 · 跟读评分 · 五维雷达</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            sfxTap();
            triggerHaptic(25);
            setShowGuide(true);
          }}
          className="min-h-[44px] flex items-center gap-1.5 rounded-2xl bg-white border-2 border-indigo-200 px-3.5 py-2 text-xs font-black text-indigo-700 shadow-sm hover:bg-indigo-50 active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none"
        >
          <span>👄</span>
          <span>口型小秘诀</span>
        </button>
      </div>

      <ArticulationGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* 快捷操作提示条 */}
      <div className="px-4 mb-3">
        <div className="flex items-center justify-between text-xs text-indigo-900 font-bold bg-indigo-50/90 px-3 py-1 rounded-xl border border-indigo-200">
          <span>⌨️ 键盘快捷操作：数字键 1-3 切换角色 · V 角色音色 · F 跟读评测 · G 口型秘诀</span>
        </div>
      </div>

      <div className="px-4 mb-4 flex gap-2" role="tablist" aria-label="声音工坊功能标签">
        {(['voice', 'followread'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => {
              sfxTap();
              triggerHaptic(30);
              setActiveTab(tab);
            }}
            className={`min-h-[44px] flex-1 rounded-2xl py-2.5 text-sm font-black border-2 transition-all focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none ${
              activeTab === tab ? 'bg-indigo-500 text-white border-indigo-500 shadow-md scale-[1.02]' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
            }`}
          >
            {tab === 'voice' ? '🎭 角色音色' : '🎙️ 跟读评测'}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'voice' ? (
            <motion.div key="voice" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-3xl border-2 border-slate-100 p-5 shadow-sm space-y-5">
              <VoiceCharacterPanel selected={selectedChar} onSelect={handleSelectChar} />
              <div className={`rounded-2xl ${selectedChar.bgColor} ${selectedChar.borderColor} border-2 p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{selectedChar.emoji}</span>
                  <div>
                    <p className={`font-black text-base ${selectedChar.color}`}>{selectedChar.name}</p>
                    <p className="text-xs text-slate-400">{selectedChar.desc}</p>
                  </div>
                </div>
                <p className={`text-sm font-medium ${selectedChar.color} bg-white/60 rounded-xl p-2 italic`}>"{selectedChar.greeting}"</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-500">🖊️ 输入任意文字，让角色朗读</p>
                <CustomSpeakBox character={selectedChar} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="followread" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-3xl border-2 border-slate-100 p-5 shadow-sm">
              <div className="flex gap-2 mb-4">
                {VOICE_CHARACTERS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChar(ch)}
                    className={`min-h-[52px] flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl border-2 text-sm transition-all focus-visible:ring-4 focus-visible:ring-indigo-300 focus:outline-none ${
                      selectedChar.id === ch.id ? `${ch.bgColor} ${ch.borderColor} shadow-sm scale-[1.02]` : 'bg-white border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    <span className="text-xl">{ch.emoji}</span>
                    <span className={`text-xs font-black ${selectedChar.id === ch.id ? ch.color : 'text-slate-400'}`}>{ch.name}</span>
                  </button>
                ))}
              </div>
              <FollowReadStudio character={selectedChar} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
