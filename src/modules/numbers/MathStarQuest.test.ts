import { describe, it, expect } from "vitest";
import { getMathQuest, MATH_MILESTONES } from "./MathStarQuest";

describe("getMathQuest", () => {
  it("未答对任何题时处于起点", () => {
    const q = getMathQuest(0);
    expect(q.current).toBeNull();
    expect(q.next).toBe(MATH_MILESTONES[0]!);
    expect(q.progressPct).toBe(0);
    expect(q.reachedCount).toBe(0);
  });

  it("负数按 0 处理", () => {
    expect(getMathQuest(-3)).toEqual(getMathQuest(0));
  });

  it("抵达第一个里程碑（5 题）", () => {
    const q = getMathQuest(5);
    expect(q.current).toBe(MATH_MILESTONES[0]!);
    expect(q.next).toBe(MATH_MILESTONES[1]!);
    expect(q.reachedCount).toBe(1);
    expect(q.progressPct).toBe(25); // (5-0)/(20-0)
  });

  it("抵达第二个里程碑（20 题）", () => {
    const q = getMathQuest(20);
    expect(q.current).toBe(MATH_MILESTONES[1]!);
    expect(q.next).toBe(MATH_MILESTONES[2]!);
    expect(q.reachedCount).toBe(2);
    expect(q.progressPct).toBe(33); // (20-5)/(50-5) 四舍五入
  });

  it("抵达第三个里程碑（50 题）", () => {
    const q = getMathQuest(50);
    expect(q.current).toBe(MATH_MILESTONES[2]!);
    expect(q.next).toBe(MATH_MILESTONES[3]!);
    expect(q.reachedCount).toBe(3);
    expect(q.progressPct).toBe(38); // (50-20)/(100-20) 四舍五入
  });

  it("抵达最终里程碑（100 题）后无下一目标", () => {
    const q = getMathQuest(100);
    expect(q.current).toBe(MATH_MILESTONES[3]!);
    expect(q.next).toBeNull();
    expect(q.reachedCount).toBe(4);
    expect(q.progressPct).toBe(100);
  });

  it("超过最终里程碑仍保持满进度", () => {
    const q = getMathQuest(150);
    expect(q.next).toBeNull();
    expect(q.progressPct).toBe(100);
  });
});
