/**
 * 古诗详情 · 训练类子组件
 * ------------------------------------------------------------
 * 节奏条（范读 / 吟诵 + 录音对照）/ 自测题库 / 分关遮挡背诵 / 复习计划摘要。
 * 训练成绩通过 store 落盘并回写 SRS 掌握度。
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import type { DeepPoem } from '@/types';
import {
  analyzeChant,
  chantModeInfo,
  chantHint,
  buildChantSegments,
  moodOfPoem,
  scoreRecording,
  type ChantMode,
  type ChantPlan,
} from '@/lib/chant';
import { decodeToAnalysis, type RecordingAnalysis } from '@/lib/audioCompare';
import { generatePoemQuiz } from '@/lib/poemQuiz';
import { buildPlan, stepLabel, type PoemPlan } from '@/lib/poemPlan';
import { speakChant, stopSpeaking, type SequenceController } from '@/lib/speech';
import { useStore, useProgress } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
// 背诵相关组件已拆至 ./PoemTrainRecite（保持 re-export 兼容既有 import）
export { ReciteRunner } from './PoemTrainRecite';

/* ---------------- 节奏条 + 范读 / 吟诵 + 录音对照（声波分析） ---------------- */
interface ScoreCard {
  source: 'audio' | 'time';
  score: number;
  fit?: number;
  timeFit?: number;
  note: string;
  byLine: { line: number; dur: number; ratio: number; fit?: number }[];
}

export function ChantBar({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const [mode, setMode] = useState<ChantMode>('fan');
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const ctrlRef = useRef<SequenceController | null>(null);

  // 录音对照
  const [recLine, setRecLine] = useState(-1);
  const [durations, setDurations] = useState<number[]>([]);
  const [blobs, setBlobs] = useState<(string | null)[]>([]);
  const [analyses, setAnalyses] = useState<(RecordingAnalysis | null)[]>([]);
  const [score, setScore] = useState<ScoreCard | null>(null);
  const startRef = useRef(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** 麦克风轨道句柄：录制异常时也必须能关掉，否则浏览器一直亮着录音红点 */
  const streamRef = useRef<MediaStream | null>(null);
  /** 已创建的 Blob URL；不显式 revoke 的话，录一句泄漏一份，整首诗录几轮就吃掉几十 MB */
  const urlsRef = useRef<Set<string>>(new Set());
  /** 回放用的单例 Audio，避免每点一次就新建一个永不释放的实例 */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const releaseUrl = (url?: string | null) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  };
  const stopMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const playBack = (url: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const el = audioRef.current;
    el.pause();
    el.src = url;
    el.currentTime = 0;
    // play() 在未交互/格式不支持时会 reject，不接住会污染控制台
    void el.play().catch(() => undefined);
  };

  const plan: ChantPlan = useMemo(() => analyzeChant(poem, mode), [poem, mode]);
  const info = chantModeInfo(mode);
  const mood = useMemo(() => moodOfPoem(poem), [poem]);
  const maxMs = Math.max(...plan.lines.flatMap((l) => l.tokens.map((t) => t.holdMs)), 1);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      ctrlRef.current?.cancel();
      try {
        if (mediaRef.current?.state !== 'inactive') mediaRef.current?.stop();
      } catch {
        /* 已经停了 */
      }
      mediaRef.current = null;
      stopMic();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
    // intentional: cleanup on unmount
  }, []);

  const play = () => {
    ctrlRef.current?.cancel();
    setPlaying(true);
    setActive(0);
    const segs = buildChantSegments(poem, mode);
    ctrlRef.current = speakChant(segs, {
      lang: 'zh-CN',
      baseRate: mode === 'yin' ? 0.62 : mood.rate,
      basePitch: mode === 'yin' ? 1.16 : mood.pitch,
      baseVolume: mood.volume,
      moodKey: mood.key,
      onLine: (i) => setActive(i),
    });
    ctrlRef.current.done
      .catch(() => undefined)
      .finally(() => {
        setPlaying(false);
        setActive(-1);
      });
  };
  const stop = () => {
    ctrlRef.current?.cancel();
    stopSpeaking();
    setPlaying(false);
    setActive(-1);
  };

  const startRec = async (line: number) => {
    startRef.current = performance.now();
    setRecLine(line);
    setScore(null);
    if (!navigator.mediaDevices?.getUserMedia) return; // 不支持就只做计时对照

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onerror = () => {
        stopMic();
        setRecLine(-1);
      };
      mr.onstop = async () => {
        // 先关麦克风：后面的解码可能耗时几百毫秒，没必要让红点一直亮着
        stopMic();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        setBlobs((prev) => {
          const n = [...prev];
          releaseUrl(n[line]); // 重录同一句时，旧的 URL 要还回去
          n[line] = url;
          return n;
        });
        // 真实声波分析：把这一句录音对照该句的期望节奏
        try {
          const single: ChantPlan = { mode, lines: [plan.lines[line]!], totalMs: plan.lines[line]!.expectedMs };
          const a = await decodeToAnalysis(blob, single);
          setAnalyses((prev) => {
            const n = [...prev];
            n[line] = a;
            return n;
          });
        } catch {
          /* 解码失败：退回计时对照 */
        }
      };
      mr.start();
      mediaRef.current = mr;
    } catch {
      // MediaRecorder 构造失败 / 用户拒绝授权：都要把已经打开的轨道关掉
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setRecLine(-1);
    }
  };
  const stopRec = (line: number) => {
    const dur = Math.round(performance.now() - startRef.current);
    try {
      if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
      else stopMic(); // 没在录（授权失败等）也要确保轨道关闭
    } catch {
      stopMic();
    }
    mediaRef.current = null;
    setRecLine(-1);
    setDurations((prev) => {
      const n = [...prev];
      n[line] = dur;
      return n;
    });
  };

  const allRecorded = plan.lines.every((_, i) => durations[i] && durations[i]! > 0);
  const runScore = () => {
    const audioLines = plan.lines
      .map((_, i) => analyses[i])
      .filter((x): x is RecordingAnalysis => Boolean(x));
    if (audioLines.length === plan.lines.length) {
      const avg = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
      const fit = avg(audioLines.map((a) => a.fit));
      const timeFit = avg(audioLines.map((a) => a.timeFit));
      const sc = avg(audioLines.map((a) => a.score));
      // 取最弱一句的点评最有针对性
      const weakestNote = audioLines.slice().sort((a, b) => a.score - b.score)[0]!.note;
      setScore({
        source: 'audio',
        score: sc,
        fit,
        timeFit,
        note: weakestNote,
        byLine: audioLines.map((a, i) => ({
          line: i,
          dur: Math.round(a.durMs),
          ratio: +(a.durMs / plan.lines[i]!.expectedMs).toFixed(2),
          fit: a.fit,
        })),
      });
    } else if (allRecorded) {
      const s = scoreRecording(plan, durations.map((d) => d ?? 0));
      setScore({
        source: 'time',
        score: s.score,
        note: '已按逐句用时比对（当前环境未做声波分析）。',
        byLine: s.ratios.map((r, i) => ({ line: i, dur: durations[i] ?? 0, ratio: r })),
      });
    }
  };
  const resetRec = () => {
    setDurations([]);
    setBlobs([]);
    setAnalyses([]);
    setScore(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CandyButton tone={playing ? 'orange' : 'pink'} variant={playing ? 'solid' : 'soft'} size="sm" onClick={playing ? stop : play}>
          {playing ? tr('common.stop') : `🔊 ${info.name}`}
        </CandyButton>
        <CandyButton tone={mode === 'fan' ? 'blue' : 'purple'} variant={mode === 'fan' ? 'solid' : 'soft'} size="sm" onClick={() => setMode('fan')}>
          {tr('poem.chantFan')}
        </CandyButton>
        <CandyButton tone={mode === 'yin' ? 'blue' : 'purple'} variant={mode === 'yin' ? 'solid' : 'soft'} size="sm" onClick={() => setMode('yin')}>
          {tr('poem.chantYin')}
        </CandyButton>
      </div>
      <p className="text-xs font-bold text-ink-soft">{chantHint(plan, tr)}</p>
      <p className="text-[11px] text-candy-purple-600">
        🎭 {tr('poem.moodBase')} · {mood.name}
        <span className="ml-1 text-ink-soft">（{tr('poem.moodNote')}）</span>
      </p>

      {/* 期望节奏条 + 实际声波对照 */}
      <div className="space-y-2 rounded-2xl bg-white/70 p-3">
        {plan.lines.map((ln, i) => {
          const rec = analyses[i]!!
          const chars = rec?.lines[0]!.chars ?? [];
          const maxChar = Math.max(...chars.map((c) => c.durMs), 1);
          return (
            <div key={`ln-${i}`} className={cn('rounded-xl', active === i && 'bg-candy-pink-soft p-1')}>
              {/* 期望节奏（平长仄短） */}
              <div className="flex h-7 items-stretch gap-[2px]">
                {ln.tokens.map((t, k) => {
                  const w = Math.max(6, (t.holdMs / maxMs) * 100);
                  const bg =
                    t.role === '平' ? '#93c5fd' : t.role === '仄' ? '#f9a8d4' : t.role === '入' ? '#fcd34d' : '#e5e7eb';
                  return (
                    <div
                      key={k}
                      className="flex items-center justify-center rounded-[3px] text-[9px] font-bold text-ink/70"
                      style={{ width: `${w}%`, background: bg }}
                      title={`${t.c || t.role} · 期望 ${t.holdMs}ms`}
                    >
                      {t.c}
                    </div>
                  );
                })}
              </div>
              {/* 实际声波（按平仄着色的真实时长分布） */}
              {chars.length > 0 && (
                <div className="mt-1 flex h-3 items-stretch gap-[2px]">
                  {chars.map((c, k) => {
                    const w = Math.max(4, (c.durMs / maxChar) * 100);
                    const bg = c.role === '平' ? '#3b82f6' : c.role === '仄' ? '#ec4899' : '#d97706';
                    return (
                      <div
                        key={k}
                        className="rounded-[2px]"
                        style={{ width: `${w}%`, background: bg }}
                        title={`${c.c} · 实际 ${c.durMs.toFixed(0)}ms`}
                      />
                    );
                  })}
                </div>
              )}
              {/* 跟读操作 */}
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onPointerDown={() => startRec(i)}
                  onPointerUp={() => stopRec(i)}
                  onPointerLeave={() => recLine === i && stopRec(i)}
                  className={cn(
                    'no-select rounded-full px-3 py-1 text-[11px] font-extrabold transition-colors',
                    recLine === i ? 'bg-rose-500 text-white' : 'bg-candy-orange-soft text-candy-orange-deep',
                  )}
                >
                  {recLine === i ? tr('poem.recRelease') : tr('poem.recHold')}
                </button>
                {durations[i] ? (
                  <span className="text-[11px] font-bold text-ink-soft">
                    {(durations[i]! / 1000).toFixed(1)}s
                    {blobs[i] && (
                      <button className="ml-1 text-candy-blue-deep underline" onClick={() => playBack(blobs[i]!)}>
                        {tr('common.listenAgain')}
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-soft/60">{tr('poem.expected')} {(ln.expectedMs / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 录音对照评分 */}
      <div className="flex items-center gap-2">
        <CandyButton tone="green" variant="soft" size="sm" disabled={!allRecorded} onClick={runScore}>
          {tr('poem.scoreGenerate')}
        </CandyButton>
        <CandyButton tone="purple" variant="ghost" size="sm" onClick={resetRec}>
          {tr('poem.recRetry')}
        </CandyButton>
      </div>
      {score && (
        <div className={cn('rounded-2xl p-3 text-sm font-bold', score.score >= 80 ? 'bg-emerald-50 text-emerald-800' : score.score >= 60 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700')}>
          <div className="flex flex-wrap items-center gap-2">
            <span>{tr('poem.fitScore')} {score.score} {tr('poem.points')}</span>
            {score.fit !== undefined && <span className="text-xs">· {tr('poem.toneFit')} {score.fit} · {tr('poem.timeFit')} {score.timeFit}</span>}
            <span className="text-xs opacity-70">（{score.source === 'audio' ? tr('poem.audioAnalysis') : tr('poem.timeCompare')}）</span>
          </div>
          <p className="mt-1 text-xs font-semibold opacity-90">{score.note}</p>
          {score.score >= 80 && <span className="ml-1">👍 {tr('poem.rhythmGood')}</span>}
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-ink-soft/80">
        {tr('poem.recExplain')}
      </p>
    </div>
  );
}

/* ---------------- 自测题库 ---------------- */
export function QuizRunner({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const questions = useMemo(() => generatePoemQuiz(poem, { count: 4 }), [poem]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const practice = useStore((s) => s.practice);
  const answered = Object.keys(picked).length;

  const pick = (qid: string, optId: string, skill: string, correct: boolean) => {
    if (picked[qid]) return;
    sfxTap();
    setPicked((p) => ({ ...p, [qid]: optId }));
    practice(skill, correct, 1);
    if (answered + 1 >= questions.length) setDone(true);
  };

  const correctCount = questions.filter((q) => picked[q.id] === q.answerId).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-candy-pink-deep">{tr('poem.quizSelf')} · {questions.length} {tr('poem.questions')}</p>
        <span className="text-xs font-bold text-ink-soft">{answered}/{questions.length}</span>
      </div>
      {questions.map((q, qi) => {
        const chosen = picked[q.id]!
        const solved = !!chosen;
        return (
          <div key={q.id} className="rounded-2xl bg-white/70 p-3">
            <p className="mb-2 text-sm font-bold text-ink">{qi + 1}. {q.prompt}</p>
            {q.display && <p className="mb-2 text-center text-lg font-extrabold text-candy-purple-deep">{q.display}</p>}
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {q.options.map((o) => {
                const isAns = o.id === q.answerId;
                const isChosen = o.id === chosen;
                const tone = solved
                  ? isAns
                    ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400'
                    : isChosen
                      ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400'
                      : 'bg-white/70 text-ink-soft'
                  : 'bg-white/70 text-ink hover:bg-candy-yellow-soft';
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={solved}
                    onClick={() => pick(q.id, o.id, q.skill ?? `poem:${poem.id}`, isAns)}
                    className={cn('rounded-xl px-3 py-2 text-sm font-bold transition-colors', tone)}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {solved && q.hint && (
              <p className="mt-1.5 rounded-xl bg-candy-yellow-soft p-2 text-xs leading-relaxed text-amber-800">💡 {q.hint}</p>
            )}
          </div>
        );
      })}
      {done && (
        <div className={cn('rounded-2xl p-3 text-center text-base font-extrabold', correctCount >= questions.length * 0.75 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
          答对 {correctCount}/{questions.length} 题{','}
          {correctCount >= questions.length * 0.75 ? ' 记忆牢固！' : ' 再读读原文巩固一下～'}
        </div>
      )}
    </div>
  );
}

/* ---------------- 复习计划摘要 ---------------- */
export function PlanSummary({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const progress = useProgress();
  const mark = progress.poemMarks[poem.id];
  const recite = progress.poemRecite[poem.id];
  const plan: PoemPlan = useMemo(() => buildPlan(poem, mark, recite), [poem, mark, recite]);

  const toneBg: Record<string, string> = {
    blue: 'bg-candy-blue-soft',
    green: 'bg-candy-green-soft',
    purple: 'bg-candy-purple-soft',
    orange: 'bg-candy-orange-soft',
    pink: 'bg-candy-pink-soft',
    yellow: 'bg-candy-yellow-soft',
  };
  const priColor: Record<string, string> = {
    high: 'text-rose-600',
    mid: 'text-amber-600',
    low: 'text-emerald-700',
  };
  const priLabel: Record<string, string> = { high: tr('poem.priHigh'), mid: tr('poem.priMid'), low: tr('poem.priLow') };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-extrabold text-candy-pink-deep">{tr('poem.myPlan')}</p>
        <span className={cn('rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-extrabold', priColor[plan.priority])}>
          {priLabel[plan.priority]}
        </span>
      </div>
      <p className="text-xs font-bold text-ink-soft">{plan.note}</p>

      {plan.focus.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.focus.map((f, i) => (
            <span key={`f-${i}`} className="rounded-full bg-candy-orange-soft px-2.5 py-0.5 text-xs font-bold text-candy-orange-deep">{f}</span>
          ))}
        </div>
      )}

      <ol className="space-y-2">
        {plan.steps.map((s, i) => (
          <li key={`s-${i}`} className="flex items-start gap-3">
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold text-ink', toneBg[s.tone])}>
              {i + 1}
            </span>
            <div className="rounded-2xl bg-white/70 px-3 py-2">
              <p className="text-sm font-extrabold text-ink">{s.title}</p>
              <p className="text-xs leading-relaxed text-ink-soft">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-ink-soft/70">{tr('poem.suggestStage')}：{tr('poem.stageN', { n: String(plan.nextStage) })} · {tr('poem.steps')}：{plan.steps.map((s) => stepLabel(s.type, tr)).join(' → ')}</p>
    </div>
  );
}
