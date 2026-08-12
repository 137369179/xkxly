/**
 * 文本预处理 · 分句 + 多音字测试集
 * ------------------------------------------------------------
 * 神经网络引擎要做到「有感情 + 多音字正确」，需要干净的文本分句，
 * 以及按语境选择正确的读音。本项目古诗数据已自带逐字拼音
 * （DeepPoem.lines[].chars[].p），通用文本可用 pinyin-pro 推导，
 * 因此 G2P（字→音）在多数场景已具备，但 Web Speech 不接受拼音输入，
 * 多音字只能靠引擎自带 G2P —— 这是评测神经网络引擎的重点。
 */

/** 按标点切句，标点附在所属句末（用于逐句高亮与停顿） */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  const sep = /[。！？；：，、\n.!?;:,]/;
  for (const ch of text) {
    buf += ch;
    if (sep.test(ch)) {
      const t = buf.trim();
      if (t) out.push(t);
      buf = '';
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

export interface HeteronymReading {
  py: string;
  word: string;
  mean: string;
}

export interface Heteronym {
  char: string;
  readings: HeteronymReading[];
}

/** 常见多音字评测集：用于验证引擎能否按语境正确发音 */
export const HETERONYMS: Heteronym[] = [
  { char: '重', readings: [
    { py: 'chóng', word: '山重水复疑无路', mean: '重复' },
    { py: 'zhòng', word: '沉重', mean: '分量重' },
  ] },
  { char: '长', readings: [
    { py: 'cháng', word: '长河落日圆', mean: '长短' },
    { py: 'zhǎng', word: '成长', mean: '生长' },
  ] },
  { char: '行', readings: [
    { py: 'xíng', word: '一行白鹭上青天', mean: '行走/行列' },
    { py: 'háng', word: '银行', mean: '行业' },
  ] },
  { char: '还', readings: [
    { py: 'hái', word: '还是', mean: '仍然' },
    { py: 'huán', word: '归还', mean: '返回' },
  ] },
  { char: '乐', readings: [
    { py: 'lè', word: '快乐', mean: '欢喜' },
    { py: 'yuè', word: '音乐', mean: '乐曲' },
  ] },
  { char: '着', readings: [
    { py: 'zhe', word: '看着书', mean: '动态助词' },
    { py: 'zháo', word: '着急', mean: '感受' },
  ] },
  { char: '差', readings: [
    { py: 'chā', word: '差别', mean: '不同' },
    { py: 'chà', word: '差不多', mean: '不好' },
    { py: 'chāi', word: '出差', mean: '派遣' },
  ] },
  { char: '调', readings: [
    { py: 'tiáo', word: '调节', mean: '调和' },
    { py: 'diào', word: '声调', mean: '音调' },
  ] },
  { char: '都', readings: [
    { py: 'dōu', word: '都来了', mean: '全' },
    { py: 'dū', word: '首都', mean: '都市' },
  ] },
  { char: '得', readings: [
    { py: 'dé', word: '得到', mean: '获得' },
    { py: 'de', word: '跑得快', mean: '补语' },
    { py: 'děi', word: '可得小心', mean: '必须' },
  ] },
];

/** 把一首诗拼成可朗读文本（标题/作者/正文，保留标点触发自然停顿） */
export function poemToText(title: string, author: string, lines: string[]): string {
  return `${title}。${author}。${lines.join('。')}。`;
}
