import { memo, useMemo, useState } from 'react';
import { pinyin } from 'pinyin-pro';
import { cn } from '@/lib/utils';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';

export interface RubyTextProps {
  text: string;
  showPinyin?: boolean;
  clickable?: boolean;
  className?: string;
  rubyClassName?: string;
  rtClassName?: string;
}

export interface CharPinyinItem {
  char: string;
  pinyin: string;
  isHanzi: boolean;
}

export function parseTextToPinyinItems(text: string): CharPinyinItem[] {
  if (!text) return [];

  // 利用 pinyin-pro 的 type: 'all' 快速解析每个字符与对应的拼音
  try {
    const list = pinyin(text, { type: 'all', toneType: 'symbol' });
    if (Array.isArray(list)) {
      return list.map((item) => {
        const isHanzi = /^[\u4e00-\u9fa5]$/.test(item.origin);
        // 茜在站内AI「小茜」中统一定音为 xī
        const py = item.origin === '茜' ? 'xī' : item.pinyin;
        return {
          char: item.origin,
          pinyin: isHanzi ? py : '',
          isHanzi,
        };
      });
    }
  } catch {
    // 降级兜底：纯文本切分
  }

  return text.split('').map((char) => ({
    char,
    pinyin: '',
    isHanzi: /^[\u4e00-\u9fa5]$/.test(char),
  }));
}

function RubyTextImpl({
  text,
  showPinyin = true,
  clickable = false,
  className,
  rubyClassName,
  rtClassName,
}: RubyTextProps) {
  const items = useMemo(() => parseTextToPinyinItems(text), [text]);
  const [activeCharIndex, setActiveCharIndex] = useState<number | null>(null);

  if (!showPinyin) {
    return <span className={className}>{text}</span>;
  }

  const handleCharClick = (char: string, idx: number) => {
    if (!clickable || !char.trim()) return;
    sfxTap();
    setActiveCharIndex(idx);
    speak(char, { lang: 'zh-CN', rate: 0.85 }).finally(() => {
      setActiveCharIndex(null);
    });
  };

  return (
    <span className={cn('inline leading-loose', className)}>
      {items.map((item, idx) => {
        if (!item.isHanzi || !item.pinyin) {
          return <span key={`${idx}-${item.char}`}>{item.char}</span>;
        }
        const isActive = activeCharIndex === idx;
        return (
          <ruby
            key={`${idx}-${item.char}`}
            onClick={() => handleCharClick(item.char, idx)}
            className={cn(
              'inline-flex flex-col items-center mx-[1.5px] transition-transform',
              clickable && 'cursor-pointer hover:scale-110 active:scale-95 select-none',
              isActive && 'scale-125 text-pink-600 font-extrabold',
              rubyClassName,
            )}
            title={clickable ? `点击朗读：${item.char} (${item.pinyin})` : undefined}
          >
            <rt
              className={cn(
                'text-[0.62em] leading-none text-pink-600 font-bold select-none mb-0.5 tracking-tight',
                isActive && 'text-pink-700 font-black',
                rtClassName,
              )}
            >
              {item.pinyin}
            </rt>
            <span>{item.char}</span>
          </ruby>
        );
      })}
    </span>
  );
}

export const RubyText = memo(RubyTextImpl);
