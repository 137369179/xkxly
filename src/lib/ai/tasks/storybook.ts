/**
 * AI 故事绘本生成任务封装
 * ------------------------------------------------------------------
 * 改造为结构化任务模式，支持 theme + style 参数。
 * fallback 覆盖 6 主题，离线也能生成预设绘本。
 */

import { chat } from '../client';
import { sanitizeStructuredText } from '../guard';
import { safeParseJSON } from '@/lib/safeStorage';
import { storybookMessages, type StoryBookData, type StoryBookPageData } from '../prompts';
import type { ChatOptions } from '../types';
import type { TaskResult } from './types';
import type { StorybookTheme, StorybookStyle } from '@/modules/storybook/types';

/** 原 ChatOptions 构建器（保留兼容） */
export function storybookTask(
  character: string,
  theme: string,
  userPrompt?: string,
): ChatOptions {
  return {
    scene: 'storybook.generate',
    json: true,
    messages: storybookMessages(character, theme, undefined, userPrompt),
    cacheKey: `storybook:${character}:${theme}:${userPrompt || ''}`,
  };
}

/** 结构化任务函数，供 useAiTask<StoryBookData> 使用 */
export function createStorybookTask(
  character: string,
  theme: StorybookTheme,
  style: StorybookStyle,
  userPrompt?: string,
): () => Promise<TaskResult<StoryBookData>> {
  return async () => {
    const opts: ChatOptions = {
      scene: 'storybook.generate',
      json: true,
      messages: storybookMessages(character, theme, style, userPrompt),
      cacheKey: `storybook:${character}:${theme}:${style}:${userPrompt || ''}`,
    };

    try {
      const result = await chat(opts);
      if (!result.ok || !result.text.trim()) {
        throw new Error(result.error?.message ?? 'AI 生成失败');
      }

      const parsed = sanitizeStructuredText(
        safeParseJSON<StoryBookData>(result.text, null as unknown as StoryBookData),
      );
      // 校验
      if (!parsed.pages || parsed.pages.length !== 4) {
        throw new Error('Invalid page count');
      }
      if (!parsed.bookTitle || !parsed.moral) {
        throw new Error('Missing required fields');
      }

      return {
        ok: true,
        data: parsed,
        fallback: false,
        ms: result.ms,
      };
    } catch {
      return {
        ok: false,
        data: fallbackStorybook(character, theme, style),
        fallback: true,
        ms: 0,
      };
    }
  };
}

/* ================================================================
 * 兜底故事库 —— 6 主题 × 4 页
 * ================================================================ */

interface FallbackBook {
  title: string;
  moral: string;
  pages: { title: string; content: string; illustrationTheme: string; bgColor: string; emoji: string }[];
}

const FALLBACK_BOOKS: Record<StorybookTheme, FallbackBook> = {
  animals: {
    title: '小狮子的勇敢冒险',
    moral: '勇敢面对困难，友谊让世界更美好',
    pages: [
      { title: '草原上的新朋友', content: '一天，小狮子在草原上遇到了一只迷路的小兔子，它决定帮助小兔子找到回家的路。', illustrationTheme: 'savanna', bgColor: '#fff4d6', emoji: '🦁' },
      { title: '过河的挑战', content: '它们来到一条小河前，小狮子勇敢地背起小兔子，一步一步趟过了河水。', illustrationTheme: 'river', bgColor: '#dcecfa', emoji: '🌊' },
      { title: '森林大冒险', content: '穿过森林时，它们遇到了一只友善的小大象，小大象用长鼻子帮它们摘到了高处的果子。', illustrationTheme: 'forest', bgColor: '#f0faf4', emoji: '🐘' },
      { title: '温暖回家路', content: '终于把小兔子送回了家，小狮子心里暖暖的，它明白了帮助别人是世界上最快乐的事。', illustrationTheme: 'home', bgColor: '#f8f0fd', emoji: '🌟' },
    ],
  },
  space: {
    title: '小宇航员的星际旅行',
    moral: '勇敢探索，世界比想象的更神奇',
    pages: [
      { title: '发射倒计时', content: '小宇航员坐上了闪闪发光的火箭，三、二、一，嗖的一下飞向了神秘的太空！', illustrationTheme: 'launch', bgColor: '#dcecfa', emoji: '🚀' },
      { title: '糖果星云', content: '太空深处的云朵居然全是棉花糖做的！小宇航员开心地摘了一朵品尝，甜极啦！', illustrationTheme: 'candy', bgColor: '#fff4d6', emoji: '🍬' },
      { title: '外星新朋友', content: '在一颗绿色的小星球上，小宇航员遇到了三只可爱的外星小嘟嘟，它们一起跳起了欢快的舞蹈。', illustrationTheme: 'alien', bgColor: '#f0faf4', emoji: '👾' },
      { title: '满载星光回家', content: '小宇航员带着满满的爱与亮晶晶的星星许愿瓶回到了家，梦里全都是奇妙的太空故事！', illustrationTheme: 'home', bgColor: '#f8f0fd', emoji: '🌟' },
    ],
  },
  princess: {
    title: '小公主的花园秘密',
    moral: '善良的心是最美的魔法',
    pages: [
      { title: '神秘的小种子', content: '小公主在城堡花园里捡到了一颗闪闪发光的种子，她小心翼翼地把它种在了花盆里。', illustrationTheme: 'garden', bgColor: '#ffe4ee', emoji: '🌱' },
      { title: '神奇的芽儿', content: '第二天早上，种子长出了彩色的小芽！小公主给它浇水、唱歌，芽儿长得越来越高。', illustrationTheme: 'magic', bgColor: '#fff4d6', emoji: '✨' },
      { title: '花仙子来了', content: '花终于开了，从花蕊里飞出了一位小花仙子！花仙子送给小公主一顶闪闪的皇冠。', illustrationTheme: 'fairy', bgColor: '#ffc9da', emoji: '🧚' },
      { title: '最美的礼物', content: '小公主明白了，用心照顾小生命就是最好的魔法。她和花仙子成了最好的朋友。', illustrationTheme: 'friendship', bgColor: '#f8f0fd', emoji: '👑' },
    ],
  },
  dinosaur: {
    title: '小恐龙的第一次远足',
    moral: '好奇心让世界变得更大',
    pages: [
      { title: '蛋壳裂开了', content: '咔嚓！小恐龙从蛋壳里钻了出来，它睁开眼睛看到了一个充满阳光的奇妙世界。', illustrationTheme: 'birth', bgColor: '#fff3ec', emoji: '🥚' },
      { title: '遇见翼龙', content: '一只小翼龙从天上飞下来，告诉小恐龙远处有好多好玩的东西，它们决定一起去看看。', illustrationTheme: 'meeting', bgColor: '#dcecfa', emoji: '🦴' },
      { title: '火山旁的温泉', content: '它们发现了一处温暖的温泉，小恐龙开心地在水里扑腾，溅起了好多水花！', illustrationTheme: 'volcano', bgColor: '#ffc9a8', emoji: '🌋' },
      { title: '回家看星星', content: '天黑了，小恐龙和新朋友躺在草地上看星星，它觉得这是出生以来最棒的一天。', illustrationTheme: 'stargazing', bgColor: '#53289f', emoji: '⭐' },
    ],
  },
  ocean: {
    title: '小海豚的海底寻宝',
    moral: '团结合作就能战胜困难',
    pages: [
      { title: '藏宝图', content: '小海豚在珊瑚礁里找到了一张藏宝图，上面画着一颗闪亮的珍珠藏在深海处。', illustrationTheme: 'map', bgColor: '#dcecfa', emoji: '🗺️' },
      { title: '小乌龟帮忙', content: '小海豚找到了好朋友小乌龟，小乌龟背着它慢慢地游过了重重海草迷宫。', illustrationTheme: 'teamwork', bgColor: '#a8d8f0', emoji: '🐢' },
      { title: '螃蟹守门员', content: '一只小螃蟹守在宝藏前面，小海豚给小螃蟹讲了个笑话，小螃蟹笑得钳子都松开了。', illustrationTheme: 'crab', bgColor: '#55aee0', emoji: '🦀' },
      { title: '闪亮的珍珠', content: '它们找到了珍珠！珍珠的光照亮了整个海底，小海豚和小伙伴们开心地围着珍珠转圈圈。', illustrationTheme: 'treasure', bgColor: '#2e93c9', emoji: '🐚' },
    ],
  },
  forest: {
    title: '小蘑菇的森林奇遇',
    moral: '每个小生命都有大大的力量',
    pages: [
      { title: '雨后小蘑菇', content: '一场春雨过后，小蘑菇从泥土里探出了圆乎乎的脑袋，它好奇地打量着这片森林。', illustrationTheme: 'mushroom', bgColor: '#f0faf4', emoji: '🍄' },
      { title: '迷路的小蜗牛', content: '小蘑菇遇到了一只迷路的小蜗牛，它用自己的颜色给小蜗牛指路，帮它找到了家。', illustrationTheme: 'snail', bgColor: '#b8f0d8', emoji: '🐌' },
      { title: '萤火虫的舞会', content: '夜晚来了，一群萤火虫围着小蘑菇跳舞，把小蘑菇照得比灯笼还要亮！', illustrationTheme: 'fireflies', bgColor: '#53289f', emoji: '🦋' },
      { title: '森林的小英雄', content: '第二天，森林里的小动物们都来找小蘑菇玩。虽然它很小，但它觉得自己是世界上最幸福的蘑菇。', illustrationTheme: 'hero', bgColor: '#f0faf4', emoji: '🌟' },
    ],
  },
};

/** 离线/兜底故事绘本数据 */
export function fallbackStorybook(
  character = '小狮子',
  theme: StorybookTheme | string = 'animals',
  style: StorybookStyle = 'warm',
): StoryBookData {
  const themeKey = (FALLBACK_BOOKS as Record<string, FallbackBook>)[theme] ? theme : 'animals';
  const book = FALLBACK_BOOKS[themeKey as StorybookTheme]!;

  // 风格影响 moral 措辞
  const styleMorals: Record<StorybookStyle, string> = {
    warm: book.moral,
    adventure: book.moral + '！',
    funny: book.moral + '哈哈哈！',
  };

  return {
    bookTitle: book.title.replace('小', character[0] ?? '小'),
    author: '小智 & 宝贝',
    moral: styleMorals[style],
    pages: book.pages.map((p, i) => ({
      pageNumber: i + 1,
      title: p.title,
      content: p.content,
      illustrationTheme: p.illustrationTheme,
      bgColor: p.bgColor,
      emoji: p.emoji,
    })) as StoryBookPageData[],
  };
}
