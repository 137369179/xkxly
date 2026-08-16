import type { RouteId } from '@/lib/router';
import type { Tone } from '@/lib/tones';

export interface NavItem {
  id: RouteId;
  label: string;
  short: string;
  emoji: string;
  imageIcon?: string;
  tone: Tone;
  desc: string;
  /** 是否出现在移动端底部 Tab（保持 ≤6 个，避免拥挤） */
  bottom?: boolean;
  /** 是否在侧边栏品类菜单中隐藏（针对已合并至主模块的子路由） */
  hiddenInSidebar?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '我的乐园', short: '首页', emoji: '🏡', imageIcon: '/icons/icon-192.png', tone: 'orange', desc: '看看今天学了什么', bottom: true },
  { id: 'today', label: '今日课程', short: '今日', emoji: '📅', imageIcon: '/icons/felt_town.jpg', tone: 'purple', desc: '跟着课程一步步学', bottom: true },
  { id: 'companion', label: '小智伙伴', short: '伙伴', emoji: '🤖', imageIcon: '/icons/felt_room.jpg', tone: 'purple', desc: '拟人讲解 · 陪娃聊天' },
  { id: 'letters', label: '字母乐园', short: '字母', emoji: '🔤', imageIcon: '/icons/letters.jpg', tone: 'blue', desc: '26 个字母大冒险', bottom: true },
  { id: 'poems', label: '古诗花园', short: '古诗', emoji: '🌸', imageIcon: '/icons/poem.jpg', tone: 'pink', desc: '385 首经典古诗' },
  { id: 'numbers', label: '数字王国', short: '数字', emoji: '🔢', imageIcon: '/icons/math.jpg', tone: 'yellow', desc: '认数字 · 学算术', bottom: true },
  { id: 'hanzi', label: '汉字乐园', short: '汉字', emoji: '🀄', imageIcon: '/icons/hanzi.jpg', tone: 'green', desc: '300 字 · 闯关与听音' },
  { id: 'hanzi-listen', label: '听音识字', short: '听音', emoji: '👂', imageIcon: '/icons/felt_sight.jpg', tone: 'green', desc: '听读音 · 点选正确汉字', hiddenInSidebar: true },
  { id: 'pinyin', label: '拼音学习', short: '拼音', emoji: '🗣️', imageIcon: '/icons/pinyin.jpg', tone: 'blue', desc: '声母韵母 · 拼读' },
  { id: 'words', label: '英语单词', short: '英语', emoji: '🔠', imageIcon: '/icons/cover-words.png', tone: 'pink', desc: '300+ 词 · 18 主题' },
  { id: 'logic', label: '逻辑挑战', short: '逻辑', emoji: '🧩', imageIcon: '/icons/logic.jpg', tone: 'green', desc: '找规律 · 动脑筋' },
  { id: 'gamecenter', label: '游戏中心', short: '游戏', emoji: '🎮', imageIcon: '/icons/fun.jpg', tone: 'purple', desc: '闯关 · 对战 · 脑力 · 创意' },
  { id: 'fun', label: '趣味乐园', short: '趣味', emoji: '🎪', imageIcon: '/icons/cover-fun.png', tone: 'purple', desc: '对战 · 听力 · 创意', hiddenInSidebar: true },
  { id: 'idioms', label: '成语故事', short: '成语', emoji: '🏯', imageIcon: '/icons/cover-idioms.png', tone: 'purple', desc: '60 个成语故事' },
  { id: 'songs', label: '儿歌乐园', short: '儿歌', emoji: '🎵', imageIcon: '/icons/cover-songs.png', tone: 'pink', desc: '10 首经典儿歌' },
  { id: 'science', label: '自然百科', short: '百科', emoji: '🦖', imageIcon: '/icons/cover-science.png', tone: 'green', desc: '恐龙 · 太空 · 天气' },
  { id: 'music', label: '音乐律动', short: '音乐', emoji: '🎹', imageIcon: '/icons/cover-music.png', tone: 'pink', desc: '彩虹琴 · 视唱练耳' },
  { id: 'art', label: '艺术色彩', short: '艺术', emoji: '🎨', imageIcon: '/icons/cover-art.png', tone: 'pink', desc: '魔法调色盘 · 色彩' },
  { id: 'safety', label: '安全防护', short: '安全', emoji: '🩺', imageIcon: '/icons/cover-safety.png', tone: 'blue', desc: '刷牙伴读 · 110/119' },
  { id: 'geography', label: '世界地理', short: '地理', emoji: '🌏', imageIcon: '/icons/cover-geography.png', tone: 'green', desc: '七大洲 · 世界动物' },
  { id: 'vehicles', label: '交通职业', short: '交通', emoji: '🚗', imageIcon: '/icons/cover-vehicles.png', tone: 'orange', desc: '消防车 · 职业对对碰' },
  { id: 'festivals', label: '节气文化', short: '节气', emoji: '🏮', imageIcon: '/icons/cover-festivals.png', tone: 'pink', desc: '二十四节气 · 节日风俗' },
  { id: 'plants', label: '奇妙植物', short: '植物', emoji: '🪴', imageIcon: '/icons/cover-plants.png', tone: 'green', desc: '向日葵 · 浇水光合作用' },
  { id: 'cat_house', label: '伴读猫屋', short: '猫咪', emoji: '🐱', imageIcon: '/icons/pink_felt_cat.png', tone: 'pink', desc: '2D/3D 梦幻猫咪 · 伴读互动' },
  { id: 'realistic_cat', label: '写实猫咪3D', short: '写实猫', emoji: '🐈', imageIcon: '/icons/unified_3d_cats.jpg', tone: 'orange', desc: '真实毛发 · PBR渲染 · 品种切换', hiddenInSidebar: true },
  { id: 'storybook', label: '奇妙故事岛', short: '故事', emoji: '📚', imageIcon: '/icons/cover-storybook.png', tone: 'pink', desc: 'AI 绘本创作 · 经典故事分馆' },
  { id: 'story', label: '故事馆', short: '故事', emoji: '📖', imageIcon: '/icons/felt_storybook.jpg', tone: 'pink', desc: '绘本 · 儿歌 · 成语 · 古诗', hiddenInSidebar: true },
  { id: 'growth', label: '成长荣誉馆', short: '荣誉', emoji: '🏆', imageIcon: '/icons/felt_album.jpg', tone: 'green', desc: '成长树 · 勋章荣誉 · 贴纸百宝箱', bottom: true },
  { id: 'wrongbook', label: '错题本', short: '错题', emoji: '📝', imageIcon: '/icons/felt_wand.jpg', tone: 'orange', desc: 'AI 自适应复习 · 消灭错题' },
  { id: 'content', label: 'AI 内容站', short: '内容', emoji: '📡', imageIcon: '/icons/felt_phonics.jpg', tone: 'purple', desc: 'AI 生成 · 故事谜语科普' },
  { id: 'research', label: '研究乐园', short: '研究', emoji: '🔬', imageIcon: '/icons/cover-research.png', tone: 'blue', desc: '选题探索 · 记录发现' },
  { id: 'discoveries', label: '发现画廊', short: '画廊', emoji: '🖼️', imageIcon: '/icons/cover-discoveries.png', tone: 'blue', desc: '探索记录 · 知识卡片' },
  { id: 'adventure', label: '闯关冒险', short: '闯关', emoji: '🚀', imageIcon: '/icons/adventure.jpg', tone: 'purple', desc: '闯关拿星星徽章' },
  { id: 'rewards', label: '奖励中心', short: '奖励', emoji: '🎁', imageIcon: '/icons/felt_box.jpg', tone: 'pink', desc: '贴纸册 · 徽章墙', hiddenInSidebar: true },
  { id: 'passport', label: '学习护照', short: '护照', emoji: '🛂', imageIcon: '/icons/felt_medal.jpg', tone: 'purple', desc: '盖章里程碑 · 成就墙', hiddenInSidebar: true },
  { id: 'parent', label: '家长中心', short: '家长', emoji: '👨‍👩‍👧', imageIcon: '/icons/parent.jpg', tone: 'green', desc: '报告 · 设置 · 护眼' },
];

export const NAV_MAP = new Map(NAV_ITEMS.map((n) => [n.id, n]));

/* ========================================================================
 * 品类模型（规格四：导航按品类重组 —— 学习 / 游戏 / 故事 / 创意 / AI小老师 / 家长中心）
 * 纯数据映射，不改动任何页面路由，零回归。标签走 i18n(categories.*)，emoji/tone 在代码侧。
 * ===================================================================== */
export type NavCategory = 'home' | 'learn' | 'game' | 'story' | 'create' | 'ai' | 'parent' | 'growth' | 'research' | 'design';

export const NAV_CATEGORY_META: { key: NavCategory; emoji: string; tone: NavItem['tone'] }[] = [
  { key: 'learn', emoji: '📚', tone: 'blue' },
  { key: 'game', emoji: '🎮', tone: 'purple' },
  { key: 'story', emoji: '📖', tone: 'pink' },
  { key: 'create', emoji: '🎨', tone: 'orange' },
  { key: 'ai', emoji: '🤖', tone: 'green' },
  { key: 'research', emoji: '🔬', tone: 'blue' },
  { key: 'growth', emoji: '🏆', tone: 'yellow' },
  { key: 'parent', emoji: '👨‍👩‍👧', tone: 'green' },
];

/** 每个模块归属的品类（primary） */
export const NAV_CATEGORY_MAP: Record<RouteId, NavCategory> = {
  home: 'home',
  today: 'home',
  companion: 'ai',
  ttstest: 'parent',
  letters: 'learn',
  poems: 'learn',
  numbers: 'learn',
  hanzi: 'learn',
  'hanzi-listen': 'learn',
  pinyin: 'learn',
  words: 'learn',
  logic: 'learn',
  fun: 'game',
  idioms: 'learn',
  songs: 'story',
  science: 'learn',
  music: 'create',
  art: 'create',
  safety: 'learn',
  geography: 'learn',
  vehicles: 'game',
  festivals: 'learn',
  plants: 'learn',
  cat_house: 'create',
  realistic_cat: 'create',
  storybook: 'story',
  wrongbook: 'ai',
  gamecenter: 'game',
  story: 'story',
  growth: 'growth',
  content: 'ai',
  research: 'research',
  discoveries: 'research',
  design: 'research',
  adventure: 'game',
  rewards: 'parent',
  passport: 'parent',
  parent: 'parent',
};

export function categoryOf(id: RouteId): NavCategory {
  return NAV_CATEGORY_MAP[id] ?? 'learn';
}

/** 按品类分组返回模块列表（不含 home/today，它们是首页专属；过滤已合并的 hiddenInSidebar 项） */
export function navByCategory(): { key: NavCategory; items: NavItem[] }[] {
  const groups: Record<string, NavItem[]> = {};
  for (const it of NAV_ITEMS) {
    if (it.id === 'home' || it.id === 'today') continue;
    if (it.hiddenInSidebar) continue;
    const c = categoryOf(it.id);
    (groups[c] ??= []).push(it);
  }
  return NAV_CATEGORY_META.filter((m) => groups[m.key]?.length).map((m) => ({
    key: m.key,
    items: groups[m.key]!,
  }));
}
