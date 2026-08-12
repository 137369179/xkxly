import { LIUSHU_META, type Liushu, type LiushuMeta } from '@/lib/hanziEtymology';
import { useTranslation } from '@/i18n/useTranslation';

const TONE_CLASS: Record<LiushuMeta['tone'], string> = {
  orange: 'bg-candy-orange-soft text-candy-orange-deep',
  blue: 'bg-candy-blue-soft text-candy-blue-deep',
  green: 'bg-candy-green-soft text-candy-green-deep',
  purple: 'bg-candy-purple-soft text-candy-purple-deep',
};

/**
 * 六书徽章：把「象形/指事/会意/形声」分类锚点做成孩子一眼能认的彩色标签。
 * 文案走 i18n；颜色/emoji 取自 LIUSHU_META（设计系统色调，无需翻译）。
 */
export function LiushuBadge({ liushu, size = 'md' }: { liushu: Liushu; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const meta = LIUSHU_META[liushu];
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-extrabold ${TONE_CLASS[meta.tone]} ${pad}`}
      title={meta.desc}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span>{t(`hanzi.liushu.${liushu}`)}</span>
      <span className="font-bold opacity-70">{t(`hanzi.liushuHint.${liushu}`)}</span>
    </span>
  );
}
