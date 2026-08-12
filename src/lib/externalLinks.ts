/**
 * 外部链接集中管理
 * 避免散落在多个文件中硬编码，域名变更时只需改这里
 */

export const EXTERNAL_LINKS = {
  wikisource: (q: string) =>
    `https://zh.wikisource.org/w/index.php?search=${encodeURIComponent(q)}&ns0=1`,
  ctext: (q: string) =>
    `https://ctext.org/searchbooks.pl?if=gb&searchu=${encodeURIComponent(q)}`,
  wikipedia: (q: string) =>
    `https://zh.wikipedia.org/wiki/${encodeURIComponent(q)}`,
  souyun: (q: string) =>
    `https://sou-yun.cn/QueryPoem.aspx?key=${encodeURIComponent(q)}`,
} as const;
