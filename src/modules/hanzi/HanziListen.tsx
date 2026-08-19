import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar, sfxWin } from '@/lib/sfx';
import { HANZI_DATA } from '@/data/hanzi';
import { HANZI_LEVELS, type HanziEntry } from '@/data/hanziIndex';
import { HANZI_SENTENCES, type HanziSentence } from '@/data/hanziSentences';
import { useStore } from '@/store/useStore';

/**
 * 听音识字（融合自 luomor-web/hanzi-study 的「听音识字」玩法）
 * ------------------------------------------------------------------
 * 上游核心：播放汉字读音 → 孩子在 3~4 个候选字中点选听到的字。
 * 本项目融合增强：
 *   - 复用自家 WebSpeech/Kokoro TTS（speak）发音，无需上游 130 个 mp3；
 *   - 候选字取自融合数据集（HANZI_DATA 精编 300 字 + HANZI_SENTENCES 广度 1249 字）；
 *   - 答对后揭示「组词 + 生活例句」（上游 p/s 字段），把听力 → 识别 → 语用闭环；
 *   - 星级连击 + 音效 + 动效，符合本站的 premium 儿童体验。
 * 约束：C7 文案全走 t()，零中文字面量；纯前端、无新存储字段。
 */

interface ListenTarget {
  c: string;
  pinyin: string;
  word: string;
  sentence: string;
  level: 1 | 2 | 3;
}

type Level = 'all' | 1 | 2 | 3;
type Status = 'idle' | 'correct' | 'wrong';

/** 把精编字表与广度语料融合为听音目标池（精编优先，广度补覆盖） */
function buildTargets(): ListenTarget[] {
  const rich = new Map<string, HanziEntry>();
  for (const h of HANZI_DATA) rich.set(h.c, h);

  const out: ListenTarget[] = HANZI_SENTENCES.map((s: HanziSentence) => {
    const r = rich.get(s.c);
    return {
      c: s.c,
      pinyin: r?.pd ?? s.pinyin,
      word: r?.words?.[0] ?? s.word,
      sentence: r?.sentence ?? s.sentence,
      level: (r?.level as 1 | 2 | 3) ?? 3,
    };
  });
  return out;
}

function pickDistinct<T>(arr: T[], n: number, exclude: (x: T) => boolean): T[] {
  const pool = arr.filter(exclude);
  const out: T[] = [];
  const copy = [...pool];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]!);
  }
  return out;
}

export default function HanziListen() {
  const { t } = useTranslation();
  const targets = useMemo(buildTargets, []);
  const practice = useStore((s) => s.practice);

  const [level, setLevel] = useState<Level>('all');
  const [started, setStarted] = useState(false);
  const [target, setTarget] = useState<ListenTarget | null>(null);
  const [options, setOptions] = useState<ListenTarget[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showPinyin, setShowPinyin] = useState(false);
  const [reveal, setReveal] = useState(false);
  const lockRef = useRef(false);

  const pool = useMemo(
    () => (level === 'all' ? targets : targets.filter((x) => x.level === level)),
    [level, targets],
  );

  const speakTarget = useCallback((tg: ListenTarget, full = false) => {
    const phrase = full
      ? `${tg.c}，${tg.word}的${tg.c}。${tg.sentence}`
      : `${tg.c}，${tg.word}的${tg.c}`;
    // TTS 不可用（音频上下文异常 / 语音资源缺失）时静默降级，不影响答题
    try {
      void speak(phrase, { module: 'hanzi', lang: 'zh-CN' }).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const next = useCallback(() => {
    if (pool.length < 4) return;
    let tg = pool[Math.floor(Math.random() * pool.length)]!;
    // 避免与上一题重复
    if (target && tg.c === target.c) tg = pool[(pool.indexOf(tg) + 1) % pool.length]!;
    const optCount = streak >= 3 ? 4 : 3;
    const distract = pickDistinct(pool, optCount - 1, (x) => x.c !== tg.c);
    const opts = pickDistinct([tg, ...distract], optCount, () => false);
    setTarget(tg);
    setOptions(opts);
    setStatus('idle');
    setSelected(null);
    setReveal(false);
    lockRef.current = false;
    speakTarget(tg);
  }, [pool, streak, target, speakTarget]);

  useEffect(() => {
    if (started && !target) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const onReplay = useCallback(() => {
    sfxTap();
    if (target) speakTarget(target);
  }, [target, speakTarget]);

  const onOption = useCallback(
    (opt: ListenTarget) => {
      if (!target || lockRef.current) return;
      sfxTap();
      setSelected(opt.c);
      if (opt.c === target.c) {
        lockRef.current = true;
        setStatus('correct');
        practice(`hanzi:${target.c}`, true, 1);
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        sfxCorrect();
        setTimeout(() => sfxStar(), 180);
        setTimeout(() => setReveal(true), 650);
        setTimeout(() => {
          if (streak >= 9) sfxWin();
          next();
        }, 2200);
      } else {
        setStatus('wrong');
        practice(`hanzi:${target.c}`, false, 0);
        setStreak(0);
        sfxWrong();
        setTimeout(() => setStatus('idle'), 700);
      }
    },
    [target, streak, next, practice],
  );

  const restart = useCallback(() => {
    setStarted(false);
    setTarget(null);
    setOptions([]);
    setScore(0);
    setStreak(0);
    setReveal(false);
    setStatus('idle');
  }, []);

  // —— 关卡选择页 ——
  if (!started) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-ink">{t('hanziListen.title')}</h1>
          <p className="mt-2 text-ink-soft">{t('hanziListen.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(['all', 1, 2, 3] as Level[]).map((lv) => (
            <CandyButton
              key={String(lv)}
              tone={lv === level ? 'green' : 'purple'}
              size="md"
              variant={lv === level ? 'solid' : 'ghost'}
              onClick={() => {
                sfxTap();
                setLevel(lv);
              }}
            >
              {lv === 'all' ? t('hanziListen.levelAll') : HANZI_LEVELS.find((x) => x.id === lv)?.emoji + ' ' + t(`hanziListen.level${lv}`)}
            </CandyButton>
          ))}
        </div>
        <CandyButton tone="orange" size="lg" onClick={() => { sfxTap(); setStarted(true); }}>
          {t('hanziListen.start')}
        </CandyButton>
        <p className="text-sm text-ink-soft">
          {t('hanziListen.poolCount', { count: pool.length })}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-6">
      {/* 顶部状态条 */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3 text-ink">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold">⭐ {score}</span>
          <span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-bold">
            🔥 {streak}
          </span>
        </div>
        <CandyButton tone="purple" size="sm" variant="ghost" onClick={() => setShowPinyin((v) => !v)}>
          {showPinyin ? t('hanziListen.hidePinyin') : t('hanziListen.showPinyin')}
        </CandyButton>
        <CandyButton tone="blue" size="sm" variant="ghost" onClick={restart}>
          {t('hanziListen.exit')}
        </CandyButton>
      </div>

      {/* 听音区 */}
      <div className="flex w-full flex-col items-center gap-3 rounded-3xl bg-white/70 p-6 shadow-sm">
        <p className="text-center text-ink-soft">{t('hanziListen.listenHint')}</p>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onReplay}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-5xl text-white shadow-lg"
          aria-label={t('hanziListen.replay')}
        >
          🔊
        </motion.button>
        <p className="text-sm text-ink-soft">{t('hanziListen.replayHint')}</p>
      </div>

      {/* 候选字网格 */}
      {target && (
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2">
          {options.map((opt) => {
            const isSel = selected === opt.c;
            const correctNow = status === 'correct' && opt.c === target.c;
            const wrongNow = status === 'wrong' && isSel;
            return (
              <motion.button
                key={opt.c}
                disabled={status === 'correct'}
                onClick={() => onOption(opt)}
                animate={
                  wrongNow
                    ? { x: [0, -10, 10, -10, 10, 0] }
                    : correctNow
                      ? { scale: [1, 1.08, 1] }
                      : {}
                }
                transition={{ duration: 0.4 }}
                className={[
                  'flex flex-col items-center justify-center gap-1 rounded-2xl py-6 text-6xl font-extrabold leading-tight shadow-sm transition-colors sm:text-7xl',
                  correctNow
                    ? 'bg-green-200 text-green-800'
                    : wrongNow
                      ? 'bg-red-200 text-red-800'
                      : 'bg-white text-ink hover:bg-sky-50',
                ].join(' ')}
              >
                <span>{opt.c}</span>
                {showPinyin && <span className="text-base font-normal text-ink-soft">{opt.pinyin}</span>}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* 答对揭示卡（融合 payoff：组词 + 例句） */}
      {reveal && target && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl bg-gradient-to-br from-amber-100 to-pink-100 p-5 text-center shadow"
        >
          <div className="text-center text-7xl font-extrabold leading-tight text-ink sm:text-8xl">{target.c}</div>
          <div className="mt-1 text-lg text-ink-soft">{target.pinyin}</div>
          <div className="mt-3 text-ink">
            <span className="font-bold">{t('hanziListen.wordLabel')}：</span>
            {target.word}
          </div>
          <div className="mt-1 text-ink">
            <span className="font-bold">{t('hanziListen.sentenceLabel')}：</span>
            {target.sentence}
          </div>
        </motion.div>
      )}
    </div>
  );
}
