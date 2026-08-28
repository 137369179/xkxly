import { useState } from 'react';
import type { Ref } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { RubyText } from '@/components/ai/RubyText';

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
  const [showPinyinMap, setShowPinyinMap] = useState<Record<string, boolean>>({});

  const togglePinyin = (id: string) => {
    sfxTap();
    setShowPinyinMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-4 mt-2.5 flex min-h-[140px] max-h-[260px] flex-1 flex-col gap-3 overflow-y-auto rounded-3xl border-2 border-pink-200/60 bg-white/75 p-3.5 shadow-inner backdrop-blur-md sm:max-h-[300px]">
      {messages.map((m) => {
        const isUser = m.sender === 'user';
        const showPinyin = !!showPinyinMap[m.id];
        return (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* 头像 */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-sm ${
                isUser
                  ? 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white'
                  : 'bg-gradient-to-tr from-amber-400 to-orange-400 text-white'
              }`}
            >
              {isUser ? '👶' : '🐱'}
            </div>

            {/* 内容 */}
            <div className={`flex max-w-[82%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-3xl px-3.5 py-2.5 text-sm font-bold shadow-xs transition-all ${
                  isUser
                    ? 'rounded-tr-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'rounded-tl-xs border border-pink-200/80 bg-pink-50/90 text-ink leading-relaxed'
                }`}
              >
                {!isUser && showPinyin ? (
                  <RubyText text={m.text} clickable={true} className="text-sm font-bold" />
                ) : (
                  <span>{m.text}</span>
                )}
              </div>

              {!isUser && (
                <div className="flex items-center gap-1.5 self-start pl-1">
                  <button
                    type="button"
                    onClick={() => {
                      sfxTap();
                      speak(m.text, { lang: 'zh-CN' });
                    }}
                    className="flex items-center gap-1 rounded-full border border-pink-200 bg-white/90 px-2 py-0.5 text-xs font-bold text-pink-700 shadow-xs transition-transform active:scale-95 hover:bg-pink-50"
                  >
                    <span>🔊</span>
                    <span>{t('catCompanion.voice.replay')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePinyin(m.id)}
                    className={`rounded-full border px-2 py-0.5 text-xs font-bold shadow-xs transition-transform active:scale-95 ${
                      showPinyin
                        ? 'border-purple-300 bg-purple-100 text-purple-700'
                        : 'border-pink-200 bg-white/90 text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    {showPinyin ? '关拼音' : '拼音'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {streaming && (
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 text-sm font-black text-white shadow-sm">
            🐱
          </div>
          <div className="max-w-[82%] rounded-3xl rounded-tl-xs border border-pink-200/80 bg-pink-50/90 px-3.5 py-2.5 text-sm font-bold text-ink shadow-xs">
            <span className="leading-relaxed">{streamingText || t('catCompanion.voice.organizing')}</span>
            <span className="inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-pink-500 ml-1" />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
