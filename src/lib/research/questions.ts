import { RESEARCH_TOPICS, getTopic } from './researchTopics';
import type { Question, QuizOption } from '@/types';
import type { Difficulty } from '@/lib/questions/_shared';

/**
 * 研究模式 · 静态出题闭包（E1 / C2 铁律）
 * ------------------------------------------------------------------
 * QUIZ 段**永不依赖 AI**（C2）：题目全部来自 researchTopics 的静态知识点
 * 索引（i18n 键），生成「判断式选择」轻量提取测验（CMML 步骤 4）。
 *
 * 文案铁律（C7）：FACT_BANK 只存 i18n 键，**零中文字面量**；
 * 翻译器 `t` 由调用点（ResearchModePage）注入，运行时渲染成文案。
 */

export type FactQuestion = {
  /** 知识点索引（对应 i18n 键 `research.quiz.<topic>.q<n>.stem` 与 `research.fallbackFacts.<topic>` 对齐） */
  fact: string;
  /** 判断题陈述是否为「正确」；false 时答案为否定 */
  claim: boolean;
  /** 题干的 i18n 键 */
  stemKey: string;
  /** 题目 i18n 键前缀（`${prefix}.stem` / `.hint`） */
  i18nPrefix: string;
  skill: string;
};

type Translate = (key: string) => string;

/** 静态题池 key → 事实题（每主题 4 题，难度 1/1/2/3） */
const FACT_BANK: Record<string, FactQuestion[]> = {
  color: [
    { fact: 'red', claim: true, stemKey: 'research.quiz.color.q0.stem', i18nPrefix: 'research.quiz.color.q0', skill: 'research:color' },
    { fact: 'blue', claim: true, stemKey: 'research.quiz.color.q1.stem', i18nPrefix: 'research.quiz.color.q1', skill: 'research:color' },
    { fact: 'green', claim: true, stemKey: 'research.quiz.color.q2.stem', i18nPrefix: 'research.quiz.color.q2', skill: 'research:color' },
    { fact: 'yellow', claim: true, stemKey: 'research.quiz.color.q3.stem', i18nPrefix: 'research.quiz.color.q3', skill: 'research:color' },
  ],
  dino: [
    { fact: 'dino1', claim: true, stemKey: 'research.quiz.dino.q0.stem', i18nPrefix: 'research.quiz.dino.q0', skill: 'research:dino' },
    { fact: 'dino2', claim: true, stemKey: 'research.quiz.dino.q1.stem', i18nPrefix: 'research.quiz.dino.q1', skill: 'research:dino' },
    { fact: 'dino3', claim: true, stemKey: 'research.quiz.dino.q2.stem', i18nPrefix: 'research.quiz.dino.q2', skill: 'research:dino' },
    { fact: 'dino4', claim: true, stemKey: 'research.quiz.dino.q3.stem', i18nPrefix: 'research.quiz.dino.q3', skill: 'research:dino' },
  ],
  space: [
    { fact: 'space1', claim: true, stemKey: 'research.quiz.space.q0.stem', i18nPrefix: 'research.quiz.space.q0', skill: 'research:space' },
    { fact: 'space2', claim: true, stemKey: 'research.quiz.space.q1.stem', i18nPrefix: 'research.quiz.space.q1', skill: 'research:space' },
    { fact: 'space3', claim: true, stemKey: 'research.quiz.space.q2.stem', i18nPrefix: 'research.quiz.space.q2', skill: 'research:space' },
    { fact: 'space4', claim: true, stemKey: 'research.quiz.space.q3.stem', i18nPrefix: 'research.quiz.space.q3', skill: 'research:space' },
  ],
  body: [
    { fact: 'body1', claim: true, stemKey: 'research.quiz.body.q0.stem', i18nPrefix: 'research.quiz.body.q0', skill: 'research:body' },
    { fact: 'body2', claim: true, stemKey: 'research.quiz.body.q1.stem', i18nPrefix: 'research.quiz.body.q1', skill: 'research:body' },
    { fact: 'body3', claim: true, stemKey: 'research.quiz.body.q2.stem', i18nPrefix: 'research.quiz.body.q2', skill: 'research:body' },
    { fact: 'body4', claim: true, stemKey: 'research.quiz.body.q3.stem', i18nPrefix: 'research.quiz.body.q3', skill: 'research:body' },
  ],
  vehicle: [
    { fact: 'vehicle1', claim: true, stemKey: 'research.quiz.vehicle.q0.stem', i18nPrefix: 'research.quiz.vehicle.q0', skill: 'research:vehicle' },
    { fact: 'vehicle2', claim: true, stemKey: 'research.quiz.vehicle.q1.stem', i18nPrefix: 'research.quiz.vehicle.q1', skill: 'research:vehicle' },
    { fact: 'vehicle3', claim: true, stemKey: 'research.quiz.vehicle.q2.stem', i18nPrefix: 'research.quiz.vehicle.q2', skill: 'research:vehicle' },
    { fact: 'vehicle4', claim: true, stemKey: 'research.quiz.vehicle.q3.stem', i18nPrefix: 'research.quiz.vehicle.q3', skill: 'research:vehicle' },
  ],
  job: [
    { fact: 'job1', claim: true, stemKey: 'research.quiz.job.q0.stem', i18nPrefix: 'research.quiz.job.q0', skill: 'research:job' },
    { fact: 'job2', claim: true, stemKey: 'research.quiz.job.q1.stem', i18nPrefix: 'research.quiz.job.q1', skill: 'research:job' },
    { fact: 'job3', claim: true, stemKey: 'research.quiz.job.q2.stem', i18nPrefix: 'research.quiz.job.q2', skill: 'research:job' },
    { fact: 'job4', claim: true, stemKey: 'research.quiz.job.q3.stem', i18nPrefix: 'research.quiz.job.q3', skill: 'research:job' },
  ],
};

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 取某主题题池（无则回退 color 题池，保证任何 topicId 都能出题） */
export function factBankFor(topicId: string): FactQuestion[] {
  return FACT_BANK[topicId] ?? FACT_BANK.color ?? [];
}

let counter = 0;

/**
 * 从事实生成一道判断式选择题：
 * 题干 = 陈述（经 t 翻译），选项 = 对（✅）/ 错（❌）。
 * 保持 QuizCard 既有作答流不变，同时满足 C2（纯静态）与 C7（i18n）。
 */
export function makeResearchFactQuestion(
  topicId: string,
  t: Translate,
  difficulty: Difficulty = 1,
  fact?: FactQuestion,
): Question {
  const bank = factBankFor(topicId);
  const f = fact ?? bank[(counter++ * 7 + difficulty) % bank.length]!;
  const id = `rsq_${topicId}_${counter}_${difficulty}`;
  const opts: QuizOption[] = [
    { id: 'a', label: t('research.quiz.opt.true'), emoji: '✅', correct: true },
    { id: 'b', label: t('research.quiz.opt.false'), emoji: '❌', correct: false },
  ];
  return {
    id,
    type: 'logic',
    kind: 'research',
    skill: f.skill,
    difficulty,
    prompt: t(f.stemKey),
    options: shuffle(opts),
    hint: t('research.quiz.hint'),
    why: t('research.quiz.why'),
    speak: t(f.stemKey),
  };
}

/** 出题闭包工厂：注入翻译器后返回 (difficulty) => Question（C2：纯静态，零 AI） */
export function makeResearchQuestion(topicId: string, t: Translate): (d: Difficulty) => Question {
  return (d: Difficulty) => makeResearchFactQuestion(topicId, t, d);
}

/** 供测试/工具：直接访问题池（topicId 有效性由 researchTopics 守门） */
export function hasFactBank(topicId: string): boolean {
  return getTopic(topicId) !== null;
}

export { RESEARCH_TOPICS };
