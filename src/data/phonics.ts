export interface PhonicsRule {
  /** 字母或字母组合 */
  letter: string;
  /** 发音描述 */
  sound: string;
  /** 音标 */
  phonetic: string;
  /** 示例单词 */
  examples: string[];
  /** 规则说明 */
  rule: string;
  /** 阶段 1=基础 2=进阶 3=高级 */
  level: 1 | 2 | 3;
}

/** 26 个字母的基础发音 */
export const LETTER_SOUNDS: PhonicsRule[] = [
  { letter: 'a', sound: '/æ/', phonetic: '/æ/', examples: ['apple', 'cat', 'bag'], rule: '字母 a 在短音节中发 /æ/，嘴巴张大，像咬苹果', level: 1 },
  { letter: 'b', sound: '/b/', phonetic: '/b/', examples: ['boy', 'bed', 'big'], rule: '字母 b 发 /b/，嘴唇轻闭再打开', level: 1 },
  { letter: 'c', sound: '/k/', phonetic: '/k/', examples: ['cat', 'cup', 'cake'], rule: '字母 c 通常发 /k/，像咳嗽的声音', level: 1 },
  { letter: 'd', sound: '/d/', phonetic: '/d/', examples: ['dog', 'dad', 'red'], rule: '字母 d 发 /d/，舌尖轻碰上牙膛', level: 1 },
  { letter: 'e', sound: '/e/', phonetic: '/e/', examples: ['egg', 'bed', 'red'], rule: '字母 e 在短音节中发 /e/，嘴巴微张', level: 1 },
  { letter: 'f', sound: '/f/', phonetic: '/f/', examples: ['fish', 'fox', 'five'], rule: '字母 f 发 /f/，上牙轻咬下嘴唇', level: 1 },
  { letter: 'g', sound: '/g/', phonetic: '/g/', examples: ['dog', 'pig', 'green'], rule: '字母 g 发 /g/，喉咙后面发出的声音', level: 1 },
  { letter: 'h', sound: '/h/', phonetic: '/h/', examples: ['hen', 'hat', 'hill'], rule: '字母 h 发 /h/，像哈气的声音', level: 1 },
  { letter: 'i', sound: '/ɪ/', phonetic: '/ɪ/', examples: ['pig', 'six', 'fish'], rule: '字母 i 在短音节中发 /ɪ/，嘴巴微张露齿', level: 1 },
  { letter: 'j', sound: '/dʒ/', phonetic: '/dʒ/', examples: ['juice', 'jump', 'jelly'], rule: '字母 j 发 /dʒ/，像 /d/ 和 /zh/ 的结合', level: 1 },
  { letter: 'k', sound: '/k/', phonetic: '/k/', examples: ['duck', 'milk', 'sky'], rule: '字母 k 发 /k/，和 c 一样发音', level: 1 },
  { letter: 'l', sound: '/l/', phonetic: '/l/', examples: ['lion', 'ball', 'milk'], rule: '字母 l 发 /l/，舌尖抵上牙膛', level: 1 },
  { letter: 'm', sound: '/m/', phonetic: '/m/', examples: ['mom', 'man', 'moon'], rule: '字母 m 发 /m/，嘴唇轻闭，鼻音', level: 1 },
  { letter: 'n', sound: '/n/', phonetic: '/n/', examples: ['sun', 'nine', 'hen'], rule: '字母 n 发 /n/，舌尖抵上牙膛，鼻音', level: 1 },
  { letter: 'o', sound: '/ɒ/', phonetic: '/ɒ/', examples: ['dog', 'fox', 'box'], rule: '字母 o 在短音节中发 /ɒ/，嘴巴圆', level: 1 },
  { letter: 'p', sound: '/p/', phonetic: '/p/', examples: ['pig', 'pink', 'cup'], rule: '字母 p 发 /p/，嘴唇轻闭再爆破', level: 1 },
  { letter: 'q', sound: '/kw/', phonetic: '/kw/', examples: ['queen', 'quick', 'quiet'], rule: '字母 q 通常和 u 一起发 /kw/', level: 1 },
  { letter: 'r', sound: '/r/', phonetic: '/r/', examples: ['red', 'rabbit', 'rain'], rule: '字母 r 发 /r/，舌头卷起不碰牙膛', level: 1 },
  { letter: 's', sound: '/s/', phonetic: '/s/', examples: ['sun', 'six', 'sky'], rule: '字母 s 发 /s/，像蛇吐信子的声音', level: 1 },
  { letter: 't', sound: '/t/', phonetic: '/t/', examples: ['ten', 'cat', 'two'], rule: '字母 t 发 /t/，舌尖轻碰上牙膛', level: 1 },
  { letter: 'u', sound: '/ʌ/', phonetic: '/ʌ/', examples: ['sun', 'duck', 'cup'], rule: '字母 u 在短音节中发 /ʌ/，嘴巴微张', level: 1 },
  { letter: 'v', sound: '/v/', phonetic: '/v/', examples: ['five', 'seven', 'love'], rule: '字母 v 发 /v/，上牙咬下嘴唇振动', level: 1 },
  { letter: 'w', sound: '/w/', phonetic: '/w/', examples: ['water', 'wind', 'woman'], rule: '字母 w 发 /w/，嘴唇圆收', level: 1 },
  { letter: 'x', sound: '/ks/', phonetic: '/ks/', examples: ['six', 'fox', 'box'], rule: '字母 x 发 /ks/，k 和 s 的组合', level: 1 },
  { letter: 'y', sound: '/j/', phonetic: '/j/', examples: ['yellow', 'yes', 'you'], rule: '字母 y 在词首发 /j/，像"耶"的音', level: 1 },
  { letter: 'z', sound: '/z/', phonetic: '/z/', examples: ['zoo', 'zero', 'buzz'], rule: '字母 z 发 /z/，像蜜蜂嗡嗡叫', level: 1 },
];

/** 常见字母组合发音规则 */
export const COMBO_SOUNDS: PhonicsRule[] = [
  { letter: 'sh', sound: '/ʃ/', phonetic: '/ʃ/', examples: ['fish', 'she', 'ship'], rule: 'sh 组合发 /ʃ/，像"嘘"安静的声音', level: 2 },
  { letter: 'ch', sound: '/tʃ/', phonetic: '/tʃ/', examples: ['chair', 'chick', 'cheese'], rule: 'ch 组合发 /tʃ/，像打喷嚏的声音', level: 2 },
  { letter: 'th', sound: '/θ/', phonetic: '/θ/', examples: ['three', 'think', 'bath'], rule: 'th 组合发 /θ/，舌尖伸出牙齿间', level: 2 },
  { letter: 'ph', sound: '/f/', phonetic: '/f/', examples: ['phone', 'photo', 'dolphin'], rule: 'ph 组合发 /f/，上齿轻触下唇吹气', level: 2 },
  { letter: 'ck', sound: '/k/', phonetic: '/k/', examples: ['duck', 'back', 'sock'], rule: 'ck 组合发 /k/，通常在短词末尾出现', level: 2 },
  { letter: 'ng', sound: '/ŋ/', phonetic: '/ŋ/', examples: ['king', 'ring', 'sing'], rule: 'ng 组合发 /ŋ/，鼻音，舌根抵软腭', level: 2 },
  { letter: 'ai', sound: '/eɪ/', phonetic: '/eɪ/', examples: ['rain', 'tail', 'snail'], rule: 'ai 组合发 /eɪ/，像字母 A 的名字', level: 2 },
  { letter: 'ay', sound: '/eɪ/', phonetic: '/eɪ/', examples: ['day', 'play', 'say'], rule: 'ay 组合发 /eɪ/，通常在词尾出现', level: 2 },
  { letter: 'ee', sound: '/iː/', phonetic: '/iː/', examples: ['tree', 'see', 'green'], rule: 'ee 组合发 /iː/，长元音，嘴角拉开', level: 2 },
  { letter: 'ea', sound: '/iː/', phonetic: '/iː/', examples: ['eat', 'sea', 'tea'], rule: 'ea 组合常发 /iː/，和 ee 一样', level: 2 },
  { letter: 'oa', sound: '/oʊ/', phonetic: '/oʊ/', examples: ['boat', 'coat', 'goat'], rule: 'oa 组合发 /oʊ/，长元音 o', level: 2 },
  { letter: 'oo', sound: '/uː/', phonetic: '/uː/', examples: ['moon', 'food', 'zoo'], rule: 'oo 组合发 /uː/，嘴巴圆收长音', level: 2 },
  { letter: 'ou', sound: '/aʊ/', phonetic: '/aʊ/', examples: ['cloud', 'house', 'cow'], rule: 'ou 组合发 /aʊ/，嘴巴从圆到大', level: 2 },
  { letter: 'ow', sound: '/aʊ/', phonetic: '/aʊ/', examples: ['cow', 'how', 'flower'], rule: 'ow 组合发 /aʊ/，和 ou 一样', level: 2 },
  { letter: 'ar', sound: '/ɑːr/', phonetic: '/ɑːr/', examples: ['star', 'car', 'park'], rule: 'ar 组合发 /ɑːr/，嘴巴张大卷舌', level: 3 },
  { letter: 'er', sound: '/ər/', phonetic: '/ər/', examples: ['water', 'tiger', 'river'], rule: 'er 组合发 /ər/，轻读卷舌音', level: 3 },
  { letter: 'ir', sound: '/ɜːr/', phonetic: '/ɜːr/', examples: ['bird', 'girl', 'shirt'], rule: 'ir 组合发 /ɜːr/，嘴巴微张卷舌', level: 3 },
  { letter: 'or', sound: '/ɔːr/', phonetic: '/ɔːr/', examples: ['fork', 'horse', 'corn'], rule: 'or 组合发 /ɔːr/，嘴巴圆卷舌', level: 3 },
  { letter: 'ur', sound: '/ɜːr/', phonetic: '/ɜːr/', examples: ['nurse', 'purse', 'turn'], rule: 'ur 组合发 /ɜːr/，和 ir 一样', level: 3 },
];

/** 获取所有 Phonics 规则 */
export function getAllPhonicsRules(): PhonicsRule[] {
  return [...LETTER_SOUNDS, ...COMBO_SOUNDS];
}

/** 按阶段获取 Phonics 规则 */
export function getPhonicsByLevel(level: 1 | 2 | 3): PhonicsRule[] {
  return getAllPhonicsRules().filter((r) => r.level === level);
}

/** 根据字母或组合查找规则 */
export function getPhonicsRule(letter: string): PhonicsRule | undefined {
  const lower = letter.toLowerCase().trim();
  return getAllPhonicsRules().find((r) => r.letter === lower);
}