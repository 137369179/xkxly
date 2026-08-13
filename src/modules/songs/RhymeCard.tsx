import { motion } from 'motion/react';
import { TONE_STYLE } from '@/lib/tones';
import { THEME_LABEL, type NurseryRhyme } from '@/data/nurseryRhymes';
import { useTranslation } from '@/i18n/useTranslation';

function RhymeCard({
  rhyme,
  index,
  learned,
  onClick,
}: {
  rhyme: NurseryRhyme;
  index: number;
  learned: boolean;
  onClick: () => void;
}) {
  const { t: translate } = useTranslation();
  const t = TONE_STYLE[rhyme.tone]!;
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      className="no-select relative flex flex-col gap-2 rounded-[1.8rem] p-4 text-left shadow-candy-sm border-3 border-white/90"
      style={{ background: `linear-gradient(150deg, ${t.soft} 0%, #ffffff 75%)` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{rhyme.emoji}</span>
        {learned && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
            style={{ background: TONE_STYLE.green.soft, color: TONE_STYLE.green.deep }}
          >
            {translate('song.learnedShort')}
          </span>
        )}
      </div>
      <div>
        <div className="text-base font-black" style={{ color: t.deep }}>
          {rhyme.title}
        </div>
        <div className="line-clamp-1 text-[11px] font-bold text-ink-soft">{rhyme.desc}</div>
      </div>
      <div
        className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
        style={{ background: 'rgba(255,255,255,0.6)', color: t.deep }}
      >
        {THEME_LABEL[rhyme.theme].emoji} {THEME_LABEL[rhyme.theme].label} · {translate('song.agePlus', { age: rhyme.ageMin })}
      </div>
    </motion.button>
  );
}

export default RhymeCard;
