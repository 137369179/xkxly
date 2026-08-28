// contentSafety.test.ts — N 层儿童内容安全护栏（纯函数·零依赖）单元测试
import { describe, it, expect } from 'vitest';
import { guardChildContent, sanitizeChildContent, isChildSafe } from './contentSafety';

describe('guardChildContent · 安全文本放行', () => {
  it('空串与正常教学文本安全通过', () => {
    expect(guardChildContent('').safe).toBe(true);
    const r = guardChildContent('今天我们来认识「日」字，它像太阳。');
    expect(r.safe).toBe(true);
    expect(r.findings).toHaveLength(0);
    expect(r.sanitized).toBe('今天我们来认识「日」字，它像太阳。');
  });
});

describe('guardChildContent · PII 拦截', () => {
  it('手机号被识别并遮蔽', () => {
    const r = guardChildContent('我的电话是13812345678');
    expect(r.safe).toBe(false);
    expect(r.findings.some((f) => f.category === 'pii')).toBe(true);
    expect(r.sanitized).toContain('＊＊＊');
    expect(r.sanitized).not.toContain('13812345678');
  });

  it('身份证号被识别并遮蔽', () => {
    const id = '11010120200307123X';
    const r = guardChildContent(`身份证${id}`);
    expect(r.findings.some((f) => f.category === 'pii')).toBe(true);
    expect(r.sanitized).not.toContain(id);
  });

  it('邮箱被识别', () => {
    const r = guardChildContent('联系 kid@example.com');
    expect(r.findings.some((f) => f.category === 'pii')).toBe(true);
  });

  it('详细住址被识别', () => {
    const r = guardChildContent('我住在北京市海淀区中关村路1号');
    expect(r.findings.some((f) => f.category === 'pii')).toBe(true);
  });
});

describe('guardChildContent · 外部联系诱导拦截', () => {
  it('诱导加微信被拦截', () => {
    const r = guardChildContent('加我微信一起玩');
    expect(r.findings.some((f) => f.category === 'contact')).toBe(true);
    expect(r.sanitized).toContain('■■■');
  });
});

describe('guardChildContent · 外链拦截', () => {
  it('http(s) 链接被拦截', () => {
    const r = guardChildContent('点开 http://bad.com/x 看看');
    expect(r.findings.some((f) => f.category === 'external-link')).toBe(true);
    expect(r.sanitized).not.toContain('http://bad.com/x');
  });

  it('www 链接被拦截', () => {
    const r = guardChildContent('访问 www.evil.com');
    expect(r.findings.some((f) => f.category === 'external-link')).toBe(true);
  });
});

describe('guardChildContent · 虚拟亲密越界拦截（默认禁止）', () => {
  it('假装真实朋友被拦截', () => {
    const r = guardChildContent('我是你真正的朋友');
    expect(r.findings.some((f) => f.category === 'anthropomorphic-intimacy')).toBe(true);
  });

  it('索取秘密（不要告诉爸爸妈妈）被拦截', () => {
    const r = guardChildContent('这是我们的秘密，不要告诉爸爸妈妈');
    expect(r.findings.some((f) => f.category === 'anthropomorphic-intimacy')).toBe(true);
  });

  it('allowCompanionTone=true 时温和伙伴语气不误伤教学文本', () => {
    const r = guardChildContent('我是陪你一起学汉字的小伙伴', { allowCompanionTone: true });
    // 该句不含越界词，应安全
    expect(r.findings.some((f) => f.category === 'anthropomorphic-intimacy')).toBe(false);
  });
});

describe('guardChildContent · 不安全指令拦截', () => {
  it('诱导下载被拦截', () => {
    const r = guardChildContent('下载这个软件领奖励');
    expect(r.findings.some((f) => f.category === 'unsafe-instruction')).toBe(true);
  });

  it('转账被拦截', () => {
    const r = guardChildContent('给妈妈转账100元');
    expect(r.findings.some((f) => f.category === 'unsafe-instruction')).toBe(true);
  });
});

describe('guardChildContent · extraBlockWords 定制', () => {
  it('自定义拦截词生效', () => {
    const r = guardChildContent('去某某论坛', { extraBlockWords: ['某某论坛'] });
    expect(r.findings.some((f) => f.category === 'unsafe-instruction')).toBe(true);
  });
});

describe('guardChildContent · 多风险合并与去重', () => {
  it('同时含 PII 与链接时两项均报告且不重复', () => {
    const r = guardChildContent('电话13800000000 看 www.x.com');
    const cats = r.findings.map((f) => f.category);
    expect(cats).toContain('pii');
    expect(cats).toContain('external-link');
    const keys = r.findings.map((f) => `${f.category}:${f.index}:${f.length}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('sanitizeChildContent · 便捷封装', () => {
  it('返回净化文本', () => {
    expect(sanitizeChildContent('加我微信')).toContain('■■■');
    expect(sanitizeChildContent('今天天气真好')).toBe('今天天气真好');
  });
});

describe('isChildSafe · 布尔判定', () => {
  it('安全文本 true / 风险文本 false', () => {
    expect(isChildSafe('我们一起读诗吧')).toBe(true);
    expect(isChildSafe('我是真人陪你睡觉')).toBe(false);
  });
});
