import React from 'react';
import { Face, Glint } from './babyIconParts';

/**
 * 荣誉勋章图形库（统一注册表，96 栅格）
 * 通过 <BabyMedal id="scholar|pinyin|math|nurture" unlocked /> 渲染，支持未解锁灰度。
 */

export const MEDAL_GLYPHS: Record<string, React.ReactNode> = {
  // 1. 全科学霸猫咪金牌勋章
  scholar: (
    <>
      <path d="M34 10 L26 44 L40 44 Z" fill="#ff6b96" />
      <path d="M62 10 L70 44 L56 44 Z" fill="#ff6b96" />
      <path d="M40 10 H56 L48 40 Z" fill="#FF9CC4" />
      <circle cx="48" cy="56" r="32" fill="#FFC93C" />
      <circle cx="48" cy="56" r="26" fill="#FFF3D2" stroke="#FFE0A3" strokeWidth={2} />
      <path d="M36 50 L40 40 L44 48 H52 L56 40 L60 50 C62 54 62 64 48 66 C34 64 34 54 36 50 Z" fill="#ff6b96" />
      <Face cx={48} cy={56} gap={5} dot={2.4} cheek={false} />
      <Glint cx={38} cy={48} rx={4} ry={2} />
    </>
  ),
  // 2. 拼音小探险家勋章
  pinyin: (
    <>
      <path d="M34 10 L26 44 L40 44 Z" fill="#5FD68B" />
      <path d="M62 10 L70 44 L56 44 Z" fill="#5FD68B" />
      <circle cx="48" cy="56" r="32" fill="#5FD68B" />
      <circle cx="48" cy="56" r="26" fill="#DDF7E7" stroke="#BBEFCF" strokeWidth={2} />
      <path d="M32 60 L38 44 L44 52 H52 L58 44 L64 60 C66 66 30 66 32 60 Z" fill="#5FD68B" />
      <path d="M34 54 Q38 51 42 54" stroke="#FFFFFF" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M54 54 Q58 51 62 54" stroke="#FFFFFF" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M44 58 Q48 62 52 58" stroke="#FFFFFF" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Glint cx={38} cy={48} rx={4} ry={2} />
    </>
  ),
  // 3. 数学小魔法师勋章
  math: (
    <>
      <path d="M34 10 L26 44 L40 44 Z" fill="#FF9F5A" />
      <path d="M62 10 L70 44 L56 44 Z" fill="#FF9F5A" />
      <circle cx="48" cy="56" r="32" fill="#FFC93C" />
      <circle cx="48" cy="56" r="26" fill="#FFF3D2" stroke="#FFE0A3" strokeWidth={2} />
      <path d="M32 62 L40 42 L48 52 H48 L56 42 L64 62 Z" fill="#8b6ef0" strokeLinejoin="round" />
      <rect x="30" y="60" width="36" height="6" rx="3" fill="#8b6ef0" />
      <circle cx="48" cy="38" r="3" fill="#FFFFFF" />
      <circle cx="44" cy="34" r="2" fill="#FFFFFF" />
      <circle cx="52" cy="34" r="2" fill="#FFFFFF" />
      <Glint cx={38} cy={48} rx={4} ry={2} />
    </>
  ),
  // 4. 贴心铲屎官爱心勋章
  nurture: (
    <>
      <path d="M34 10 L26 44 L40 44 Z" fill="#ff6b96" />
      <path d="M62 10 L70 44 L56 44 Z" fill="#ff6b96" />
      <circle cx="48" cy="56" r="32" fill="#ff6b96" />
      <circle cx="48" cy="56" r="26" fill="#FFE4EF" stroke="#FFC7DE" strokeWidth={2} />
      <path d="M34 46 L40 36 L44 42 H52 L56 36 L62 46 Z" fill="#FF9CC4" />
      <path d="M48 70 C48 70 34 58 34 50 C34 44 40 40 44 43 C48 46 48 46 48 46 C48 46 48 46 52 43 C56 40 62 44 62 50 C62 58 48 70 48 70 Z" fill="#ff6b96" />
      <Face cx={48} cy={54} gap={5} dot={2.4} cheek={false} />
      <Glint cx={38} cy={48} rx={4} ry={2} />
    </>
  ),
};
