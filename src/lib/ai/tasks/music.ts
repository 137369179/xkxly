/**
 * AI 任务 · B1 音乐创作升级
 * ------------------------------------------------------------------
 * musicCreateTask —— 音乐创作小助手（流式点评）
 * musicRhythmTask —— 节奏模仿评判（流式）
 */
import { musicCreateMessages, musicRhythmMessages } from '../prompts';
import type { StreamTask } from './types';

/** 本地兜底：创作点评（AI 失败时用） */
export function localMusicCreate(notes: string): string {
  const count = notes.length;
  if (count >= 5)
    return `哇！你一口气敲了 ${count} 个音符，像一只快乐的小鸟在唱歌！🎵 要不要试试用高音 Do 结尾，会更有惊喜感哦！`;
  if (count >= 3)
    return '这段旋律短短的很可爱，像小雨点落在树叶上！滴滴答答～再多敲几个音符，就能变成一首完整的歌啦！';
  return '你敲响的第一个音符，就是音乐旅程的开始！✨ 试试连着敲 3 个不同的键，听听它们唱出的小旋律吧！';
}

/** 本地兜底：节奏评判（AI 失败时用） */
export function localMusicRhythm(_target: string, _played: string, score: number): string {
  if (score >= 90) return `太厉害了！你和节奏大师敲得一模一样！👏 得分 ${score} 分，小鼓手就是你！`;
  if (score >= 70) return `敲得真不错！得分 ${score} 分！🎵 再跟着多听两遍，你就能 100 分啦！`;
  return `没关系，得分 ${score} 分，节奏小火车开动啦！🚂 再试一次，跟着鼓点一起「咚咚哒」，会越来越准的！`;
}

/** 音乐创作点评（流式） */
export function musicCreateTask(notes: string): StreamTask {
  return {
    scene: 'music.create',
    messages: musicCreateMessages(notes),
    title: '小智听你的创作',
    hint: '正在听你的旋律…',
    fallback: localMusicCreate(notes),
  };
}

/** 节奏模仿评判（流式） */
export function musicRhythmTask(target: string, played: string, score: number): StreamTask {
  return {
    scene: 'music.rhythm',
    messages: musicRhythmMessages(target, played, score),
    title: '节奏评判',
    hint: '正在打分…',
    fallback: localMusicRhythm(target, played, score),
  };
}
