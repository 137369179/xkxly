/**
 * 学科定义单一真相源
 * 
 * 统一管理所有学科的 label/emoji/tone/metadata，
 * 避免 MapView、Sidebar、Nav 等多处硬编码不一致。
 * 
 * 使用方式：import { SUBJECTS, getSubjectById } from '@/lib/srs/SUBJECTS';
 *
 * P2-5：本表是全站**唯一**的学科 label/emoji/tone 来源。
 * `@/lib/srs` 里的展示层 SUBJECTS 数组已改为引用本表（只额外补充图表配色 color
 * 与本表未单列的展示子类 number/sentence/research），不再各自硬编码，杜绝数据漂移。
 */

export type SubjectId = 'letter' | 'math' | 'hanzi' | 'pinyin' | 'poem' | 'word' | 'logic' | 'science' | 'music' | 'art' | 'idiom' | 'song' | 'safety' | 'geo' | 'vehicle' | 'festival' | 'plant' | 'fun' | 'adventure' | 'rewards' | 'parent' | 'today' | 'home' | 'cat_house' | 'passport';

export interface SubjectNode {
  emoji: string;
  label: string;
  expectedCount: number;
}

export interface SubjectDef {
  id: SubjectId;
  label: string;
  emoji: string;
  tone: 'pink' | 'purple' | 'blue' | 'green' | 'yellow' | 'orange';
  nodes: SubjectNode[];
  skillPrefixes: string[];
  desc: string;
}

/** 完整学科定义表 */
export const SUBJECTS: Record<SubjectId, SubjectDef> = {
  letter: {
    id: 'letter', label: '字母', emoji: '🔤', tone: 'blue',
    nodes: [
      { emoji: '🔤', label: 'A-G', expectedCount: 7 },
      { emoji: '🔤', label: 'H-N', expectedCount: 7 },
      { emoji: '🔤', label: 'O-T', expectedCount: 6 },
      { emoji: '✨', label: 'U-Z', expectedCount: 6 },
    ],
    skillPrefixes: ['letter:'],
    desc: '26 个字母大冒险',
  },
  // P2-5：本条覆盖 math:/number:/count: 三类知识点，统一中文名收敛为「数学」
  // （原为「数字」，与 srs 展示层的「数学」冲突）；「数字」由 srs 展示层的 number 子类承载。
  math: {
    id: 'math', label: '数学', emoji: '➕', tone: 'green',
    nodes: [
      { emoji: '🔢', label: '1-10', expectedCount: 10 },
      { emoji: '➕', label: '加减法', expectedCount: 15 },
      { emoji: '✖️', label: '乘除', expectedCount: 10 },
      { emoji: '🧮', label: '应用题', expectedCount: 8 },
      { emoji: '⚡', label: '速算', expectedCount: 5 },
    ],
    skillPrefixes: ['math:', 'number:', 'count:'],
    desc: '认数字 · 学算术',
  },
  hanzi: {
    id: 'hanzi', label: '汉字', emoji: '🀄', tone: 'green',
    nodes: [
      { emoji: '🌱', label: '启蒙', expectedCount: 100 },
      { emoji: '🌿', label: '常用', expectedCount: 120 },
      { emoji: '🌳', label: '进阶', expectedCount: 60 },
      { emoji: '📖', label: '阅读', expectedCount: 20 },
    ],
    skillPrefixes: ['hanzi:'],
    desc: '300 字 · 玩认练写说',
  },
  pinyin: {
    id: 'pinyin', label: '拼音', emoji: '📋', tone: 'blue',
    nodes: [
      { emoji: '🗣️', label: '声母', expectedCount: 23 },
      { emoji: '🎶', label: '韵母', expectedCount: 24 },
      { emoji: '🔗', label: '拼读', expectedCount: 16 },
    ],
    skillPrefixes: ['pinyin:'],
    desc: '声母韵母 · 拼读',
  },
  poem: {
    id: 'poem', label: '古诗', emoji: '🌸', tone: 'pink',
    nodes: [
      { emoji: '🌸', label: '启蒙', expectedCount: 80 },
      { emoji: '📜', label: '经典', expectedCount: 200 },
      { emoji: '🏛️', label: '名篇', expectedCount: 105 },
    ],
    skillPrefixes: ['poem:'],
    desc: '385 首经典古诗',
  },
  // P2-5：emoji 由 🔤 收敛为 💬，避免与 letter（字母🔤）图标重复
  word: {
    id: 'word', label: '英语', emoji: '💬', tone: 'pink',
    nodes: [
      { emoji: '🐱', label: '基础词', expectedCount: 240 },
      { emoji: '📖', label: '句子', expectedCount: 20 },
      { emoji: '🗣️', label: '对话', expectedCount: 12 },
    ],
    skillPrefixes: ['word:'],
    desc: '300+ 词 · 18 主题',
  },
  logic: {
    id: 'logic', label: '逻辑', emoji: '🧩', tone: 'purple',
    nodes: [
      { emoji: '🔍', label: '找规律', expectedCount: 8 },
      { emoji: '🧩', label: '配对', expectedCount: 6 },
      { emoji: '🤖', label: '编程', expectedCount: 6 },
    ],
    skillPrefixes: ['logic:', 'compare:', 'sort:', 'pair:', 'similar:'],
    desc: '找规律 · 动脑筋',
  },
  science: {
    id: 'science', label: '百科', emoji: '🦖', tone: 'green',
    nodes: [], skillPrefixes: ['science:'], desc: '恐龙 · 太空 · 天气',
  },
  music: {
    id: 'music', label: '音乐', emoji: '🎹', tone: 'pink',
    nodes: [], skillPrefixes: ['music:'], desc: '彩虹琴 · 视唱练耳',
  },
  art: {
    id: 'art', label: '艺术', emoji: '🎨', tone: 'pink',
    nodes: [], skillPrefixes: ['art:'], desc: '魔法调色盘 · 色彩',
  },
  // P2-5：emoji/tone 收敛为 📜/orange（与展示层历史取值一致）
  idiom: {
    id: 'idiom', label: '成语', emoji: '📜', tone: 'orange',
    nodes: [], skillPrefixes: ['idiom:'], desc: '60 个成语故事',
  },
  song: {
    id: 'song', label: '儿歌', emoji: '🎵', tone: 'pink',
    nodes: [], skillPrefixes: ['song:'], desc: '10 首经典儿歌',
  },
  safety: {
    id: 'safety', label: '安全', emoji: '🩺', tone: 'blue',
    nodes: [], skillPrefixes: ['safety:'], desc: '刷牙伴读 · 110/119',
  },
  geo: {
    id: 'geo', label: '地理', emoji: '🌏', tone: 'green',
    nodes: [], skillPrefixes: ['geo:'], desc: '七大洲 · 世界动物',
  },
  vehicle: {
    id: 'vehicle', label: '交通', emoji: '🚗', tone: 'orange',
    nodes: [], skillPrefixes: ['vehicle:'], desc: '消防车 · 职业对对碰',
  },
  festival: {
    id: 'festival', label: '节气', emoji: '🌸', tone: 'pink',
    nodes: [], skillPrefixes: ['festival:'], desc: '二十四节气 · 节日风俗',
  },
  plant: {
    id: 'plant', label: '植物', emoji: '🪴', tone: 'green',
    nodes: [], skillPrefixes: ['plant:'], desc: '向日葵 · 浇水光合作用',
  },
  fun: {
    id: 'fun', label: '趣味', emoji: '🎮', tone: 'purple',
    nodes: [], skillPrefixes: ['fun:'], desc: '对战 · 听力 · 创意',
  },
  adventure: {
    id: 'adventure', label: '闯关', emoji: '🚀', tone: 'purple',
    nodes: [], skillPrefixes: ['adventure:'], desc: '闯关拿星星徽章',
  },
  rewards: {
    id: 'rewards', label: '奖励', emoji: '🎁', tone: 'pink',
    nodes: [], skillPrefixes: [], desc: '贴纸册 · 徽章墙',
  },
  parent: {
    id: 'parent', label: '家长', emoji: '👨‍👩‍👧', tone: 'green',
    nodes: [], skillPrefixes: [], desc: '报告 · 设置 · 护眼',
  },
  today: {
    id: 'today', label: '今日课程', emoji: '📅', tone: 'purple',
    nodes: [], skillPrefixes: [], desc: '跟着课程一步步学',
  },
  home: {
    id: 'home', label: '我的乐园', emoji: '🏡', tone: 'orange',
    nodes: [], skillPrefixes: [], desc: '看看今天学了什么',
  },
  cat_house: {
    id: 'cat_house', label: '养猫', emoji: '🐱', tone: 'pink',
    nodes: [], skillPrefixes: [], desc: '小鱼干 · 梦幻粉猫',
  },
  passport: {
    id: 'passport', label: '护照', emoji: '🛂', tone: 'purple',
    nodes: [], skillPrefixes: [], desc: '盖章里程碑 · 成就墙',
  },
};

/** 根据 ID 获取学科定义 */
export function getSubjectById(id: string): SubjectDef | undefined {
  return (SUBJECTS as Record<string, SubjectDef>)[id];
}

/** 获取所有有知识点的学科（排除功能型模块） */
export function getLearningSubjects(): SubjectDef[] {
  return Object.values(SUBJECTS).filter(s => s.skillPrefixes.length > 0);
}

/** 根据技能键推断所属学科 */
export function inferSubjectFromSkill(skillKey: string): SubjectDef | undefined {
  for (const subject of Object.values(SUBJECTS)) {
    if (subject.skillPrefixes.some(prefix => skillKey.startsWith(prefix))) {
      return subject;
    }
  }
  return undefined;
}

export default SUBJECTS;
