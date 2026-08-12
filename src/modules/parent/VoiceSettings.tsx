/**
 * 朗读设置组件（P4 · 家长中心接入）
 * ------------------------------------------------------------
 * 把全站语音设置（音色 / 语速 / 音高 / 音量 / 多音字纠音）做成可调节的 UI，
 * 写入 src/lib/tts/settings.ts 这一全站唯一数据源，所有朗读调用点自动生效。
 *
 * 设计要点：
 *  - 用订阅模式实时反映设置变化，改完即生效，无需刷新；
 *  - 试听按钮直接走 speech.speak，享受与全站一致的「倍率调制」逻辑，
 *    听到的就是宝贝在各模块将听到的效果；
 *  - 多音字纠音提供「原文 vs 实际朗读」对照预览，改开关能立刻看到差异；
 *  - 音色列表异步加载（voiceschanged），加载不出来也降级为「系统自动优选」。
 */
import { useEffect, useMemo, useState } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import {
  DEFAULT_SETTINGS,
  applyCustomSceneSlot,
  applyScene,
  deleteCustomSceneSlot,
  detectActiveScene,
  getSettings,
  MAX_CUSTOM_SCENES,
  NEURAL_VOICES,
  nextFreeSlot,
  resetSettings,
  saveCustomSceneSlot,
  SCENE_PRESETS,
  setModulePreset,
  subscribeSettings,
  updateSettings,
} from '@/lib/tts/settings';
import type { TtsModuleKey, TtsModulePresets } from '@/lib/tts/types';
import { tts } from '@/lib/tts/manager';
import { speak, stopSpeaking } from '@/lib/speech';
import { correctChars, polyphoneFixes } from '@/lib/tts/polyphone';
import { useTranslation } from '@/i18n/useTranslation';

/** 试听样本：两句都含经典诗词多音字（见 xiàn / 还 huán） */
const SAMPLE_CHARS: { c: string; p?: string }[] = [
  { c: '风', p: 'fēng' }, { c: '吹', p: 'chuī' }, { c: '草', p: 'cǎo' }, { c: '低', p: 'dī' },
  { c: '见', p: 'xiàn' }, { c: '牛', p: 'niú' }, { c: '羊', p: 'yáng' },
  { c: '万', p: 'wàn' }, { c: '里', p: 'lǐ' }, { c: '长', p: 'cháng' }, { c: '征', p: 'zhēng' },
  { c: '人', p: 'rén' }, { c: '未', p: 'wèi' }, { c: '还', p: 'huán' },
];

export default function VoiceSettings() {
  const { t } = useTranslation();
  const [s, setS] = useState(() => getSettings());
  const [voices, setVoices] = useState(() => tts.listZhVoices());
  const [playing, setPlaying] = useState(false);

  // 实时跟设置数据源
  useEffect(() => subscribeSettings(() => setS(getSettings())), []);

  // 音色异步加载
  useEffect(() => {
    const update = () => setVoices(tts.listZhVoices());
    update();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', update);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
    }
    return undefined;
  }, []);

  const fixes = useMemo(() => polyphoneFixes(SAMPLE_CHARS), []);
  const fixIdx = useMemo(() => new Map(fixes.map((f) => [f.index, f])), [fixes]);
  const spoken = useMemo(() => correctChars(SAMPLE_CHARS), []);
  const activeScene = useMemo(() => detectActiveScene(s), [s]);

  const set = (patch: Partial<typeof s>) => updateSettings(patch);

  const audition = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    const usePoly = getSettings().polyphone;
    const text = usePoly ? spoken : SAMPLE_CHARS.map((c) => c.c).join('');
    setPlaying(true);
    // 不传 rate/pitch/volume：让 speech.speak 按倍率调制套用全局偏好，
    // 听到的就是各模块真实效果
    await speak(text, { lang: 'zh-CN', onEnd: () => setPlaying(false) });
    setPlaying(false);
  };

  // 神经网络发音预览：无视当前主引擎，直接走 Kokoro 本地模型，让家长先听效果
  const [neuralLoading, setNeuralLoading] = useState(false);
  const neuralOn = s.engine === 'kokoro';
  const previewNeural = async () => {
    if (neuralLoading) return;
    setNeuralLoading(true);
    try {
      await tts.ensureEngine('kokoro');
      const k = tts.getKokoro();
      if (k) {
        const handle = await k.play('小熊宝宝在森林里，轻轻念着一首古诗。', {
          rate: s.rate,
          pitch: s.pitch,
          volume: s.volume,
        });
        await handle.done;
      } else {
        await speak('小熊宝宝在森林里，轻轻念着一首古诗。', { lang: 'zh-CN' });
      }
    } catch {
      /* 兜底系统语音 */
    } finally {
      setNeuralLoading(false);
    }
  };

  return (
    <Panel>
      <PanelTitle emoji="🎙️" title={t('parent.voiceTitle')} subtitle={t('parent.voiceSubtitle')} tone="green" />

      <div className="space-y-4">
        {/* 音色 */}
        <div>
          <div className="mb-2 text-sm font-extrabold text-ink">{t('parent.voiceTone')}</div>
          <select
            value={s.voiceURI}
            onChange={(e) => set({ voiceURI: e.target.value })}
            className="w-full rounded-2xl border-2 border-candy-green-soft bg-white/80 px-3 py-3 text-base font-bold text-ink outline-none focus:border-candy-green active:scale-[0.99]"
          >
            <option value="">{t('parent.voiceAuto')}</option>
            {voices.map((v) => (
              <option key={v.uri} value={v.uri}>
                {v.name}
                {v.local ? t('parent.voiceLocal') : t('parent.voiceCloud')}
              </option>
            ))}
          </select>
          {voices.length === 0 && (
            <p className="mt-1 text-xs font-bold text-ink-soft">{t('parent.voiceLoading')}</p>
          )}
        </div>

        {/* 三个滑杆 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Slider
            label={t('parent.voiceRate')}
            value={s.rate}
            min={0.5}
            max={1.5}
            step={0.02}
            format={(v) => `×${v.toFixed(2)}`}
            onChange={(v) => set({ rate: v })}
          />
          <Slider
            label={t('parent.voicePitch')}
            value={s.pitch}
            min={0.5}
            max={1.6}
            step={0.02}
            format={(v) => v.toFixed(2)}
            onChange={(v) => set({ pitch: v })}
          />
          <Slider
            label={t('parent.voiceVolume')}
            value={s.volume}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set({ volume: v })}
          />
        </div>

        {/* 神经网络朗读（P8）：本地 AI 模型，自然度更高，一键开启 */}
        <div className="rounded-2xl bg-candy-blue-soft/40 p-3">
          <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-ink">
            <span>🧠 {t('parent.voiceNeural')}</span>
            {neuralOn ? (
              <span className="rounded-full bg-candy-blue px-2 py-0.5 text-[10px] font-extrabold text-white">{t('parent.voiceOn')}</span>
            ) : (
              <span className="rounded-full bg-gray-300 px-2 py-0.5 text-[10px] font-extrabold text-gray-700">{t('parent.voiceOff')}</span>
            )}
          </div>
          <p className="mb-3 text-xs font-bold text-ink-soft">
            {t('parent.voiceNeuralDesc')}
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-ink-soft">
              {tts.webgpu() ? t('parent.voiceWebgpu') : t('parent.voiceCpu')}
            </span>
            <Toggle checked={neuralOn} onChange={(v) => set({ engine: v ? 'kokoro' : 'webspeech' })} />
          </div>
          {neuralOn && (
            <div className="mt-3">
              <div className="mb-1.5 text-xs font-bold text-ink-soft">{t('parent.voiceZhTone')}</div>
              <select
                value={s.kokoroVoice}
                onChange={(e) => set({ kokoroVoice: e.target.value })}
                className="w-full rounded-2xl border-2 border-candy-blue-soft bg-white/80 px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-candy-blue active:scale-[0.99]"
              >
                {NEURAL_VOICES.filter((v) => v.lang === 'zh').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <CandyButton
            tone="blue"
            variant="soft"
            size="sm"
            className="mt-3"
            disabled={neuralLoading}
            onClick={previewNeural}
          >
            {neuralLoading ? t('parent.voiceLoadingModel') : t('parent.voicePreviewNeural')}
          </CandyButton>
        </div>

        {/* 朗读场景（P6 + P7 + P9·④）：一键套用整体朗读气质 / 多套保存专属场景 */}
        <div className="rounded-2xl bg-candy-yellow-soft/40 p-3">
          <div className="mb-1 text-sm font-extrabold text-ink">{t('parent.voiceScene')}</div>
          <div className="mb-3 text-xs font-bold text-ink-soft">
            {t('parent.voiceSceneDesc', { count: MAX_CUSTOM_SCENES })}
          </div>
          <div className="flex flex-wrap gap-2">
            {SCENE_PRESETS.map((sc) => {
              const active = activeScene === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => applyScene(sc.id)}
                  className={
                    'flex w-16 flex-col items-center rounded-2xl px-2 py-2 text-center transition active:scale-95 ' +
                    (active
                      ? 'bg-candy-green text-white shadow'
                      : 'bg-white/80 text-ink hover:bg-white')
                  }
                >
                  <span className="text-2xl leading-none">{sc.emoji}</span>
                  <span className="mt-1 text-xs font-extrabold">{sc.name}</span>
                </button>
              );
            })}
            {activeScene === 'custom' && (s.customScenes ?? []).length === 0 && (
              <div className="flex w-16 flex-col items-center rounded-2xl bg-candy-yellow px-2 py-2 text-center">
                <span className="text-2xl leading-none">🎚️</span>
                <span className="mt-1 text-xs font-extrabold text-candy-yellow-deep">{t('parent.voiceCustom')}</span>
              </div>
            )}
          </div>
          <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-ink-soft">
            {SCENE_PRESETS.filter((sc) => sc.neuralVoice).map((sc) => (
              <span key={sc.id}>
                {sc.emoji}→{NEURAL_VOICES.find((v) => v.id === sc.neuralVoice)?.name.replace(/（.*/, '')}
                {sc.preferNeural ? t('parent.voiceAutoAi') : ''}
              </span>
            ))}
          </div>

          {/* 我的场景：多套槽位（P9 · ④） */}
          <div className="mt-3 border-t border-candy-yellow-deep/20 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-ink">{t('parent.voiceMyScenes', { count: (s.customScenes ?? []).length, max: MAX_CUSTOM_SCENES })}</span>
              <CandyButton
                tone="yellow"
                variant="soft"
                size="sm"
                disabled={nextFreeSlot(s) === 0}
                onClick={() => saveCustomSceneSlot(nextFreeSlot(s))}
              >
                ＋ {t('parent.voiceSaveCurrent')}
              </CandyButton>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: MAX_CUSTOM_SCENES }, (_, i) => i + 1).map((slot) => {
                const scene = (s.customScenes ?? []).find((x) => x.slot === slot);
                const active = activeScene === `slot-${slot}`;
                if (!scene) {
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => saveCustomSceneSlot(slot)}
                      className="flex flex-col items-center rounded-2xl border-2 border-dashed border-candy-yellow-deep/40 bg-white/50 px-2 py-2.5 text-center text-candy-yellow-deep transition active:scale-95"
                    >
                      <span className="text-xl leading-none">＋</span>
                      <span className="mt-1 text-[11px] font-extrabold">{t('parent.voiceEmptySlot', { slot })}</span>
                    </button>
                  );
                }
                return (
                  <div
                    key={slot}
                    className={
                      'flex flex-col items-center rounded-2xl px-2 py-2 text-center transition ' +
                      (active ? 'bg-candy-green text-white shadow' : 'bg-white/80 text-ink')
                    }
                  >
                    <button
                      type="button"
                      onClick={() => applyCustomSceneSlot(slot)}
                      className="flex w-full flex-col items-center active:scale-95"
                    >
                      <span className="text-2xl leading-none">{scene.emoji}</span>
                      <span className="mt-1 text-[11px] font-extrabold leading-tight">
                        {scene.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCustomSceneSlot(slot)}
                      className="mt-1 rounded-full bg-candy-orange-soft px-2 py-0.5 text-[10px] font-extrabold text-candy-orange-deep active:scale-95"
                    >
                      {t('parent.delete')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {activeScene.startsWith('slot-') ? (
              <p className="text-xs font-bold text-candy-green-deep">
                {t('parent.voiceApplied', { name: (s.customScenes ?? []).find((x) => `slot-${x.slot}` === activeScene)?.name ?? '' })}
              </p>
            ) : activeScene === 'custom' ? (
              <p className="text-xs font-bold text-ink-soft">{t('parent.voiceCustomNow')}</p>
            ) : (
              <p className="text-xs font-bold text-ink-soft">
                {SCENE_PRESETS.find((x) => x.id === activeScene)?.desc}
              </p>
            )}
          </div>
        </div>

        {/* 多音字纠音开关 */}
        <div className="flex items-center justify-between rounded-2xl bg-candy-green-soft/40 p-3">
          <div className="min-w-0 pr-3">
            <div className="text-sm font-extrabold text-ink">{t('parent.voicePolyphone')}</div>
            <div className="text-xs font-bold text-ink-soft">
              {t('parent.voicePolyphoneDesc')}
            </div>
          </div>
          <Toggle checked={s.polyphone} onChange={(v) => set({ polyphone: v })} />
        </div>

        {/* 分模块朗读微调（P5）：在全局语速/音高之上，单独给各内容模块加微调 */}
        <div className="rounded-2xl bg-candy-purple-soft/40 p-3">
          <div className="mb-1 text-sm font-extrabold text-ink">{t('parent.voiceModuleTune')}</div>
          <div className="mb-3 text-xs font-bold text-ink-soft">
            {t('parent.voiceModuleTuneDesc')}
          </div>
          <div className="space-y-3">
            <ModuleTuner emoji="📜" title={t('parent.voiceModPoem')} keys={['poem']} presets={s.modulePresets} />
            <ModuleTuner emoji="🔤" title={t('parent.voiceModQuiz')} keys={['quiz']} presets={s.modulePresets} />
            <ModuleTuner emoji="🎉" title={t('parent.voiceModPraise')} keys={['praise']} presets={s.modulePresets} />
            <ModuleTuner emoji="🔢" title={t('parent.voiceModNumber')} keys={['number', 'letter']} presets={s.modulePresets} />
            <ModuleTuner emoji="📚" title={t('parent.voiceModStory')} keys={['story', 'ai']} presets={s.modulePresets} />
          </div>
        </div>

        {/* 纠音对照预览 */}
        <div className="rounded-2xl bg-white/70 p-3">
          <div className="mb-1.5 text-xs font-bold text-ink-soft">{t('parent.voiceSample')}</div>
          <p className="text-lg font-extrabold leading-relaxed text-ink">
            {SAMPLE_CHARS.map((ch, i) =>
              i === 6 ? (
                <span key={`ch-${i}`}>
                  {ch.c}
                  <span className="mx-0.5 text-candy-orange-deep">，</span>
                </span>
              ) : (
                <span key={`char-${i}`}>{ch.c}</span>
              ),
            )}
          </p>
          <div className="mb-1.5 mt-3 text-xs font-bold text-ink-soft">
            {t('parent.voiceActual')}{!s.polyphone && t('parent.voicePolyOff')}
          </div>
          <p className="text-lg font-extrabold leading-relaxed text-ink">
            {SAMPLE_CHARS.map((ch, i) => {
              const f = fixIdx.get(i);
              if (i === 6) {
                return (
                  <span key={`ch-${i}`}>
                    {f ? <span className="rounded bg-candy-orange-soft px-1 text-candy-orange-deep">{f.sub}</span> : ch.c}
                    <span className="mx-0.5 text-candy-orange-deep">，</span>
                  </span>
                );
              }
              return f ? (
                <span key={`char-${i}`} className="rounded bg-candy-orange-soft px-1 text-candy-orange-deep">
                  {f.sub}
                </span>
              ) : (
                <span key={`char-${i}`}>{ch.c}</span>
              );
            })}
          </p>
        </div>

        {/* 操作 */}
        <div className="flex flex-wrap gap-2">
          <CandyButton tone={playing ? 'orange' : 'green'} size="md" onClick={audition}>
            {playing ? t('parent.voiceStop') : t('parent.voiceAudition')}
          </CandyButton>
          <CandyButton
            tone="purple"
            variant="soft"
            size="md"
            onClick={() => {
              resetSettings();
            }}
          >
            ↺ {t('parent.voiceReset')}
          </CandyButton>
        </div>

        {JSON.stringify(s) !== JSON.stringify(DEFAULT_SETTINGS) && (
          <p className="text-center text-[11px] font-bold text-ink-soft">
            {t('parent.voiceAutoSaved')}
          </p>
        )}
      </div>
    </Panel>
  );
}

/* ---------------- 分模块微调器（P5） ---------------- */
function ModuleTuner({
  emoji,
  title,
  keys,
  presets,
}: {
  emoji: string;
  title: string;
  keys: TtsModuleKey[];
  presets: TtsModulePresets;
}) {
  const { t } = useTranslation();
  // 分组（如「数字·字母」）共用一组 UI：取任一已设值作为当前显示
  const any = keys.map((k) => presets[k]).find(Boolean);
  const rateMul = any?.rateMul ?? 1;
  const pitchDelta = any?.pitchDelta ?? 0;

  // 两组微调都为「默认值」时，删除该模块预设（回退跟随全局）
  const apply = (rm: number, pd: number) => {
    const clear = rm === 1 && pd === 0;
    keys.forEach((k) => setModulePreset(k, clear ? undefined : { rateMul: rm, pitchDelta: pd }));
  };

  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-ink">
        <span>{emoji}</span>
        <span>{title}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Slider
          label={t('parent.voiceRateFine')}
          value={rateMul}
          min={0.7}
          max={1.3}
          step={0.05}
          format={(v) => `×${v.toFixed(2)}`}
          onChange={(v) => apply(v, pitchDelta)}
        />
        <Slider
          label={t('parent.voicePitchFine')}
          value={pitchDelta}
          min={-0.2}
          max={0.2}
          step={0.05}
          format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
          onChange={(v) => apply(rateMul, v)}
        />
      </div>
    </div>
  );
}

/* ---------------- 滑杆 ---------------- */
function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
        <span>{label}</span>
        <span className="font-mono text-candy-green-deep">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1.5 w-full accent-candy-green"
      />
    </label>
  );
}

/* ---------------- 开关 ---------------- */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        'relative inline-flex h-9 w-16 shrink-0 items-center rounded-full transition-colors active:scale-95 ' +
        (checked ? 'bg-candy-green' : 'bg-gray-300')
      }
    >
      <span
        className={
          'inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ' +
          (checked ? 'translate-x-8' : 'translate-x-1')
        }
      />
    </button>
  );
}
