/**
 * 对话气泡列表（从 CatVoiceChatModal 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：消息气泡 + 流式回复占位 + 自动滚动锚点。
 */
import type { Ref } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'cat';
  text: string;
}

export function VoiceMessageList({
  messages,
  streaming,
  streamingText,
  endRef,
}: {
  messages: VoiceMessage[];
  streaming: boolean;
  streamingText: string;
  endRef: Ref<HTMLDivElement>;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-4 mt-3 flex min-h-[130px] max-h-[200px] flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-3">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex items-start gap-2 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
              m.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            {m.sender === 'user' ? '🧑‍🎓' : '🐱'}
          </div>
          <div className={`flex max-w-[80%] flex-col gap-1 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`rounded-2xl px-3 py-2 text-xs font-bold shadow-xs ${
                m.sender === 'user'
                  ? 'rounded-tr-none bg-indigo-600 text-white'
                  : 'rounded-tl-none bg-amber-100 text-amber-950'
              }`}
            >
              {m.text}
            </div>
            {m.sender === 'cat' && (
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  speak(m.text, { lang: 'zh-CN' });
                }}
                className="flex items-center gap-1 self-start rounded-full border border-amber-500/30 bg-amber-900/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 transition-transform active:scale-95"
              >
                {t('catCompanion.voice.replay')}
              </button>
            )}
          </div>
        </div>
      ))}

      {streaming && (
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">
            🐱
          </div>
          <div className="max-w-[80%] animate-pulse rounded-2xl rounded-tl-none bg-amber-100 px-3 py-2 text-xs font-bold text-amber-950">
            {streamingText || t('catCompanion.voice.organizing')}
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
