import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { stopSpeaking, speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import type { NurseryRhyme } from '@/data/nurseryRhymes';
import { useAiStream } from '@/lib/ai/useAi';
import { songExplainTask } from '@/lib/ai/tasks/song';
import { useTranslation } from '@/i18n/useTranslation';
import { isEnglishRhyme } from './utils';

function SongExplainPanel({ rhyme, tone }: { rhyme: NurseryRhyme; tone: Tone }) {
  const { t: translate } = useTranslation();
  const t = TONE_STYLE[tone]!;
  const task = useMemo(() => songExplainTask(rhyme), [rhyme]);
  const { status, text, fallback, run, reset } = useAiStream();
  const [showExplain, setShowExplain] = useState(false);

  const handleToggle = () => {
    sfxTap();
    if (!showExplain) {
      setShowExplain(true);
      if (status === 'idle') {
        run(task);
      }
    } else {
      setShowExplain(false);
      reset();
      stopSpeaking();
    }
  };

  const handleSpeak = () => {
    sfxTap();
    if (text) {
      const lang = isEnglishRhyme(rhyme) ? 'en-US' : 'zh-CN';
      speak(text, { lang, rate: 0.8 });
    }
  };

  if (!showExplain) {
    return (
      <div className="text-center">
        <CandyButton tone={tone} variant="soft" size="sm" onClick={handleToggle}>
          {translate('song.aiExplainBtn')}
        </CandyButton>
      </div>
    );
  }

  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-lg"
            style={{ background: t.soft }}
          >
            🤖
          </span>
          <span className="text-base font-black" style={{ color: t.deep }}>
            {translate('song.aiExplainTitle')}
          </span>
        </div>
        <div className="flex gap-1.5">
          {text && status === 'done' && (
            <CandyButton tone={tone} variant="ghost" size="sm" onClick={handleSpeak}>
              {translate('song.listenShort')}
            </CandyButton>
          )}
          <CandyButton tone="purple" variant="ghost" size="sm" onClick={handleToggle}>
            ✕
          </CandyButton>
        </div>
      </div>

      {/* 内容区 */}
      <div
        className="min-h-[60px] rounded-xl p-3 text-sm font-bold leading-relaxed"
        style={{ background: t.soft, color: t.deep }}
      >
        {status === 'thinking' && (
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}>
            {translate('song.aiThinking')}
          </motion.span>
        )}
        {status === 'streaming' && (
          <span>{text}</span>
        )}
        {status === 'done' && (
          <span>{text}</span>
        )}
        {status === 'idle' && (
          <span className="text-ink-soft">{translate('song.aiIdleTip')}</span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-center gap-2">
        {status === 'idle' && (
          <CandyButton tone={tone} size="sm" onClick={() => run(task)}>
            {translate('song.startExplain')}
          </CandyButton>
        )}
        {(status === 'done' || status === 'error') && (
          <CandyButton tone={tone} variant="soft" size="sm" onClick={() => run(task)}>
            {translate('song.explainAgain')}
          </CandyButton>
        )}
        {fallback && status === 'done' && (
          <span className="text-xs text-ink-soft/60">{translate('song.localContent')}</span>
        )}
      </div>
    </Panel>
  );
}

export default SongExplainPanel;
