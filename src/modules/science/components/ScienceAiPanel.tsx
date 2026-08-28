/**
 * 🤖 科学 AI 讲解面板
 * ------------------------------------------------------------
 * 通用 AI 讲解组件，封装 useAiStream + companionExplainTask
 * 点击按钮 → 流式渲染 → 失败兜底
 */
import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAiStream } from '@/lib/ai/useAi';
import { companionExplainTask } from '@/lib/ai/tasks/companion';
import type { CompanionTopic } from '@/data/companionTopics';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface ScienceAiPanelProps {
  topic: CompanionTopic;
  label?: string;
  triggerLabel?: string;
  className?: string;
}

function ScienceAiPanelImpl({ topic, label, triggerLabel = '🤖 小茜讲讲', className }: ScienceAiPanelProps) {
  const { t: tr } = useTranslation();
  const defaultTrigger = triggerLabel || `🤖 ${tr('science.aiTrigger')}`;
  const task = useMemo(() => companionExplainTask(topic), [topic]);
  const { status, text, fallback, run, reset } = useAiStream();

  const handleTrigger = () => {
    sfxTap();
    if (status === 'idle' || status === 'error') {
      run(task);
    } else {
      reset();
    }
  };

  const showContent = status === 'streaming' || status === 'done' || (status === 'thinking' && text.length > 0);

  return (
    <div className={cn('rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-3', className)}>
      {label && (
        <p className="mb-2 text-xs font-bold text-green-800">{label}</p>
      )}
      <button
        onClick={handleTrigger}
        disabled={status === 'thinking' || status === 'streaming'}
        className={cn(
          'w-full rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all active:scale-95',
          status === 'thinking' || status === 'streaming'
            ? 'bg-green-200 text-green-600'
            : 'bg-green-500 text-white shadow-md hover:bg-green-600'
        )}
      >
        {status === 'thinking' ? '🤔 ' + tr('science.thinking') : status === 'streaming' ? '✨ ' + tr('science.storyTelling') : status === 'done' ? '🔄 ' + tr('science.listenAgain') : defaultTrigger}
      </button>

      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="rounded-xl bg-white/80 p-3 text-sm leading-relaxed text-ink">
              {text}
              {fallback && (
                <span className="mt-1 block text-xs text-ink-muted">{tr('science.knowledgeCard')}</span>
              )}
            </div>
            {status === 'done' && (
              <button
                onClick={() => { sfxStar(); reset(); }}
                className="mt-2 text-xs font-bold text-green-600 hover:text-green-800"
              >
                ✕ {tr('common.collapse')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {status === 'thinking' && text.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
          <span className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-green-400" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-green-400" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-green-400" style={{ animationDelay: '300ms' }} />
          </span>
          {tr('science.preparing')}
        </div>
      )}
    </div>
  );
}

export const ScienceAiPanel = memo(ScienceAiPanelImpl);
