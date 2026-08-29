import { motion } from 'motion/react';
import { TONE_STYLE } from '@/lib/tones';
import { sfxStar } from '@/lib/sfx';
import { THEMES } from './constants';
import type { StorybookTheme } from './types';

interface ThemePickerProps {
  value: StorybookTheme | null;
  onChange: (theme: StorybookTheme) => void;
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {THEMES.map((theme) => {
        const tone = TONE_STYLE[theme.tone];
        const selected = value === theme.id;
        return (
          <motion.button
            key={theme.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => {
              sfxStar();
              onChange(theme.id);
            }}
            className="relative flex flex-col items-center justify-center gap-2 rounded-[1.5rem] p-4 sm:p-6 transition-colors"
            style={{
              backgroundColor: selected ? tone.soft : '#ffffff',
              border: `4px solid ${selected ? tone.main : '#e6d8ce'}`,
              boxShadow: selected ? `0 6px 0 ${tone.deep}` : '0 4px 0 #e2c4cb',
            }}
          >
            {selected && (
              <motion.div
                layoutId="theme-check"
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: tone.main }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                ✓
              </motion.div>
            )}
            <span className="text-4xl sm:text-5xl">{theme.emoji}</span>
            <span
              className="text-base sm:text-lg font-bold"
              style={{ color: selected ? tone.deep : '#966b78' }}
            >
              {theme.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
