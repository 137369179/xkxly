import deep from './poems-deep.json';
import { DOSSIERS } from './poemDossiers';
import type { DeepPoem } from '@/types';

/** 385 首古诗的增强数据（结构化元数据 + 精选深度作庭） */
const DEEP_POEMS: DeepPoem[] = (deep as unknown as DeepPoem[]).map((p) => ({
  ...p,
  dossier: DOSSIERS[p.id],
}));

export default DEEP_POEMS;

export const DEEP_BY_ID = new Map(DEEP_POEMS.map((p) => [p.id, p]));
