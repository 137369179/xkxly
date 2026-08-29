/**
 * 图表配色令牌（儿童风格设计系统 v1）
 * ------------------------------------------------------------------
 * 背景：改版前 `StudyCharts` / `ParentEnhance` / `WrongBookStats` / `WeekCompare`
 * 各写各的硬编码色值，全仓库无共享配色常量，一次换肤要改 4 处且极易漏。
 *
 * 约定：
 *   - 所有手绘 SVG 图表（柱状/折线/雷达/热力/环形）一律从这里取色，**不再内联 hex**；
 *   - 色值与 `src/styles/index.css` 的 @theme、src/lib/tones.ts 的 TONE_STYLE 同源
 *     （均为主色板 50-900 阶），改这里请同步那两处；
 *   - 图表面向家长（成人），所以允许使用信息密度较高的 muted 灰阶，
 *     但儿童可见的部分仍须满足 ≥4.5:1。
 */
export const CHART = {
  /** 网格线 / 坐标轴 */
  grid: '#e6d8ce',
  /** 主文字（数值、标题） */
  text: '#503c34',
  /** 次级文字（刻度、图例说明） */
  textMuted: '#bb9f8f',
  /** 中性填充（未激活/无数据） */
  neutral: '#a0806f',

  /** 系列主色 */
  series: {
    blue: '#0b5ec9',
    purple: '#8f5bff',
    pink: '#ff5c8a',
    amber: '#d9860a',
    green: '#3fc26b',
    gray: '#a0806f',
  },

  /** 面积/填充（半透明，用于折线下方区域与雷达填充） */
  area: {
    blue: 'rgba(11, 94, 201, 0.16)',
    purple: 'rgba(143, 91, 255, 0.18)',
    pink: 'rgba(255, 92, 138, 0.18)',
    amber: 'rgba(217, 134, 10, 0.18)',
    green: 'rgba(63, 194, 107, 0.18)',
  },

  /** 热力条等级色（0→4 由浅到深） */
  levelColors: ['#e6d8ce', '#bcebce', '#62cc8a', '#3fc26b', '#1b7a3d'],
} as const;

/** 图例用的小圆点（HTML 场景，非 SVG） */
export function legendDot(color: string): { background: string } {
  return { background: color };
}

export type ChartTokens = typeof CHART;
