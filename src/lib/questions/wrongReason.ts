/**
 * 智能错因分析（核心加强 D）
 * ------------------------------------------------------------
 * 设计依据：洪恩「错了不批评，卡住给提示」——只说"不对"没用，
 * 要告诉孩子"你选了 X，但应该选 Y，因为……"。
 */
import type { Question } from '@/types';

/**
 * 根据答错选项和正确答案，生成针对性错因提示。
 * 覆盖主要题型，无法识别时返回通用提示。
 */
export function wrongReason(q: Question, wrongLabel: string): string {
  const rightLabel = q.options.find((o) => o.id === q.answerId)?.label;
  if (!rightLabel) return `不对哦，正确答案是另一个～`;

  // math: 数字运算——"你选了X，但结果应该是Y"
  if (q.kind === 'math') {
    const w = Number(wrongLabel);
    const r = Number(rightLabel);
    if (!isNaN(w) && !isNaN(r)) {
      const diff = r - w;
      const dir = diff > 0 ? '大了' : '小了';
      const gap = Math.abs(diff);
      return `你选的是 ${w}，比正确答案 ${r} ${dir} ${gap} 个数～再算一遍吧！`;
    }
  }

  // math-mul / math-div: 乘除——"你选了X，但答案应该是Y"
  if (q.kind === 'math-mul' || q.kind === 'math-div') {
    const w = Number(wrongLabel);
    const r = Number(rightLabel);
    if (!isNaN(w) && !isNaN(r)) {
      return `你选的是 ${w}，但正确答案是 ${r}～用手指帮忙算一算！`;
    }
  }

  // count: 数数——"你数了X个，但实际上有Y个"
  if (q.kind === 'count') {
    const w = Number(wrongLabel);
    const r = Number(rightLabel);
    if (!isNaN(w) && !isNaN(r)) {
      return `你数了 ${w} 个，但实际上是 ${r} 个哦～再用手指点着数一遍吧！`;
    }
  }

  // number: 数字认知
  if (q.kind === 'number') {
    return `再想想「${q.display}」这个数字的写法～中文和阿拉伯数字都要认识哦！`;
  }

  // letter: 字母
  if (q.kind === 'letter') {
    return `再细心看看，大写的「${rightLabel}」对应的样子不大一样哦～`;
  }

  // poem: 古诗
  if (q.kind === 'poem') {
    return `这句不是「${wrongLabel}」哦，多读两遍就记住了～正确答案在下面！`;
  }

  // logic: 逻辑题
  if (q.kind === 'logic') {
    return `仔细看看规律，你选的"${wrongLabel}"不太对～正确答案是"${rightLabel}"！`;
  }

  // coin: 钱币
  if (q.kind === 'coin') {
    return `你算的是 ${wrongLabel}，但加起来应该是 ${rightLabel} 哦～记住 1元=10角！`;
  }

  // time: 时钟
  if (q.kind === 'time') {
    return `再仔细看看时针和分针的位置～时针短、分针长！`;
  }

  // shape: 形状
  if (q.kind === 'shape') {
    return `你选的是"${wrongLabel}"，但它是"${rightLabel}"哦～再数数它有几条边！`;
  }

  // compare / sort / pair / similar
  if (q.kind === 'compare') {
    return `你选的是"${wrongLabel}"，再比比看哪个更大呀～`;
  }
  if (q.kind === 'sort') {
    return `"${wrongLabel}" 不对哦，想一想它和哪些东西是一类的～`;
  }
  if (q.kind === 'pair') {
    return `"${wrongLabel}" 不是反义词～想想和意思相反的那个词！`;
  }
  if (q.kind === 'similar') {
    return `仔细看字的样子，「${wrongLabel}」和上面那个字有点不一样哦～`;
  }

  // pinyin-* / word-*
  if (q.kind?.startsWith('pinyin')) {
    return `你选的是"${wrongLabel}"，但正确答案是"${rightLabel}"～再读读声母和韵母！`;
  }
  if (q.kind?.startsWith('word')) {
    return `"${wrongLabel}" 不对哦，再想想这个单词的意思～`;
  }

  // 通用兜底
  return `你选的是"${wrongLabel}"～但正确答案是"${rightLabel}"，再试一次！`;
}
