/**
 * 语音设置 · 全站唯一数据源
 * ------------------------------------------------------------
 * 为什么单独抽一个文件：
 *   speech.ts（老引擎，全站几十处 speak 调用）和 tts/manager.ts（新引擎抽象层）
 *   都要读同一份用户设置。如果让 speech.ts 去 import manager，会把
 *   kokoroEngine 一并拖进所有页面的依赖图；反过来也不成立。
 *   把「设置」下沉为无依赖的独立模块，两边都只依赖它，互不牵连。
 *
 * 设计要点：
 *   - 内存缓存 + localStorage 持久化，读取零成本（speak 每句都会读）；
 *   - 发布订阅，UI 改设置后立即对后续朗读生效，无需刷新；
 *   - 隐私模式 / localStorage 不可用时静默降级为内存态，不抛错。
 */
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import type { TtsCustomScene, TtsModuleKey, TtsModulePreset, TtsModulePresets, TtsScenePreset, TtsSettings } from './types';

const SETTINGS_KEY = 'bb_tts_settings_v1';

export const DEFAULT_SETTINGS: TtsSettings = {
  engine: 'edge', // 默认开启微软超拟真 Neural 真人音色（天籁真人声），遇断网自动秒级降级 WebSpeech / 本地离线音频
  edgeVoice: 'zh-CN-XiaoxiaoNeural',
  rate: 0.8,
  pitch: 1.05,
  volume: 1,
  emotion: 'plain',
  voiceURI: '',
  polyphone: true,
  // 分模块朗读微调：默认全空（=跟随全局），家长可针对古诗/鼓励等单独调速
  modulePresets: {},
  // 家长保存的专属场景（P7 / P9 · ④ 多槽位）：数组，互不复盖
  customScenes: [],
  // 神经网络引擎：用户配置自托管 R2/CDN 地址后启用，默认留空避免未认证直接请求 HuggingFace 报错 401
  kokoroModelUrl: '',
  kokoroLibUrl: 'https://cdn.jsdelivr.net/npm/kokoro-js/dist/kokoro.web.js',
  kokoroVoice: 'zf_xiaoxiao',
  kokoroDtype: 'q4f16',
  device: 'webgpu',
};

/** 微软超拟真 Neural 真人音色列表（业界天花板级儿童与少儿教育音色） */
export const EDGE_NEURAL_VOICES: { id: string; name: string; desc: string; lang: 'zh' | 'en'; tag: string }[] = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓老师', desc: '温柔亲切·少儿名师女声', lang: 'zh', tag: '推荐·故事/古诗' },
  { id: 'zh-CN-YunxiNeural', name: '云希弟弟', desc: '清脆活泼·同龄男孩童声', lang: 'zh', tag: '推荐·游戏/互动' },
  { id: 'zh-CN-YunjianNeural', name: '云健哥哥', desc: '阳光帅气·大哥哥青年男声', lang: 'zh', tag: '百科/探险' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊姐姐', desc: '生动甜美·可爱知心姐姐', lang: 'zh', tag: '儿歌/日常' },
  { id: 'en-US-AnaNeural', name: 'Ana 安娜', desc: '纯正甜美·美式少儿英文童声', lang: 'en', tag: '英语首选' },
];

/** 神经网络引擎可选音色（中文为主，适配儿童内容）。首字符 z=中文，a=英文。 */
export const NEURAL_VOICES: { id: string; name: string; lang: 'zh' | 'en' }[] = [
  { id: 'zf_xiaoxiao', name: '小晓（温柔女声·中文）', lang: 'zh' },
  { id: 'zf_xiaobei', name: '小北（清亮女声·中文）', lang: 'zh' },
  { id: 'zm_yunjian', name: '云见（沉稳男声·中文）', lang: 'zh' },
  { id: 'zm_yunxi', name: '云溪（少年男声·中文）', lang: 'zh' },
  { id: 'af_heart', name: 'Heart（英文·字母单词用）', lang: 'en' },
];

/** speech.ts 老调用点的基准值：用户设置相对它换算成倍率，从而调制全站朗读 */
export const BASE_RATE = 0.8;
export const BASE_PITCH = 1.1;

function read(): TtsSettings {
  try {
    const raw = safeGetItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TtsSettings> & {
        customScene?: { rate: number; pitch: number; volume: number; modulePresets?: unknown };
      };
      // P9 · ④ 迁移：旧版单 customScene 升级为多槽位 customScenes（slot 1）
      if ((parsed as { customScene?: unknown }).customScene && !parsed.customScenes) {
        const old = (parsed as { customScene: { rate: number; pitch: number; volume: number; modulePresets?: unknown } }).customScene;
        parsed.customScenes = [
          { slot: 1, name: '我的场景', emoji: '🎚️', rate: old.rate, pitch: old.pitch, volume: old.volume, modulePresets: (old.modulePresets as TtsModulePresets) ?? {} },
        ];
        delete (parsed as { customScene?: unknown }).customScene;
      }
      // 自动迁移：清理历史缓存中无法直接免鉴权请求的 HuggingFace 默认地址
      if (parsed.kokoroModelUrl === 'onnx-community/Kokoro-82M-v1.0') {
        parsed.kokoroModelUrl = '';
      }
      if (parsed.engine === 'kokoro' && !parsed.kokoroModelUrl) {
        parsed.engine = 'edge';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[tts/settings] 解析/操作失败，已回退默认', e);
  }
  return { ...DEFAULT_SETTINGS };
}

let cache: TtsSettings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): TtsSettings {
  if (!cache) cache = read();
  return cache;
}

export function updateSettings(patch: Partial<TtsSettings>): TtsSettings {
  cache = { ...getSettings(), ...patch };
  safeSetItem(SETTINGS_KEY, JSON.stringify(cache));
  listeners.forEach((f) => f());
  return cache;
}

export function resetSettings(): TtsSettings {
  return updateSettings({ ...DEFAULT_SETTINGS });
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ---------------- P6：朗读场景预设包 ---------------- */

/** 内置朗读场景（家长一键套用整体朗读气质）。顺序是 UI 展示顺序。 */
export const SCENE_PRESETS: TtsScenePreset[] = [
  { id: 'standard', name: '标准', emoji: '🧸', desc: '日常均衡，适合大多数时间', rate: 0.8, pitch: 1.1, volume: 1, moduleRateMul: 1, modulePitchDelta: 0, neuralVoice: 'zf_xiaoxiao' },
  { id: 'sleep', name: '睡前', emoji: '🌙', desc: '更慢更柔，自动切温柔中文音色，像在耳边轻轻讲', rate: 0.62, pitch: 1.0, volume: 0.8, moduleRateMul: 0.85, modulePitchDelta: -0.05, neuralVoice: 'zf_xiaoxiao', preferNeural: true },
  { id: 'energetic', name: '活力', emoji: '⚡', desc: '更明快俏皮，切清亮女声，陪玩时更带劲', rate: 0.95, pitch: 1.25, volume: 1, moduleRateMul: 1.1, modulePitchDelta: 0.08, neuralVoice: 'zf_xiaobei' },
  { id: 'clear', name: '清晰', emoji: '🔆', desc: '字字清楚，识字跟读更跟得上', rate: 0.72, pitch: 1.05, volume: 1, moduleRateMul: 0.95, modulePitchDelta: 0, neuralVoice: 'zf_xiaoxiao' },
];

const ALL_MODULE_KEYS: TtsModuleKey[] = ['poem', 'quiz', 'praise', 'number', 'letter', 'story', 'ai'];

/** 把「统一模块微调」展开成每个模块的预设；倍率=1 且偏移=0 时不写，回退全局 */
export function buildUniformModulePresets(rateMul = 1, pitchDelta = 0): TtsModulePresets {
  if (rateMul === 1 && pitchDelta === 0) return {};
  const out: TtsModulePresets = {};
  for (const k of ALL_MODULE_KEYS) out[k] = { rateMul, pitchDelta };
  return out;
}

/**
 * 一键套用某朗读场景：写入全局语速/音高/音量 + 全模块统一微调，
 * 并联动中文神经音色（P9 · ③）——睡前等场景自动切到温柔/清亮中文嗓，
 * 若场景标了 preferNeural（如睡前），且已配置模型，则一并启用神经网络朗读，
 * 让「柔和音色」真正出声。
 */
export function applyScene(id: string): TtsSettings {
  const sc = SCENE_PRESETS.find((x) => x.id === id);
  if (!sc) return getSettings();
  const patch: Partial<TtsSettings> = {
    rate: sc.rate,
    pitch: sc.pitch,
    volume: sc.volume,
    modulePresets: buildUniformModulePresets(sc.moduleRateMul, sc.modulePitchDelta),
  };
  // 联动神经音色：已配置模型时同步切换选中的中文嗓
  const s = getSettings();
  if (sc.neuralVoice) patch.kokoroVoice = sc.neuralVoice;
  // 场景要求且模型可用 → 启用神经网络朗读，让柔和音色立刻生效
  if (sc.preferNeural && s.kokoroModelUrl) patch.engine = 'kokoro';
  return updateSettings(patch);
}

/** 当前设置是否精确命中某个场景（否则视为「自定义」）。命中某槽位返回 'slot-N'。 */
export function detectActiveScene(s: TtsSettings): string {
  // P7/④：先比对家长保存的专属场景（完整快照，支持非均匀模块微调）
  const scenes = s.customScenes ?? [];
  for (const c of scenes) {
    if (
      c.rate === s.rate &&
      c.pitch === s.pitch &&
      c.volume === s.volume &&
      JSON.stringify(c.modulePresets) === JSON.stringify(s.modulePresets ?? {})
    ) {
      return `slot-${c.slot}`;
    }
  }
  for (const sc of SCENE_PRESETS) {
    const expect = buildUniformModulePresets(sc.moduleRateMul, sc.modulePitchDelta);
    if (
      s.rate === sc.rate &&
      s.pitch === sc.pitch &&
      s.volume === sc.volume &&
      JSON.stringify(s.modulePresets) === JSON.stringify(expect)
    ) {
      return sc.id;
    }
  }
  return 'custom';
}

/* ---------------- P7 / P9·④：我的场景（多槽位保存） ---------------- */

/** 最多可保存的场景套数 */
export const MAX_CUSTOM_SCENES = 4;

/** 把当前设置快照进指定槽位（已存在则覆盖，不存在则新增） */
export function saveCustomSceneSlot(slot: number, name?: string): TtsSettings {
  const s = getSettings();
  const scenes = [...(s.customScenes ?? [])];
  const idx = scenes.findIndex((x) => x.slot === slot);
  const snap: TtsCustomScene = {
    slot,
    name: name?.trim() || `我的场景 ${slot}`,
    emoji: '🎚️',
    rate: s.rate,
    pitch: s.pitch,
    volume: s.volume,
    modulePresets: s.modulePresets ?? {},
  };
  if (idx >= 0) scenes[idx] = snap;
  else scenes.push(snap);
  scenes.sort((a, b) => a.slot - b.slot);
  return updateSettings({ customScenes: scenes });
}

/** 套用已保存的指定槽位场景（无则原样返回） */
export function applyCustomSceneSlot(slot: number): TtsSettings {
  const c = (getSettings().customScenes ?? []).find((x) => x.slot === slot);
  if (!c) return getSettings();
  return updateSettings({
    rate: c.rate,
    pitch: c.pitch,
    volume: c.volume,
    modulePresets: c.modulePresets,
  });
}

/** 删除某槽位场景 */
export function deleteCustomSceneSlot(slot: number): TtsSettings {
  const scenes = (getSettings().customScenes ?? []).filter((x) => x.slot !== slot);
  return updateSettings({ customScenes: scenes });
}

/** 下一个空槽位（满则返回 0） */
export function nextFreeSlot(s: TtsSettings): number {
  const used = new Set((s.customScenes ?? []).map((x) => x.slot));
  for (let i = 1; i <= MAX_CUSTOM_SCENES; i++) if (!used.has(i)) return i;
  return 0;
}

/**
 * 把「用户全局偏好」叠加到某个调用点自带的参数上。
 * 全站几十处 speak 各自带着精心调过的语速（字母 0.7、数字 0.75、鼓励语 0.9…），
 * 直接用用户设置覆盖会毁掉这些手调值，所以改用 **倍率调制**：
 * 保留各调用点的相对差异，同时让用户的「整体快一点/慢一点」全局生效。
 *
 * 分模块微调（P5）：若 opts.module 命中家长的模块预设，再做一层
 * rateMul × 与 pitchDelta +，实现「古诗慢一点、鼓励语活泼一点」这类
 * 跨模块差异，而无需在每一处调用点硬编码。
 */
export function applyUserPrefs(opts: {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  module?: TtsModuleKey | string;
}): { rate?: number; pitch?: number; volume?: number; voiceURI?: string } {
  const s = getSettings();
  const rateMul = s.rate / BASE_RATE;
  const pitchDelta = s.pitch - BASE_PITCH;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // 分模块微调（未知 module key 运行时自然回落为无预设）
  const mp = opts.module ? s.modulePresets?.[opts.module as TtsModuleKey] : undefined;
  const modRateMul = mp?.rateMul ?? 1;
  const modPitchDelta = mp?.pitchDelta ?? 0;

  return {
    rate: opts.rate === undefined ? undefined : clamp(opts.rate * rateMul * modRateMul, 0.3, 2),
    pitch: opts.pitch === undefined ? undefined : clamp(opts.pitch + pitchDelta + modPitchDelta, 0.4, 2),
    volume: clamp((opts.volume ?? 1) * s.volume, 0, 1),
    // 中文才套用用户选的音色，英文单词朗读仍走英文音色自动优选
    voiceURI: opts.lang === 'en-US' ? '' : s.voiceURI,
  };
}

/**
 * 更新单个模块的朗读微调（P5）。
 * patch 留空则清除该模块预设（回退到跟随全局）。
 * 多模块共享一组 UI 时（如「数字·字母」同时写 number+letter），调用方循环传入即可。
 */
export function setModulePreset(
  key: TtsModuleKey,
  patch?: TtsModulePreset,
): TtsSettings {
  const cur = getSettings().modulePresets ?? {};
  const next: TtsModulePresets = { ...cur };
  if (patch && (patch.rateMul !== undefined || patch.pitchDelta !== undefined)) {
    next[key] = { ...next[key], ...patch };
  } else {
    delete next[key];
  }
  return updateSettings({ modulePresets: next });
}
