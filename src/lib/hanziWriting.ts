/**
 * 汉字描红书写评分（真实笔顺数据驱动）
 * ------------------------------------------------------------
 * 把 HanziStrokeWriter 的「固定 3 星」改为真实判定：
 *   - 孩子描红的轨迹（1024 书法坐标点集）与整字所有笔画中线比对；
 *   - 计算「覆盖度」（笔画中线采样点被轨迹命中的比例）与「贴合度」
 *     （孩子轨迹点落在笔画附近的比率，防乱涂）；
 *   - 据此给出 1~3 星与小鱼干奖励。
 *
 * 与 StrokeTrace（逐笔跟写、按笔顺严格判定）不同，这里是**自由描红**
 * 整体评分，不要求笔顺，只看「描得像不像」，更贴合儿童自由书写场景。
 */
import { densifyMedian, type StrokeData } from './strokes';

const TOL = 120; // 命中容差（1024 空间单位），约等于屏幕 35px
const COVER_3 = 0.75; // ≥3 星覆盖阈值
const COVER_2 = 0.5; // ≥2 星覆盖阈值
const COVER_1 = 0.25; // ≥1 星覆盖阈值
const NEAR_NEED = 0.55; // 防乱涂：轨迹点落在笔画附近的比率下限
const LEN_RATIO = 0.35; // 轨迹总长相对整字中线的比例下限（太少说明没描）

type Pt = [number, number];

function dist(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pathLen(pts: Pt[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i]!, pts[i - 1]!);
  return l;
}

export interface WritingGrade {
  /** 1~3 星 */
  stars: number;
  /** 小鱼干奖励 */
  fish: number;
  /** 覆盖度 0-1（调试/展示用） */
  coverage: number;
  /** 贴合度 0-1 */
  nearRate: number;
}

/**
 * 对孩子的描红轨迹评分。
 * @param trail 孩子轨迹点（1024 书法坐标，y 向上）
 * @param data 该字的笔顺数据（含每笔中线 m）
 */
export function gradeHanziWriting(trail: Pt[], data: StrokeData | null): WritingGrade {
  // 无笔顺数据：回退到保守判定——有足够轨迹就给 2 星，否则 1 星
  if (!data || !data.m.length) {
    const hasSome = trail.length >= 4;
    return { stars: hasSome ? 2 : 1, fish: hasSome ? 1 : 0, coverage: hasSome ? 0.6 : 0, nearRate: 1 };
  }

  // 合并所有笔画中线为一个稠密参考点集
  const allMedian: Pt[] = [];
  for (const m of data.m) {
    if (m.length) allMedian.push(...(densifyMedian(m, 20) as Pt[]));
  }
  if (!allMedian.length) {
    return { stars: 1, fish: 0, coverage: 0, nearRate: 1 };
  }

  // 覆盖度：每个参考采样点附近是否有轨迹
  let hit = 0;
  for (const mp of allMedian) {
    for (const dp of trail) {
      if (dist(dp, mp) <= TOL) {
        hit++;
        break;
      }
    }
  }
  const coverage = hit / allMedian.length;

  // 贴合度：孩子轨迹点落在笔画附近的比率（防乱涂）
  let near = 0;
  for (const dp of trail) {
    for (const mp of allMedian) {
      if (dist(dp, mp) <= TOL * 1.3) {
        near++;
        break;
      }
    }
  }
  const nearRate = trail.length ? near / trail.length : 0;

  // 轨迹长度相对整字中线长度（防只点了一下）
  const totalLen = allMedian.reduce((s, p, i) => (i ? s + dist(p, allMedian[i - 1]!) : s), 0);
  const enoughLen = pathLen(trail) >= totalLen * LEN_RATIO;

  const nearOk = nearRate >= NEAR_NEED;

  let stars = 1;
  if (enoughLen && coverage >= COVER_3 && nearOk) stars = 3;
  else if (enoughLen && coverage >= COVER_2 && nearOk) stars = 2;
  else if (coverage >= COVER_1) stars = 1;
  // 乱涂或轨迹太少，仍给 1 星鼓励，但不给鱼干
  const fish = stars >= 3 ? 2 : stars === 2 ? 1 : 0;

  return { stars, fish, coverage, nearRate };
}

/** 屏幕 canvas 坐标 → 1024 书法坐标（y 翻转：canvas y 向下 → 书法 y 向上） */
export function canvasToStroke1024(x: number, y: number, size = 256): Pt {
  return [Math.round((x / size) * 1024), Math.round(((size - y) / size) * 1024)];
}
