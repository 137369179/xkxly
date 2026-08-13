# 首页推荐算法升级（P3）

## 任务目标
升级 `src/modules/home/HomePage.tsx` 中的 `pickRecommendations` 函数，从单一按 masteryRate 排序升级为三维智能推荐：时段感知 + 兴趣感知 + 薄弱点感知。

## 完成内容

### 1. 时段感知
- 新增 `TimeSlot` 类型（morning/noon/afternoon/evening/night）
- `currentTimeSlot(hour)` 根据当前小时返回时段
- `TIME_SLOT_MODULES` 定义各时段推荐模块：
  - 早上(6-11): poems/letters/pinyin/hanzi/words
  - 中午(11-14): science/geography
  - 下午(14-18): numbers/logic
  - 晚上(18-22): songs/story/fun/art/music
  - 夜间(22-6): story/storybook

### 2. 兴趣感知
- `moduleTouchedCount(p, routeId)`: 统计模块下 lv>0 的 skill 数量
- touchedCount 高的模块优先推荐

### 3. 薄弱点感知
- `moduleErrorRate(p, routeId)`: 统计模块 ng/(ok+ng) 错误率
- 错误率高的模块优先推荐

### 4. 综合评分公式
```
score = timeBonus * 0.4 + interestScore * 0.3 + weaknessScore * 0.3
```
- timeBonus: 时段匹配 1.0，不匹配 0.3
- interestScore: touchedCount 归一化到 0-1
- weaknessScore: 错误率归一化到 0-1

### 5. 其他改动
- 返回 top 4 推荐（原来为 3）
- 每个推荐项附带 reason 字段，说明推荐原因（如"早上适合学古诗"、"数学需要多练习"）
- 扩展了可推荐模块列表（RECOMMENDABLE_IDS），从原来仅 LEARN_MODULE_IDS + FUN_MODULE_IDS 扩展到 24 个模块
- 保留了 `moduleMasteryRate` 函数用于推荐理由的回退逻辑
- 新增 `ROUTE_PREFIX_MAP` 统一管理 RouteId -> mastery 前缀映射

### 6. 类型安全
- 严格 TypeScript，无 `any`
- `ROUTE_PREFIX_MAP` 使用 `Partial<Record<RouteId, string>>` 类型安全
- `MODULE_LABEL` 使用 `Partial<Record<RouteId, string>>`
- `TIME_SLOT_MODULES` 使用 `Record<TimeSlot, Set<RouteId>>`

## 验证结果
- `npx tsc --noEmit --pretty` 无任何类型错误
- 保持了现有代码风格（JSDoc 注释、命名约定、缩进等）
