/**
 * 学习困难实时干预
 * ------------------------------------------------------------
 * 当孩子连续答错 N 题时，单纯继续出题会打击积极性。
 * 本模块提供：
 *   - STRUGGLE_THRESHOLD：触发干预的连错阈值（默认 3 题）
 *   - STRUGGLE_MESSAGES：比 randomEncourage 更温和、更具引导性的话语池
 *   - useStruggle() hook：跟踪连续答错次数，达到阈值时返回 isStruggling 信号
 *
 * 干预方式（由调用方决定 UI）：
 *   1. 弹出鼓励 Modal，含「继续加油」/「跳过这题」两个选项
 *   2. 选择「跳过」时直接进入下一题，重置连错计数
 *   3. 选择「继续」时重置连错计数，让孩子重新开始
 *
 * 设计依据：洪恩识字「错了不批评、卡住给提示」的儿童心理学原则，
 * 避免 6 岁孩子在连错后产生挫败感而放弃学习。
 */
import { useCallback, useState } from 'react';

/** 连续答错多少题后触发干预 */
export const STRUGGLE_THRESHOLD = 3;

/**
 * 干预话语池：连错时使用，比单题答错的 randomEncourage 更长更温和，
 * 包含「没关系」「慢慢来」「一起想想」等引导性表达，降低挫败感。
 */
export const STRUGGLE_MESSAGES: string[] = [
  '没关系，学习新东西总要试几次的，我们一起再来一遍！',
  '别着急，慢慢想，你已经很棒啦，再来一次好不好？',
  '错了也没关系，每个小朋友都会错的，我们换个角度想想～',
  '深呼吸一下，你已经学了很多啦，这题我们再试试看！',
  '这题有点难对不对？没关系，多试几次就会啦，加油！',
  '小智相信你可以的！我们休息一下，再来一次好不好？',
  '别灰心，学习就像爬山，一步一步来，你已经在进步啦！',
  '没关系哦，错了才知道哪里要再学一遍，我们继续！',
];

/** 随机选一条干预话语 */
export function pickStruggleMessage(): string {
  return STRUGGLE_MESSAGES[Math.floor(Math.random() * STRUGGLE_MESSAGES.length)]!;
}

/**
 * 连错检测 hook
 * ------------------------------------------------------------
 * 用法：
 *   const { wrongStreak, record, reset, isStruggling } = useStruggle();
 *   // 答错时：record(false); 答对时：record(true);
 *   // isStruggling 为 true 时弹干预 Modal
 *   // 用户处理后调用 reset()
 */
export function useStruggle(threshold: number = STRUGGLE_THRESHOLD) {
  const [wrongStreak, setWrongStreak] = useState(0);
  const [intervened, setIntervened] = useState(false);

  const record = useCallback(
    (correct: boolean) => {
      if (correct) {
        setWrongStreak(0);
        setIntervened(false);
        return;
      }
      setWrongStreak((prev) => {
        const next = prev + 1;
        // 达到阈值且尚未干预过，标记为 struggling
        if (next >= threshold && !intervened) {
          setIntervened(true);
        }
        return next;
      });
    },
    [intervened, threshold],
  );

  const reset = useCallback(() => {
    setWrongStreak(0);
    setIntervened(false);
  }, []);

  /** 是否处于"需要干预"状态：连错达到阈值且本轮尚未干预 */
  const isStruggling = intervened && wrongStreak >= threshold;

  return { wrongStreak, record, reset, isStruggling };
}
