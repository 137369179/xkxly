/**
 * AI 服务层 · 配置
 * 模型注册表、场景分级、参数预设。改模型只动这一个文件。
 */
import type { AiScene } from './types';

/**
 * 全站默认模型（可由 .env 的 VITE_AI_DEFAULT_MODEL 覆盖）。
 * 2026-08-16 起切换为 Agnes 2.5 Flash（用户指定默认，BFF 已配 AGNES_API_KEY）。
 */
export const DEFAULT_MODEL: string =
  (import.meta.env.VITE_AI_DEFAULT_MODEL as string | undefined) || 'agnes-2.5-flash';

/** BFF 代理地址。生产同源部署时留空，走相对路径 */
export const PROXY_URL: string =
  ((import.meta.env.VITE_AI_PROXY_URL as string | undefined) || '').replace(/\/$/, '') +
  '/api/ai/chat';

export interface ModelInfo {
  id: string;
  label: string;
  /** 相对速度：数字越小越快 */
  speed: 1 | 2 | 3;
  note: string;
}

/** 实测可用的文本模型（包含 StepFun 阶跃星辰、讯飞 MaaS Qwen3.6-35B-A3B、DeepSeek 与 Agnes） */
export const MODELS: ModelInfo[] = [
  { id: 'agnes-2.5-flash', label: 'Agnes 2.5 闪电', speed: 1, note: '全站默认（用户指定）' },
  { id: 'step-3.7-flash', label: 'StepFun 3.7 闪电', speed: 1, note: '阶跃星辰旗舰高速模型' },
  { id: 'step-3.5-flash', label: 'StepFun 3.5 闪电', speed: 1, note: '阶跃星辰高速模型' },
  { id: 'xopqwen36v35b', label: 'Qwen3.6-35B-A3B', speed: 1, note: '讯飞星辰 MaaS 超级旗舰模型' },
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4', speed: 1, note: 'DeepSeek 旗舰高速模型' },
  { id: 'deepseek-chat', label: 'DeepSeek Chat', speed: 1, note: '通用高速对话模型' },
  { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', speed: 2, note: '深度思考推理模型' },
  { id: 'agnes-2.5-pro', label: 'Agnes 2.5 深思', speed: 3, note: '适合学情分析等长文' },
];

interface SceneConfig {
  model: string;
  /**
   * 失败或模型不可用时的降级链。
   * ⚠️ 只能填 MODELS 注册表里存在的 id（P2-9：原先引用了未注册的 `agnes-2.0-flash`，
   * 降级到该模型必然失败，现已统一为 `agnes-2.5-flash`）。
   */
  fallback: string[];
  temperature: number;
  /**
   * ⚠️ 所有 Agnes 模型都是推理模型，思考链会吃掉 70~85% 的 completion token。
   * 实测 max_tokens=50 时思考链直接吃满、正文返回空串。所以此处一律给足。
   */
  maxTokens: number;
  /** 要求纯 JSON 输出 */
  json?: boolean;
}

/**
 * 场景 → 模型分级
 * 孩子端轻交互抢速度，家长端长文抢质量。
 */
const SCENE_CONFIG: Record<AiScene, SceneConfig> = {
  // —— 孩子端：速度优先 ——
  'praise': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.95, maxTokens: 700 },
  'letter.story': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.9, maxTokens: 900 },
  'logic.explain': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.5, maxTokens: 900 },

  // —— 孩子端：质量优先 ——
  'poem.tutor': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.6, maxTokens: 1400 },
  'math.explain': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.5, maxTokens: 1000 },

  // —— 结构化输出：低温度 + JSON ——
  'poem.grade': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.3, maxTokens: 1600, json: true },
  'math.generate': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.85, maxTokens: 1600, json: true },
  'plan.today': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.7, maxTokens: 1600, json: true },

  // —— 家长端：质量优先 ——
  'parent.report': { model: DEFAULT_MODEL, fallback: ['deepseek-reasoner', 'deepseek-chat'], temperature: 0.6, maxTokens: 2200 },
  'parent.deepReport': { model: DEFAULT_MODEL, fallback: ['deepseek-reasoner', 'deepseek-chat'], temperature: 0.6, maxTokens: 2200 },

  // —— v6 新增：孩子端速度优先 ——
  'number.story': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.9, maxTokens: 900 },
  'poem.imagine': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.85, maxTokens: 800 },
  'poem.prosody': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.5, maxTokens: 800 },
  // 对话类（小智语音/追问、逗趣延伸）同样走非推理模型，避免思考链吃空正文落到本地兜底
  'quiz.extend': { model: 'deepseek-chat', fallback: ['agnes-2.5-flash'], temperature: 0.9, maxTokens: 600 },
  'adventure.encourage': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 600 },
  'daily.summary': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.85, maxTokens: 700 },

  // —— v6 新增：孩子端质量优先 ——
  'poem.compare': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.6, maxTokens: 1200 },
  'poet.story': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.85, maxTokens: 1000 },

  // —— v6 新增：结构化输出 ——
  'count.generate': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.85, maxTokens: 1600, json: true },
  'letter.match': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.8, maxTokens: 1400, json: true },
  'wrong.analyze': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.3, maxTokens: 1200, json: true },
  'recommend.practice': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.5, maxTokens: 1200, json: true },

  // —— 汉字识字：速度优先 ——
  'hanzi.story': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.9, maxTokens: 900 },
  'hanzi.sentence': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.85, maxTokens: 600 },

  // —— 汉字识字：质量优先 ——
  'pinyin.tutor': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.6, maxTokens: 1000 },

  // —— 英语单词 ——
  'word.story': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.9, maxTokens: 800 },
  'word.phonics': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.6, maxTokens: 900 },

  // —— AI 故事绘本 ——
  'storybook.generate': { model: DEFAULT_MODEL, fallback: ['agnes-2.5-flash'], temperature: 0.85, maxTokens: 1800, json: true },

  // —— 朗读发音建议（P3-14）：速度优先，孩子等不了太久 ——
  'speech.advise': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.6, maxTokens: 800, json: true },

  // —— AI 个性化学习路径 ——
  'path.narrate': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.85, maxTokens: 700 },
  'path.weekly': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.7, maxTokens: 900 },
  'path.coach': { model: DEFAULT_MODEL, fallback: ['deepseek-reasoner', 'deepseek-chat'], temperature: 0.6, maxTokens: 1200 },

  // —— AI 陪伴学习伙伴 ——
  // ⚠️ 对话类场景必须走非推理模型（deepseek-chat）：这句话 AI 得直接出正文，
  // 而 agnes/deepseek-reasoner 的思考链会吃掉大量 completion token，
  // 曾经 maxTokens=250 被思考链吃空返回 empty_content，孩子得到的是本地兜底而不是真正的 AI 回答。
  'companion.chat': { model: 'deepseek-chat', fallback: ['deepseek-v4-flash', 'agnes-2.5-flash'], temperature: 0.85, maxTokens: 900 },
  'companion.explain': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 1000 },

  // —— S2 Companion 2.0 新增 ——
  'companion.buddyQuiz': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.85, maxTokens: 1400, json: true },
  'companion.dailyQuest': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.7, maxTokens: 1600, json: true },
  'companion.comfort': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.85, maxTokens: 700 },
  'companion.celebrate': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.9, maxTokens: 600 },
  'companion.followUp': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 900 },

  // —— 成语 AI 化 ——
  'idiom.story': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 800 },
  'idiom.sentence': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.9, maxTokens: 600, json: true },
  'idiom.hint': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.7, maxTokens: 300, json: true },

  // —— A3 儿歌学唱升级 ——
  'song.recommend': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 400, json: true },
  'song.explain': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 700 },

  // —— B1 音乐创作升级 ——
  'music.create': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.9, maxTokens: 600 },
  'music.rhythm': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.7, maxTokens: 500 },

  // —— B3/B4 节气与安全 ——
  'festival.talk': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 700 },
  'safety.scene': { model: DEFAULT_MODEL, fallback: ['deepseek-chat', 'agnes-2.5-flash'], temperature: 0.8, maxTokens: 600 },
};

export function sceneConfig(scene: AiScene): SceneConfig {
  return SCENE_CONFIG[scene];
}

/** 超时：首字节 / 全程
 *  核心加强 I：首字节从 25s 降至 12s。
 *  6 岁孩子专注力有限，等 25s 才出第一个字基本就放弃走神了。
 *  12s 是经过实测的"孩子还能等"阈值——网络正常时 1-3s 就有首字节，
 *  12s 足够覆盖弱网抖动，又能在真正卡住时快速触发重试/降级。
 *  全程超时 90s 不变（流式输出后已建立连接，长内容正常）。 */
export const TIMEOUT_FIRST_BYTE = 12_000;
export const TIMEOUT_TOTAL = 90_000;

/** 重试：仅网络错误与真 5xx，指数退避 */
export const RETRY_MAX = 2;
export const RETRY_BASE_MS = 900;

/** 缓存默认有效期 7 天 */
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
