export interface LetterItem {
  /** 大写字母 */
  upper: string;
  /** 小写字母 */
  lower: string;
  /** 例词 */
  word: string;
  /** 例词中文 */
  zh: string;
  emoji: string;
  /** 统一羊毛毡（毛绒 felt）风格方形图标 URL */
  iconSrc: string;
  /** 图标右上徽标文案（可选） */
  iconBadge?: string;
  /** 图标主题色（Tailwind from/to 渐变类） */
  iconColor?: string;
}

export const LETTERS: LetterItem[] = [
  {
    upper: 'A', lower: 'a', word: 'Apple', zh: '苹果', emoji: '🍎',
    iconSrc: '/icons/apple.jpg',
    iconBadge: '🍎 Red Apple',
    iconColor: 'from-pink-500 to-rose-400',
  },
  {
    upper: 'B', lower: 'b', word: 'Banana', zh: '香蕉', emoji: '🍌',
    iconSrc: '/words/bear.jpg',
    iconBadge: '🐻 Fluffy Bear',
    iconColor: 'from-rose-400 to-pink-500',
  },
  {
    upper: 'C', lower: 'c', word: 'Cat', zh: '小猫', emoji: '🐱',
    iconSrc: '/words/cat.jpg',
    iconBadge: '🐱 Soft Fluffy Kitten',
    iconColor: 'from-pink-400 to-amber-400',
  },
  {
    upper: 'D', lower: 'd', word: 'Dog', zh: '小狗', emoji: '🐶',
    iconSrc: '/words/dog.jpg',
    iconBadge: '🐶 Fluffy Puppy',
    iconColor: 'from-pink-500 to-purple-400',
  },
  {
    upper: 'E', lower: 'e', word: 'Elephant', zh: '大象', emoji: '🐘',
    iconSrc: '/words/elephant.jpg',
    iconBadge: '🐘 Baby Elephant',
    iconColor: 'from-purple-400 to-pink-400',
  },
  {
    upper: 'F', lower: 'f', word: 'Fish', zh: '小鱼', emoji: '🐟',
    iconSrc: '/words/fish.jpg',
    iconBadge: '🐟 Fluffy Pink Fish',
    iconColor: 'from-teal-400 to-pink-400',
  },
  {
    upper: 'G', lower: 'g', word: 'Grape', zh: '葡萄', emoji: '🍇',
    iconSrc: '/words/giraffe.jpg',
    iconBadge: '🦒 Baby Giraffe',
    iconColor: 'from-amber-400 to-pink-500',
  },
  {
    upper: 'H', lower: 'h', word: 'Hat', zh: '帽子', emoji: '🎩',
    iconSrc: '/words/house.jpg',
    iconBadge: '🏠 Strawberry House',
    iconColor: 'from-rose-500 to-pink-400',
  },
  {
    upper: 'I', lower: 'i', word: 'Ice cream', zh: '冰淇淋', emoji: '🍦',
    iconSrc: '/words/icecream.jpg',
    iconBadge: '🍦 Cone Icecream',
    iconColor: 'from-pink-400 to-rose-400',
  },
  {
    upper: 'J', lower: 'j', word: 'Juice', zh: '果汁', emoji: '🧃',
    iconSrc: '/words/juice.jpg',
    iconBadge: '🧃 Strawberry Juice Box',
    iconColor: 'from-rose-400 to-pink-500',
  },
  {
    upper: 'K', lower: 'k', word: 'Kite', zh: '风筝', emoji: '🪁',
    iconSrc: '/words/kite.jpg',
    iconBadge: '🪁 Strawberry Kite',
    iconColor: 'from-pink-400 to-indigo-400',
  },
  {
    upper: 'L', lower: 'l', word: 'Lion', zh: '狮子', emoji: '🦁',
    iconSrc: '/words/lion.jpg',
    iconBadge: '🦁 Fluffy Baby Lion',
    iconColor: 'from-amber-500 to-pink-500',
  },
  {
    upper: 'M', lower: 'm', word: 'Moon', zh: '月亮', emoji: '🌙',
    iconSrc: '/words/monkey.jpg',
    iconBadge: '🐒 Cute Pink Monkey',
    iconColor: 'from-pink-500 to-amber-400',
  },
  {
    upper: 'N', lower: 'n', word: 'Nose', zh: '鼻子', emoji: '👃',
    iconSrc: '/words/nest.jpg',
    iconBadge: '🪹 Fluffy Bird Nest',
    iconColor: 'from-rose-400 to-sky-400',
  },
  {
    upper: 'O', lower: 'o', word: 'Orange', zh: '橙子', emoji: '🍊',
    iconSrc: '/words/owl.jpg',
    iconBadge: '🦉 Wise Felt Owl',
    iconColor: 'from-indigo-400 to-pink-400',
  },
  {
    upper: 'P', lower: 'p', word: 'Panda', zh: '熊猫', emoji: '🐼',
    iconSrc: '/words/penguin.jpg',
    iconBadge: '🐧 Fluffy Penguin',
    iconColor: 'from-sky-400 to-pink-400',
  },
  {
    upper: 'Q', lower: 'q', word: 'Queen', zh: '女王', emoji: '👑',
    iconSrc: '/words/queen.jpg',
    iconBadge: '👑 Floral Bunny Queen',
    iconColor: 'from-purple-400 to-rose-400',
  },
  {
    upper: 'R', lower: 'r', word: 'Rabbit', zh: '兔子', emoji: '🐰',
    iconSrc: '/words/rabbit.jpg',
    iconBadge: '🐰 Soft Fluffy Bunny',
    iconColor: 'from-pink-400 to-rose-500',
  },
  {
    upper: 'S', lower: 's', word: 'Sun', zh: '太阳', emoji: '☀️',
    iconSrc: '/words/sun.jpg',
    iconBadge: '☀️ Sun & Castle',
    iconColor: 'from-amber-400 to-rose-400',
  },
  {
    upper: 'T', lower: 't', word: 'Tiger', zh: '老虎', emoji: '🐯',
    iconSrc: '/words/tiger.jpg',
    iconBadge: '🐯 Cute Felt Tiger',
    iconColor: 'from-orange-400 to-pink-500',
  },
  {
    upper: 'U', lower: 'u', word: 'Umbrella', zh: '雨伞', emoji: '☂️',
    iconSrc: '/words/unicorn.jpg',
    iconBadge: '🦄 Dreamy Unicorn',
    iconColor: 'from-indigo-400 to-pink-400',
  },
  {
    upper: 'V', lower: 'v', word: 'Violin', zh: '小提琴', emoji: '🎻',
    iconSrc: '/words/violin.jpg',
    iconBadge: '🎻 Music Felt Violin',
    iconColor: 'from-rose-400 to-amber-400',
  },
  {
    upper: 'W', lower: 'w', word: 'Watermelon', zh: '西瓜', emoji: '🍉',
    iconSrc: '/words/whale.jpg',
    iconBadge: '🐳 Ocean Blue Whale',
    iconColor: 'from-sky-400 to-teal-400',
  },
  {
    upper: 'X', lower: 'x', word: 'Xylophone', zh: '木琴', emoji: '🎹',
    iconSrc: '/words/xylophone.jpg',
    iconBadge: '🎵 Rainbow Xylophone',
    iconColor: 'from-emerald-400 to-pink-400',
  },
  {
    upper: 'Y', lower: 'y', word: 'Yacht', zh: '帆船', emoji: '⛵',
    iconSrc: '/words/yoyo.jpg',
    iconBadge: '🪀 Spinning Yoyo',
    iconColor: 'from-purple-400 to-pink-400',
  },
  {
    upper: 'Z', lower: 'z', word: 'Zebra', zh: '斑马', emoji: '🦓',
    iconSrc: '/words/zebra.jpg',
    iconBadge: '🦓 Cute Felt Zebra',
    iconColor: 'from-slate-400 to-pink-400',
  },
];

export const LETTER_MAP = new Map(LETTERS.map((l) => [l.upper, l]));
/** 按字母大写键返回羊毛毡图标信息（用于向后兼容 FluffyLetterVisual 等组件） */
export const LETTER_ICON_MAP = Object.fromEntries(
  LETTERS.map((l) => [
    l.upper,
    {
      src: l.iconSrc,
      badge: l.iconBadge ?? `${l.emoji} ${l.word}`,
      color: l.iconColor ?? 'from-pink-500 to-rose-400',
    },
  ]),
) as Record<string, { src: string; badge: string; color: string }>;
