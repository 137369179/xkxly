import { describe, it, expect } from 'vitest';
import { extractJson, sanitizeStructuredText } from './guard';

const ZW = '\u200b';
const CTRL = '\u0000';

describe('sanitizeStructuredText（P1-8 · 结构化输出内容过滤）', () => {
  it('正常嵌套内容保持不变', () => {
    const data = {
      title: '小兔子的冒险',
      pages: [{ text: '小兔子上山采蘑菇', emoji: '🐇' }],
      n: 3,
      ok: true,
      maybe: null,
    };
    expect(sanitizeStructuredText(data)).toEqual(data);
  });

  it('递归清洗字符串字段中的零宽/控制字符', () => {
    const input = { a: `hi${ZW}${CTRL}`, list: [`x${ZW}`, 'ok'] };
    expect(sanitizeStructuredText(input)).toEqual({ a: 'hi', list: ['x', 'ok'] });
  });

  it('数组与非字符串值透传', () => {
    expect(sanitizeStructuredText(['keep', 0, false, null])).toEqual(['keep', 0, false, null]);
  });
});

describe('extractJson 对结构化输出执行内容过滤（P1-8）', () => {
  it('正常 JSON 解析并透传字符串', () => {
    const out = extractJson<{ title: string; n: number }>('{"title":"ABC","n":1}');
    expect(out).toEqual({ title: 'ABC', n: 1 });
  });

  it('解码结果同样被递归清洗', () => {
    const out = extractJson<{ a: string }>(`{"a":"x${ZW}"}`);
    expect(out).toEqual({ a: 'x' });
  });
});