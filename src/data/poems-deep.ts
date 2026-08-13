import deep from './poems-deep.json';
import { DOSSIERS } from './poemDossiers';
import type { DeepPoem } from '@/types';

// P2-17 收敛说明：本文件是「权威完整数据集」（poems-deep.json + 精选 dossier），供 PoemDetail / poemStudy
// 按需动态加载，不被列表/出题场景引用。它是 poems 系三套索引中字段最全的，但体积最大（~519KB），
// 故不作为通用「主索引」；主索引请用 poems（PoemIndex）。保留原数据模型，未做合并/重写。
/** 385 首古诗的增强数据（结构化元数据 + 精选深度作庭） */
const DEEP_POEMS: DeepPoem[] = (deep as unknown as DeepPoem[]).map((p) => ({
  ...p,
  dossier: DOSSIERS[p.id],
}));

export default DEEP_POEMS;

export const DEEP_BY_ID = new Map(DEEP_POEMS.map((p) => [p.id, p]));
