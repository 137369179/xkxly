import index from './poems-index.json';

/**
 * 古诗轻量索引（由 poems-deep.json 生成，scripts 同口径）。
 * 只保留列表 / 检索 / 出题所需字段：id / title / author / dynasty / genre /
 * lines(纯文本) / tags / level / themes / imagery / difficulty。
 * 不含逐字拼音(titleChars)、authorBio、dossier（译文/注释/用典/修辞）等重型字段——
 * 那些只在「详情研读」视图需要，由 PoemDetail / poemStudy 直接动态加载 poems-deep。
 *
 * 体积对比：deep 约 403KB（gzip 100KB），index 约 83KB（gzip ~20KB）。
 * 这样诗库列表、闯关出题、今日课程、家长周报等都不必加载 100KB 的深层数据，
 * 519KB 的 poems-deep 仅在真正打开一首诗的详情时才按需拉取。
 *
 * P2-17 收敛说明：本文件的 PoemIndex（POEMS）即「主索引」，被 poems.ts 默认再导出，
 * 是诗库列表 / 闯关出题 / 今日课程 / 家长周报 的统一入口（比 poemIndex.ts 的 PoemBrief 字段更全）。
 */
export interface PoemIndex {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  genre: string;
  lines: string[];
  tags: string[];
  level: number;
  themes: string[];
  imagery: string[];
  difficulty: number;
}

const POEMS: PoemIndex[] = index as unknown as PoemIndex[];
export default POEMS;
