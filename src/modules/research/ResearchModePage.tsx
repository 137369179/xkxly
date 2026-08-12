import { useTranslation } from '@/i18n/useTranslation';

/**
 * 研究模式路由页（Sprint 1 空壳占位）
 * ------------------------------------------------------------
 * 仅作为 #/research 的可导航落点，验证路由骨架（C6）跑通。
 * 完整编排层（ExploreSlot / KnowledgeCardPanel / RoundRunner 接线）在 Sprint 2 接入。
 * 文案一律走 t()，禁硬编码中文（C7）。
 */
export default function ResearchModePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl">🔬</div>
      <h1 className="text-2xl font-extrabold text-gray-800">{t('nav.research.label')}</h1>
      <p className="text-gray-500">{t('research.comingSoon')}</p>
    </div>
  );
}
