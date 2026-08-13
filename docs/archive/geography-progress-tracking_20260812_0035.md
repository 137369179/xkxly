# Geography 模块进度追踪实现

**日期**: 2026-08-12 00:35  
**任务**: 为 geography 模块添加进度追踪

## 目标
为 `GeographyPage.tsx` 添加进度追踪：大洲探索记录 learnSkill + tickTime，问答答对/答错记录 practice，UI 展示已探索大洲数。

## 改动内容

### 文件: `src/modules/geography/GeographyPage.tsx`

1. **新增 import**: `import { useStore, useProgress } from '@/store/useStore'`

2. **组件内解构**: `const { learnSkill, practice, tickTime } = useStore()` + `const progress = useProgress()`

3. **已探索大洲计数**: 遍历 `CONTINENTS`，检查 `progress.mastery['geo:{id}']` 是否存在且 `lv >= 0`，得到 `exploredCount`

4. **大洲选择 (handleSelect)**: 调用 `learnSkill('geo:' + c.id)` + `tickTime(5)`

5. **问答答对 (handleAnswer)**: 调用 `practice('geo:quiz-' + quizItem.c.id, true, 2, 2)` + `tickTime(5)`

6. **问答答错**: 调用 `practice('geo:quiz-' + quizItem.c.id, false, 0, 2)`

7. **UI 进度展示**: 在大洲探索区域标题下方添加 `📖 已探索 {exploredCount}/7 大洲`

## 验证
- `npx tsc --noEmit --pretty` 无类型错误
- 无使用 `any`
- practice 签名: `(skill, correct, star?, difficulty? 1|2|3)` — 使用 difficulty=2 (中等难度)
