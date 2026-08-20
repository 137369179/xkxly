// @vitest-environment node
/**
 * 闯关里程碑条（StreakBar）渲染与逻辑单测
 * 校验：圆点数 = target、点亮数 = streak、达 0/全亮边界。
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { StreakBar } from './StreakBar';

describe('StreakBar 渲染', () => {
  it('渲染 target 个圆点，点亮 streak 个（0 起点）', () => {
    const html = renderToStaticMarkup(createElement(StreakBar, { streak: 0, target: 3 }));
    const dots = html.match(/streak-dot-/g) ?? [];
    expect(dots.length).toBe(3);
    expect(html.includes('data-on="1"')).toBe(false);
  });

  it('streak 部分点亮时，前 streak 个 on=1，其余 on=0', () => {
    const html = renderToStaticMarkup(createElement(StreakBar, { streak: 2, target: 4 }));
    const onCount = (html.match(/data-on="1"/g) ?? []).length;
    const offCount = (html.match(/data-on="0"/g) ?? []).length;
    expect(onCount).toBe(2);
    expect(offCount).toBe(2);
  });

  it('全亮边界：streak=target', () => {
    const html = renderToStaticMarkup(createElement(StreakBar, { streak: 3, target: 3 }));
    expect((html.match(/data-on="1"/g) ?? []).length).toBe(3);
  });

  it('超出 target 的 streak 安全截断为全亮', () => {
    const html = renderToStaticMarkup(createElement(StreakBar, { streak: 9, target: 3 }));
    expect((html.match(/streak-dot-/g) ?? []).length).toBe(3);
    expect((html.match(/data-on="1"/g) ?? []).length).toBe(3);
  });
});