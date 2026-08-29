import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap } from '@/lib/sfx';
import { useAiTask } from '@/lib/ai/useAi';
import { useTranslation } from '@/i18n/useTranslation';
import { ThemePicker } from './ThemePicker';
import { StylePicker } from './StylePicker';
import { GeneratingOverlay } from './GeneratingOverlay';
import { getTheme } from './constants';
import { createStorybookTask, fallbackStorybook } from '@/lib/ai/tasks/storybook';
import type { StoryBookData } from '@/lib/ai/prompts';
import type { StorybookTheme, StorybookStyle } from './types';

type Step = 'theme' | 'style' | 'generating';

interface StorybookCreatorProps {
  onCreated: (book: StoryBookData, theme: StorybookTheme, style: StorybookStyle, character: string) => void;
}

export function StorybookCreator({ onCreated }: StorybookCreatorProps) {
  const { t: tr } = useTranslation();
  const [step, setStep] = useState<Step>('theme');
  const [theme, setTheme] = useState<StorybookTheme | null>(null);
  const [style, setStyle] = useState<StorybookStyle | null>(null);

  // 生成任务函数（useMemo 稳定引用，避免每次渲染重建）
  const taskFn = useMemo(() => {
    if (!theme || !style) return null;
    const preset = getTheme(theme);
    const character = preset.characters[0] ?? '小狮子';
    return createStorybookTask(character, theme, style);
  }, [theme, style]);

  const { loading, result, run } = useAiTask<StoryBookData>(
    taskFn ?? (async () => ({ ok: false, data: fallbackStorybook('小狮子', 'animals'), fallback: true })),
  );

  // 生成完成回调
  const handleGenerate = useCallback(() => {
    if (!taskFn) return;
    run();
    setStep('generating');
  }, [taskFn, run]);

  // 监听生成结果
  useTaskResult(result, loading, () => {
    if (result && theme && style) {
      const preset = getTheme(theme);
      const character = preset.characters[0] ?? '小狮子';
      const book = result.data;
      onCreated(book, theme, style, character);
    }
  });

  // 渲染
  if (step === 'theme') {
    return (
      <div className="flex flex-col gap-6 py-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-500">{tr('storybook.chooseTheme')}</h2>
          <p className="text-sm text-gray-400 mt-1">{tr('storybook.themeHint')}</p>
        </div>
        <ThemePicker
          value={theme}
          onChange={(t) => {
            setTheme(t);
            setStep('style');
          }}
        />
      </div>
    );
  }

  if (step === 'style') {
    return (
      <div className="flex flex-col gap-6 py-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-500">{tr('storybook.chooseStyle')}</h2>
          <p className="text-sm text-gray-400 mt-1">{tr('storybook.styleHint')}</p>
        </div>
        <StylePicker
          value={style}
          onChange={(s) => {
            setStyle(s);
            sfxTap();
          }}
        />
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setStep('theme');
            }}
            className="text-sm text-gray-400 underline"
          >
            ← {tr('storybook.changeTheme')}
          </button>
          <button
            type="button"
            disabled={!style}
            onClick={handleGenerate}
            className={`px-8 py-3 rounded-full text-lg font-bold transition-colors ${
              style
                ? 'bg-purple-400 text-candy-purple-on shadow-lg hover:bg-purple-500'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {tr('storybook.startCreate')} ✨
          </button>
        </div>
      </div>
    );
  }

  // generating step
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <GeneratingOverlay
          key="overlay"
          onCancel={() => {
            sfxTap();
            setStep('theme');
          }}
        />
      ) : result ? (
        <motion.div
          key="done"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-8 text-center"
        >
          <p className="text-lg text-purple-400 font-bold">
            {result.fallback ? tr('storybook.fallbackReady') : tr('storybook.createDone')}
          </p>
        </motion.div>
      ) : (
        <GeneratingOverlay
          key="overlay-init"
          onCancel={() => {
            sfxTap();
            setStep('theme');
          }}
        />
      )}
    </AnimatePresence>
  );
}

/** 监听 task 结果变化，完成后回调 */
function useTaskResult(
  result: ReturnType<typeof useAiTask<StoryBookData>>['result'],
  loading: boolean,
  onDone: () => void,
) {
  // 用 useEffect 监听 loading 从 true→false
  const [prevLoading, setPrevLoading] = useState(false);
  if (prevLoading && !loading && result) {
    // loading 刚结束且有结果
    setTimeout(onDone, 100);
  }
  // 同步更新 prevLoading
  if (prevLoading !== loading) {
    setPrevLoading(loading);
  }
}
