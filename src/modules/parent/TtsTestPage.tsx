/**
 * 语音引擎诊断 / A·B 评测页（家长 / 开发者用，不在儿童侧边栏）
 * ------------------------------------------------------------
 * 用途：
 *   1. 查看当前环境能力（WebGPU、系统中文音色数量、各引擎加载状态）；
 *   2. 一键加载神经网络模型（Kokoro），验证中文音质与多音字处理；
 *   3. 调节音色 / 语速 / 音高 / 音量 / 情绪，实时试听；
 *   4. 多音字专项评测；
 *   5. 系统语音 vs 神经网络 同文本 A·B 对比。
 * 访问：浏览器打开 https://你的域名/#/ttstest
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { navigate } from '@/lib/router';
import { tts } from '@/lib/tts/manager';
import { HETERONYMS } from '@/lib/tts/g2p';
import type { TtsPlayHandle, TtsSettings } from '@/lib/tts/types';
import DEEP_POEMS from '@/data/poems-deep';
import { CandyButton } from '@/components/ui/Button';
import { FollowRead } from '@/components/FollowRead';
import { cn } from '@/lib/utils';

/** 模拟儿歌数据（简短，便于测试跟读评测流程） */
const MOCK_RHYMES = [
  {
    title: '小星星',
    emoji: '⭐',
    lines: ['一闪一闪亮晶晶', '满天都是小星星'],
    lang: 'zh-CN' as const,
    tone: 'blue' as const,
  },
  {
    title: '两只老虎',
    emoji: '🐯',
    lines: ['两只老虎 两只老虎', '跑得快 跑得快'],
    lang: 'zh-CN' as const,
    tone: 'pink' as const,
  },
  {
    title: '春天到',
    emoji: '🌸',
    lines: ['春天到 春天到', '花儿朵朵开口笑'],
    lang: 'zh-CN' as const,
    tone: 'green' as const,
  },
  {
    title: 'Spring',
    emoji: '🌱',
    lines: ['Spring is green', 'Flowers bloom'],
    lang: 'en-US' as const,
    tone: 'amber' as const,
  },
];

const EMOTIONS = [
  { key: 'plain', name: 'tts.emotionPlain', rate: 0.8, pitch: 1.1 },
  { key: 'homesick', name: 'tts.emotionHomesick', rate: 0.7, pitch: 1.05 },
  { key: 'frontier', name: 'tts.emotionFrontier', rate: 0.82, pitch: 0.96 },
  { key: 'nature', name: 'tts.emotionNature', rate: 0.74, pitch: 1.12 },
  { key: 'bold', name: 'tts.emotionBold', rate: 0.86, pitch: 1.08 },
  { key: 'joy', name: 'tts.emotionJoy', rate: 0.82, pitch: 1.15 },
];

const SAMPLES = DEEP_POEMS.slice(0, 8).map((p) => ({
  id: p.id,
  label: `${p.title} · ${p.author}`,
  text: `${p.title}。${p.author}。${p.lines.map((l) => l.text).join('。')}。`,
}));

export default function TtsTestPage() {
  const { t: translate } = useTranslation();
  const [, force] = useState(0);
  const [status, setStatus] = useState(() => tts.getStatus());
  const [settings, setSettings] = useState<TtsSettings>(() => tts.getSettings());
  const [text, setText] = useState(SAMPLES[0]?.text ?? '床前明月光，疑是地上霜。举头望明月，低头思故乡。');
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelMsg, setModelMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleRef = useRef<TtsPlayHandle | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [, setLine] = useState(-1);

  // FollowRead 跟读测试：当前选中的模拟儿歌
  const [mockIdx, setMockIdx] = useState(0);

  // A/B
  const abRef = useRef<{ sys: TtsPlayHandle | null; neu: TtsPlayHandle | null }>({ sys: null, neu: null });
  const [abPlaying, setAbPlaying] = useState<'sys' | 'neu' | null>(null);

  useEffect(() => {
    const unsub = tts.subscribe(() => {
      setSettings(tts.getSettings());
      setStatus(tts.getStatus());
      force((n) => n + 1);
    });
    setStatus(tts.getStatus());
    // 预热系统语音音色列表
    void tts.ensureEngine('webspeech').then(() => setStatus(tts.getStatus()));
    return unsub;
  }, []);

  // 该页为家长/开发者诊断工具，不在 NAV_ITEMS 中，故自行设置 document.title
  // （同时让预渲染管线能匹配到路由标题，避免被判定 SKIP）
  useEffect(() => {
    document.title = translate('tts.pageTitle');
  }, [translate]);

  // 进度轮询（line 由 play 的 onLine 回调更新）
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const h = handleRef.current;
      if (!h) return;
      setProgress(h.progress);
      if (h.state === 'stopped') {
        setPlaying(false);
        setProgress(1);
      }
    }, 100);
    return () => clearInterval(t);
  }, [playing]);

  const update = (patch: Partial<TtsSettings>) => {
    tts.updateSettings(patch);
    setSettings(tts.getSettings());
  };

  const play = async () => {
    handleRef.current?.stop();
    setPlaying(true);
    setProgress(0);
    setLine(0);
    const h = await tts.play(text, {}, (i) => setLine(i));
    handleRef.current = h;
    h.done.finally(() => {
      setPlaying(false);
      setProgress(1);
      setLine(-1);
    });
  };
  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setPlaying(false);
    setProgress(0);
    setLine(-1);
  };

  const loadKokoro = async () => {
    setLoadingModel(true);
    setModelMsg(null);
    try {
      const info = await tts.ensureEngine('kokoro');
      setStatus(tts.getStatus());
      if (info.error) setModelMsg({ ok: false, msg: translate('tts.loadFail', { msg: info.error }) });
      else setModelMsg({ ok: true, msg: translate('tts.modelReady', { name: info.name }) });
    } catch (e) {
      setModelMsg({ ok: false, msg: translate('tts.modelError', { msg: e instanceof Error ? e.message : String(e) }) });
    } finally {
      setLoadingModel(false);
    }
  };

  const playHeteronym = async (word: string) => {
    handleRef.current?.stop();
    setPlaying(true);
    const h = await tts.play(word, {}, () => undefined);
    handleRef.current = h;
    h.done.finally(() => setPlaying(false));
  };

  const abText = text;
  const playAb = async (which: 'sys' | 'neu') => {
    abRef.current[which]?.stop();
    if (which === 'sys') {
      const h = await tts.play(abText, { rate: settings.rate, pitch: settings.pitch, volume: settings.volume, voiceURI: settings.voiceURI });
      abRef.current.sys = h;
    } else {
      // 神经网络：临时切引擎
      const prev = settings.engine;
      tts.updateSettings({ engine: 'kokoro' });
      try {
        const h = await tts.play(abText, { rate: settings.rate, pitch: settings.pitch, volume: settings.volume });
        abRef.current.neu = h;
      } catch {
        setModelMsg({ ok: false, msg: translate('tts.neuralUnavailable') });
      } finally {
        tts.updateSettings({ engine: prev });
      }
    }
    setAbPlaying(which);
  };
  const stopAb = (which: 'sys' | 'neu') => {
    abRef.current[which]?.stop();
    abRef.current[which] = null;
    setAbPlaying((p) => (p === which ? null : p));
  };

  const zhVoices = useMemo(() => tts.listZhVoices(), [status]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-candy-pink-deep">{translate('tts.pageTitle')}</h2>
          <button
            onClick={() => navigate('parent')}
            className="shrink-0 rounded-2xl bg-cream-dark px-3 py-1.5 text-xs font-extrabold text-ink-soft hover:bg-candy-yellow"
          >
            ← {translate('tts.back')}
          </button>
        </div>
        <p className="text-xs text-ink-soft">
          {translate('tts.pageDesc')}
        </p>
      </div>

      {/* 环境能力 */}
      <Card title={translate('tts.cardEnv')}>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Stat label="WebGPU" value={status.webgpu ? translate('tts.supported') : translate('tts.unsupported')} />
          <Stat label={translate('tts.sysVoiceCount')} value={translate('tts.zhVoiceCount', { count: status.zhVoiceCount })} />
          <Stat label={translate('tts.curEngine')} value={settings.engine === 'kokoro' ? translate('tts.engineNeural') : translate('tts.engineSystem')} />
        </div>
        <div className="mt-2 space-y-1">
          {status.engines.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-xs">
              <span className="font-extrabold text-ink">{e.name}</span>
              <span className={cn('rounded-full px-2 py-0.5 font-bold', e.loaded ? 'bg-emerald-100 text-emerald-700' : e.available ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>
                {e.loaded ? translate('tts.ready') : e.available ? translate('tts.pending') : translate('tts.unavailable')}
              </span>
              <span className="text-ink-soft">{translate('tts.offlineLabel', { v: e.offline ? translate('tts.offlineYes') : translate('tts.offlineNo'), h: e.heteronymControl ? translate('tts.offlineYes') : translate('tts.offlineNo') })}</span>
              {e.error && <span className="text-rose-600">· {e.error}</span>}
            </div>
          ))}
        </div>
        {zhVoices.length > 0 && (
          <details className="mt-2 text-xs text-ink-soft">
            <summary className="cursor-pointer font-bold">{translate('tts.zhVoices', { count: zhVoices.length })}</summary>
            <ul className="mt-1 space-y-0.5">
              {zhVoices.slice(0, 20).map((v) => (
                <li key={v.uri} className="flex items-center gap-2">
                  <span className={cn('rounded px-1', v.local ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{v.local ? translate('tts.local') : translate('tts.cloud')}</span>
                  {v.name}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {/* 引擎与神经网络设置 */}
      <Card title={translate('tts.cardEngine')}>
        <div className="flex gap-2">
          <Chip active={settings.engine === 'webspeech'} onClick={() => update({ engine: 'webspeech' })}>{translate('tts.engineSystem')}</Chip>
          <Chip active={settings.engine === 'kokoro'} onClick={() => update({ engine: 'kokoro' })}>{translate('tts.engineNeural')}</Chip>
        </div>

        <div className="mt-3 space-y-2">
          <Field label={translate('tts.kokoroUrl')}>
            <input className={inputCls} value={settings.kokoroModelUrl} placeholder="https://你的CDN/Kokoro-82M/..." onChange={(e) => update({ kokoroModelUrl: e.target.value })} />
          </Field>
          <Field label={translate('tts.kokoroLibUrl')}>
            <input className={inputCls} value={settings.kokoroLibUrl} onChange={(e) => update({ kokoroLibUrl: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label={translate('tts.voiceField')}>
              <input className={inputCls} value={settings.kokoroVoice} onChange={(e) => update({ kokoroVoice: e.target.value })} />
            </Field>
            <Field label={translate('tts.precision')}>
              <select className={inputCls} value={settings.kokoroDtype} onChange={(e) => update({ kokoroDtype: e.target.value as TtsSettings['kokoroDtype'] })}>
                <option value="q4f16">q4f16</option>
                <option value="fp16">fp16</option>
                <option value="fp32">fp32</option>
              </select>
            </Field>
            <Field label={translate('tts.device')}>
              <select className={inputCls} value={settings.device} onChange={(e) => update({ device: e.target.value as TtsSettings['device'] })}>
                <option value="webgpu">webgpu</option>
                <option value="wasm">wasm</option>
              </select>
            </Field>
            <div className="flex items-end">
              <CandyButton tone="blue" size="sm" fullWidth disabled={loadingModel} onClick={loadKokoro}>
                {loadingModel ? translate('tts.loadingModel') : translate('tts.loadModel')}
              </CandyButton>
            </div>
          </div>
          {modelMsg && (
            <p className={cn('rounded-xl px-3 py-1.5 text-xs font-bold', modelMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
              {modelMsg.ok ? '✅ ' : '⚠️ '}{modelMsg.msg}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-ink-soft/80">
            {translate('tts.tip')}
          </p>
        </div>
      </Card>

      {/* 试听与调节 */}
      <Card title={translate('tts.cardTrial')}>
        <Field label={translate('tts.readText')}>
          <textarea className={cn(inputCls, 'h-24 resize-y')} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <Chip key={s.id} onClick={() => setText(s.text)}>{s.label}</Chip>
          ))}
        </div>

        <p className="mt-3 text-xs font-bold text-ink-soft">{translate('tts.emotion')}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {EMOTIONS.map((e) => (
            <Chip
              key={e.key}
              active={settings.emotion === e.key}
              onClick={() => {
                update({ emotion: e.key, rate: e.rate, pitch: e.pitch });
              }}
            >
              {translate(e.name)}
            </Chip>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Slider label={translate('tts.speed')} value={settings.rate} min={0.5} max={1.5} step={0.02} onChange={(v) => update({ rate: v })} />
          <Slider label={translate('tts.pitch')} value={settings.pitch} min={0.5} max={1.6} step={0.02} onChange={(v) => update({ pitch: v })} />
          <Slider label={translate('tts.volume')} value={settings.volume} min={0} max={1} step={0.02} onChange={(v) => update({ volume: v })} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <CandyButton tone={playing ? 'orange' : 'pink'} size="md" onClick={playing ? stop : play}>
            {playing ? translate('tts.stop') : translate('tts.listen')}
          </CandyButton>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-candy-pink transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-bold text-ink-soft">{Math.round(progress * 100)}%</span>
        </div>
      </Card>

      {/* 多音字评测 */}
      <Card title={translate('tts.cardHeteronym')}>
        <p className="mb-2 text-xs text-ink-soft">
          {translate('tts.heteronymDesc')}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HETERONYMS.map((h) => (
            <div key={h.char} className="rounded-2xl bg-white/70 p-2">
              <p className="text-base font-extrabold text-candy-purple-deep">【{h.char}】</p>
              <div className="mt-1 space-y-1">
                {h.readings.map((r) => (
                  <div key={r.py} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 font-mono text-sm font-bold text-candy-blue-deep">{r.py}</span>
                    <button
                      type="button"
                      onClick={() => playHeteronym(r.word)}
                      className="flex-1 rounded-lg bg-candy-yellow-soft px-2 py-1 text-left text-sm font-bold text-ink hover:bg-candy-yellow"
                    >
                      {r.word}
                    </button>
                    <span className="text-[11px] text-ink-soft">{r.mean}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* A/B 对比 */}
      <Card title={translate('tts.cardAb')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AbCol title={translate('tts.abSys')} active={abPlaying === 'sys'} onPlay={() => playAb('sys')} onStop={() => stopAb('sys')} />
          <AbCol title={translate('tts.abNeural')} active={abPlaying === 'neu'} onPlay={() => playAb('neu')} onStop={() => stopAb('neu')} />
        </div>
        <p className="mt-2 text-[11px] text-ink-soft/80">{translate('tts.abDesc')}</p>
      </Card>

      {/* FollowRead 跟读评测测试 */}
      <Card title={translate('tts.cardFollowRead')}>
        <p className="mb-3 text-[11px] text-ink-soft/80">
          {translate('tts.frDesc')}
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {MOCK_RHYMES.map((r, i) => (
            <button
              key={`r-${i}`}
              onClick={() => setMockIdx(i)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-sm font-bold transition',
                mockIdx === i
                  ? 'bg-candy-purple text-white shadow-sm'
                  : 'bg-black/5 text-ink-soft hover:bg-black/10',
              )}
            >
              {r.emoji} {r.title}
            </button>
          ))}
        </div>
        <FollowRead
          key={mockIdx}
          text={MOCK_RHYMES[mockIdx]!.lines.join('，')}
          lines={MOCK_RHYMES[mockIdx]!.lines}
          lang={MOCK_RHYMES[mockIdx]!.lang}
          module="story"
          rate={0.78}
          tone={MOCK_RHYMES[mockIdx]!.tone}
          threshold={60}
          enableAiAdvice
          title={`${MOCK_RHYMES[mockIdx]!.emoji} ${MOCK_RHYMES[mockIdx]!.title}`}
        />
      </Card>

      <p className="pb-6 text-center text-[11px] text-ink-soft/70">
        {translate('tts.frConclusion')}
      </p>
    </div>
  );
}

/* ---------------- UI 小组件 ---------------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
      <h3 className="mb-3 text-base font-extrabold text-candy-blue-deep">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2">
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="font-extrabold text-ink">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-ink-soft">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  'input-jelly w-full px-3 py-2 text-base font-bold text-ink outline-none';

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-extrabold transition-colors',
        active ? 'bg-candy-pink text-white' : 'bg-white/70 text-ink-soft hover:bg-candy-pink-soft',
      )}
    >
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft">
        <span>{label}</span>
        <span className="font-mono text-candy-purple-deep">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-candy-pink"
      />
    </label>
  );
}

function AbCol({ title, active, onPlay, onStop }: { title: string; active: boolean; onPlay: () => void; onStop: () => void }) {
  const { t: translate } = useTranslation();
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <p className="mb-2 text-sm font-extrabold text-ink">{title}</p>
      <div className="flex gap-2">
        <CandyButton tone={active ? 'orange' : 'green'} size="sm" fullWidth onClick={active ? onStop : onPlay}>
          {active ? translate('tts.stopShort') : translate('tts.readTogether')}
        </CandyButton>
      </div>
    </div>
  );
}
