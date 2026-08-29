import React, { useState, useRef } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';

export interface VoiceChatInputProps {
  onSend: (text: string) => void;
  isListening: boolean;
  onToggleListen: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function VoiceChatInput({
  onSend,
  isListening,
  onToggleListen,
  disabled = false,
  placeholder,
}: VoiceChatInputProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || disabled) return;
    sfxTap();
    onSend(text);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-pink-200/60 bg-white/95 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3 shadow-lg"
    >
      {/* 🎙️ 语音录入按钮 */}
      <button
        type="button"
        onClick={onToggleListen}
        disabled={disabled}
        aria-label={isListening ? t('catCompanion.voice.doneSpeaking') : t('catCompanion.voice.speakAgain')}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black transition-all active:scale-90 ${
          isListening
            ? 'bg-rose-500 text-candy-pink-on shadow-lg shadow-rose-500/40 animate-pulse ring-4 ring-rose-300/50'
            : 'bg-gradient-to-tr from-pink-500 to-rose-400 text-candy-pink-on shadow-md hover:scale-105'
        }`}
        title={isListening ? '点击结束录音' : '按住/点击说话'}
      >
        {isListening ? (
          <span className="inline-block h-3.5 w-3.5 rounded-xs bg-white" />
        ) : (
          '🎙️'
        )}
      </button>

      {/* ⌨️ 文本输入框 */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || t('catCompanion.inputPlaceholder')}
          maxLength={150}
          className="w-full rounded-2xl border-2 border-pink-200 bg-pink-50/70 px-3.5 py-2 text-sm font-bold text-ink placeholder-pink-300 shadow-inner outline-none transition-all focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-300/40 disabled:opacity-50"
        />
        {inputText && (
          <button
            type="button"
            onClick={() => setInputText('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-400 hover:text-pink-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* 🚀 发送按钮 */}
      <button
        type="submit"
        disabled={disabled || !inputText.trim()}
        className="flex h-10 px-4 shrink-0 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-xs font-black text-candy-pink-on shadow-md transition-all hover:opacity-95 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
      >
        <span>{t('catCompanion.send')}</span>
        <span>🚀</span>
      </button>
    </form>
  );
}
