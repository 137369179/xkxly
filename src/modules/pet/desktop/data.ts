/**
 * 桌面宠物 · 静态数据
 * 调色板 / 配件 / 性格 / 好感度配置 / 天气预设
 */

/* ---------------- 拼豆 51 色调色板 ---------------- */
export const PALETTE_51: string[] = [
  // 基础白灰黑
  '#ffffff', '#f4f4f6', '#e3e4e8', '#b9bcc4', '#8a8e99', '#5b5f6a', '#2c2f36', '#121317',
  // 红/粉
  '#ff4d6d', '#ff8fa3', '#ffb3c1', '#ffd6de',
  // 橙/黄
  '#ff6b35', '#ff9f1c', '#ffd166', '#fff3b0',
  // 绿
  '#2a9d8f', '#52b788', '#95d5b2', '#d8f3dc', '#74c69d',
  // 青/蓝
  '#0b8f8f', '#38b6c1', '#70c7db', '#9ad9ec',
  // 蓝/紫
  '#2e6ec9', '#5a8dee', '#7b9ef0', '#a7c4ff',
  '#7b2cbf', '#9d4edd', '#c77dff', '#e0aaff',
  // 棕
  '#a4693f', '#c98a5e', '#e3b68f', '#7f5539',
  // 金/银
  '#d4af37', '#f5d061', '#e8e8ec', '#c0c0c0',
]; // 45
// 45 + 6（扩展）需补到 51：基色 41 项 + 扩展 10 项
const EXTRA = [
  '#ff5d8f', '#ffb703', '#80b918', '#38b000', '#00b4d8', '#4361ee',
  '#f15bb5', '#06d6a0', '#9f86c0', '#f8c630',
];
export const PALETTE = PALETTE_51.concat(EXTRA).slice(0, 51);

/* ---------------- 7 种可穿戴配件 ---------------- */
export type AccessoryId = 'hat' | 'umbrella' | 'sunglasses' | 'crown' | 'scarf' | 'bowtie' | 'glasses';
export interface Accessory {
  id: AccessoryId;
  label: string;
  emoji: string;
  /** 叠加偏移（px，相对宠物头顶/脸部），用于动画融合定位 */
  anchor: 'head' | 'face' | 'neck';
  /** 特殊触发逻辑 key（如雨伞自动撑开），无则 null */
  weather?: 'rain' | 'hot';
}
export const ACCESSORIES: Accessory[] = [
  { id: 'hat', label: '小帽子', emoji: '🧢', anchor: 'head' },
  { id: 'umbrella', label: '雨伞', emoji: '☂️', anchor: 'head', weather: 'rain' },
  { id: 'sunglasses', label: '墨镜', emoji: '🕶️', anchor: 'face' },
  { id: 'crown', label: '皇冠', emoji: '👑', anchor: 'head' },
  { id: 'scarf', label: '围巾', emoji: '🧣', anchor: 'neck' },
  { id: 'bowtie', label: '蝴蝶结', emoji: '🎀', anchor: 'neck' },
  { id: 'glasses', label: '小圆镜', emoji: '🤓', anchor: 'face' },
];

/* ---------------- 5 种 AI 性格预设 ---------------- */
export type PersonalityId = 'gentle' | 'energetic' | 'shy' | 'wise' | 'jokester';
export interface Personality {
  id: PersonalityId;
  label: string;
  emoji: string;
  systemHint: string;
}
export const PERSONALITIES: Personality[] = [
  { id: 'gentle', label: '温柔奶妈', emoji: '🌸', systemHint: '说话轻声慢语、温暖耐心，常用鼓励和抱抱的口吻。' },
  { id: 'energetic', label: '元气满满', emoji: '⚡', systemHint: '充满活力、爱用感叹号和拟声词，会蹦蹦跳跳地鼓励孩子。' },
  { id: 'shy', label: '害羞小猫', emoji: '🫣', systemHint: '害羞又可爱，说话结结巴巴，偶尔躲一下，但很真诚。' },
  { id: 'wise', label: '博学老师', emoji: '🎓', systemHint: '知识丰富、循循善诱，用孩子能懂的小故事讲道理。' },
  { id: 'jokester', label: '搞笑达人', emoji: '🤹', systemHint: '爱开玩笑、爱讲冷笑话，回答间穿插童趣小幽默。' },
];

/* ---------------- 好感度系统配置 ----------------
 * 8 种互动类型；每种有每日次数上限（8 类封顶 maxDaily）。
 * 累计 exp 决定等级，等级提升触发里程碑庆祝。
 */
export type InteractionType =
  | 'pet' | 'feed' | 'talk' | 'play' | 'task' | 'pomodoro' | 'clean' | 'learn';
export interface InteractionSpec {
  type: InteractionType;
  label: string;
  exp: number;
  /** 每日该类型的互动上限 */
  daily: number;
  emoji: string;
}
export const INTERACTIONS: InteractionSpec[] = [
  { type: 'pet', label: '摸摸头', exp: 6, daily: 30, emoji: '🖐️' },
  { type: 'feed', label: '喂零食', exp: 10, daily: 10, emoji: '🍪' },
  { type: 'talk', label: '陪聊天', exp: 8, daily: 12, emoji: '💬' },
  { type: 'play', label: '玩游戏', exp: 12, daily: 8, emoji: '🎾' },
  { type: 'task', label: '完成任务', exp: 15, daily: 10, emoji: '✅' },
  { type: 'pomodoro', label: '专注番茄', exp: 20, daily: 8, emoji: '🍅' },
  { type: 'clean', label: '帮清洁', exp: 5, daily: 15, emoji: '🧽' },
  { type: 'learn', label: '一起学习', exp: 18, daily: 6, emoji: '📖' },
];
/** 等级阈值（累计 exp 跨越后提升） */
export const AFFINITY_LEVELS = [0, 60, 160, 320, 560, 900, 1300, 1800, 2400, 3200];
export const MAX_LEVEL = AFFINITY_LEVELS.length; // 10 级

/* ---------------- 天气预设（映射到宠物状态动画） ---------------- */
export type WeatherCode = 'clear' | 'cloudy' | 'rain' | 'snow' | 'hot';
export interface WeatherPreset {
  code: WeatherCode;
  label: string;
  emoji: string;
  /** 触发的配件自动佩戴 */
  autoAccessory?: AccessoryId;
  /** 触发的粒子 */
  particle: 'none' | 'snow' | 'rain' | 'none';
  /** 触发的专用动画 key */
  action?: string;
}
export const WEATHER_PRESETS: WeatherPreset[] = [
  { code: 'clear', label: '晴', emoji: '☀️', particle: 'none' },
  { code: 'cloudy', label: '多云', emoji: '☁️', particle: 'none' },
  { code: 'rain', label: '下雨', emoji: '🌧️', autoAccessory: 'umbrella', particle: 'rain' },
  { code: 'snow', label: '下雪', emoji: '❄️', particle: 'snow', action: 'shiver' },
  { code: 'hot', label: '高温', emoji: '🥵', autoAccessory: 'hat', particle: 'none', action: 'icecream' },
];