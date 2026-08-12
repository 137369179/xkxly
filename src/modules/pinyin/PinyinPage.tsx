import { useState } from 'react';
import { PINYIN_GROUPS, getPinyinByType, nextPinyin, type PinyinEntry } from '@/data/pinyinIndex';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { sfxTap } from '@/lib/sfx';
import { TONE_STYLE } from '@/lib/tones';
import { useStore } from '@/store/useStore';
import { PinyinLearn } from './PinyinLearn';
import { useTranslation } from '@/i18n/useTranslation';
import { PinyinPractice } from './PinyinPractice';
import { BlendPractice } from './BlendPractice';
import { TonePractice } from './TonePractice';
import { Dictation } from './Dictation';
import { PinyinGroup } from './PinyinGroup';

type Tab = 'shengmu' | 'yunmu' | 'zhengti' | 'practice' | 'blend' | 'tone' | 'dictation' | 'group';

/** 拼音类型（用于拼读解锁判定） */
type PinyinType = 'shengmu' | 'yunmu' | 'zhengti';


export default function PinyinPage() {
  const { t: tr } = useTranslation();
  const TABS: TabItem<Tab>[] = [
    { id: 'shengmu', label: tr('pinyinPage.shengmu'), emoji: '🗣️' },
    { id: 'yunmu', label: tr('pinyinPage.yunmu'), emoji: '🎶' },
    { id: 'zhengti', label: tr('pinyinPage.zhengti'), emoji: '⭐' },
    { id: 'practice', label: tr('pinyinPage.practice'), emoji: '🎯' },
    { id: 'blend', label: tr('pinyinPage.blend'), emoji: '🔗' },
    { id: 'tone', label: tr('pinyinPage.tone'), emoji: '🎵' },
    { id: 'dictation', label: tr('pinyinPage.dictation'), emoji: '🎧' },
    { id: 'group', label: tr('pinyinPage.group'), emoji: '🎶' },
  ];
  const TYPE_LABELS: Record<PinyinType, string> = {
    shengmu: tr('pinyinPage.shengmu'),
    yunmu: tr('pinyinPage.yunmu'),
    zhengti: tr('pinyinPage.zhengti'),
  };
  const [tab, setTab] = useState<Tab>('shengmu');
  const [selected, setSelected] = useState<PinyinEntry | null>(null);
  // 掌握度数据：用于推荐下一个拼音与判断拼读解锁
  const mastery = useStore((s) => s.progress.mastery);

  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="text-sm font-bold text-ink-soft">
          ← {tr('pinyinPage.back')}
        </button>
        <PinyinLearn entry={selected} onDone={() => setSelected(null)} />
      </div>
    );
  }

  if (tab === 'practice') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🎯" title={tr('pinyinPage.practiceTitle')} subtitle={tr('pinyinPage.practiceSub')} tone="purple" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="purple" layoutId="pinyin-tabs" />
        <PinyinPractice />
      </div>
    );
  }

  if (tab === 'blend') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🔗" title={tr('pinyinPage.blendTitle')} subtitle={tr('pinyinPage.blendSub')} tone="blue" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="pinyin-tabs" />
        <BlendPractice />
      </div>
    );
  }

  if (tab === 'tone') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🎵" title={tr('pinyinPage.toneTitle')} subtitle={tr('pinyinPage.toneSub')} tone="blue" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="pinyin-tabs" />
        <TonePractice />
      </div>
    );
  }

  if (tab === 'dictation') {
    return (
      <div className="space-y-5">
        <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="pinyin-tabs" />
        <Dictation />
      </div>
    );
  }

  if (tab === 'group') {
    return (
      <div className="space-y-5">
        <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="pinyin-tabs" />
        <PinyinGroup />
      </div>
    );
  }

  const group = PINYIN_GROUPS.find(g => {
    if (tab === 'shengmu') return g.id === 'shengmu';
    if (tab === 'yunmu') return g.id === 'yunmu-dan' || g.id === 'yunmu-fu' || g.id === 'yunmu-bi';
    return g.id === 'zhengti';
  });

  const groups = tab === 'yunmu'
    ? PINYIN_GROUPS.filter(g => g.id.startsWith('yunmu'))
    : [group!].filter(Boolean);

  const tone = tab === 'shengmu' ? 'blue' : tab === 'yunmu' ? 'pink' : 'purple';

  // 今日推荐：按 order 升序第一个尚未掌握的拼音
  const recommended = nextPinyin(mastery);
  // 已学完的类型（已学拼音数达到该类型总数）→ 解锁拼读练习
  const completedTypes: PinyinType[] = (['shengmu', 'yunmu', 'zhengti'] as PinyinType[]).filter((tp) => {
    const items = getPinyinByType(tp);
    return items.length > 0 && items.every((p) => {
      const m = mastery[`pinyin:${p.p}`]!
      return !!m && m.lv >= 1;
    });
  });

  return (
    <div className="space-y-5">
      <PageHeader emoji="📋" title={tr('pinyinPage.title')} subtitle={tr('pinyinPage.subtitle')} tone={tone} />

      {/* 今日推荐拼音卡片 */}
      {recommended ? (
        <Panel className="relative overflow-hidden">
          {/* 脉冲高亮光晕 */}
          <div className="pointer-events-none absolute -inset-2 animate-pulse rounded-[2.5rem] bg-candy-pink-soft/60" />
          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl border-4 border-white bg-white shadow-candy-sm">
              <span className="text-6xl font-black text-candy-pink-deep">{recommended.p}</span>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-sm font-extrabold text-candy-pink-deep">🌟 {tr('pinyinPage.todayRec')}</p>
              <p className="mt-1 text-base font-bold text-ink">{recommended.sound}</p>
              <p className="mt-1 text-sm font-semibold text-candy-purple-deep">🎵 {recommended.rhyme}</p>
            </div>
            <CandyButton tone="pink" size="lg" onClick={() => { sfxTap(); setSelected(recommended); }}>
              {tr('pinyinPage.clickLearn')}
            </CandyButton>
          </div>
        </Panel>
      ) : (
        <Panel className="text-center">
          <div className="text-5xl">🎉</div>
          <p className="mt-2 text-xl font-extrabold text-candy-purple-deep">{tr('pinyinPage.allDone')}</p>
          <p className="mt-1 text-sm font-bold text-ink-soft">{tr('pinyinPage.allDoneHint')}</p>
          <div className="mt-3 flex justify-center">
            <CandyButton tone="purple" size="md" onClick={() => { sfxTap(); setTab('blend'); }}>
              {tr('pinyinPage.goBlend')}
            </CandyButton>
          </div>
        </Panel>
      )}

      {/* 拼读练习入口：当某类型拼音全部学完时显示 */}
      {completedTypes.length > 0 && (
        <Panel>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-base font-extrabold text-candy-blue-deep">🔗 {tr('pinyinPage.blendUnlocked')}</p>
              <p className="mt-1 text-sm font-bold text-ink-soft">
                {tr('pinyinPage.blendUnlockedHint', { types: completedTypes.map((t) => TYPE_LABELS[t]).join(tr('pinyinPage.comma')) })}
              </p>
            </div>
            <CandyButton tone="blue" size="lg" onClick={() => { sfxTap(); setTab('blend'); }}>
              {tr('pinyinPage.blendPractice')}
            </CandyButton>
          </div>
        </Panel>
      )}

      <Tabs items={TABS} value={tab} onChange={setTab} tone={tone} layoutId="pinyin-tabs" />

      {groups.map(g => (
        <Panel key={g.id}>
          <PanelTitle emoji={g.emoji} title={g.name} subtitle={g.desc} tone={g.tone} />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {g.items.map(item => (
              <button
                key={item.p}
                onClick={() => { sfxTap(); setSelected(item); }}
                className="flex flex-col items-center justify-center rounded-2xl p-3 min-h-[64px] shadow-candy-sm transition-all active:translate-y-[2px]"
                style={{ background: TONE_STYLE[g.tone].soft }}
              >
                <span className="text-2xl font-black text-ink">{item.p}</span>
                <span className="text-[10px] font-bold" style={{ color: TONE_STYLE[g.tone].deep }}>{item.rhyme.slice(0, 6)}</span>
              </button>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
