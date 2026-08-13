/**
 * 古诗自测题库生成器
 * ------------------------------------------------------------
 * 依据一首诗与其元数据（作者 / 主题 / 逐句文本 / 难点标记），自动生成
 * 多种题型的自测题：作者、接句、填空、主题归类。题目复用通用 Question
 * 结构，并挂接 skill=`poem:${id}`，作答即回写 SRS 掌握度（间隔重复）。
 *
 * 干扰项从同库其它诗作中随机抽取，保证区分度且可复现（传入 seed 可固定）。
 */
import type { DeepPoem, Question, QuizOption } from '@/types';
import DEEP_POEMS from '@/data/poems-deep';

export type QuizKind = 'author' | 'next' | 'fill' | 'theme';

export interface QuizOptions {
  /** 题库规模（每种题型尽量出 1 题，总题数受此上限约束） */
  count?: number;
  /** 限定题型（默认四种都出） */
  kinds?: QuizKind[];
  /** 干扰项抽取池（默认全库） */
  pool?: DeepPoem[];
  /** 随机种子（同种子同结果，便于复盘） */
  seed?: number;
}

/** 轻量可复现随机数（mulberry32） */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function lineText(poem: DeepPoem, i: number): string {
  return poem.lines[i]!.chars.map((c) => c.c).join('');
}

/** 生成一首诗的自测题 */
export function generatePoemQuiz(poem: DeepPoem, opts: QuizOptions = {}): Question[] {
  const count = opts.count ?? 4;
  const kinds = opts.kinds ?? (['author', 'next', 'fill', 'theme'] as QuizKind[]);
  const pool = opts.pool ?? DEEP_POEMS;
  const rand = rng(opts.seed ?? hashId(poem.id));

  const others = pool.filter((p) => p.id !== poem.id);
  const pickOthers = (n: number) => shuffle(others, rand).slice(0, n);

  const questions: Question[] = [];
  let idx = 0;
  const push = (q: Omit<Question, 'id' | 'kind' | 'skill'> & Partial<Pick<Question, 'skill'>>) => {
    if (questions.length >= count) return;
    questions.push({
      id: `q-${poem.id}-${idx++}`,
      kind: 'poem',
      skill: `poem:${poem.id}`,
      ...q,
    } as Question);
  };

  // 作者题
  if (kinds.includes('author')) {
    const wrong = pickOthers(3).map((p) => p.author);
    const opts2: QuizOption[] = shuffle(
      [poem.author, ...wrong],
      rand,
    ).map((a, i) => ({ id: `o${i}`, label: a }));
    push({
      prompt: `《${poem.title}》的作者是谁？`,
      display: poem.title,
      options: opts2,
      answerId: opts2.find((o) => o.label === poem.author)!.id,
      hint: `本诗作者为${poem.author}（${poem.dynasty}）。`,
      speak: poem.title,
      speakLang: 'zh-CN',
    });
  }

  // 接句题
  if (kinds.includes('next') && poem.lines.length >= 2) {
    const li = Math.floor(rand() * (poem.lines.length - 1));
    const prev = lineText(poem, li);
    const nextLine = lineText(poem, li + 1);
    const wrong = pickOthers(3).map((p) => lineText(p, Math.floor(rand() * p.lines.length)));
    const opts2: QuizOption[] = shuffle([nextLine, ...wrong], rand).map((t, i) => ({
      id: `o${i}`,
      label: t,
    }));
    push({
      prompt: `「${prev}」的下一句是？`,
      speak: prev,
      speakLang: 'zh-CN',
      options: opts2,
      answerId: opts2.find((o) => o.label === nextLine)!.id,
      hint: `原诗为：「${prev}，${nextLine}」。`,
    });
  }

  // 填空题（隐去句中一字）
  if (kinds.includes('fill')) {
    const li = Math.floor(rand() * poem.lines.length);
    const chars = poem.lines[li]!.chars;
    const hanIdx = chars.map((c, i) => (/[一-龥]/.test(c.c) ? i : -1)).filter((i) => i >= 0);
    if (hanIdx.length >= 2) {
      const hideAt = hanIdx[1 + Math.floor(rand() * (hanIdx.length - 1))]!
      const correct = chars[hideAt]!.c;
      const masked = chars.map((c, i) => (i === hideAt ? '（　）' : c.c)).join('');
      const poolChars = new Set<string>();
      others.forEach((p) =>
        p.lines.forEach((l) =>
          l.chars.forEach((c) => {
            if (/[一-龥]/.test(c.c) && c.c !== correct) poolChars.add(c.c);
          }),
        ),
      );
      const distract = shuffle([...poolChars], rand).slice(0, 3);
      const opts2: QuizOption[] = shuffle([correct, ...distract], rand).map((t, i) => ({
        id: `o${i}`,
        label: t,
      }));
      push({
        prompt: `「${masked}」中缺的字是？`,
        speak: lineText(poem, li),
        speakLang: 'zh-CN',
        options: opts2,
        answerId: opts2.find((o) => o.label === correct)!.id,
        hint: `原句为：「${lineText(poem, li)}」。`,
      });
    }
  }

  // 主题归类题
  if (kinds.includes('theme') && (poem.themes ?? []).length) {
    const themes = poem.themes ?? [];
    const theme = themes[Math.floor(rand() * themes.length)]!;
    const allThemes = new Set<string>(themes);
    others.forEach((p) => (p.themes ?? []).forEach((t) => allThemes.add(t)));
    const wrong = shuffle([...allThemes].filter((t) => t !== theme), rand).slice(0, 3);
    const opts2: QuizOption[] = shuffle([theme, ...wrong], rand).map((t, i) => ({
      id: `o${i}`,
      label: t,
    }));
    push({
      prompt: `《${poem.title}》更可能属于哪类主题？`,
      display: poem.title,
      options: opts2,
      answerId: opts2.find((o) => o.label === theme)!.id,
      hint: `本诗标注主题：${themes.join('、')}。`,
    });
  }

  return questions;
}

function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
