const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 0-100 转中文数字（口语习惯：11 → 十一，20 → 二十，100 → 一百） */
export function toChineseNumber(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return String(n);
  if (n === 100) return '一百';
  if (n < 10) return DIGITS[n]!;
  if (n === 10) return '十';
  if (n < 20) return `十${DIGITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? `${DIGITS[tens]}十` : `${DIGITS[tens]}十${DIGITS[ones]}`;
}

/** 0-100 的拼音（用于数字卡片下方标注） */
const PY_DIGITS = ['líng', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ'];

export function toNumberPinyin(n: number): string {
  if (n < 0 || n > 100 || !Number.isInteger(n)) return '';
  if (n === 100) return 'yī bǎi';
  if (n < 10) return PY_DIGITS[n]!;
  if (n === 10) return 'shí';
  if (n < 20) return `shí ${PY_DIGITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? `${PY_DIGITS[tens]} shí` : `${PY_DIGITS[tens]} shí ${PY_DIGITS[ones]}`;
}
