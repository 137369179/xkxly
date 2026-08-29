import { describe, it, expect } from 'vitest';
import {
  scienceAskTask,
  scienceExperimentTask,
  hanziMnemonicTask,
  wordQuizTask,
  logicDetectiveTask,
} from './tasks/explain';
import { safetyRoleplayTask } from './tasks/culture';
import { fallbackStoryBranch } from './tasks/storybook';
import { localDailyQuestPlan } from './tasks/companion';
import { localParentActions } from './tasks/report';
import { rhymeCreateTask, localWrongVariant } from './tasks/generate';
import {
  getScienceLocalFallback,
  getMnemonicLocalFallback,
  getSmartFallback,
} from './localFallback';
import { sceneConfig } from './config';
import { parseTextToPinyinItems } from '@/components/ai/RubyText';
import type { Progress } from '@/types';

describe('新 AI 任务构建与场景配置', () => {
  it('scienceAskTask 构造正确的 StreamTask', () => {
    const task = scienceAskTask('天空为什么是蓝色的？', '自然探索');
    expect(task.scene).toBe('science.ask');
    expect(task.title).toBe('科学小问号');
    expect(task.cacheKey).toBe('science:天空为什么是蓝色的？');
    expect(task.messages.length).toBe(2);
    expect(task.messages[0]?.role).toBe('system');
    expect(task.messages[1]?.content).toContain('天空为什么是蓝色的？');
  });

  it('scienceExperimentTask 构造家庭微实验任务', () => {
    const task = scienceExperimentTask('彩虹的形成', '怎么在家里看到彩虹？');
    expect(task.scene).toBe('science.experiment');
    expect(task.title).toBe('家庭科学微实验');
    expect(task.cacheKey).toBe('experiment:彩虹的形成');
    expect(task.fallback).toContain('准备道具');
  });

  it('safetyRoleplayTask 构造安全情景演练任务', () => {
    const task = safetyRoleplayTask('陌生人敲门送礼物', '我不开门，喊爸爸');
    expect(task.scene).toBe('safety.roleplay');
    expect(task.title).toBe('安全模拟小剧场');
    expect(task.messages[1]?.content).toContain('陌生人敲门送礼物');
  });

  it('hanziMnemonicTask 构造正确的 StreamTask', () => {
    const task = hanziMnemonicTask('休', 'xiū', '休息');
    expect(task.scene).toBe('hanzi.mnemonic');
    expect(task.title).toBe('生字记忆口诀');
    expect(task.cacheKey).toBe('mnemonic:休');
    expect(task.messages[1]?.content).toContain('汉字：休');
  });

  it('wordQuizTask 构造正确的 StreamTask', () => {
    const task = wordQuizTask('apple', '苹果', 'I like eating apples.');
    expect(task.scene).toBe('word.quiz');
    expect(task.title).toBe('单词趣味互动');
    expect(task.cacheKey).toBe('wordquiz:apple');
    expect(task.messages[1]?.content).toContain('apple');
  });

  it('fallbackStoryBranch 能够生成分支剧情与结局', () => {
    const branch1 = fallbackStoryBranch('小猫咪', '穿红雨靴去森林', 1);
    expect(branch1.isEnd).toBe(false);
    expect(branch1.choices.length).toBe(2);
    expect(branch1.text).toContain('小猫咪');

    const branchEnd = fallbackStoryBranch('小猫咪', '回家喝牛奶', 4);
    expect(branchEnd.isEnd).toBe(true);
    expect(branchEnd.choices.length).toBe(0);
  });

  it('localParentActions 能够生成 3 张亲子行动卡', () => {
    const mockProgress = { stars: 10, streak: 3, wrongBook: [], mastery: {} } as unknown as Progress;
    const plan = localParentActions(mockProgress);
    expect(plan.cards.length).toBe(3);
    expect(plan.cards[0]?.title).toBeDefined();
    expect(plan.cards[0]?.guide).toBeDefined();
  });

  it('logicDetectiveTask 构造逻辑推理侦探任务', () => {
    const task = logicDetectiveTask('谁吃了森林蛋糕？');
    expect(task.scene).toBe('logic.detective');
    expect(task.title).toBe('逻辑小侦探');
    expect(task.fallback).toContain('案情通报');
  });

  it('rhymeCreateTask 构造儿歌顺口溜创作任务', () => {
    const taskHanzi = rhymeCreateTask('日', 'hanzi');
    expect(taskHanzi.scene).toBe('rhyme.create');
    expect(taskHanzi.fallback).toContain('日');

    const taskWord = rhymeCreateTask('cat', 'word');
    expect(taskWord.scene).toBe('rhyme.create');
    expect(taskWord.fallback).toContain('cat');
  });

  it('localWrongVariant 能够生成举一反三变式题', () => {
    const q = localWrongVariant('math:add', '2 + 3 = ?', '5');
    expect(q.question).toContain('变式题');
    expect(q.options.length).toBe(4);
    expect(q.answer).toBe('5');
  });

  it('新场景均已在 SCENE_CONFIG 中正确注册', () => {
    const scenes = [
      'science.ask',
      'hanzi.mnemonic',
      'word.quiz',
      'storybook.branch',
      'science.experiment',
      'safety.roleplay',
      'parent.actions',
      'wrong.variant',
      'logic.detective',
      'rhyme.create',
    ] as const;

    for (const scene of scenes) {
      const cfg = sceneConfig(scene);
      expect(cfg).toBeDefined();
      expect(cfg.fallback.length).toBeGreaterThan(0);
    }
  });
});

describe('AI 本地规则引擎新场景兜底', () => {
  it('科学问题命中预置规则', () => {
    const res = getScienceLocalFallback('天空为什么是蓝色的？');
    expect(res.ok).toBe(true);
    expect(res.text).toContain('散开');
  });

  it('生字口诀命中预置规则', () => {
    const res = getMnemonicLocalFallback('休', 'xiū');
    expect(res.ok).toBe(true);
    expect(res.text).toContain('靠在大树旁');
  });

  it('getSmartFallback 智能路由正常命中新场景', () => {
    const resScience = getSmartFallback('science.ask', { question: '为什么会下雨？' });
    expect(resScience?.ok).toBe(true);

    const resMnemonic = getSmartFallback('hanzi.mnemonic', { char: '明', pinyin: 'míng' });
    expect(resMnemonic?.ok).toBe(true);
    expect(resMnemonic?.text).toContain('日头加上月亮光');

    const resExp = getSmartFallback('science.experiment', {});
    expect(resExp?.ok).toBe(true);
    expect(resExp?.text).toContain('准备道具');
  });
});

describe('R165 每日任务叙事化兜底', () => {
  it('localDailyQuestPlan 每条任务都带故事语境，且 route 全部是有效路由', () => {
    const plan = localDailyQuestPlan(3, 0);
    expect(plan.quests.length).toBe(3);
    const validRoutes = new Set<string>([
      '/numbers', '/poems', '/logic', '/hanzi', '/words', '/gamecenter',
    ]);
    for (const q of plan.quests) {
      expect(q.story.length).toBeGreaterThan(0);
      expect(q.title.length).toBeLessThanOrEqual(8);
      expect(validRoutes.has(q.route)).toBe(true);
    }
  });
});

describe('智能汉字拼音注音组件解析验证', () => {
  it('parseTextToPinyinItems 正确识别汉字与对应拼音', () => {
    const items = parseTextToPinyinItems('太阳升起 123 !');
    expect(items.length).toBeGreaterThan(0);

    const taiItem = items.find((i) => i.char === '太');
    expect(taiItem).toBeDefined();
    expect(taiItem?.isHanzi).toBe(true);
    expect(taiItem?.pinyin).toBe('tài');

    const numItem = items.find((i) => i.char === '1');
    expect(numItem?.isHanzi).toBe(false);
  });
});
