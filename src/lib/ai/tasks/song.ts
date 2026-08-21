/**
 * AI 任务 · 儿歌学唱
 * ------------------------------------------------------------------
 * songRecommendTask —— 根据年龄/学习进度/时间段推荐适合的儿歌（结构化 JSON）
 * songExplainTask   —— 逐句解释歌词含义（流式文本）
 * 本地兜底永远可用：AI 挂了孩子也绝不冷场。
 */
import { songExplainMessages, songRecommendMessages } from '../prompts';
import { chat } from '../client';
import { sanitizeStructuredText } from '../guard';
import { safeParseJSON } from '@/lib/safeStorage';
import type { StreamTask, TaskResult } from './types';
import { pick } from './types';
import { NURSERY_RHYMES } from '@/data/nurseryRhymes';
import type { NurseryRhyme } from '@/data/nurseryRhymes';

/** 推荐结果数据结构 */
export interface SongRecommendData {
  rhymeId: string;
  reason: string;
}

/** 本地兜底推荐：按时间段选歌 */
function localRecommend(age: number, learnedIds: string[], hour: number): SongRecommendData {
  const learnedSet = new Set(learnedIds);
  const unlearned = NURSERY_RHYMES.filter((r) => !learnedSet.has(r.id));
  const pool = unlearned.length > 0 ? unlearned : NURSERY_RHYMES;

  // 按时间段选歌
  let candidates: NurseryRhyme[] = pool;
  if (hour < 11) {
    // 上午：欢快的动物/数数类
    candidates = pool.filter((r) => r.theme === 'animals' || r.theme === 'number');
    if (candidates.length === 0) candidates = pool;
  } else if (hour >= 18 && hour < 22) {
    // 晚上：温柔的自然/家人类
    candidates = pool.filter((r) => r.theme === 'nature' || r.theme === 'family');
    if (candidates.length === 0) candidates = pool;
  }

  // 按年龄过滤
  const ageOk = candidates.filter((r) => r.ageMin <= age);
  if (ageOk.length > 0) candidates = ageOk;

  const chosen = pick(candidates.length > 0 ? candidates : pool);

  const reasons: Record<string, string> = {
    'two-tigers': '宝贝快来听！两只小老虎跑呀跑，一起跟着唱吧～',
    'little-star': '天黑了，小星星出来啦，一起唱这首温柔的晚安歌吧～',
    'count-ducks': '宝贝来看呀，小鸭子排队游泳啦，数数有几只！',
    'little-rabbit': '小兔乖乖把门开开～这首歌唱完了宝贝就懂得保护自己啦！',
    'pull-radish': '嘿哟嘿哟拔萝卜！大家一起来拔，看能不能拔出来～',
    'spring-is-coming': '春天来啦！这首歌帮宝贝找到春天的颜色～',
    'abc-song': '宝贝准备好学字母了吗？唱完这首歌就认识 26 个字母啦！',
    'my-family': '妈妈辛苦啦～这首歌教宝贝表达对家人的爱～',
    'wheels-on-bus': '公交车转呀转～英文歌也很好听哦，一起来唱！',
    'rain-rain': '小雨沙沙沙～种子喝了雨水就要发芽啦，一起来听！',
  };

  return {
    rhymeId: chosen.id,
    reason: reasons[chosen.id] ?? `宝贝一起来听「${chosen.title}」吧！`,
  };
}

/**
 * AI 歌曲推荐任务（结构化 JSON）
 * 根据孩子年龄/学习进度/时间段推荐适合的儿歌
 */
export async function songRecommendTask(
  age: number,
  learnedIds: string[],
  hour: number,
): Promise<TaskResult<SongRecommendData>> {
  const fallbackData = localRecommend(age, learnedIds, hour);

  try {
    const rhymeList = NURSERY_RHYMES.map((r) => `${r.id}:${r.title}`).join(';');
    const r = await chat({
      scene: 'song.recommend',
      messages: songRecommendMessages(age, learnedIds, hour, rhymeList),
    });
    const text = r.text?.trim();
    if (!r.ok || !text) {
      return { ok: true, data: fallbackData, fallback: true };
    }
    const parsed = sanitizeStructuredText<SongRecommendData>(
      safeParseJSON<SongRecommendData>(text, fallbackData),
    );
    // 校验：推荐的 rhymeId 必须真实存在，否则回退本地选歌
    const valid = !!parsed?.rhymeId && NURSERY_RHYMES.some((x) => x.id === parsed.rhymeId);
    if (!valid) {
      return { ok: true, data: fallbackData, fallback: true };
    }
    return { ok: true, data: { rhymeId: parsed.rhymeId, reason: parsed.reason || fallbackData.reason }, ms: r.ms, fallback: false };
  } catch {
    return { ok: true, data: fallbackData, fallback: true };
  }
}

/**
 * AI 歌词解读任务（流式文本）
 * 逐句解释歌词含义
 */
export function songExplainTask(rhyme: NurseryRhyme): StreamTask {
  // 本地兜底：简单的逐句解释
  const fallbackExplanations: Record<string, string> = {
    'two-tigers': '两只小老虎跑来跑去，一只少了耳朵，一只少了尾巴，是不是很奇怪呀？这首歌就是让我们觉得好玩，一边唱一边笑！',
    'little-star': '天上的星星一闪一闪的，到处都是小星星。它们亮亮的，就像好多小眼睛在眨呀眨。一闪一闪亮晶晶，满天都是小星星。',
    'count-ducks': '门前大桥下面来了一群小鸭子，快来数一数有多少只。二四六七八，好多呀！数都数不清啦！',
    'little-rabbit': '小兔子一个人在家，有人来敲门说快开门。小兔子说不开不开，妈妈没回来谁来也不开门。宝贝也要像小兔子一样安全哦！',
    'pull-radish': '大家一起嘿哟嘿哟拔萝卜，一个人拔不动，喊老奶奶来帮忙。大家一起使劲，团结力量大就能拔出来啦！',
    'spring-is-coming': '春天在哪里呀？在绿绿的山林里。有红花有绿草，还有小黄鹂在唱歌。春天真美丽呀！',
    'abc-song': '这是英文字母歌，从 A 唱到 Z，26 个字母都能记住。唱完这首歌就认识所有字母啦！',
    'my-family': '妈妈下班回家啦，宝贝给妈妈倒杯茶，亲亲妈妈说辛苦了。这首歌教我们爱家人、感谢家人。',
    'wheels-on-bus': '公交车的轮子转呀转，穿过小镇的每个角落。这首歌用英文唱，我们一边唱一边学英语！',
    'rain-rain': '小雨沙沙沙地下，地里的种子高兴极了，说雨水真甜，我要发芽啦。这首歌让我们感受大自然的美好。',
  };

  const fallback = fallbackExplanations[rhyme.id] ?? `「${rhyme.title}」这首歌真好听，歌词讲的是${rhyme.desc}。宝贝跟着唱几遍就会啦！`;

  return {
    scene: 'song.explain',
    messages: songExplainMessages(rhyme.title, rhyme.lyrics),
    title: '小茜讲歌词',
    hint: '小茜正在给宝贝讲歌词…',
    fallback,
  };
}
