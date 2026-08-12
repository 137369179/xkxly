/**
 * 古诗背诵 · 分关遮挡背诵 + AI 讲评（从 PoemTrain 拆分）
 * ------------------------------------------------------------
 * ReciteRunner：填空 / 语音 / 录音回放三种背诵模式，四关递进（隐一字 → 全隐默写）
 * ReciteGradeCard：AI 讲评（分数以本地 scoreRecite 为准，AI 只负责写评语）
 */
import { useEffect, useRef, useState } from 'react';
import type { DeepPoem, ReciteStat } from '@/types';
import { maskPoem, scoreRecite, type MaskedPoem } from '@/lib/recite';
import { useStore, useProgress } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { CandyButton } from '@/components/ui/Button';
import { useAiTask } from '@/lib/ai/useAi';
import { gradeRecite } from '@/lib/ai/tasks';
import { AiAvatar, AiDots } from '@/components/ai';
import type { ReciteGrade } from '@/lib/ai/prompts';
import { TONE_STYLE } from '@/lib/tones';
import { VoiceRecite } from './VoiceRecite';
import { ReciteRecorder } from './ReciteRecorder';
import { useTranslation } from '@/i18n/useTranslation';

/* ---------------- 分关遮挡背诵 ---------------- */
export function ReciteRunner({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const stat: ReciteStat | undefined = useProgress().poemRecite[poem.id];
  const recordRecite = useStore((s) => s.recordRecite);
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(((stat?.stage ?? 0) + 1 > 4 ? 4 : (stat?.stage ?? 0) + 1) as 1 | 2 | 3 | 4);
  const [mask, setMask] = useState<MaskedPoem>(() => maskPoem(poem, level));
  const [inputs, setInputs] = useState<string[]>(() => poem.lines.map(() => ''));
  const [result, setResult] = useState<ReturnType<typeof scoreRecite> | null>(null);
  const [gradeKey, setGradeKey] = useState(0);
  const [mode, setMode] = useState<'fill' | 'voice' | 'record'>('fill');

  // 背诵通关后 stat.stage 会增长，自动推进到下一关
  const stageRef = useRef(stat?.stage ?? 0);
  useEffect(() => {
    const cur = stat?.stage ?? 0;
    if (cur !== stageRef.current) {
      stageRef.current = cur;
      const next = Math.min(cur + 1, 4) as 1 | 2 | 3 | 4;
      setLevel(next);
      setResult(null);
      setInputs(poem.lines.map(() => ''));
      setMask(maskPoem(poem, next));
    }
  }, [stat?.stage, poem]);

  const submit = () => {
    const r = scoreRecite(poem, inputs);
    setResult(r);
    recordRecite(poem.id, r.score, level);
    setGradeKey((k) => k + 1);
  };

  const changeLevel = (lv: 1 | 2 | 3 | 4) => {
    setLevel(lv);
    setResult(null);
    setInputs(poem.lines.map(() => ''));
    setMask(maskPoem(poem, lv));
  };

  return (
    <div className="space-y-3">
      {/* 模式切换 */}
      <div className="flex gap-2">
        <CandyButton tone={mode === 'fill' ? 'pink' : 'purple'} variant={mode === 'fill' ? 'solid' : 'soft'} size="sm" onClick={() => setMode('fill')}>{tr('poem.trainFill')}</CandyButton>
        <CandyButton tone={mode === 'voice' ? 'pink' : 'purple'} variant={mode === 'voice' ? 'solid' : 'soft'} size="sm" onClick={() => setMode('voice')}>{tr('poem.trainVoice')}</CandyButton>
        <CandyButton tone={mode === 'record' ? 'pink' : 'purple'} variant={mode === 'record' ? 'solid' : 'soft'} size="sm" onClick={() => setMode('record')}>{tr('poem.trainRecord')}</CandyButton>
      </div>
      {mode === 'voice' ? (
        <VoiceRecite poem={poem} />
      ) : mode === 'record' ? (
        <ReciteRecorder poem={poem} />
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-extrabold text-candy-pink-deep">{tr('poem.maskRecite')}</p>
        {stat && (
          <span className="text-xs font-bold text-ink-soft">
            {tr('poem.statBest', { best: stat.best, stage: stat.stage, runs: stat.runs })}
          </span>
        )}
      </div>

      {/* 关卡选择 */}
      <div className="flex gap-1.5">
        {([1, 2, 3, 4] as const).map((lv) => (
          <CandyButton key={lv} tone={level === lv ? 'pink' : 'purple'} variant={level === lv ? 'solid' : 'soft'} size="sm" onClick={() => changeLevel(lv)}>
            {tr('poem.levelN', { lv })}
          </CandyButton>
        ))}
      </div>
      <p className="text-xs font-bold text-ink-soft">
        {tr('poem.maskLevel', { level: tr(`poem.maskLevel${level}`), total: mask.total })}
      </p>

      {/* 逐句填空 */}
      <div className="space-y-2">
        {poem.lines.map((line, i) => {
          const r = result?.perLine[i];
          return (
            <div key={`line-${i}`} className="rounded-2xl bg-white/70 p-2">
              <div className="mb-1 text-xs font-bold text-ink-soft">{mask.lines[i]}</div>
              <input
                value={inputs[i]}
                onChange={(e) => setInputs((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={tr('poem.fillPlaceholder')}
                className={cn(
                  'w-full rounded-xl border-2 bg-white/80 px-3 py-2 text-base font-bold text-ink outline-none',
                  result ? (r && r.correct === r.total ? 'border-emerald-300' : 'border-rose-300') : 'border-candy-pink-soft focus:border-candy-pink',
                )}
              />
              {r && (
                <p className={cn('mt-1 text-xs font-bold', r.correct === r.total ? 'text-emerald-700' : 'text-rose-600')}>
                  {tr('poem.lineCorrect', { correct: r.correct, total: r.total })}
                  {r.correct !== r.total && <span className="ml-1 text-ink-soft">（{tr('poem.correctIs')}：{line.text}）</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <CandyButton tone="green" size="md" fullWidth onClick={submit}>{tr('poem.submitGrade')}</CandyButton>
        <CandyButton tone="purple" variant="soft" size="md" onClick={() => { setInputs(poem.lines.map(() => '')); setResult(null); }}>{tr('poem.clear')}</CandyButton>
      </div>
      {result && (
        <div className={cn('rounded-2xl p-3 text-center text-base font-extrabold', result.score >= 80 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
          {tr('poem.totalScore', { score: result.score, correct: result.correct, total: result.total })}{result.score >= 80 ? ` ${tr('poem.passLevel')}` : ` ${tr('poem.keepGoing')}`}
        </div>
      )}
      {result && <ReciteGradeCard key={gradeKey} poem={poem} answer={inputs.join('\n')} score={result.score} />}
        </>
      )}
    </div>
  );
}

/* ---------------- AI 背诵讲评（结构化批改 + 本地兜底） ---------------- */
function ReciteGradeCard({
  poem,
  answer,
  score,
}: {
  poem: DeepPoem;
  answer: string;
  score: number;
}) {
  const { t: tr } = useTranslation();
  const original = poem.lines.map((l) => l.text).join('\n');
  // 分数以本地 scoreRecite 为准，AI 只写「哪里错 + 为什么 + 怎么改」
  const grade = useAiTask<ReciteGrade>(() => gradeRecite(poem.title, original, answer, score), true);
  const tone = TONE_STYLE.green;

  if (!grade.result) {
    return grade.loading ? (
      <div className="flex items-center gap-2 rounded-2xl bg-candy-green-soft p-3">
        <AiAvatar size={28} mood="thinking" />
        <AiDots color={tone.main} />
        <span className="text-sm font-bold text-candy-green-deep">{tr('poem.thinkingGrade')}</span>
      </div>
    ) : null;
  }

  const g = grade.result.data;
  return (
    <div className="space-y-2 rounded-2xl bg-candy-green-soft p-3">
      <div className="flex items-center gap-2">
        <AiAvatar size={28} />
        <span className="text-base font-extrabold text-candy-green-deep">{tr('poem.aiGrade')}</span>
      </div>
      <p className="text-base font-bold text-ink">{g.praise}</p>
      {g.wrong.length > 0 && (
        <ul className="space-y-1">
          {g.wrong.map((w, i) => (
            <li key={`w-${i}`} className="rounded-xl bg-white/70 px-3 py-1.5 text-sm">
              <span className="font-extrabold text-rose-600">{w.got}</span>
              <span className="text-ink-soft"> {tr('poem.shouldBe')} </span>
              <span className="font-extrabold text-emerald-700">{w.want}</span>
              {w.tip && <span className="ml-1 text-xs text-ink-soft">（{w.tip}）</span>}
            </li>
          ))}
        </ul>
      )}
      {g.advice && (
        <p className="rounded-xl bg-white/70 px-3 py-1.5 text-sm font-bold text-candy-blue-deep">💡 {g.advice}</p>
      )}
      {grade.result.fallback && (
        <p className="text-xs font-semibold text-ink-soft">{tr('poem.offlineGrade')}</p>
      )}
    </div>
  );
}

