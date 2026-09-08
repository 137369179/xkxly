// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { createElement } from 'react';

import { PinyinKingdomMap } from '../components/PinyinKingdomMap';
import { PinyinToneCar } from '../components/PinyinToneCar';
import { PinyinVoiceStudio } from '../components/PinyinVoiceStudio';
import { PinyinPracticeMiniGames } from '../components/PinyinPracticeMiniGames';
import { PinyinCodexModal } from '../components/PinyinCodexModal';
import { PinyinLearn } from '../PinyinLearn';

import { KINGDOM_ISLANDS, getKingdomLevel } from '@/data/pinyinKingdomData';
import { getAllPinyin } from '@/data/pinyinIndex';

// Mock speech
vi.mock('@/lib/speech', () => ({
  speak: vi.fn(),
  speakSequence: vi.fn(),
  stopSpeaking: vi.fn(),
}));

// Mock sfx
vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

// Mock celebrate
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

// Mock store
const fakeStore = {
  stars: 50,
  progress: {
    mastery: {
      'pinyin:a': { lv: 2, lastReview: 1000 },
      'pinyin:o': { lv: 1, lastReview: 1000 },
    },
  },
  addStars: vi.fn(),
  learnSkill: vi.fn(),
  practice: vi.fn(),
};

vi.mock('@/store/useStore', () => ({
  useStore: (selector: (s: any) => any) => selector(fakeStore),
  useStars: () => fakeStore.stars,
}));

describe('小莤拼音数据架构 (Kingdom Data Specs)', () => {
  it('定义了 5 大核心岛屿，且 levelIds 与配置完整', () => {
    expect(KINGDOM_ISLANDS.length).toBe(5);
    const ids = KINGDOM_ISLANDS.map((i) => i.id);
    expect(ids).toContain('single_final');
    expect(ids).toContain('initial');
    expect(ids).toContain('compound_nasal');
    expect(ids).toContain('whole_syllable');
    expect(ids).toContain('phonics_lab');
  });

  it('全量 63 个拼音均能通过 getKingdomLevel 解析完整拟人与四线三格规格', () => {
    const all = getAllPinyin();
    expect(all.length).toBe(63);
    for (const p of all) {
      const lvl = getKingdomLevel(p.p);
      expect(lvl.p).toBe(p.p);
      expect(lvl.personification.character).toBeTruthy();
      expect(lvl.fourLineGrid.position).toBeTruthy();
      expect(lvl.fourLineGrid.strokeNames.length).toBeGreaterThan(0);
    }
  });
});

describe('PinyinKingdomMap 关卡大地图', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('渲染小莤拼音王国大冒险标头与 5 大岛屿切换按钮', async () => {
    await act(async () => {
      root.render(
        createElement(PinyinKingdomMap, {
          onSelectLevel: vi.fn(),
          onOpenCodex: vi.fn(),
          onOpenPhonicsLab: vi.fn(),
        })
      );
    });

    expect(container.textContent).toContain('小莤拼音王国大冒险');
    expect(container.textContent).toContain('单韵母奇妙村');
    expect(container.textContent).toContain('声母探险森林');
    expect(container.textContent).toContain('拼音宝典');
  });

  it('点击关卡节点触发 onSelectLevel', async () => {
    const onSelect = vi.fn();
    await act(async () => {
      root.render(
        createElement(PinyinKingdomMap, {
          onSelectLevel: onSelect,
          onOpenCodex: vi.fn(),
          onOpenPhonicsLab: vi.fn(),
        })
      );
    });

    const levelElement = [...container.querySelectorAll('*')].find(
      (el) => el.textContent === 'a'
    );
    expect(levelElement).toBeTruthy();

    await act(async () => {
      (levelElement as HTMLElement).click();
    });

    expect(onSelect).toHaveBeenCalled();
  });
});

describe('PinyinToneCar 四声调小汽车过山车', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('渲染四声调发音按钮与小汽车轨道', async () => {
    await act(async () => {
      root.render(createElement(PinyinToneCar, { basePinyin: 'a' }));
    });

    expect(container.textContent).toContain('四声调过山车');
    expect(container.textContent).toContain('一声平');
    expect(container.textContent).toContain('二声扬');
    expect(container.textContent).toContain('三声转');
    expect(container.textContent).toContain('四声降');
  });

  it('点击切换二声调并更新例字展示', async () => {
    await act(async () => {
      root.render(createElement(PinyinToneCar, { basePinyin: 'a' }));
    });

    const buttons = container.querySelectorAll('button');
    const tone2Btn = [...buttons].find((b) => b.textContent?.includes('二声扬'));
    expect(tone2Btn).toBeTruthy();

    await act(async () => {
      tone2Btn!.click();
    });

    expect(container.textContent).toContain('á');
  });
});

describe('PinyinVoiceStudio 变声魔镜录音棚', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('渲染录音棚标题、趣味变声试听魔法器与4种声效', async () => {
    const level = getKingdomLevel('a');
    await act(async () => {
      root.render(createElement(PinyinVoiceStudio, { level, onPass: vi.fn() }));
    });

    expect(container.textContent).toContain('变声魔镜录音棚');
    expect(container.textContent).toContain('趣味变声试听魔法器');
    expect(container.textContent).toContain('机械战警');
    expect(container.textContent).toContain('花栗鼠');
    expect(container.textContent).toContain('巨石怪');
  });
});

describe('PinyinPracticeMiniGames 趣味小游戏', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('渲染 3 种趣味玩法标签与题目', async () => {
    const level = getKingdomLevel('a');
    await act(async () => {
      root.render(createElement(PinyinPracticeMiniGames, { level, onPass: vi.fn() }));
    });

    expect(container.textContent).toContain('听音戳气球');
    expect(container.textContent).toContain('声调魔术帽');
    expect(container.textContent).toContain('看图配对');
    expect(container.textContent).toContain('第 1/3 题');
  });
});

describe('PinyinCodexModal 63 拼音图鉴宝典', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('渲染图鉴收集总进度与分类筛选', async () => {
    await act(async () => {
      root.render(
        createElement(PinyinCodexModal, {
          isOpen: true,
          onClose: vi.fn(),
        })
      );
    });

    expect(document.body.textContent).toContain('小莤拼音全量图鉴宝典');
    expect(document.body.textContent).toContain('荣耀金卡');
    expect(document.body.textContent).toContain('探索银卡');
    expect(document.body.textContent).toContain('单韵母 (6)');
    expect(document.body.textContent).toContain('声母 (23)');
  });
});

describe('PinyinLearn 五步超级教学闭环', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('渲染 玩·认·读·写·练 5 步流程与正在学习提示', async () => {
    const all = getAllPinyin();
    const entry = all[0]!;
    await act(async () => {
      root.render(createElement(PinyinLearn, { entry, onDone: vi.fn() }));
    });

    expect(container.textContent).toContain('当前关卡');
    expect(container.textContent).toContain('玩');
    expect(container.textContent).toContain('认');
    expect(container.textContent).toContain('读');
    expect(container.textContent).toContain('写');
    expect(container.textContent).toContain('练');
  });
});
