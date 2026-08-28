import { describe, it, expect } from 'vitest';
import { analyzeChant, calculateTokenTimeOffsets } from '../chant';
import type { DeepPoem } from '@/types';

describe('chant · Karaoke Token Time Offsets', () => {
  const samplePoem: DeepPoem = {
    id: 'jing-ye-si',
    title: '静夜思',
    titleChars: [
      { c: '静', p: 'jìng' },
      { c: '夜', p: 'yè' },
      { c: '思', p: 'sī' },
    ],
    author: '李白',
    dynasty: '唐',
    level: 1,
    tags: ['思乡', '写景'],
    lines: [
      {
        text: '床前明月光，',
        chars: [
          { c: '床', p: 'chuáng' },
          { c: '前', p: 'qián' },
          { c: '明', p: 'míng' },
          { c: '月', p: 'yuè' },
          { c: '光', p: 'guāng' },
          { c: '，', p: '' },
        ],
      },
      {
        text: '疑是地上霜。',
        chars: [
          { c: '疑', p: 'yí' },
          { c: '是', p: 'shì' },
          { c: '地', p: 'dì' },
          { c: '上', p: 'shàng' },
          { c: '霜', p: 'shuāng' },
          { c: '。', p: '' },
        ],
      },
    ],
  };

  it('calculates continuous increasing timestamps for poem lines', () => {
    const plan = analyzeChant(samplePoem, 'fan');
    const firstLine = plan.lines[0];
    expect(firstLine).toBeDefined();

    const offsets = calculateTokenTimeOffsets(firstLine!);
    expect(offsets.length).toBeGreaterThanOrEqual(5);

    expect(offsets[0]!.startMs).toBe(0);
    expect(offsets[0]!.durationMs).toBeGreaterThan(0);

    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]!.startMs).toBe(offsets[i - 1]!.startMs + offsets[i - 1]!.durationMs);
    }
  });
});
