import { describe, it, expect } from 'vitest';
import { levelOf, levelOfChar, rhymeBase, buildStandardGrid } from './prosody';

describe('prosody · levelOf()', () => {
  it('一声为平', () => {
    expect(levelOf('mā')).toBe('平');
    expect(levelOf('tiān')).toBe('平');
  });

  it('二声为平', () => {
    expect(levelOf('má')).toBe('平');
    expect(levelOf('rén')).toBe('平');
  });

  it('三声为仄', () => {
    expect(levelOf('mǎ')).toBe('仄');
    expect(levelOf('shuǐ')).toBe('仄');
  });

  it('四声为仄', () => {
    expect(levelOf('mà')).toBe('仄');
    expect(levelOf('yuè')).toBe('仄');
  });

  it('空串返回空', () => {
    expect(levelOf('')).toBe('');
  });

  it('轻声归平', () => {
    expect(levelOf('de')).toBe('平');
  });
});

describe('prosody · levelOfChar()', () => {
  it('入声字归仄（即使今读平声）', () => {
    // 「一」今读 yī（一声，平），但古入声，格律上作仄
    const r = levelOfChar('一', 'yī');
    expect(r.level).toBe('仄');
    expect(r.ru).toBe(true);
  });

  it('非入声字按今读声调判定', () => {
    // 「天」今读 tiān（一声，平），非入声
    const r = levelOfChar('天', 'tiān');
    expect(r.level).toBe('平');
    expect(r.ru).toBe(false);
  });

  it('标点/非汉字返回空', () => {
    expect(levelOfChar('，', '').level).toBe('');
    expect(levelOfChar('!', '').level).toBe('');
  });

  it('空拼音返回空', () => {
    expect(levelOfChar('字', '').level).toBe('');
  });
});

describe('prosody · rhymeBase()', () => {
  it('发花辙：-a 韵母', () => {
    expect(rhymeBase('huā')).toBe('a');
    expect(rhymeBase('jiā')).toBe('a');
  });

  it('言前辙：-an 韵母', () => {
    expect(rhymeBase('tiān')).toBe('an');
    expect(rhymeBase('shān')).toBe('an');
  });

  it('江阳辙：-ang 韵母', () => {
    expect(rhymeBase('guāng')).toBe('ang');
    expect(rhymeBase('máng')).toBe('ang');
  });

  it('遥条辙：-ao 韵母', () => {
    expect(rhymeBase('gāo')).toBe('ao');
    expect(rhymeBase('yáo')).toBe('ao');
  });

  it('空串返回空', () => {
    expect(rhymeBase('')).toBe('');
  });

  it('ü 归入一七辙', () => {
    // 「女」nǚ 的韵母 ü 归一七辙
    expect(rhymeBase('nǚ')).toBe('i');
  });
});

describe('prosody · buildStandardGrid()', () => {
  it('五言仄起不入韵 4 句', () => {
    const grid = buildStandardGrid(5, '仄', false, false);
    expect(grid.length).toBe(4);
    // 第一句第二字（节奏点）应为仄
    expect(grid[0]![1]).toBe('仄');
  });

  it('七言平起入韵 4 句', () => {
    const grid = buildStandardGrid(7, '平', true, false);
    expect(grid.length).toBe(4);
    // 第一句第二字（节奏点）应为平
    expect(grid[0]![1]).toBe('平');
  });

  it('律诗 8 句（基准重复一次）', () => {
    const grid = buildStandardGrid(5, '仄', false, true);
    expect(grid.length).toBe(8);
  });

  it('七言每句 7 字', () => {
    const grid = buildStandardGrid(7, '平', true, false);
    grid.forEach((line) => expect(line.length).toBe(7));
  });

  it('五言每句 5 字', () => {
    const grid = buildStandardGrid(5, '平', false, false);
    grid.forEach((line) => expect(line.length).toBe(5));
  });
});
