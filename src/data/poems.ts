/**
 * 古诗语料默认导出（轻量索引版）。
 * 原先直接复用 poems-deep（403KB / gzip 100KB），会导致诗库列表、闯关出题、
 * 今日课程、家长周报等全部页面在加载时就被迫拉取整份深层数据。
 * 现改为只导出轻量索引（PoemIndex，约 83KB / gzip ~20KB），深层数据
 * （逐字拼音、译文、注释、用典、修辞）由 PoemDetail / poemStudy 按需动态加载。
 * 这样既缩小首屏与各页面体积，又不影响详情研读体验。
 */
import POEMS from './poemsIndex';
export type { PoemIndex } from './poemsIndex';
export default POEMS;
