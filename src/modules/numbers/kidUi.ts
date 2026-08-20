/**
 * 数字王国 · 儿童友好 UI 常量（T-ux）
 * ------------------------------------------------------------------
 * 针对 5-12 岁儿童，规范化交互控件的触达目标与字号，杜绝绕过设计系统
 * 的小触达/小字号按钮。约定（与 design system 的 ≥44px 精神一致）：
 *   - 可点击的答案/模式/操作按钮：触达高度 ≥44px (min-h-11)
 *   - 交互文字 ≥ text-base（16px），避免小于 12px 的 text-xs 按钮文案
 * 供各数字子组件统一引用，保证整模块一致并可被审计测试断言。
 */

/** 常见「小触达小字号」的原始按钮样式信号：命中即需收敛 */
export const KID_RISKY_BUTTON_HINTS = ['text-xs', 'text-[11px]', 'py-1 ', 'py-0.5'] as const;

/** 是否命中危险的小按钮信号（用于源码审计断言） */
export function isKidRiskyInteractiveClassName(className: string | undefined): boolean {
  if (!className) return false;
  return KID_RISKY_BUTTON_HINTS.some((h) => className.includes(h));
}