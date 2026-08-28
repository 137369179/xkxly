import { useState, useCallback, useMemo } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { useAiStream } from '@/lib/ai/useAi';
import { AiPanel } from '@/components/ai';
import type { StreamTask } from '@/lib/ai/tasks';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 创意表达
 * 1. 看图说话：选一张图，说一段话描述它
 * 2. 编故事：选主题，AI 辅助编故事
 * 3. 仿写句子：给例句，孩子仿写
 */

type Mode = 'describe' | 'story' | 'imitate';

const MODES: { id: Mode; label: string; emoji: string; desc: string }[] = [
  { id: 'describe', label: '看图说话', emoji: '🖼️', desc: '选一幅图，说说你看到了什么' },
  { id: 'story', label: '编故事', emoji: '📖', desc: '选一个主题，一起编个小故事' },
  { id: 'imitate', label: '仿写句子', emoji: '✏️', desc: '学一学，写一写' },
];

const PICTURES = [
  { emoji: '🌳🏡', label: '小房子和大树' },
  { emoji: '🌊⛵', label: '大海和小船' },
  { emoji: '🌈🌈', label: '美丽的彩虹' },
  { emoji: '🦊🌲', label: '森林里的狐狸' },
  { emoji: '🌙⭐', label: '月亮和星星' },
  { emoji: '🌸🐝', label: '花园和蜜蜂' },
  { emoji: '🐕🎾', label: '小狗玩球' },
  { emoji: '⛄❄️', label: '雪人' },
];

const STORY_THEMES = [
  '勇敢的小兔子', '迷路的小星星', '爱唱歌的小鸟', '神奇的画笔',
  '会飞的房子', '海底的派对', '云朵上的学校', '贪吃的小熊',
];

const IMITATE_EXAMPLES = [
  { example: '太阳是红红的。', prompt: '月亮是___的。' },
  { example: '小猫在院子里跑来跑去。', prompt: '小狗在___。' },
  { example: '春天来了，花都开了。', prompt: '秋天来了，___。' },
  { example: '我喜欢吃甜甜的苹果。', prompt: '我喜欢___。' },
  { example: '天上的白云像棉花糖。', prompt: '天上的星星像___。' },
];

function makeDescribeTask(picture: string, label: string): StreamTask {
  return {
    scene: 'praise',
    messages: [
      { role: 'system' as const, content: '你是小茜，一个温暖的儿童学习伙伴。请用简单温馨的语言引导孩子描述图片。' },
      { role: 'user' as const, content: `图片是${label}（${picture}）。请引导孩子说说看到了什么，给一个小提示和开头。50字以内。` },
    ],
    fallback: `看看这幅图（${picture}），${label}。你看到了什么呀？试着说一两句话吧！`,
    title: '看图说话',
    hint: '小茜正在看图...',
  };
}

function makeStoryTask(theme: string): StreamTask {
  return {
    scene: 'praise',
    messages: [
      { role: 'system' as const, content: '你是小茜，一个温暖的儿童故事讲述者。请用简单生动的语言编一个很短的小故事（100字内），适合5-6岁孩子。' },
      { role: 'user' as const, content: `请以"${theme}"为主题编一个小故事。` },
    ],
    fallback: `从前，${theme}。有一天它遇到了一件有趣的事情……你想接下来会发生什么呢？`,
    title: '编故事',
    hint: '小茜在编故事...',
  };
}

export function CreativeExpress() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('describe');
  const [selectedPic, setSelectedPic] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);
  const [selectedImitate, setSelectedImitate] = useState<number | null>(null);
  const [userText, setUserText] = useState('');

  const describeTask = useMemo(
    () => (selectedPic !== null && PICTURES[selectedPic]) ? makeDescribeTask(PICTURES[selectedPic].emoji, PICTURES[selectedPic].label) : null,
    [selectedPic]
  );
  const storyTask = useMemo(
    () => (selectedTheme !== null && STORY_THEMES[selectedTheme]) ? makeStoryTask(STORY_THEMES[selectedTheme]) : null,
    [selectedTheme]
  );

  const describeStream = useAiStream(describeTask ?? undefined);
  const storyStream = useAiStream(storyTask ?? undefined);

  const speak_ = useCallback((text: string) => {
    speak(text, { lang: 'zh-CN', rate: 0.9 });
  }, []);

  return (
    <Panel>
      <PanelTitle emoji="🎨" title={t('creative.pageTitle')} subtitle={t('creative.subtitle')} tone="pink" />

      {/* 模式选择 */}
      <div className="mb-3 flex gap-2">
        {MODES.map(m => (
          <CandyButton
            key={m.id}
            tone={mode === m.id ? 'pink' : 'purple'}
            variant={mode === m.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { setMode(m.id); setSelectedPic(null); setSelectedTheme(null); setSelectedImitate(null); setUserText(''); }}
          >
            {m.emoji} {t(`creative.${m.id === 'describe' ? 'describe' : m.id === 'story' ? 'story' : 'imitate'}`)}
          </CandyButton>
        ))}
      </div>

      {/* 看图说话 */}
      {mode === 'describe' && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-ink-soft">{t('creative.describeDesc')}</p>
          <div className="grid grid-cols-4 gap-2">
            {PICTURES.map((p, i) => (
              <button
                key={`p-${i}`}
                onClick={() => { setSelectedPic(i); setUserText(''); }}
                className={cn(
                  'rounded-2xl p-2 text-center transition',
                  selectedPic === i ? 'bg-candy-pink-soft ring-2 ring-candy-pink-main' : 'bg-white'
                )}
              >
                <div className="text-2xl">{p.emoji}</div>
                <div className="text-xs font-bold text-ink-soft">{p.label}</div>
              </button>
            ))}
          </div>

          {selectedPic !== null && PICTURES[selectedPic] && (
            <div className="space-y-2">
              <div className="rounded-2xl bg-candy-pink-soft p-4 text-center">
                <div className="text-5xl">{PICTURES[selectedPic].emoji}</div>
                <div className="mt-1 text-sm font-bold text-candy-pink-deep">{PICTURES[selectedPic].label}</div>
              </div>
              <AiPanel state={describeStream} title={t('creative.aiSay')} tone="pink" />
              <textarea
                value={userText}
                onChange={e => setUserText(e.target.value.slice(0, 100))}
                placeholder={t('creative.describePlaceholder')}
                className="w-full rounded-2xl border-4 border-candy-pink-soft bg-white p-3 text-sm font-semibold text-ink outline-none"
                rows={3}
              />
              <div className="flex gap-2">
                <CandyButton tone="pink" size="sm" disabled={!userText.trim()} onClick={() => { speak_(userText); celebrateSmall(); useStore.getState().incCreativeCount(); }}>
                  {t('creative.readToMe')}
                </CandyButton>
                <CandyButton tone="purple" size="sm" onClick={() => setUserText('')}>
                  {t('creative.clear')}
                </CandyButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 编故事 */}
      {mode === 'story' && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-ink-soft">{t('creative.storyDesc')}</p>
          <div className="grid grid-cols-2 gap-2">
            {STORY_THEMES.map((t, i) => (
              <button
                key={`t-${i}`}
                onClick={() => { setSelectedTheme(i); setUserText(''); }}
                className={cn(
                  'rounded-2xl p-2.5 text-center text-sm font-bold transition',
                  selectedTheme === i ? 'bg-candy-pink-soft ring-2 ring-candy-pink-main text-candy-pink-deep' : 'bg-white text-ink'
                )}
              >
                📖 {t}
              </button>
            ))}
          </div>
          {selectedTheme !== null && (
            <AiPanel state={storyStream} title={t('creative.aiStory')} tone="pink" />
          )}
        </div>
      )}

      {/* 仿写句子 */}
      {mode === 'imitate' && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-ink-soft">{t('creative.imitateDesc')}</p>
          <div className="space-y-2">
            {IMITATE_EXAMPLES.map((ex, i) => (
              <button
                key={`ex-${i}`}
                onClick={() => { setSelectedImitate(i); setUserText(''); }}
                className={cn(
                  'w-full rounded-2xl p-3 text-left transition',
                  selectedImitate === i ? 'bg-candy-pink-soft ring-2 ring-candy-pink-main' : 'bg-white'
                )}
              >
                <div className="text-sm font-bold text-ink">{t('creative.example', { text: ex.example })}</div>
                <div className="text-xs font-bold text-candy-pink-deep">{t('creative.copyWrite', { text: ex.prompt })}</div>
              </button>
            ))}
          </div>
          {selectedImitate !== null && IMITATE_EXAMPLES[selectedImitate] && (
            <div className="space-y-2">
              <div className="rounded-2xl bg-candy-pink-soft p-3">
                <div className="text-sm font-bold text-ink">{t('creative.example', { text: IMITATE_EXAMPLES[selectedImitate].example })}</div>
                <div className="text-sm font-bold text-candy-pink-deep">{t('creative.copyWrite', { text: IMITATE_EXAMPLES[selectedImitate].prompt })}</div>
              </div>
              <textarea
                value={userText}
                onChange={e => setUserText(e.target.value.slice(0, 50))}
                placeholder={t('creative.imitatePlaceholder')}
                className="w-full rounded-2xl border-4 border-candy-pink-soft bg-white p-3 text-sm font-semibold text-ink outline-none"
                rows={2}
              />
              <div className="flex gap-2">
                <CandyButton tone="pink" size="sm" disabled={!userText.trim()} onClick={() => { speak_(userText); celebrateSmall(); useStore.getState().incCreativeCount(); }}>
                  {t('creative.readToMe')}
                </CandyButton>
                <CandyButton tone="purple" size="sm" onClick={() => setUserText('')}>
                  {t('creative.clear')}
                </CandyButton>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
