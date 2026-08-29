import { motion } from 'motion/react';
import { TONE_STYLE } from '@/lib/tones';
import { sfxStar } from '@/lib/sfx';
import { STYLES } from './constants';
import type { StorybookStyle } from './types';

interface StylePickerProps {
  value: StorybookStyle | null;
  onChange: (style: StorybookStyle) => void;
}

export function StylePicker({ value, onChange }: StylePickerProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      {STYLES.map((style) => {
        const tone = TONE_STYLE.purple;
        const selected = value === style.id;
        return (
          <motion.button
            key={style.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => {
              sfxStar();
              onChange(style.id);
            }}
            className="flex-1 flex flex-col items-center gap-2 rounded-[1.5rem] p-4 sm:p-6 transition-colors"
            style={{
              backgroundColor: selected ? tone.soft : '#ffffff',
              border: `4px solid ${selected ? tone.main : '#e6d8ce'}`,
              boxShadow: selected ? `0 6px 0 ${tone.deep}` : '0 4px 0 #e2c4cb',
            }}
          >
            <span className="text-4xl sm:text-5xl">{style.emoji}</span>
            <span
              className="text-base sm:text-lg font-bold"
              style={{ color: selected ? tone.deep : '#966b78' }}
            >
              {style.label}
            </span>
            <span className="text-xs sm:text-sm text-gray-400 text-center">
              {style.desc}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
