// @vitest-environment jsdom
/**
 * 🌿 BotanicalLab.test.tsx
 * 单元测试：植物生命周期与昆虫微观生态实验室 Pro
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { BotanicalLab } from '../BotanicalLab';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../ScienceAiPanel', () => ({
  ScienceAiPanel: () => <div data-testid="science-ai-panel">AI Panel</div>,
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('BotanicalLab Component Pro', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = mkDiv();
  });

  afterEach(() => {
    act(() => { root?.unmount(); });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders default plant growth lab with 8 plant options and care tools', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BotanicalLab />);
    });

    expect(container.textContent).toContain('植物培育仓 (8种)');
    expect(container.textContent).toContain('金色向日葵');
    expect(container.textContent).toContain('浇水');
    expect(container.textContent).toContain('光照');
    expect(container.textContent).toContain('施肥');
    expect(container.textContent).toContain('松土');
  });

  it('handles watering, sunlight, fertilizer, and soil loosening interactions', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BotanicalLab />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const waterBtn = buttons.find((b) => b.textContent?.includes('浇水'));
    const sunBtn = buttons.find((b) => b.textContent?.includes('光照'));
    const soilBtn = buttons.find((b) => b.textContent?.includes('松土'));

    await act(async () => { waterBtn?.click(); });
    await act(async () => { sunBtn?.click(); });
    await act(async () => { soilBtn?.click(); });

    expect(container.textContent).toContain('阶段');
  });

  it('switches plant species cleanly (e.g. 脆甜大西瓜 / 水中圣洁荷花)', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BotanicalLab />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const watermelonBtn = buttons.find((b) => b.textContent?.includes('脆甜大西瓜'));
    await act(async () => { watermelonBtn?.click(); });

    expect(container.textContent).toContain('脆甜大西瓜');
    expect(container.textContent).toContain('匍匐深广吸水根系');

    const lotusBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('水中圣洁荷花'),
    );
    await act(async () => { lotusBtn?.click(); });
    expect(container.textContent).toContain('水中圣洁荷花');
    expect(container.textContent).toContain('水下淤泥莲藕肉质根');

    const cactusBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('沙漠神奇仙人掌'),
    );
    await act(async () => { cactusBtn?.click(); });
    expect(container.textContent).toContain('沙漠神奇仙人掌');
    expect(container.textContent).toContain('微型黑种吸水萌发');

    const tomatoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('多汁小番茄'),
    );
    await act(async () => { tomatoBtn?.click(); });
    expect(container.textContent).toContain('多汁小番茄');
    expect(container.textContent).toContain('种子吸水与胚根初萌');
  });

  it('switches to insect metamorphosis mode and views lifecycle steps', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BotanicalLab />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const insectBtn = buttons.find((b) => b.textContent?.includes('昆虫生态瓶'));
    await act(async () => { insectBtn?.click(); });

    expect(container.textContent).toContain('彩蝶破茧羽化');
    expect(container.textContent).toContain('翠绿虫卵');
    expect(container.textContent).toContain('贪吃毛毛虫');

    // 切换到独角仙
    const beetleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('独角仙铁甲斗士'),
    );
    await act(async () => { beetleBtn?.click(); });
    expect(container.textContent).toContain('独角仙铁甲斗士');
  });

  it('switches to microscope X-Ray inspector and changes magnification targets', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BotanicalLab />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const microBtn = buttons.find((b) => b.textContent?.includes('显微透视台'));
    await act(async () => { microBtn?.click(); });

    expect(container.textContent).toContain('MAGNIFICATION: 400X');
    expect(container.textContent).toContain('叶绿体');

    // 切换至根系
    const rootBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('根系导管输水'),
    );
    await act(async () => { rootBtn?.click(); });
    expect(container.textContent).toContain('木质部导管');
  });

  it('switches to eco-symbiosis garden and triggers insect-plant actions', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BotanicalLab />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const symBtn = buttons.find((b) => b.textContent?.includes('共生互动园'));
    await act(async () => { symBtn?.click(); });

    expect(container.textContent).toContain('蜜蜂传粉 ✕ 向日葵');
    expect(container.textContent).toContain('七星瓢虫 ✕ 番茄卫士');
    expect(container.textContent).toContain('蚂蚁兵团 ✕ 刺槐树');
    expect(container.textContent).toContain('菌根真菌 ✕ 森林地下网');
  });

  it('switches to natural quiz mode and handles answers', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BotanicalLab />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const quizBtn = buttons.find((b) => b.textContent?.includes('自然小博士'));
    await act(async () => { quizBtn?.click(); });

    expect(container.textContent).toContain('小考官');

    const optButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      ['氧气', '灰尘', '水汽', '氮气'].some((txt) => b.textContent?.includes(txt)),
    );
    expect(optButtons.length).toBeGreaterThan(0);

    await act(async () => { optButtons[0]?.click(); });
    expect(container.textContent).toContain('挑战下一题');
  });
});

