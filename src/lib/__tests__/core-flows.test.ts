/**
 * 核心流程集成测试
 * 测试关键用户路径的完整工作流
 */

import { describe, it, expect } from 'vitest';
import { review, isDue, emptyMastery, INTERVALS, masteryRate } from '../srs';
import { isProgressDataCorrupted } from '../autoBackup';
import { createInitialProgress } from '../progress';
import { validateBackup } from '../backup';
import { getSmartFallback } from '../ai/localFallback';
import { offlineCache } from '../offlineCache';

describe('核心流程集成测试', () => {
  describe('SRS间隔重复系统', () => {
    it('应该正确处理答题记录', () => {
      const now = Date.now();
      
      // 初始状态
      let mastery = emptyMastery(now);
      expect(mastery.lv).toBe(0);
      expect(mastery.ok).toBe(0);
      expect(mastery.ng).toBe(0);
      
      // 答对一次
      mastery = review(mastery, true, now);
      expect(mastery.lv).toBe(1);
      expect(mastery.ok).toBe(1);
      
      // 再次答对
      mastery = review(mastery, true, now);
      expect(mastery.lv).toBe(2);
      
      // 答错一次（只降一级）
      mastery = review(mastery, false, now);
      expect(mastery.lv).toBe(1);
      expect(mastery.ng).toBe(1);
      
      // 连续答对达到掌握
      mastery = review(mastery, true, now);
      mastery = review(mastery, true, now);
      mastery = review(mastery, true, now);
      mastery = review(mastery, true, now);
      expect(mastery.lv).toBe(5); // 最高等级
    });

    it('应该正确判断复习到期', () => {
      const now = Date.now();
      
      // 新学习的知识点不应该到期
      let mastery = emptyMastery(now);
      mastery = review(mastery, true, now);
      expect(isDue(mastery, now)).toBe(false);
      
      // 模拟时间流逝，让知识点到期
      const pastDate = now - INTERVALS[mastery.lv]! * 24 * 60 * 60 * 1000;
      mastery.due = pastDate;
      expect(isDue(mastery, now)).toBe(true);
    });

    it('应该正确计算整体掌握率', () => {
      const now = Date.now();
      const p = {
        ...createInitialProgress(),
        mastery: {
          'hanzi:一': review(emptyMastery(now), true, now),
          'hanzi:二': review(review(emptyMastery(now), true, now), true, now),
          'hanzi:三': emptyMastery(now),
        },
      };
      
      const rate = masteryRate(p);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
  });

  describe('数据损坏检测', () => {
    it('应该检测损坏的数据（缺失字段）', () => {
      const corruptedData = {
        stars: 100,
        // badges 缺失
        lettersHeard: ['a'],
        mastery: {},
      };
      
      const result = isProgressDataCorrupted(corruptedData as any);
      expect(result).toBe(true);
    });

    it('应该检测损坏的数据（null值）', () => {
      const corruptedData = {
        stars: null, // null表示损坏
        badges: [],
        lettersHeard: [],
        mastery: {},
      };
      
      const result = isProgressDataCorrupted(corruptedData as any);
      expect(result).toBe(true);
    });

    it('应该识别有效的数据', () => {
      const validData = {
        stars: 100,
        badges: ['badge1'],
        lettersHeard: ['a', 'b'],
        mastery: {},
      };
      
      const result = isProgressDataCorrupted(validData as any);
      expect(result).toBe(false);
    });
  });

  describe('AI本地Fallback', () => {
    it('应该为汉字生成解释', () => {
      const result = getSmartFallback('hanzi.story', { char: '日', pinyin: 'rì' });
      expect(result?.ok).toBe(true);
      expect(result?.text).toContain('日');
    });

    it('应该为数学题生成讲解', () => {
      const result = getSmartFallback('math.explain', { 
        display: '3 + 5', 
        correct: '8' 
      });
      expect(result?.ok).toBe(true);
      expect(result?.text).toContain('8');
    });

    it('应该为拼音提供辅导', () => {
      const result = getSmartFallback('pinyin.tutor', { symbol: 'a' });
      expect(result?.ok).toBe(true);
      expect(result?.text).toContain('a');
    });

    it('未知场景应该返回null', () => {
      const result = getSmartFallback('unknown.scene', {});
      expect(result).toBeNull();
    });
  });

  describe('离线缓存系统', () => {
    it('应该能够检查离线状态', async () => {
      // 这个测试主要验证API可用
      const stats = await offlineCache.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.videoCount).toBe('number');
      expect(typeof stats.totalSizeMB).toBe('number');
    });
  });
});

describe('备份格式验证', () => {
  it('应该验证有效的备份格式', () => {
    const validBackup = {
      app: 'baby-learning-park',
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: {
        stars: 100,
        badges: [],
        lettersHeard: [],
        mastery: {},
      },
      settings: {
        sound: true,
        showPinyin: true,
        parentPin: '',
        pinFails: 0,
        pinLockUntil: 0,
        dailyLimitMin: 30,
        eyeCareMin: 20,
        aiEnabled: true,
      },
    };
    
    expect(validateBackup(validBackup)).toBe(true);
  });

  it('应该拒绝无效的备份格式', () => {
    expect(validateBackup(null)).toBe(false);
    expect(validateBackup({})).toBe(false);
    expect(validateBackup({ app: 'wrong-app' })).toBe(false);
    expect(validateBackup({ 
      app: 'baby-learning-park',
      version: 1,
      exportedAt: '2024-01-01',
    })).toBe(false); // 缺少必要字段
  });
});
