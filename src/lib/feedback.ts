/**
 * 统一即时反馈助手（游戏化·即时反馈）
 * ------------------------------------------------------------------
 * 把「音效 + 彩带 + 场景化话术」编排成一行调用，让各模块反馈口径一致：
 *   - 答对：sfxCorrect + celebrateSmall + 场景表扬话术 → 返回话术文本
 *   - 答错：sfxWrong + 场景温和鼓励话术 → 返回话术文本
 * 语料/彩带/音效均复用既有单例（praise / celebrate / sfx），不重复造词。
 * 调用方拿返回文本自行决定是否朗读/展示（避免本模块替所有调用方决定朗读时机）。
 */
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { praiseByScene, encourageByScene, type PraiseScene, type EncourageScene } from '@/lib/praise';

/**
 * 答对反馈：音效 + 彩带 + 场景表扬，返回话术文本（非空）。
 * @param scene 表扬场景；可按 skill 用 skillToPraiseScene 换算
 */
export function answerCorrect(scene: PraiseScene = 'general'): string {
  sfxCorrect();
  void celebrateSmall();
  return praiseByScene(scene);
}

/**
 * 答错反馈：音效 + 场景温和鼓励，返回话术文本（非空）。
 * 不做惩罚性反馈，仅温和引导（符合儿童友好原则）。
 */
export function answerWrong(scene: EncourageScene = 'general'): string {
  sfxWrong();
  return encourageByScene(scene);
}