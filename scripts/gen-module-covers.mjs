/**
 * gen-module-covers.mjs
 * 模块封面插图系统 —— 单一真相源 → 脚本派生（同 PWA 图标的工程原则）
 *
 * 设计约定（与全站儿童视觉语言一致）：
 *  - 背景 = tone.main（模块色彩身份）
 *  - 中心白色「舞台圆」承载母题，母题用 tone.deep 描画
 *  - 左上角白光泽（Glint），保留「有脸光泽」家族感
 *  - 封面不嵌文字：语义辨识度由「色彩 + 母题」承担（导航卡已有模块名 UI）
 *
 * 产出 (public/icons/)：
 *   cover-<id>.png   512×512  PNG，15 个模块各一张，互不相同
 *
 * 依赖：sharp（项目已装，CI 可移植）。幂等：重跑覆盖。
 *
 * 运行：node scripts/gen-module-covers.mjs
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

/** tone → { main, deep }（与 src/lib/tones.ts 同步） */
const TONE = {
  pink: { main: '#FF6FA5', deep: '#D9457B' },
  blue: { main: '#4FC3F7', deep: '#2196C9' },
  yellow: { main: '#FFC93C', deep: '#D99C0E' },
  green: { main: '#5FD68B', deep: '#33A863' },
  purple: { main: '#A78BFA', deep: '#7B57E8' },
  orange: { main: '#FF9F5A', deep: '#E0742B' },
};

/* ---------------------------------------------------------------------------
 * 15 个模块的语义母题（中心约在 256,226，半径 ≤120 的白色舞台圆内）
 * 每个母题仅用基础图元，保证在缩略尺寸下可辨识、且与儿童语言同调
 * ------------------------------------------------------------------------- */
const COVERS = [
  {
    id: 'words', tone: 'pink',
    motif: `
      <path d="M138 212 Q196 178 256 212 Q316 178 374 212 L374 292 Q316 258 256 292 Q196 258 138 292 Z" fill="{deep}"/>
      <path d="M256 212 L256 292" stroke="{main}" stroke-width="7" fill="none"/>
      <path d="M300 150 l9 22 23 9 -23 9 -9 22 -9 -22 -23 -9 23 -9 Z" fill="{main}"/>`,
  },
  {
    id: 'fun', tone: 'purple',
    motif: `
      <ellipse cx="214" cy="214" rx="60" ry="70" fill="{main}"/>
      <path d="M214 284 L204 330" stroke="{deep}" stroke-width="6" fill="none"/>
      <path d="M214 150 l0 -16 M214 150 l-9 -12 M214 150 l9 -12 M198 158 l-14 -6 M230 158 l14 -6" stroke="{deep}" stroke-width="5" stroke-linecap="round"/>
      <path d="M292 196 l11 28 28 11 -28 11 -11 28 -11 -28 -28 -11 28 -11 Z" fill="{deep}"/>`,
  },
  {
    id: 'idioms', tone: 'purple',
    motif: `
      <rect x="168" y="182" width="176" height="92" rx="12" fill="{main}"/>
      <rect x="150" y="172" width="30" height="112" rx="15" fill="{deep}"/>
      <rect x="332" y="172" width="30" height="112" rx="15" fill="{deep}"/>
      <path d="M196 214 H316 M196 238 H316" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>`,
  },
  {
    id: 'songs', tone: 'yellow',
    motif: `
      <path d="M206 256 L206 176 Q274 164 296 194 L296 214" stroke="{deep}" stroke-width="13" fill="none" stroke-linecap="round"/>
      <path d="M300 214 L300 168 Q356 160 372 184 L372 200" stroke="{main}" stroke-width="11" fill="none" stroke-linecap="round"/>
      <circle cx="192" cy="256" r="22" fill="{deep}"/>
      <circle cx="286" cy="214" r="20" fill="{main}"/>`,
  },
  {
    id: 'science', tone: 'green',
    motif: `
      <path d="M256 286 L256 200" stroke="{deep}" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M256 224 Q304 192 326 224 Q294 256 256 236 Z" fill="{main}"/>
      <path d="M256 244 Q208 216 190 248 Q220 274 256 252 Z" fill="{main}"/>
      <path d="M256 200 l8 20 20 8 -20 8 -8 20 -8 -20 -20 -8 20 -8 Z" fill="{deep}"/>`,
  },
  {
    id: 'music', tone: 'yellow',
    motif: `
      <rect x="156" y="230" width="200" height="72" rx="14" fill="{deep}"/>
      <rect x="186" y="230" width="11" height="52" fill="#FFFFFF"/>
      <rect x="216" y="230" width="11" height="52" fill="#FFFFFF"/>
      <rect x="246" y="230" width="11" height="52" fill="#FFFFFF"/>
      <rect x="276" y="230" width="11" height="52" fill="#FFFFFF"/>
      <rect x="306" y="230" width="11" height="52" fill="#FFFFFF"/>
      <circle cx="338" cy="186" r="18" fill="{main}"/>
      <path d="M338 168 L338 186" stroke="{deep}" stroke-width="6" stroke-linecap="round"/>`,
  },
  {
    id: 'art', tone: 'pink',
    motif: `
      <rect x="196" y="168" width="20" height="78" rx="10" fill="{deep}"/>
      <path d="M186 244 Q208 292 230 244 Z" fill="{main}"/>
      <circle cx="306" cy="206" r="30" fill="{deep}"/>
      <circle cx="306" cy="206" r="13" fill="{main}"/>
      <circle cx="282" cy="252" r="9" fill="{main}"/>
      <circle cx="332" cy="252" r="9" fill="{main}"/>`,
  },
  {
    id: 'safety', tone: 'blue',
    motif: `
      <path d="M256 166 L338 196 L338 252 Q338 308 256 336 Q174 308 174 252 L174 196 Z" fill="{main}"/>
      <path d="M242 216 L270 216 L270 244 L298 244 L298 272 L270 272 L270 300 L242 300 L242 272 L214 272 L214 244 L242 244 Z" fill="#FFFFFF"/>`,
  },
  {
    id: 'geography', tone: 'green',
    motif: `
      <circle cx="256" cy="226" r="76" fill="{main}"/>
      <ellipse cx="256" cy="226" rx="30" ry="76" fill="none" stroke="#FFFFFF" stroke-width="6"/>
      <path d="M180 226 H332" stroke="#FFFFFF" stroke-width="6"/>
      <path d="M206 184 Q256 206 256 226 Q228 252 198 252" fill="#FFFFFF" opacity="0.55"/>`,
  },
  {
    id: 'vehicles', tone: 'orange',
    motif: `
      <path d="M172 252 L188 212 Q198 198 216 198 L300 198 Q318 198 330 212 L344 252 Z" fill="{main}"/>
      <rect x="172" y="250" width="180" height="38" rx="16" fill="{deep}"/>
      <circle cx="216" cy="288" r="21" fill="#FFFFFF"/><circle cx="216" cy="288" r="9" fill="{deep}"/>
      <circle cx="308" cy="288" r="21" fill="#FFFFFF"/><circle cx="308" cy="288" r="9" fill="{deep}"/>`,
  },
  {
    id: 'festivals', tone: 'yellow',
    motif: `
      <rect x="246" y="168" width="20" height="14" rx="4" fill="{deep}"/>
      <ellipse cx="256" cy="238" rx="58" ry="66" fill="{main}"/>
      <rect x="206" y="234" width="14" height="9" rx="3" fill="{deep}"/>
      <rect x="292" y="234" width="14" height="9" rx="3" fill="{deep}"/>
      <path d="M256 304 L256 332" stroke="{deep}" stroke-width="7" stroke-linecap="round"/>
      <path d="M238 318 H274" stroke="{deep}" stroke-width="7" stroke-linecap="round"/>`,
  },
  {
    id: 'plants', tone: 'green',
    motif: `
      <path d="M236 250 L236 292 L276 292 L276 250 Z" fill="{deep}"/>
      <path d="M256 250 L256 198" stroke="{deep}" stroke-width="9" stroke-linecap="round"/>
      <path d="M256 222 Q210 198 198 228 Q224 248 256 228 Z" fill="{main}"/>
      <path d="M256 234 Q302 210 314 240 Q288 260 256 240 Z" fill="{main}"/>`,
  },
  {
    id: 'storybook', tone: 'pink',
    motif: `
      <path d="M150 232 Q200 202 252 230 L252 296 Q200 268 150 296 Z" fill="{deep}"/>
      <path d="M362 232 Q312 202 260 230 L260 296 Q312 268 362 296 Z" fill="{main}"/>
      <path d="M256 150 l10 26 28 10 -28 10 -10 26 -10 -26 -28 -10 28 -10 Z" fill="{deep}"/>`,
  },
  {
    id: 'research', tone: 'blue',
    motif: `
      <circle cx="238" cy="216" r="42" fill="#FFFFFF" stroke="{deep}" stroke-width="13"/>
      <circle cx="238" cy="216" r="20" fill="{main}" opacity="0.5"/>
      <path d="M270 248 L310 288" stroke="{deep}" stroke-width="15" stroke-linecap="round"/>
      <path d="M300 168 l8 20 20 8 -20 8 -8 20 -8 -20 -20 -8 20 -8 Z" fill="{deep}"/>`,
  },
  {
    id: 'discoveries', tone: 'blue',
    motif: `
      <path d="M256 178 a44 44 0 0 1 28 78 l0 14 -56 0 0 -14 a44 44 0 0 1 28 -78 Z" fill="{main}"/>
      <rect x="238" y="272" width="36" height="11" rx="5" fill="{deep}"/>
      <rect x="242" y="290" width="28" height="9" rx="4" fill="{deep}"/>
      <path d="M256 148 l6 16 16 6 -16 6 -6 16 -6 -16 -16 -6 16 -6 Z" fill="{deep}"/>`,
  },
];

function svgFor({ tone, motif }) {
  const { main, deep } = TONE[tone];
  const m = motif.replaceAll('{main}', main).replaceAll('{deep}', deep);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="96" fill="${main}"/>
  <ellipse cx="124" cy="108" rx="74" ry="36" fill="#FFFFFF" opacity="0.16" transform="rotate(-24 124 108)"/>
  <circle cx="256" cy="226" r="152" fill="#FFFFFF"/>
  ${m}
</svg>`;
}

let ok = 0;
for (const c of COVERS) {
  const buf = Buffer.from(svgFor(c));
  const file = `cover-${c.id}.png`;
  await sharp(buf).resize(512, 512).png().toFile(resolve(outDir, file));
  ok++;
  console.log(`✓ ${file} (${c.tone})`);
}
console.log(`\n生成完成：${ok} 张模块封面 → public/icons/`);

// 自检：全部为合法 PNG
try {
  const { stdout } = { stdout: '' };
  for (const c of COVERS) {
    const f = resolve(outDir, `cover-${c.id}.png`);
    const meta = await sharp(f).metadata();
    if (meta.format !== 'png' || meta.width !== 512) throw new Error(`bad ${f}`);
  }
  console.log('✓ 格式校验通过：全部 512×512 PNG');
} catch (e) {
  console.error('校验失败：', e.message);
  process.exit(1);
}
