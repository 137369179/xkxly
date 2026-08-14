/**
 * 英语词族（Word Family）数据
 * ------------------------------------------------------------
 * 自然拼读「迁移拼读」的核心：掌握一个词族规则，就能拼读整个词族。
 * 用于 Phase 2 词族迁移练习：给 cat → 问「哪个也是 -at 家族」→ 拼读 bat/mat/rat。
 * 短元音族（CVC）按 元音 a/e/i/o/u 分组，长元音族/特殊组合在后。
 */

export interface WordFamily {
  /** 词族 id（= 押韵部分，如 'at'） */
  id: string;
  /** 展示用模式（如 '-at'） */
  pattern: string;
  /** 发音（如 '/æt/'） */
  sound: string;
  /** 规则说明（中文，给孩子讲） */
  desc: string;
  /** 封面 emoji */
  emoji: string;
  /** 拼读阶段 1=短元音 2=长元音/组合 3=进阶 */
  level: 1 | 2 | 3;
  /** 成员词（小写） */
  words: string[];
}

export const WORD_FAMILIES: WordFamily[] = [
  // ============ 短元音 a ============
  { id: 'at', pattern: '-at', sound: '/æt/', desc: 'a 发 /æ/，t 收尾，像「咬苹果」的嘴巴', emoji: '🐱', level: 1, words: ['cat', 'hat', 'rat', 'bat', 'mat', 'fat', 'sat'] },
  { id: 'an', pattern: '-an', sound: '/æn/', desc: 'a 发 /æ/，n 用鼻子收尾', emoji: '🖐️', level: 1, words: ['man', 'pan', 'can', 'fan', 'van', 'ran'] },
  { id: 'ad', pattern: '-ad', sound: '/æd/', desc: 'a 发 /æ/，d 收尾', emoji: '👨', level: 1, words: ['dad', 'bad', 'mad', 'pad', 'sad'] },
  { id: 'ag', pattern: '-ag', sound: '/æg/', desc: 'a 发 /æ/，g 收尾', emoji: '👜', level: 1, words: ['bag', 'tag', 'wag', 'rag'] },
  { id: 'ap', pattern: '-ap', sound: '/æp/', desc: 'a 发 /æ/，p 爆破收尾', emoji: '🧢', level: 1, words: ['cap', 'map', 'nap', 'tap', 'lap'] },
  { id: 'am', pattern: '-am', sound: '/æm/', desc: 'a 发 /æ/，m 抿嘴收尾', emoji: '🍓', level: 1, words: ['jam', 'ham', 'ram', 'yam'] },
  // ============ 短元音 e ============
  { id: 'en', pattern: '-en', sound: '/en/', desc: 'e 发 /e/，n 收尾', emoji: '🐔', level: 1, words: ['hen', 'pen', 'ten', 'men', 'den'] },
  { id: 'et', pattern: '-et', sound: '/et/', desc: 'e 发 /e/，t 收尾', emoji: '🐾', level: 1, words: ['pet', 'net', 'jet', 'wet', 'vet'] },
  { id: 'ed', pattern: '-ed', sound: '/ed/', desc: 'e 发 /e/，d 收尾', emoji: '🛏️', level: 1, words: ['red', 'bed', 'fed', 'led'] },
  { id: 'eg', pattern: '-eg', sound: '/eg/', desc: 'e 发 /e/，g 收尾', emoji: '🦵', level: 1, words: ['leg', 'peg', 'beg'] },
  // ============ 短元音 i ============
  { id: 'ig', pattern: '-ig', sound: '/ɪg/', desc: 'i 发 /ɪ/，g 收尾', emoji: '🐷', level: 1, words: ['pig', 'big', 'wig', 'dig', 'fig'] },
  { id: 'in', pattern: '-in', sound: '/ɪn/', desc: 'i 发 /ɪ/，n 收尾', emoji: '📌', level: 1, words: ['pin', 'tin', 'win', 'bin', 'fin'] },
  { id: 'ip', pattern: '-ip', sound: '/ɪp/', desc: 'i 发 /ɪ/，p 收尾', emoji: '💋', level: 1, words: ['lip', 'hip', 'tip', 'zip', 'dip'] },
  { id: 'it', pattern: '-it', sound: '/ɪt/', desc: 'i 发 /ɪ/，t 收尾', emoji: '💺', level: 1, words: ['sit', 'hit', 'bit', 'kit', 'fit'] },
  { id: 'ix', pattern: '-ix', sound: '/ɪks/', desc: 'i 发 /ɪ/，x 发 /ks/ 收尾', emoji: '6️⃣', level: 1, words: ['six', 'fix', 'mix'] },
  // ============ 短元音 o ============
  { id: 'og', pattern: '-og', sound: '/ɒg/', desc: 'o 发 /ɒ/，g 收尾', emoji: '🐶', level: 1, words: ['dog', 'fog', 'log', 'jog', 'frog'] },
  { id: 'ot', pattern: '-ot', sound: '/ɒt/', desc: 'o 发 /ɒ/，t 收尾', emoji: '☕', level: 1, words: ['hot', 'pot', 'dot', 'not', 'got'] },
  { id: 'op', pattern: '-op', sound: '/ɒp/', desc: 'o 发 /ɒ/，p 收尾', emoji: '🎪', level: 1, words: ['top', 'hop', 'mop', 'pop', 'cop'] },
  { id: 'ox', pattern: '-ox', sound: '/ɒks/', desc: 'o 发 /ɒ/，x 发 /ks/ 收尾', emoji: '🦊', level: 1, words: ['fox', 'box', 'ox'] },
  // ============ 短元音 u ============
  { id: 'ug', pattern: '-ug', sound: '/ʌg/', desc: 'u 发 /ʌ/，g 收尾', emoji: '🐞', level: 1, words: ['bug', 'mug', 'rug', 'hug', 'jug'] },
  { id: 'un', pattern: '-un', sound: '/ʌn/', desc: 'u 发 /ʌ/，n 收尾', emoji: '☀️', level: 1, words: ['sun', 'run', 'fun', 'bun', 'gun'] },
  { id: 'ut', pattern: '-ut', sound: '/ʌt/', desc: 'u 发 /ʌ/，t 收尾', emoji: '🥜', level: 1, words: ['nut', 'cut', 'hut', 'but', 'gut'] },
  { id: 'ub', pattern: '-ub', sound: '/ʌb/', desc: 'u 发 /ʌ/，b 收尾', emoji: '🧊', level: 1, words: ['cub', 'tub', 'rub', 'club'] },
  // ============ 长元音/魔法 e ============
  { id: 'ake', pattern: '-ake', sound: '/eɪk/', desc: 'a_e 魔法 e：a 读自己的名字 /eɪ/，k 收尾', emoji: '🎂', level: 2, words: ['cake', 'lake', 'make', 'take', 'bake', 'rake'] },
  { id: 'ame', pattern: '-ame', sound: '/eɪm/', desc: 'a_e 魔法 e：a 读 /eɪ/，m 收尾', emoji: '🎮', level: 2, words: ['game', 'name', 'same', 'came'] },
  { id: 'ate', pattern: '-ate', sound: '/eɪt/', desc: 'a_e 魔法 e：a 读 /eɪ/，t 收尾', emoji: '🍽️', level: 2, words: ['gate', 'late', 'date', 'plate'] },
  { id: 'ike', pattern: '-ike', sound: '/aɪk/', desc: 'i_e 魔法 e：i 读自己的名字 /aɪ/', emoji: '🚲', level: 2, words: ['bike', 'like', 'kite', 'hike'] },
  { id: 'ime', pattern: '-ime', sound: '/aɪm/', desc: 'i_e 魔法 e：i 读 /aɪ/，m 收尾', emoji: '🕐', level: 2, words: ['time', 'lime', 'dime'] },
  { id: 'ide', pattern: '-ide', sound: '/aɪd/', desc: 'i_e 魔法 e：i 读 /aɪ/，d 收尾', emoji: '🎢', level: 2, words: ['ride', 'hide', 'slide'] },
  // ============ 元音组合 ============
  { id: 'ee', pattern: '-ee', sound: '/iː/', desc: 'ee 双写 e，长音「衣——」，嘴角拉开', emoji: '🐝', level: 2, words: ['see', 'tree', 'bee', 'three', 'green', 'feet'] },
  { id: 'ay', pattern: '-ay', sound: '/eɪ/', desc: 'ay 发 /eɪ/，通常在词尾', emoji: '☀️', level: 2, words: ['day', 'say', 'play', 'stay', 'way', 'may'] },
  { id: 'ai', pattern: '-ai', sound: '/eɪ/', desc: 'ai 发 /eɪ/，像字母 A 的名字', emoji: '🌧️', level: 2, words: ['rain', 'train', 'tail', 'mail', 'snail'] },
  { id: 'oa', pattern: '-oa', sound: '/oʊ/', desc: 'oa 发 /oʊ/，长元音 o', emoji: '⛵', level: 2, words: ['boat', 'coat', 'goat', 'soap', 'road'] },
  { id: 'oo', pattern: '-oo', sound: '/uː/', desc: 'oo 发 /uː/，嘴巴圆收长音', emoji: '🌙', level: 2, words: ['moon', 'food', 'zoo', 'book', 'look'] },
  { id: 'ow', pattern: '-ow', sound: '/aʊ/', desc: 'ow 发 /aʊ/，嘴巴从圆到大', emoji: '🐮', level: 2, words: ['cow', 'how', 'now', 'wow'] },
  // ============ 进阶组合 ============
  { id: 'ing', pattern: '-ing', sound: '/ɪŋ/', desc: 'ing 发 /ɪŋ/，鼻音收尾', emoji: '🎵', level: 3, words: ['sing', 'ring', 'king', 'wing', 'thing'] },
  { id: 'ight', pattern: '-ight', sound: '/aɪt/', desc: 'ight 发 /aɪt/，igh 读 /aɪ/', emoji: '💡', level: 3, words: ['light', 'night', 'right', 'bright', 'fight'] },
  { id: 'ear', pattern: '-ear', sound: '/ɪr/', desc: 'ear 发 /ɪr/，卷舌', emoji: '👂', level: 3, words: ['ear', 'hear', 'near', 'year'] },
];

/** 获取全部词族 */
export function getAllWordFamilies(): WordFamily[] {
  return WORD_FAMILIES;
}

/** 按 id 查找词族 */
export function getFamilyById(id: string): WordFamily | undefined {
  return WORD_FAMILIES.find((f) => f.id === id);
}

/** 按阶段获取词族 */
export function getFamiliesByLevel(level: 1 | 2 | 3): WordFamily[] {
  return WORD_FAMILIES.filter((f) => f.level === level);
}

/** 查找某单词所属的词族（可能多个，如 pig → -ig） */
export function getFamiliesOfWord(word: string): WordFamily[] {
  const lower = word.toLowerCase().trim();
  return WORD_FAMILIES.filter((f) => f.words.includes(lower));
}
