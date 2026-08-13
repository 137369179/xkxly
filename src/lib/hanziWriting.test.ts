import { describe, it, expect } from 'vitest';
import { gradeHanziWriting, canvasToStroke1024 } from './hanziWriting';
import type { StrokeData } from './strokes';

/** 构造一个简单的一笔横（从左到右的水平中线），便于测试判定 */
function makeHorizontalStroke(): StrokeData {
  const m: [number, number][][] = [];
  const pts: [number, number][] = [];
  for (let x = 100; x <= 900; x += 20) pts.push([x, 500]);
  m.push(pts);
  return { s: [], m };
}

describe('gradeHanziWriting', () => {
  it('空轨迹或乱点 → 1 星，无鱼干', () => {
    const data = makeHorizontalStroke();
    const grade = gradeHanziWriting([], data);
    expect(grade.stars).toBe(1);
    expect(grade.fish).toBe(0);
  });

  it('轨迹完整覆盖笔画中线 → 3 星 + 2 鱼干', () => {
    const data = makeHorizontalStroke();
    // 沿中线密集描一遍
    const trail: [number, number][] = [];
    for (let x = 100; x <= 900; x += 5) trail.push([x, 500]);
    const grade = gradeHanziWriting(trail, data);
    expect(grade.coverage).toBeGreaterThan(0.75);
    expect(grade.stars).toBe(3);
    expect(grade.fish).toBe(2);
  });

  it('部分覆盖 → 2 星 + 1 鱼干', () => {
    const data = makeHorizontalStroke();
    const trail: [number, number][] = [];
    for (let x = 100; x <= 550; x += 5) trail.push([x, 500]);
    const grade = gradeHanziWriting(trail, data);
    expect(grade.stars).toBe(2);
    expect(grade.fish).toBe(1);
  });

  it('乱涂（远离笔画）→ 贴合度不足，1 星', () => {
    const data = makeHorizontalStroke();
    const trail: [number, number][] = [];
    for (let x = 0; x < 50; x++) trail.push([x * 20, 100]); // 全在笔画上方很远
    const grade = gradeHanziWriting(trail, data);
    expect(grade.stars).toBe(1);
    expect(grade.fish).toBe(0);
  });

  it('无笔顺数据 → 有轨迹给 2 星', () => {
    const trail: [number, number][] = [
      [100, 100],
      [200, 200],
      [300, 300],
      [400, 400],
    ];
    const grade = gradeHanziWriting(trail, null);
    expect(grade.stars).toBe(2);
  });

  it('canvasToStroke1024 坐标翻转正确', () => {
    // canvas (0,0) 左上 → 书法 (0, 1024)；canvas (256,0) 右上 → (1024, 1024)
    expect(canvasToStroke1024(0, 0, 256)).toEqual([0, 1024]);
    expect(canvasToStroke1024(256, 0, 256)).toEqual([1024, 1024]);
    expect(canvasToStroke1024(0, 256, 256)).toEqual([0, 0]);
  });
});
