import type { StorybookTheme, StorybookStyle, ThemePreset, StylePreset } from './types';

export const THEMES: ThemePreset[] = [
  {
    id: 'animals',
    label: '动物世界',
    emoji: '🦁',
    tone: 'orange',
    characters: ['小狮子', '小兔子', '小大象', '小狐狸'],
    sceneEmojis: ['🦊', '🐰', '🐿️', '🦉', '🌳'],
    bgGradient: 'linear-gradient(180deg, #E8F5E9 0%, #C8E6C9 100%)',
  },
  {
    id: 'space',
    label: '太空探险',
    emoji: '🚀',
    tone: 'purple',
    characters: ['小宇航员', '机器人小宝', '小星星'],
    sceneEmojis: ['⭐', '🌟', '☄️', '🛸', '🌙'],
    bgGradient: 'linear-gradient(180deg, #1A237E 0%, #311B92 100%)',
  },
  {
    id: 'princess',
    label: '公主童话',
    emoji: '👸',
    tone: 'pink',
    characters: ['小公主', '花仙子', '美人鱼'],
    sceneEmojis: ['👑', '💎', '🦢', '🌸', '🏰'],
    bgGradient: 'linear-gradient(180deg, #FCE4EC 0%, #F8BBD0 100%)',
  },
  {
    id: 'dinosaur',
    label: '恐龙时代',
    emoji: '🦕',
    tone: 'green',
    characters: ['小恐龙', '翼龙宝宝', '三角龙'],
    sceneEmojis: ['🦖', '🌴', '🥚', '🌋', '🦴'],
    bgGradient: 'linear-gradient(180deg, #FFF3E0 0%, #FFCC80 100%)',
  },
  {
    id: 'ocean',
    label: '海底世界',
    emoji: '🐠',
    tone: 'blue',
    characters: ['小海豚', '小乌龟', '小螃蟹'],
    sceneEmojis: ['🐢', '🦀', '🌊', '🐚', '🫧'],
    bgGradient: 'linear-gradient(180deg, #E1F5FE 0%, #4FC3F7 100%)',
  },
  {
    id: 'forest',
    label: '森林奇遇',
    emoji: '🍄',
    tone: 'green',
    characters: ['小蘑菇', '小松鼠', '小萤火虫'],
    sceneEmojis: ['🐌', '🦋', '🍃', '🌳', '🌿'],
    bgGradient: 'linear-gradient(180deg, #E0F2F1 0%, #A5D6A7 100%)',
  },
];

export const STYLES: StylePreset[] = [
  {
    id: 'warm',
    label: '温馨故事',
    emoji: '💕',
    desc: '温暖感人的小故事',
    promptHint: '故事风格：温馨感人，充满爱和关怀，结局温暖美好',
  },
  {
    id: 'adventure',
    label: '冒险传奇',
    emoji: '⚔️',
    desc: '勇敢刺激的大冒险',
    promptHint: '故事风格：冒险刺激，有挑战和勇气，结局胜利欢呼',
  },
  {
    id: 'funny',
    label: '搞笑趣味',
    emoji: '😂',
    desc: '让人哈哈大笑的故事',
    promptHint: '故事风格：幽默搞笑，有意想不到的转折，让孩子哈哈大笑',
  },
];

export function getTheme(id: StorybookTheme): ThemePreset {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

export function getStyle(id: StorybookStyle): StylePreset {
  return STYLES.find((s) => s.id === id) ?? STYLES[0]!;
}
