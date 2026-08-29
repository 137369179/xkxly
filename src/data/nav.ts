import type { RouteId } from '@/lib/router';
import type { Tone } from '@/lib/tones';

export interface NavItem {
  id: RouteId;
  label: string;
  short: string;
  emoji: string;
  imageIcon?: string;
  /** P1-9 响应式：小尺寸变体（-480，供 srcset 移动端/小卡使用，省流量） */
  imageIconSmall?: string;
  tone: Tone;
  desc: string;
  /** 是否出现在移动端底部 Tab（改版后收敛为 4 个：首页/乐园地图/游戏/成长） */
  bottom?: boolean;
  /** 是否在侧边栏品类菜单中隐藏（针对已合并至主模块的子路由） */
  hiddenInSidebar?: boolean;
  /** 乐园地图所属岛屿（4 岛分组，替代侧边栏 8 品类平铺） */
  island?: Island;
  /** 合并后的重定向目标（路由不删，仅更换渲染目标，见 lib/routeRedirects.ts） */
  redirect?: RouteId;
  /** 品牌级 3D 图标资产路径（对标宝宝巴士/洪恩质感）；缺省回落到 emoji 渲染 */
  brandIcon?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '我的乐园', short: '首页', emoji: '🏡', imageIcon: '/icons/icon-192.png', tone: 'orange', desc: '今日学习计划与成长看板', bottom: true, brandIcon: '/icons/brand3d/tab-home.webp' },
  { id: 'hall', label: '乐园地图', short: '地图', emoji: '🗺️', tone: 'purple', desc: '四大岛屿 · 全部乐园随便逛', bottom: true, brandIcon: '/icons/brand3d/tab-hall.webp' },
  { id: 'today', label: '今日课程', short: '今日', emoji: '📅', imageIcon: '/icons/felt_town.jpg', tone: 'purple', desc: '自适应每日任务与3分钟极速复习' },
  { id: 'companion', label: '小茜伙伴', short: '伙伴', emoji: '🤖', imageIcon: '/icons/felt_room.jpg', tone: 'purple', desc: '拟人化智能讲解 · 社交情商演练', island: 'create' , brandIcon: '/icons/brand3d/mod-companion.webp' },
  { id: 'hanzi', label: '汉字乐园', short: '汉字', emoji: '🀄', imageIcon: '/icons/hanzi.jpg', tone: 'green', desc: '象形字源 · 玩认练写说 · 300字精学', island: 'learn' , brandIcon: '/icons/brand3d/mod-hanzi.webp' },
  { id: 'hanzi-listen', label: '听音识字', short: '听音', emoji: '👂', imageIcon: '/icons/felt_sight.jpg', tone: 'green', desc: '纯正普通话发音 · 快速识字听音辨字', hiddenInSidebar: true, redirect: 'hanzi' },
  { id: 'pinyin', label: '拼音滑梯', short: '拼音', emoji: '🛝', imageIcon: '/icons/pinyin.jpg', tone: 'blue', desc: '声韵滑滑梯 · 易混辨析 · 拼读大冒险', island: 'learn' , brandIcon: '/icons/brand3d/mod-pinyin.webp' },
  { id: 'letters', label: '字母与拼读', short: '字母', emoji: '🔤', imageIcon: '/icons/letters.jpg', tone: 'blue', desc: '26 字母大冒险 · Phonics 气泡 · CVC三拼', island: 'learn' , brandIcon: '/icons/brand3d/mod-letters.webp' },
  { id: 'words', label: '英语单词乐园', short: '单词', emoji: '🔠', imageIcon: '/icons/cover-words.webp', tone: 'pink', desc: '300+ 生活主题词汇 · 美式真人原声', island: 'learn' , brandIcon: '/icons/brand3d/mod-words.webp' },
  { id: 'numbers', label: '数学与思维', short: '数学', emoji: '🔢', imageIcon: '/icons/math.jpg', tone: 'yellow', desc: '数感天平 · 十格阵加减 · 七巧空间工坊', island: 'learn' , brandIcon: '/icons/brand3d/mod-numbers.webp' },
  { id: 'logic', label: '逻辑与编程', short: '逻辑', emoji: '🧩', imageIcon: '/icons/logic.jpg', tone: 'green', desc: 'CodeBot 积木编程 · 智能迷宫 · 脑力训练', island: 'learn' , brandIcon: '/icons/brand3d/mod-logic.webp' },
  { id: 'poems', label: '国学古诗馆', short: '古诗', emoji: '🌸', imageIcon: '/icons/poem.jpg', tone: 'pink', desc: '经典诗词长卷 · 诗仙飞花令 · 九宫拼诗', island: 'learn' , brandIcon: '/icons/brand3d/mod-poems.webp' },
  { id: 'voicestudio', label: '发音评测工坊', short: '发音', emoji: '🎙️', tone: 'purple', desc: '多音色童声伴读 · 5维发音雷达 · 逐句跟读', island: 'learn' , brandIcon: '/icons/brand3d/mod-voicestudio.webp' },
  { id: 'idioms', label: '成语消消乐', short: '成语', emoji: '🏯', imageIcon: '/icons/cover-idioms.webp', tone: 'purple', desc: '60 个成语典故 · 4x4 方块消除 · 寓言大决斗', island: 'story' , brandIcon: '/icons/brand3d/mod-idioms.webp' },
  { id: 'storybook', label: '分级绘本岛', short: '绘本', emoji: '📚', imageIcon: '/icons/cover-storybook.png', tone: 'pink', desc: '自集字专属故事 · Level 1~5 分级阅读', island: 'story' , brandIcon: '/icons/brand3d/mod-storybook.webp' },
  { id: 'songs', label: '儿歌乐园', short: '儿歌', emoji: '🎵', imageIcon: '/icons/cover-songs.webp', imageIconSmall: '/icons/cover-songs-480.webp', tone: 'pink', desc: '10 首经典童谣 · 节奏明快启蒙', island: 'story' , brandIcon: '/icons/brand3d/mod-songs.webp' },
  { id: 'nursery', label: '儿歌跟唱', short: '跟唱', emoji: '🎶', imageIcon: '/icons/cover-songs.webp', tone: 'pink', desc: '逐句跟唱伴学 · 知识儿歌好习惯', island: 'story' , brandIcon: '/icons/brand3d/mod-nursery.webp' },
  { id: 'science', label: '自然科学馆', short: '科学', emoji: '🦖', imageIcon: '/icons/cover-science.webp', tone: 'green', desc: '恐龙考古 · 植物生命周期 · 太空天气', island: 'explore' , brandIcon: '/icons/brand3d/mod-science.webp' },
  { id: 'safety', label: '安全情景剧场', short: '安全', emoji: '🚨', imageIcon: '/icons/cover-safety.webp', imageIconSmall: '/icons/cover-safety-480.webp', tone: 'blue', desc: '习惯模拟器 · 地震火灾逃生 · 出行防走失', island: 'explore' , brandIcon: '/icons/brand3d/mod-safety.webp' },
  { id: 'geography', label: '环球 3D 地理', short: '地理', emoji: '🧭', imageIcon: '/icons/cover-geography.webp', tone: 'green', desc: '七大洲五大洋 · 地标名胜 · 护照集章', island: 'explore' , brandIcon: '/icons/brand3d/mod-geography.webp' },
  { id: 'festivals', label: '节气文化馆', short: '节气', emoji: '🏮', imageIcon: '/icons/cover-festivals.webp', tone: 'pink', desc: '二十四节气长卷 · 传统节日风俗', island: 'explore' , brandIcon: '/icons/brand3d/mod-festivals.webp' },
  { id: 'plants', label: '奇妙植物馆', short: '植物', emoji: '🪴', imageIcon: '/icons/cover-plants.webp', imageIconSmall: '/icons/cover-plants-480.webp', tone: 'green', desc: '向日葵生长 · 浇水光照光合作用', island: 'explore' , brandIcon: '/icons/brand3d/mod-plants.webp' },
  { id: 'research', label: '探索研究乐园', short: '研究', emoji: '🔬', imageIcon: '/icons/cover-research.webp', imageIconSmall: '/icons/cover-research-480.webp', tone: 'blue', desc: '小课题探究 · 科学假设与验证', island: 'explore' , brandIcon: '/icons/brand3d/mod-research.webp' },
  { id: 'discoveries', label: '科学发现画廊', short: '画廊', emoji: '🖼️', imageIcon: '/icons/cover-discoveries.webp', tone: 'blue', desc: '探索记录 · 知识卡片 · 荣誉成果', island: 'explore' , brandIcon: '/icons/brand3d/mod-discoveries.webp' },
  { id: 'music', label: '音乐律动坊', short: '音乐', emoji: '🎹', imageIcon: '/icons/cover-music.webp', imageIconSmall: '/icons/cover-music-480.webp', tone: 'pink', desc: '太鼓达人律动 · 彩虹琴视唱练耳', island: 'create' , brandIcon: '/icons/brand3d/mod-music.webp' },
  { id: 'art', label: '艺术与填色', short: '艺术', emoji: '🎨', imageIcon: '/icons/cover-art.webp', tone: 'pink', desc: '魔力分块填色本 · 魔法调色盘 · 自由画板', island: 'create' , brandIcon: '/icons/brand3d/mod-art.webp' },
  { id: 'vehicles', label: '城市交通救援', short: '救援', emoji: '🚒', imageIcon: '/icons/cover-vehicles.webp', tone: 'orange', desc: '消防灭火 · 救护医疗 · 特警探案 · 挖掘机', island: 'create' , brandIcon: '/icons/brand3d/mod-vehicles.webp' },
  { id: 'cat_house', label: '伴读猫屋', short: '猫咪', emoji: '🐱', imageIcon: '/icons/pink_felt_cat.png', tone: 'pink', desc: '2D/3D 梦幻猫咪 · 伴读喂养互动', island: 'create' , brandIcon: '/icons/brand3d/mod-cat_house.webp' },
  { id: 'realistic_cat', label: '写实猫咪3D', short: '写实猫', emoji: '🐈', imageIcon: '/icons/unified_3d_cats.jpg', tone: 'orange', desc: '真实毛发 · PBR渲染 · 多品种切换', hiddenInSidebar: true, redirect: 'cat_house' , brandIcon: '/icons/brand3d/mod-realistic_cat.webp' },
  { id: 'desktop_pet', label: '桌面宠物', short: '宠物', emoji: '🐾', tone: 'purple', desc: '互动桌面萌宠 · 亲密度好感度 · 番茄钟', hiddenInSidebar: true, redirect: 'cat_house' , brandIcon: '/icons/brand3d/mod-desktop_pet.webp' },
  { id: 'content', label: 'AI 内容创作站', short: '创作', emoji: '📡', imageIcon: '/icons/felt_phonics.jpg', tone: 'purple', desc: 'AI 故事生成 · 知识谜语 · 百科答疑', island: 'create' },
  { id: 'wrongbook', label: '智能错题本', short: '错题', emoji: '📝', imageIcon: '/icons/felt_wand.jpg', tone: 'orange', desc: 'AI 自适应薄弱诊断 · 变式题消灭错题', island: 'create' , brandIcon: '/icons/brand3d/mod-wrongbook.webp' },
  { id: 'adventure', label: '星际闯关大冒险', short: '闯关', emoji: '🚀', imageIcon: '/icons/adventure.jpg', tone: 'purple', desc: '通关赢取星星勋章与专属宝藏' , brandIcon: '/icons/brand3d/mod-adventure.webp' },
  { id: 'gamecenter', label: '益智游戏中心', short: '游戏', emoji: '🎮', imageIcon: '/icons/fun.jpg', tone: 'purple', desc: '闯关冒险 · 亲子对战 · 脑力空间', bottom: true, brandIcon: '/icons/brand3d/tab-game.webp' },
  { id: 'fun', label: '趣味竞技场', short: '竞技', emoji: '🎪', imageIcon: '/icons/cover-fun.webp', tone: 'purple', desc: '亲子对战 · 听力反应 · 创意搭建', hiddenInSidebar: true, redirect: 'gamecenter' },
  { id: 'story', label: '万卷故事馆', short: '故事', emoji: '📖', imageIcon: '/icons/felt_storybook.jpg', tone: 'pink', desc: '绘本 · 儿歌 · 成语 · 古诗综合总馆', hiddenInSidebar: true, redirect: 'hall' , brandIcon: '/icons/brand3d/mod-story.webp' },
  { id: 'growth', label: '成长荣誉馆', short: '荣誉', emoji: '🏆', imageIcon: '/icons/felt_album.jpg', tone: 'yellow', desc: '全景记忆星图 · 勋章百宝箱 · 成长之树', bottom: true, brandIcon: '/icons/brand3d/tab-growth.webp' },
  { id: 'rewards', label: '奖励中心', short: '奖励', emoji: '🎁', imageIcon: '/icons/felt_box.jpg', tone: 'pink', desc: '贴纸百宝箱 · 荣誉勋章墙', hiddenInSidebar: true, redirect: 'growth' },
  { id: 'passport', label: '学习打卡护照', short: '护照', emoji: '🛂', imageIcon: '/icons/felt_medal.jpg', tone: 'purple', desc: '里程碑盖章 · 世界足迹成就墙', hiddenInSidebar: true, redirect: 'growth' },
  { id: 'achievement', label: '宝贝成就中心', short: '成就', emoji: '🏅', imageIcon: '/icons/felt_medal.jpg', tone: 'pink', desc: '见证点滴进步 · 闪耀荣誉殿堂', hiddenInSidebar: true, redirect: 'growth' , brandIcon: '/icons/brand3d/mod-achievement.webp' },
  { id: 'parent', label: '家长管理中心', short: '家长', emoji: '👨‍👩‍👧', imageIcon: '/icons/parent.jpg', tone: 'green', desc: '学情周报 · 视力护眼时长 · 课程配置' , brandIcon: '/icons/brand3d/mod-parent.webp' },
];

export const NAV_MAP = new Map(NAV_ITEMS.map((n) => [n.id, n]));

/* ========================================================================
 * 品类模型（规格四：导航按品类重组 —— 学习 / 游戏 / 故事 / 创意 / AI小老师 / 家长中心）
 * 纯数据映射，不改动任何页面路由，零回归。标签走 i18n(categories.*)，emoji/tone 在代码侧。
 * ===================================================================== */
export type NavCategory = 'home' | 'learn' | 'game' | 'story' | 'create' | 'ai' | 'parent' | 'growth' | 'research' | 'design';

/** 乐园地图四大岛屿（对标洪恩星球地图 / 宝宝巴士场景世界） */
export type Island = 'learn' | 'story' | 'explore' | 'create';

export const ISLAND_META: { key: Island; label: string; emoji: string; tone: NavItem['tone']; brandIcon?: string }[] = [
  { key: 'learn', label: '学习岛', emoji: '📚', tone: 'blue', brandIcon: '/icons/brand3d/island-learn.webp' },
  { key: 'story', label: '故事岛', emoji: '📖', tone: 'pink', brandIcon: '/icons/brand3d/island-story.webp' },
  { key: 'explore', label: '探索岛', emoji: '🔬', tone: 'green', brandIcon: '/icons/brand3d/island-explore.webp' },
  { key: 'create', label: '创意岛', emoji: '🎨', tone: 'orange', brandIcon: '/icons/brand3d/island-create.webp' },
];

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
  hall: 'home',
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
  desktop_pet: 'ai',
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
  achievement: 'growth',
  nursery: 'learn',
  duel: 'game',
  voicestudio: 'learn',
};

export function categoryOf(id: RouteId): NavCategory {
  return NAV_CATEGORY_MAP[id] ?? 'learn';
}

/** 按品类分组返回模块列表（不含 home/today，它们是首页专属；过滤已合并的 hiddenInSidebar 项） */
export function navByCategory(): { key: NavCategory; items: NavItem[] }[] {
  const groups: Record<string, NavItem[]> = {};
  for (const it of NAV_ITEMS) {
    // home/today/hall 为主导航与首页专属入口，不进品类分组
    if (it.id === 'home' || it.id === 'today' || it.id === 'hall') continue;
    if (it.hiddenInSidebar) continue;
    const c = categoryOf(it.id);
    (groups[c] ??= []).push(it);
  }
  return NAV_CATEGORY_META.filter((m) => (groups[m.key]?.length ?? 0) > 0).map((m) => ({
    key: m.key,
    items: groups[m.key] ?? [],
  }));
}

/** 按岛屿分组返回模块列表（乐园地图用；只含显式声明 island 的模块，自动跳过合并/隐藏项） */
export function navByIsland(): { key: Island; items: NavItem[] }[] {
  const groups: Record<string, NavItem[]> = {};
  for (const it of NAV_ITEMS) {
    if (!it.island || it.hiddenInSidebar || it.redirect) continue;
    (groups[it.island] ??= []).push(it);
  }
  return ISLAND_META.filter((m) => (groups[m.key]?.length ?? 0) > 0).map((m) => ({
    key: m.key,
    items: groups[m.key] ?? [],
  }));
}

/** 岛屿内进度：已学 count（由 mastery 提供数据，此处仅返回该岛全部模块 id） */
export function islandIds(island: Island): RouteId[] {
  return navByIsland().find((g) => g.key === island)?.items.map((i) => i.id) ?? [];
}
