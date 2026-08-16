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
  /** 自然拼读国际音标或发音符号（如 /æ/） */
  phonicsSound: string;
  /** 自然拼读发音示例助记短语（如 "A is for Apple, /æ/ /æ/ Apple!"） */
  phonicsRhyme: string;
  /** 字母类别分组（元音 vowel、基础高频辅音 consonant1、进阶辅音 consonant2） */
  category: 'vowel' | 'consonant1' | 'consonant2';
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
    phonicsSound: '/æ/',
    phonicsRhyme: 'A says /æ/, /æ/, apple!',
    category: 'vowel',
    iconSrc: '/icons/apple.png',
    iconBadge: '🍎 Red Apple',
    iconColor: 'from-pink-500 to-rose-400',
  },
  {
    upper: 'B', lower: 'b', word: 'Bear', zh: '小熊', emoji: '🐻',
    phonicsSound: '/b/',
    phonicsRhyme: 'B says /b/, /b/, bear!',
    category: 'consonant1',
    iconSrc: '/words/bear.jpg',
    iconBadge: '🐻 Fluffy Bear',
    iconColor: 'from-amber-400 to-orange-500',
  },
  {
    upper: 'C', lower: 'c', word: 'Cat', zh: '小猫', emoji: '🐱',
    phonicsSound: '/k/',
    phonicsRhyme: 'C says /k/, /k/, cat!',
    category: 'consonant1',
    iconSrc: '/words/cat.jpg',
    iconBadge: '🐱 Soft Fluffy Kitten',
    iconColor: 'from-pink-400 to-amber-400',
  },
  {
    upper: 'D', lower: 'd', word: 'Dog', zh: '小狗', emoji: '🐶',
    phonicsSound: '/d/',
    phonicsRhyme: 'D says /d/, /d/, dog!',
    category: 'consonant1',
    iconSrc: '/words/dog.jpg',
    iconBadge: '🐶 Fluffy Puppy',
    iconColor: 'from-pink-500 to-purple-400',
  },
  {
    upper: 'E', lower: 'e', word: 'Elephant', zh: '大象', emoji: '🐘',
    phonicsSound: '/e/',
    phonicsRhyme: 'E says /e/, /e/, elephant!',
    category: 'vowel',
    iconSrc: '/words/elephant.jpg',
    iconBadge: '🐘 Baby Elephant',
    iconColor: 'from-purple-400 to-pink-400',
  },
  {
    upper: 'F', lower: 'f', word: 'Fish', zh: '小鱼', emoji: '🐟',
    phonicsSound: '/f/',
    phonicsRhyme: 'F says /f/, /f/, fish!',
    category: 'consonant1',
    iconSrc: '/words/fish.jpg',
    iconBadge: '🐟 Fluffy Pink Fish',
    iconColor: 'from-teal-400 to-pink-400',
  },
  {
    upper: 'G', lower: 'g', word: 'Giraffe', zh: '长颈鹿', emoji: '🦒',
    phonicsSound: '/ɡ/',
    phonicsRhyme: 'G says /ɡ/, /ɡ/, giraffe!',
    category: 'consonant1',
    iconSrc: '/words/giraffe.jpg',
    iconBadge: '🦒 Baby Giraffe',
    iconColor: 'from-amber-400 to-pink-500',
  },
  {
    upper: 'H', lower: 'h', word: 'House', zh: '房子', emoji: '🏠',
    phonicsSound: '/h/',
    phonicsRhyme: 'H says /h/, /h/, house!',
    category: 'consonant1',
    iconSrc: '/words/house.jpg',
    iconBadge: '🏠 Strawberry House',
    iconColor: 'from-rose-500 to-pink-400',
  },
  {
    upper: 'I', lower: 'i', word: 'Ice cream', zh: '冰淇淋', emoji: '🍦',
    phonicsSound: '/ɪ/',
    phonicsRhyme: 'I says /ɪ/, /ɪ/, ice cream!',
    category: 'vowel',
    iconSrc: '/words/icecream.jpg',
    iconBadge: '🍦 Cone Icecream',
    iconColor: 'from-pink-400 to-rose-400',
  },
  {
    upper: 'J', lower: 'j', word: 'Juice', zh: '果汁', emoji: '🧃',
    phonicsSound: '/dʒ/',
    phonicsRhyme: 'J says /dʒ/, /dʒ/, juice!',
    category: 'consonant1',
    iconSrc: '/words/juice.jpg',
    iconBadge: '🧃 Strawberry Juice Box',
    iconColor: 'from-rose-400 to-pink-500',
  },
  {
    upper: 'K', lower: 'k', word: 'Kite', zh: '风筝', emoji: '🪁',
    phonicsSound: '/k/',
    phonicsRhyme: 'K says /k/, /k/, kite!',
    category: 'consonant1',
    iconSrc: '/words/kite.jpg',
    iconBadge: '🪁 Strawberry Kite',
    iconColor: 'from-pink-400 to-indigo-400',
  },
  {
    upper: 'L', lower: 'l', word: 'Lion', zh: '狮子', emoji: '🦁',
    phonicsSound: '/l/',
    phonicsRhyme: 'L says /l/, /l/, lion!',
    category: 'consonant1',
    iconSrc: '/words/lion.jpg',
    iconBadge: '🦁 Fluffy Baby Lion',
    iconColor: 'from-amber-500 to-pink-500',
  },
  {
    upper: 'M', lower: 'm', word: 'Monkey', zh: '猴子', emoji: '🐒',
    phonicsSound: '/m/',
    phonicsRhyme: 'M says /m/, /m/, monkey!',
    category: 'consonant1',
    iconSrc: '/words/monkey.jpg',
    iconBadge: '🐒 Cute Pink Monkey',
    iconColor: 'from-pink-500 to-amber-400',
  },
  {
    upper: 'N', lower: 'n', word: 'Nest', zh: '鸟巢', emoji: '🪹',
    phonicsSound: '/n/',
    phonicsRhyme: 'N says /n/, /n/, nest!',
    category: 'consonant1',
    iconSrc: '/words/nest.jpg',
    iconBadge: '🪹 Fluffy Bird Nest',
    iconColor: 'from-rose-400 to-sky-400',
  },
  {
    upper: 'O', lower: 'o', word: 'Owl', zh: '猫头鹰', emoji: '🦉',
    phonicsSound: '/ɒ/',
    phonicsRhyme: 'O says /ɒ/, /ɒ/, owl!',
    category: 'vowel',
    iconSrc: '/words/owl.jpg',
    iconBadge: '🦉 Wise Felt Owl',
    iconColor: 'from-indigo-400 to-pink-400',
  },
  {
    upper: 'P', lower: 'p', word: 'Penguin', zh: '企鹅', emoji: '🐧',
    phonicsSound: '/p/',
    phonicsRhyme: 'P says /p/, /p/, penguin!',
    category: 'consonant1',
    iconSrc: '/words/penguin.jpg',
    iconBadge: '🐧 Fluffy Penguin',
    iconColor: 'from-sky-400 to-pink-400',
  },
  {
    upper: 'Q', lower: 'q', word: 'Queen', zh: '女王', emoji: '👑',
    phonicsSound: '/kw/',
    phonicsRhyme: 'Q says /kw/, /kw/, queen!',
    category: 'consonant2',
    iconSrc: '/words/queen.jpg',
    iconBadge: '👑 Floral Bunny Queen',
    iconColor: 'from-purple-400 to-rose-400',
  },
  {
    upper: 'R', lower: 'r', word: 'Rabbit', zh: '兔子', emoji: '🐰',
    phonicsSound: '/r/',
    phonicsRhyme: 'R says /r/, /r/, rabbit!',
    category: 'consonant1',
    iconSrc: '/words/rabbit.jpg',
    iconBadge: '🐰 Soft Fluffy Bunny',
    iconColor: 'from-pink-400 to-rose-500',
  },
  {
    upper: 'S', lower: 's', word: 'Sun', zh: '太阳', emoji: '☀️',
    phonicsSound: '/s/',
    phonicsRhyme: 'S says /s/, /s/, sun!',
    category: 'consonant1',
    iconSrc: '/words/sun.jpg',
    iconBadge: '☀️ Sun & Castle',
    iconColor: 'from-amber-400 to-rose-400',
  },
  {
    upper: 'T', lower: 't', word: 'Tiger', zh: '老虎', emoji: '🐯',
    phonicsSound: '/t/',
    phonicsRhyme: 'T says /t/, /t/, tiger!',
    category: 'consonant1',
    iconSrc: '/words/tiger.jpg',
    iconBadge: '🐯 Cute Felt Tiger',
    iconColor: 'from-orange-400 to-pink-500',
  },
  {
    upper: 'U', lower: 'u', word: 'Unicorn', zh: '独角兽', emoji: '🦄',
    phonicsSound: '/juː/',
    phonicsRhyme: 'U says /juː/, /juː/, unicorn!',
    category: 'vowel',
    iconSrc: '/words/unicorn.jpg',
    iconBadge: '🦄 Dreamy Unicorn',
    iconColor: 'from-indigo-400 to-pink-400',
  },
  {
    upper: 'V', lower: 'v', word: 'Violin', zh: '小提琴', emoji: '🎻',
    phonicsSound: '/v/',
    phonicsRhyme: 'V says /v/, /v/, violin!',
    category: 'consonant2',
    iconSrc: '/words/violin.jpg',
    iconBadge: '🎻 Music Felt Violin',
    iconColor: 'from-rose-400 to-amber-400',
  },
  {
    upper: 'W', lower: 'w', word: 'Whale', zh: '鲸鱼', emoji: '🐳',
    phonicsSound: '/w/',
    phonicsRhyme: 'W says /w/, /w/, whale!',
    category: 'consonant2',
    iconSrc: '/words/whale.jpg',
    iconBadge: '🐳 Ocean Blue Whale',
    iconColor: 'from-sky-400 to-teal-400',
  },
  {
    upper: 'X', lower: 'x', word: 'Xylophone', zh: '木琴', emoji: '🎼',
    phonicsSound: '/ks/',
    phonicsRhyme: 'X says /ks/, /ks/, xylophone!',
    category: 'consonant2',
    iconSrc: '/words/xylophone.jpg',
    iconBadge: '🎵 Rainbow Xylophone',
    iconColor: 'from-emerald-400 to-pink-400',
  },
  {
    upper: 'Y', lower: 'y', word: 'Yoyo', zh: '溜溜球', emoji: '🪀',
    phonicsSound: '/j/',
    phonicsRhyme: 'Y says /j/, /j/, yoyo!',
    category: 'consonant2',
    iconSrc: '/words/yoyo.jpg',
    iconBadge: '🪀 Spinning Yoyo',
    iconColor: 'from-purple-400 to-pink-400',
  },
  {
    upper: 'Z', lower: 'z', word: 'Zebra', zh: '斑马', emoji: '🦓',
    phonicsSound: '/z/',
    phonicsRhyme: 'Z says /z/, /z/, zebra!',
    category: 'consonant2',
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
