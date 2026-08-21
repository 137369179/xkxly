/**
 * AI 个性化上下文（P0-4）
 * ------------------------------------------------------------------
 * 把孩子的 SRS 掌握度/薄弱点转成简洁画像，注入给原本不带个性化的孩子端
 * AI 生成（小茜聊天等），让 AI 对每个孩子"可见地个性化"。
 * 通过可选 context 参数传递，默认不注入 → 对既有调用方完全无感。
 */
import { weakSkills, skillLabel } from '@/lib/srs';
import type { Progress } from '@/types';

/**
 * 生成孩子画像摘要。
 * - p：学习进度（含 mastery / stars）
 * - n：取前 n 个最薄弱知识点
 * - 无掌握度数据时给出"新朋友"中性文案，避免误导。
 */
export function masteryCue(p: Progress, n = 4): string {
  if (!p?.mastery) {
    return '孩子是刚认识的新朋友，还没有明显薄弱点，请用好奇和鼓励的语气带他探索';
  }
  const weak = weakSkills(p, n);
  if (weak.length === 0) {
    return '孩子是刚认识的新朋友，还没有明显薄弱点，请用好奇和鼓励的语气带他探索';
  }
  const list = weak
    .map((w) => skillLabel(w.skill) + (w.m.lv > 0 ? `（已会${w.m.lv}成）` : '刚开始学'))
    .join('、');
  return `### 孩子的学习画像（请延续他的状态，个性化沟通）\n他最需要温习的知识点是：${list}。`;
}

export default masteryCue;