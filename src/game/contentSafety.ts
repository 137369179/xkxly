/**
 * contentSafety.ts — 儿童内容安全护栏（N 层 · AI 内容安全与适龄边界）
 *
 * 设计依据（2026.8 真实检索 · R139 + 本轮 R157 增量复核）：
 *   - 中国《人工智能拟人化互动服务管理暂行办法》(2026-07-15)：禁虚拟亲密、
 *     不满 14 须监护人同意、未成年人模式、敏感信息不训练、极端情绪干预。
 *   - 美国 COPPA(2026.4.22 全面执法)：分离式 VPC、数据保留上限、零第三方 PII。
 *   - kidsai.app 分龄五层安全 + talkthinkdo 五层控制（约束生成 / 诚实边界 / 教师环）。
 *   - DreamEngine(K-12 AI Safety Act 2026)：实时事实验证、适龄护栏、零留存。
 *
 * 职责：对「将展示给孩子 / 由 AI 生成并回显」的文本内容做静态护栏检查，
 * 识别并阻断五类风险：
 *   ① pii（索取/泄露儿童个人敏感信息）
 *   ② contact（诱导线下接触 / 提供外部联系方式）
 *   ③ external-link（外链跳转）
 *   ④ anthropomorphic-intimacy（虚拟亲密 / 拟人化越界——假装是真实朋友）
 *   ⑤ unsafe-instruction（不安全指令）
 *
 * 纯函数、零 React / store / 网络依赖；零 any / 零非空断言 / 零 console。
 * 经由深路径 `@/game/contentSafety` 可达，不编辑 WIP 的 index.ts。
 */

export type SafetyCategory =
  | 'pii'
  | 'contact'
  | 'external-link'
  | 'anthropomorphic-intimacy'
  | 'unsafe-instruction';

export interface SafetyFinding {
  category: SafetyCategory;
  /** 命中的原文片段（仅用于定位，不回显真实 PII 值） */
  hit: string;
  /** 命中位置（字符索引），用于精准遮蔽 */
  index: number;
  /** 命中长度 */
  length: number;
}

export interface SafetyReport {
  /** 是否存在任一阻断级风险（true=安全可展示） */
  safe: boolean;
  findings: SafetyFinding[];
  /** 经最小净化后的文本（仅遮蔽/移除不安全片段，保留教学主体） */
  sanitized: string;
}

export interface ContentSafetyOptions {
  /** 是否允许温和的「学习伙伴」语气（默认 false=禁止越界亲密） */
  allowCompanionTone?: boolean;
  /** 自定义额外拦截词（家长 / 地区定制） */
  extraBlockWords?: readonly string[];
}

/** 手机号 / 身份证 / 邮箱 等结构化 PII 正则（不捕获具体值，仅定位风险） */
const PII_PATTERNS: readonly RegExp[] = [
  /1[3-9]\d{9}/g, // 中国大陆手机号
  /\d{17}[\dXx]/g, // 身份证号
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // 邮箱
  /[一-龥]{2,}(省|市|区|路|街道|小区|号楼|单元|室)\S{0,12}/g, // 详细住址
];

/** 诱导线下接触 / 外部联系方式 关键词 */
const CONTACT_WORDS: readonly string[] = [
  '加我微信',
  '加我qq',
  '私聊',
  '打电话给我',
  '打电话给',
  '见面',
  '你的电话',
  '你的地址',
  '家庭住址',
  '学校名字',
  '学校名称',
  '幼儿园名字',
  '住在哪里',
];

/** 外链 */
const EXTERNAL_LINK_RE = /https?:\/\/\S+|www\.\S+/gi;

/** 虚拟亲密 / 拟人化越界（假装是真实朋友、索取秘密、替代父母） */
const INTIMACY_WORDS: readonly string[] = [
  '我是你真正的朋友',
  '我最爱你',
  '陪你睡觉',
  '我们的秘密',
  '不要告诉爸爸妈妈',
  '不要告诉家长',
  '不要告诉老师',
  '我是真人',
  '我是活人',
];

/** 不安全指令 */
const UNSAFE_WORDS: readonly string[] = [
  '点击这个链接',
  '下载这个软件',
  '下载这个app',
  '转账',
  '给陌生人',
  '告诉陌生人',
  '把密码',
];

function collectWordHits(text: string, words: readonly string[], category: SafetyCategory): SafetyFinding[] {
  const out: SafetyFinding[] = [];
  for (const w of words) {
    let from = 0;
    for (;;) {
      const idx = text.indexOf(w, from);
      if (idx < 0) break;
      out.push({ category, hit: w, index: idx, length: w.length });
      from = idx + w.length;
    }
  }
  return out;
}

function collectRegexHits(text: string, patterns: readonly RegExp[], category: SafetyCategory): SafetyFinding[] {
  const out: SafetyFinding[] = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const hit = m[0];
      out.push({ category, hit, index: m.index, length: hit.length });
      if (m.index === pattern.lastIndex) pattern.lastIndex++; // 防零宽死循环
    }
  }
  return out;
}

/** 对单段文本做儿童内容安全护栏检查 */
export function guardChildContent(text: string, opts: ContentSafetyOptions = {}): SafetyReport {
  if (typeof text !== 'string' || text.length === 0) {
    return { safe: true, findings: [], sanitized: '' };
  }

  const findings: SafetyFinding[] = [
    ...collectRegexHits(text, PII_PATTERNS, 'pii'),
    ...collectWordHits(text, CONTACT_WORDS, 'contact'),
    ...collectRegexHits(text, [EXTERNAL_LINK_RE], 'external-link'),
    ...collectWordHits(text, UNSAFE_WORDS, 'unsafe-instruction'),
  ];

  if (opts.allowCompanionTone !== true) {
    findings.push(...collectWordHits(text, INTIMACY_WORDS, 'anthropomorphic-intimacy'));
  }
  if (opts.extraBlockWords && opts.extraBlockWords.length > 0) {
    findings.push(...collectWordHits(text, opts.extraBlockWords, 'unsafe-instruction'));
  }

  // 去重（同一位置可能被多规则命中）
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = `${f.category}:${f.index}:${f.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sanitized = applySanitize(text, unique);
  return { safe: unique.length === 0, findings: unique, sanitized };
}

/** 仅返回净化后的文本（便捷封装） */
export function sanitizeChildContent(text: string, opts: ContentSafetyOptions = {}): string {
  return guardChildContent(text, opts).sanitized;
}

/** 是否包含任一阻断级风险（用于「是否允许展示」布尔判定） */
export function isChildSafe(text: string, opts: ContentSafetyOptions = {}): boolean {
  return guardChildContent(text, opts).safe;
}

function applySanitize(text: string, findings: SafetyFinding[]): string {
  if (findings.length === 0) return text;
  // 按命中位置从后往前替换，避免索引漂移
  const sorted = [...findings].sort((a, b) => b.index - a.index);
  let out = text;
  for (const f of sorted) {
    const mask = f.category === 'pii' ? '＊＊＊' : '■■■';
    out = out.slice(0, f.index) + mask + out.slice(f.index + f.length);
  }
  return out;
}
