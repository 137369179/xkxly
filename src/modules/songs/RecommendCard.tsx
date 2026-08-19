import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { useMastery } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';
import { TONE_STYLE } from '@/lib/tones';
import { RHYME_MAP } from '@/data/nurseryRhymes';
import { useAiTask } from '@/lib/ai/useAi';
import { songRecommendTask } from '@/lib/ai/tasks/song';
import { useTranslation } from '@/i18n/useTranslation';

function RecommendCard({ onPick }: { onPick: (id: string) => void }) {
  const { t: translate } = useTranslation();
  const mastery = useMastery();
  const age = 5; // 默认 5 岁

  // 获取已学过的儿歌 id
  const learnedIds = useMemo(() => {
    const ids: string[] = [];
    for (const k of Object.keys(mastery)) {
      if (k.startsWith('rhyme:') && mastery[k]!.lv >= 1) {
        ids.push(k.replace('rhyme:', ''));
      }
    }
    return ids;
  }, [mastery]);

  const hour = new Date().getHours();

  // 获取 AI 推荐
  const { result, loading } = useAiTask(
    () => songRecommendTask(age, learnedIds, hour),
    true,
  );

  const recommend = result?.data;
  const recommendedRhyme = recommend ? RHYME_MAP.get(recommend.rhymeId) : null;

  if (!recommendedRhyme) {
    return null;
  }

  const t = TONE_STYLE[recommendedRhyme.tone]!;
  const timeLabel =
    hour < 6 ? translate('song.timeDawn') :
    hour < 11 ? translate('song.timeMorning') :
    hour < 14 ? translate('song.timeNoon') :
    hour < 18 ? translate('song.timeAfternoon') :
    hour < 21 ? translate('song.timeEvening') :
    translate('song.timeNight');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.8rem] border-3 border-white/90 p-4 shadow-candy-sm"
      style={{ background: `linear-gradient(135deg, ${t.soft} 0%, #ffffff 70%)` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-black text-white" style={{ background: t.main }}>
          {translate('song.recommendBadge', { time: timeLabel })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-5xl">{recommendedRhyme.emoji}</span>
        <div className="flex-1">
          <div className="text-lg font-black" style={{ color: t.deep }}>
            {recommendedRhyme.title}
          </div>
          {loading ? (
            <div className="text-xs font-bold text-ink-soft">{translate('song.aiChoosing')}</div>
          ) : (
            <div className="text-xs font-bold text-ink-soft leading-snug">
              {recommend?.reason}
            </div>
          )}
        </div>
        <CandyButton
          tone={recommendedRhyme.tone}
          size="sm"
          onClick={() => {
            sfxTap();
            onPick(recommendedRhyme.id);
          }}
        >
          {translate('song.goSing')}
        </CandyButton>
      </div>
    </motion.div>
  );
}

export default RecommendCard;
