// @vitest-environment jsdom
/**
 * 家长学习报告面板（E1）· 一致性守护测试
 * 聚焦：报告面板真实读取进度/护眼数据源并渲染关键指标，不回退为死 UI。
 * 不依赖 AI 流/语音/全局业务副作用；store 与翻译均 mock 为可断言形态。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const mockProgress: Record<string, unknown> = {
  stars: 0,
  streak: 0,
  badges: [] as string[],
  mathCorrect: 0,
  mathTotal: 0,
  mastery: {} as Record<string, number>,
  lettersHeard: [] as string[],
  numbersHeard: [] as string[],
  poemsRead: [] as string[],
  dailyLog: {} as Record<string, { sec: number }>,
};

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@/store/useStore', () => ({
  useStore: (selector?: (s: { progress: typeof mockProgress }) => unknown) =>
    selector ? selector({ progress: mockProgress }) : { progress: mockProgress },
}));
vi.mock('@/store/useSettingsStore', () => ({
  useSettingsStore: () => ({
    settings: { eyeCareMode: false, eyeCareMin: 20, dailyLimitMin: 30 },
  }),
}));
vi.mock('@/store/useProfilesStore', () => ({
  useActiveProfileMeta: () => undefined,
}));

import { LearningReportPanel } from './LearningReportPanel';
import { dateKey } from '@/lib/dailyPlan';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

function render() {
  act(() => {
    root.render(createElement(LearningReportPanel));
  });
}

describe('LearningReportPanel（E1 家长报告）', () => {
  it('渲染报告标题与护眼守护区块', () => {
    render();
    const text = host.textContent ?? '';
    expect(text).toContain('parent.report');
    expect(text).toContain('parent.eyeCare');
    expect(text).toContain('parent.eyeCareMode');
  });

  it('无学习数据时展示引导文案', () => {
    render();
    expect(host.textContent).toContain('parent.noLearningYet');
  });

  it('渲染真实进度指标（星星/连续/徽章/已熟练/正确率）', () => {
    mockProgress.stars = 12;
    mockProgress.streak = 3;
    mockProgress.badges = ['b1', 'b2'];
    mockProgress.mathCorrect = 8;
    mockProgress.mathTotal = 10;
    mockProgress.mastery = { a: 1 };
    mockProgress.lettersHeard = ['x'];
    mockProgress.numbersHeard = ['y'];
    mockProgress.poemsRead = ['z'];
    mockProgress.dailyLog = { [dateKey()]: { sec: 600 } };
    render();
    const text = host.textContent ?? '';
    expect(text).toContain('12'); // 星星
    expect(text).toContain('3'); // 连续天数
    expect(text).toContain('2'); // 徽章数
    expect(text).toContain('1'); // 已熟练
    expect(text).toContain('80%'); // 正确率
    expect(text).toContain('common.minutes'); // 今日时长（mock 翻译返回 key）
    expect(text).not.toContain('parent.noLearningYet'); // 已有数据则不再显示引导
  });
});
