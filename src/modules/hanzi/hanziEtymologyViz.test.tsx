// @vitest-environment jsdom
/**
 * 字理可视化组件（P2）渲染测试
 * ============================================================
 * 覆盖四类教学正确性不变量 + 四类典型字的渲染不崩溃：
 *   - 形声字「清」：形旁(氵)+声旁(青) 都标出，且声旁显示读音关系
 *   - 形声不表音字「江」：只标形旁，绝不含「声旁/读音」措辞（防教错护栏）
 *   - 象形字「山」：拼字动画走「整体字」分支，不渲染部件拆解
 *   - 会意字「明」：日 + 月 拼装
 *   - 字族根「青」：带出 清/情/晴/请；叶子「清」回退到所属字族
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LiushuBadge } from './LiushuBadge';
import { ComponentBreakdown } from './ComponentBreakdown';
import { AssemblyAnimation } from './AssemblyAnimation';
import { HanziFamilyTree } from './HanziFamilyTree';
import { FormationExplainer } from './FormationExplainer';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(node);
  });
  return host;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  if (host) host.remove();
  root = null;
  host = null;
});

describe('LiushuBadge', () => {
  it('形声字显示「形声字」徽章', () => {
    const el = render(createElement(LiushuBadge, { liushu: 'pictophonetic' as const }));
    expect(el.textContent).toContain('形声字');
  });
  it('象形字显示「象形字」徽章', () => {
    const el = render(createElement(LiushuBadge, { liushu: 'pictographic' as const }));
    expect(el.textContent).toContain('象形字');
  });
});

describe('ComponentBreakdown', () => {
  it('清：形旁+声旁都标出，声旁显示读音关系', () => {
    const el = render(createElement(ComponentBreakdown, { char: '清' }));
    expect(el.textContent).toContain('氵');
    expect(el.textContent).toContain('青');
    expect(el.textContent).toContain('形旁·表义');
    expect(el.textContent).toContain('声旁·表音');
    expect(el.textContent).toContain('读音一样'); // 清 qīng ← 青 qīng exact
  });

  it('江（声旁已不表音）：绝不含「声旁/读音」措辞', () => {
    const el = render(createElement(ComponentBreakdown, { char: '江' }));
    expect(el.textContent).toContain('氵');
    expect(el.textContent).toContain('工');
    expect(el.textContent).not.toContain('声旁·表音');
    expect(el.textContent).not.toContain('读音');
  });

  it('山（象形独体）：无拆解面板', () => {
    const el = render(createElement(ComponentBreakdown, { char: '山' }));
    expect(el.childElementCount).toBe(0);
  });
});

describe('AssemblyAnimation', () => {
  it('明：渲染 日 + 月 = 明 拼装', () => {
    const el = render(createElement(AssemblyAnimation, { char: '明' }));
    expect(el.textContent).toContain('日');
    expect(el.textContent).toContain('月');
    expect(el.textContent).toContain('明');
  });

  it('山：整体字分支不崩溃', () => {
    const el = render(createElement(AssemblyAnimation, { char: '山' }));
    expect(el.textContent).toContain('山');
    expect(el.textContent).toContain('整体字');
  });
});

describe('HanziFamilyTree', () => {
  it('青（字族根）：带出派生字并标注声旁角色', () => {
    const el = render(createElement(HanziFamilyTree, { char: '青' }));
    expect(el.textContent).toContain('清');
    expect(el.textContent).toContain('字根');
    expect(el.textContent).toContain('声旁·表音');
  });

  it('清（叶子字）：回退到所属字族，提示「字族的一员」', () => {
    const el = render(createElement(HanziFamilyTree, { char: '清' }));
    expect(el.textContent).toContain('青');
    expect(el.textContent).toContain('字族的一员');
  });
});

describe('FormationExplainer', () => {
  it('江：讲解含形旁但不声称声旁表音', () => {
    const el = render(createElement(FormationExplainer, { char: '江' }));
    expect(el.textContent).toContain('氵');
    expect(el.textContent).toContain('工');
    expect(el.textContent).not.toContain('声旁');
    expect(el.textContent).not.toContain('读音一样');
  });

  it('清：讲解提示声旁读音一样', () => {
    const el = render(createElement(FormationExplainer, { char: '清' }));
    expect(el.textContent).toContain('读音一样');
  });
});
