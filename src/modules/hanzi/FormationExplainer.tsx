import { explainFormation } from '@/lib/hanziEtymology';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 字理讲解：直接复用查询层 explainFormation 生成的、经过教学正确性把关的讲解句。
 * 【措辞纪律】数据没给 phonetic 就绝不含「声旁表音」，uncertain 字只做中性描述——
 * 这套约束已在数据生成期与查询层双重保证，本组件只负责呈现。
 */
export function FormationExplainer({ char }: { char: string }) {
  const { t } = useTranslation();
  const text = explainFormation(char);
  if (!text) return null;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-candy-green-soft/70 to-candy-blue-soft/50 p-3.5">
      <p className="mb-1 text-xs font-extrabold text-candy-green-deep">{t('hanzi.formationTitle')}</p>
      <p className="text-base font-semibold leading-relaxed text-ink">{text}</p>
    </div>
  );
}
