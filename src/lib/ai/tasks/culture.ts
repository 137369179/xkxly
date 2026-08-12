/**
 * AI 任务 · B3 节气文化 & B4 安全教育
 * ------------------------------------------------------------------
 * festivalTalkTask —— 节气/传统节日讲解（流式）
 * safetySceneTask  —— 安全情景对话（流式）
 */
import { festivalTalkMessages, safetySceneMessages } from '../prompts';
import type { StreamTask } from './types';

/** 本地兜底：节气讲解 */
export function localFestivalTalk(name: string, chant: string, custom: string): string {
  return `${name}到啦！${chant} 这时候大家会${custom}。你可以在家问问爸爸妈妈，他们小时候是怎么过${name}的，一定很有意思！`;
}

/** 本地兜底：安全情景 */
export function localSafetyScene(scene: string, option: string): string {
  if (option.includes('不可以') || option.includes('不能') || option.includes('不要') || option.includes('不跟'))
    return `宝贝做得对！「${option}」是安全的做法。记住哦：${scene}的时候，保护好自己最重要！你真棒！`;
  return `宝贝要小心哦！「${option}」这样做有点危险。${scene}的时候，我们要想想怎样才安全，可以请爸爸妈妈帮忙判断。记住啦，安全第一！`;
}

/** 节气讲解（流式） */
export function festivalTalkTask(name: string, season: string, chant: string, custom: string): StreamTask {
  return {
    scene: 'festival.talk',
    messages: festivalTalkMessages(name, season, chant, custom),
    title: `小智讲${name}`,
    hint: '正在讲节气小知识…',
    fallback: localFestivalTalk(name, chant, custom),
  };
}

/** 安全情景对话（流式） */
export function safetySceneTask(scene: string, option: string): StreamTask {
  return {
    scene: 'safety.scene',
    messages: safetySceneMessages(scene, option),
    title: '安全小卫士',
    hint: '正在想想这样做安不安全…',
    fallback: localSafetyScene(scene, option),
  };
}
