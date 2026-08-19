import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore, useMastery } from '@/store/useStore';
import { navigate, type RouteId } from '@/lib/router';
import { stopSpeaking } from '@/lib/speech';
import { sfxTap, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { THEME_LABEL, type NurseryRhyme } from '@/data/nurseryRhymes';
import { FollowRead } from '@/components/FollowRead';
import { FillBlank } from './FillBlank';
import { BeatTap } from './BeatTap';
import { useTranslation } from '@/i18n/useTranslation';
import { isEnglishRhyme, mapReaderTone } from './utils';
import SongExplainPanel from './SongExplainPanel';

/** 关联模块提示：把儿歌与对应学习模块串联 */
function RelatedModuleHint({ prefix, tone }: { prefix: string; tone: Tone }) {
  const { t: translate } = useTranslation();
  const map: Record<string, { route: RouteId; label: string; emoji: string }> = {
    letter: { route: 'letters', label: '字母乐园', emoji: '🔤' },
    number: { route: 'numbers', label: '数字王国', emoji: '🔢' },
    hanzi: { route: 'hanzi', label: '汉字识字', emoji: '🀄' },
    pinyin: { route: 'pinyin', label: '拼音学习', emoji: '📋' },
    word: { route: 'words', label: '英语单词', emoji: '🌐' },
    poem: { route: 'poems', label: '古诗花园', emoji: '🌸' },
  };
  const target = map[prefix]!;
  if (!target) return null;

  return (
    <Panel className="!py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-ink">{translate('song.relatedTitle')}</p>
          <p className="text-xs font-bold text-ink-soft mt-0.5">{translate('song.relatedDesc', { label: target.label })}</p>
        </div>
        <CandyButton
          tone={tone}
          size="md"
          onClick={() => {
            sfxTap();
            navigate(target.route);
          }}
        >
          {target.emoji} {translate('song.goSee')}
        </CandyButton>
      </div>
    </Panel>
  );
}

function RhymePlayer({
  rhyme,
  onBack,
}: {
  rhyme: NurseryRhyme;
  onBack: () => void;
}) {
  const learnSkill = useStore((s) => s.learnSkill);
  const practice = useStore((s) => s.practice);
  const mastery = useMastery();
  const { t: translate } = useTranslation();
  const t = TONE_STYLE[rhyme.tone]!
  const skill = `rhyme:${rhyme.id}`;
  const learned = !!mastery[skill];
  const masteryLv = mastery[skill]?.lv ?? 0;
  const lang = isEnglishRhyme(rhyme) ? 'en-US' : 'zh-CN';

  // Tab 切换：sing（跟唱）/ fillblank（填词）/ beattap（打拍）
  const [tab, setTab] = useState<'sing' | 'fillblank' | 'beattap'>('sing');

  // 切换儿歌时停止朗读
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [rhyme.id]);

  // 跟读评测通过 → 标记学会
  const handlePass = () => {
    learnSkill(skill);
    practice(skill, true, 1);
    celebrateBig();
    sfxWin();
  };

  // 手动标记"我会唱了"
  const handleMarkLearned = () => {
    sfxWin();
    learnSkill(skill);
    practice(skill, true, 1);
    celebrateBig();
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => {
          sfxTap();
          stopSpeaking();
          onBack();
        }}
        className="no-select inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-base font-extrabold text-ink-soft shadow-candy-sm active:translate-y-[2px]"
      >
        {translate('song.backToList')}
      </button>

      <PageHeader emoji={rhyme.emoji} title={rhyme.title} subtitle={rhyme.desc} tone={rhyme.tone} />

      {/* 主题标签 + 年龄 + 已学标记 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-extrabold"
          style={{ background: t.soft, color: t.deep }}
        >
          {THEME_LABEL[rhyme.theme].emoji} {THEME_LABEL[rhyme.theme].label}
        </span>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-ink-soft">
          {translate('song.agePlus', { age: rhyme.ageMin })}
        </span>
        {learned && (
          <span
            className="rounded-full px-3 py-1 text-xs font-extrabold"
            style={{ background: TONE_STYLE.green.soft, color: TONE_STYLE.green.deep }}
          >
            {translate('song.learnedBadge', { lv: masteryLv })}
          </span>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex justify-center gap-2">
        <CandyButton
          tone={tab === 'sing' ? 'pink' : 'purple'}
          variant={tab === 'sing' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => {
            sfxTap();
            setTab('sing');
          }}
        >
          {translate('song.singTab')}
        </CandyButton>
        <CandyButton
          tone={tab === 'fillblank' ? 'pink' : 'purple'}
          variant={tab === 'fillblank' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => {
            sfxTap();
            setTab('fillblank');
          }}
        >
          {translate('song.fillTab')}
        </CandyButton>
        <CandyButton
          tone={tab === 'beattap' ? 'pink' : 'purple'}
          variant={tab === 'beattap' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => {
            sfxTap();
            setTab('beattap');
          }}
        >
          {translate('song.beatTab')}
        </CandyButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'sing' && (
          <motion.div
            key="sing"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-5"
          >
            {/* 专业跟读：逐字高亮范读 + 跟读评测 + AI 发音建议 */}
            <FollowRead
              text={rhyme.lyrics.join('，')}
              lines={rhyme.lyrics}
              lang={lang}
              module="story"
              rate={0.78}
              tone={mapReaderTone(rhyme.tone)}
              threshold={60}
              enableAiAdvice
              onPass={handlePass}
            />

            {/* AI 歌词解读 */}
            <SongExplainPanel rhyme={rhyme} tone={rhyme.tone} />

            {/* 教育寓意 */}
            <div className="rounded-2xl bg-white/70 p-3 text-center">
              <span className="text-xs font-bold text-ink-soft">{translate('song.moralLabel')}</span>
              <span className="text-sm font-extrabold text-ink">{rhyme.moral}</span>
            </div>

            {/* 手动标记学会 */}
            {!learned && (
              <div className="text-center">
                <CandyButton tone="green" variant="soft" size="sm" onClick={handleMarkLearned}>
                  {translate('song.markLearned')}
                </CandyButton>
              </div>
            )}

            {/* 进度记录 */}
            {learned && (
              <Panel className="!py-4">
                <PanelTitle emoji="📊" title={translate('song.progressTitle')} tone="green" />
                <ProgressBar value={masteryLv} max={5} tone="green" showLabel />
                <p className="mt-2 text-sm font-bold text-ink-soft">
                  {translate('song.progressTip')}
                </p>
              </Panel>
            )}

            {/* 跨模块联动：关联模块入口 */}
            {rhyme.relatedPrefix && (
              <RelatedModuleHint prefix={rhyme.relatedPrefix} tone={rhyme.tone} />
            )}
          </motion.div>
        )}

        {tab === 'fillblank' && (
          <motion.div
            key="fillblank"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <FillBlank rhyme={rhyme} tone={rhyme.tone} />
          </motion.div>
        )}

        {tab === 'beattap' && (
          <motion.div
            key="beattap"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <BeatTap rhyme={rhyme} tone={rhyme.tone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RhymePlayer;
