/**
 * 26 个英文字母纯正高保真离线音频生成脚本
 * ------------------------------------------------------------
 * 运行方式：node scripts/generate-letter-voices.mjs
 * 目标目录：public/audio/letters/
 * 生成内容：
 *   1. letter_{a-z}.m4a (标准字母名发音：A, B, C...)
 *   2. phonics_{a-z}.m4a (标准拼读发音短语：A says /æ/, apple! ...)
 *   3. word_{a-z}.m4a (核心例词发音：Apple, Banana, Cat...)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../public/audio/letters');
fs.mkdirSync(targetDir, { recursive: true });

const LETTERS = [
  { char: 'a', name: 'A', phonics: 'A says /æ/, /æ/, apple!', word: 'Apple' },
  { char: 'b', name: 'B', phonics: 'B says /b/, /b/, banana!', word: 'Banana' },
  { char: 'c', name: 'C', phonics: 'C says /k/, /k/, cat!', word: 'Cat' },
  { char: 'd', name: 'D', phonics: 'D says /d/, /d/, dog!', word: 'Dog' },
  { char: 'e', name: 'E', phonics: 'E says /e/, /e/, elephant!', word: 'Elephant' },
  { char: 'f', name: 'F', phonics: 'F says /f/, /f/, fish!', word: 'Fish' },
  { char: 'g', name: 'G', phonics: 'G says /g/, /g/, giraffe!', word: 'Giraffe' },
  { char: 'h', name: 'H', phonics: 'H says /h/, /h/, hat!', word: 'Hat' },
  { char: 'i', name: 'I', phonics: 'I says /ɪ/, /ɪ/, ice cream!', word: 'Ice cream' },
  { char: 'j', name: 'J', phonics: 'J says /dʒ/, /dʒ/, juice!', word: 'Juice' },
  { char: 'k', name: 'K', phonics: 'K says /k/, /k/, kite!', word: 'Kite' },
  { char: 'l', name: 'L', phonics: 'L says /l/, /l/, lion!', word: 'Lion' },
  { char: 'm', name: 'M', phonics: 'M says /m/, /m/, monkey!', word: 'Monkey' },
  { char: 'n', name: 'N', phonics: 'N says /n/, /n/, nest!', word: 'Nest' },
  { char: 'o', name: 'O', phonics: 'O says /ɒ/, /ɒ/, orange!', word: 'Orange' },
  { char: 'p', name: 'P', phonics: 'P says /p/, /p/, panda!', word: 'Panda' },
  { char: 'q', name: 'Q', phonics: 'Q says /kw/, /kw/, queen!', word: 'Queen' },
  { char: 'r', name: 'R', phonics: 'R says /r/, /r/, rabbit!', word: 'Rabbit' },
  { char: 's', name: 'S', phonics: 'S says /s/, /s/, sun!', word: 'Sun' },
  { char: 't', name: 'T', phonics: 'T says /t/, /t/, tiger!', word: 'Tiger' },
  { char: 'u', name: 'U', phonics: 'U says /ʌ/, /ʌ/, umbrella!', word: 'Umbrella' },
  { char: 'v', name: 'V', phonics: 'V says /v/, /v/, violin!', word: 'Violin' },
  { char: 'w', name: 'W', phonics: 'W says /w/, /w/, watermelon!', word: 'Watermelon' },
  { char: 'x', name: 'X', phonics: 'X says /ks/, /ks/, xylophone!', word: 'Xylophone' },
  { char: 'y', name: 'Y', phonics: 'Y says /j/, /j/, yacht!', word: 'Yacht' },
  { char: 'z', name: 'Z', phonics: 'Z says /z/, /z/, zebra!', word: 'Zebra' },
];

console.log('🚀 开始生成 26 个纯正英文字母高保真离线音频...');

for (const item of LETTERS) {
  const { char, name, phonics, word } = item;

  // 1. 生成 Letter Name 音频 (letter_{a-z}.m4a)
  const letterOut = path.join(targetDir, `letter_${char}.m4a`);
  try {
    execSync(`say -v Samantha -r 130 --data-format=aac -o "${letterOut}" "Letter ${name}, ${name}"`);
  } catch (e) {
    console.warn(`[WARN] letter_${char}:`, e.message);
  }

  // 2. 生成 Word 音频 (word_{a-z}.m4a)
  const wordOut = path.join(targetDir, `word_${char}.m4a`);
  try {
    execSync(`say -v Samantha -r 135 --data-format=aac -o "${wordOut}" "${word}"`);
  } catch (e) {
    console.warn(`[WARN] word_${char}:`, e.message);
  }

  // 3. 生成 Phonics 音频 (phonics_{a-z}.m4a)
  const phonicsOut = path.join(targetDir, `phonics_${char}.m4a`);
  try {
    execSync(`say -v Samantha -r 135 --data-format=aac -o "${phonicsOut}" "${phonics}"`);
  } catch (e) {
    console.warn(`[WARN] phonics_${char}:`, e.message);
  }

  process.stdout.write(`✅ 已就绪: ${name.toUpperCase()} (letter / word / phonics)\n`);
}

console.log('🎉 26 字母全套 78 个高保真音频生成完毕，存放在 public/audio/letters/');
