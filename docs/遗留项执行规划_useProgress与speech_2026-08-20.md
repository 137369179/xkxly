# 遗留项执行规划：useProgress 细粒度迁移 & speech.ts 拆分

> 文档日期：2026-08-20
> 状态：待执行（已通过全站扫描分析确认，规划已定，尚未开始改码）
> 关联：`docs/SCAN_2026-08-20_全面扫描.md`（若有）· 全面扫描分析报告中的「遗留后续项」

---

## 背景

全面代码扫描分析后，确定两项**高价值遗留优化**需要专项处理：

1. **useProgress 细粒度迁移**：`useProgress()` 返回整个 progress 对象，任一字段变化（每题 practice、30s tickTime）都会让所有订阅组件重渲染。
2. **speech.ts 拆分**：主包通过 4 个锚点静态引用 speech.ts，把整套 TTS 引擎（realVoice / edgeNeuralTts / hanziAudio / letterAudio / pinyinAudio）钉死在主包，首屏体积偏大。

本文档为具体执行步骤，供后续按序实施与查阅。

---

## Part A · useProgress 细粒度迁移

### A0 现状与真实影响

通过脚本统计（2026-08-20）：

| 指标 | 数值 |
|---|---|
| useProgress 调用点 | 87 处 |
| 涉及文件 | 67 个 |
| 字段访问边数 | 118 条 |

**关键认知（影响优先级判断）**：

- ✅ 主壳常驻组件（TopBar / Sidebar / BottomTabs / CatCompanion）**早已**用 `useStars` / `useBadgeCount` 等细粒度 selector —— 全局"爆炸半径"问题已解决。
- ⚠️ 剩余 67 文件**几乎全是懒加载页面级组件**，影响收敛为**页面内**：进页后每题 practice 触发该页所有 useProgress 组件重渲染。
- 🔥 **单点收益最大**：`useAdaptiveDifficulty`（被 20+ 模块经 `useAdaptiveDifficultyState` 共用）整对象传给 `recommendDifficulty`。

### A1 需要新增的 selector（在 `src/store/useStore.ts` 细粒度 selector 区新增）

```ts
// 按 id 细粒度（返回原始值，只在该条变化时重渲染）
usePoemMark(id)          // s.progress.poemMarks[id]
usePoemNote(id)          // s.progress.poemNotes[id]
usePoemRecite(id)        // s.progress.poemRecite[id]
useLevelStar(id)         // s.progress.levelStars[id]
usePoemFavorite(id)      // s.progress.poemFavorites.includes(id)
useSkillMastery(id)      // 已有（P1-2 已落地）
usePoemsRead(id)?        // 若按 id 读取才需要

// 整块订阅（页面级统计用，配合 useShallow 投影）
useBadgeDates  useGrowth  useStickers  useLettersHeard  useNumbersHeard
useWrongBook   useLessonDate  useLessonStep
useResearchStats  useDiscoveries  useResearchNotes  useChatHistory
usePoemMarks / usePoemNotes / usePoemRecite（整块，页面统计场景）
```

### A2 分 4 批迁移（按收益/风险排序）

#### 第 1 批 · 热点优先（1 个文件，收益最大）

- `src/store/adaptiveDifficulty.ts` 的 `useAdaptiveDifficulty`：改 `useStore(useShallow(...))`，只投影 `recommendDifficulty` 实际读取的字段（以 `src/lib/adaptChain.ts` 的 `recommendDifficulty`/`adaptiveDifficulty`/`applyRecentSignals` 实际读取为准：mastery / wrongBook / dailyLog / growth 等）。
- 一次改动惠及 20+ 模块。

#### 第 2 批 · 单字段直换（约 40 文件，机械替换）

按字段归类批量替换，例如：

| 字段 | 替换为 | 涉及文件（示例） |
|---|---|---|
| mastery | `useMastery()`（页面级统计本就该刷新） | HanziPage / RadicalBrowser / WordBuilder / MusicPage / PlantsPage / SongsPage / RhymePlayer / RecommendCard / WordReview / WordsPage / VehiclesPage / GeographyPage / FestivalsPage / ArtPage / LetterStudy |
| dailyLog | `useDailyLog()` | Leaderboard / WeekCompare / StudyCalendar / HomeHero / ParentTodayLogPanel / GameCenterPage / TodayPage |
| badges + badgeDates | `useBadges()` + `useBadgeDates()` | AchievementWall / BadgeCollection / StudyPassport / WrongBookBadgeList / AchievementCenter / GrowthMuseumPage |
| stars / spent / streak | `useStars()` / `useSpent()` / `useStreak()` / `useAvailableStars()` | ParentBackupSection / BadgeCollection 等 |

#### 第 3 批 · 按 id 记录类（约 12 文件）

poems 模块的 `poemMarks[id]` / `poemNotes[id]` / `poemRecite[id]` / `poemFavorites` / `poemsRead`：

- PoemDetail / PoemNotes / PoemStudy / PlanView / PoemTrain / TrainView / PoemsPage / PoemFill / PoetTimeline / StoryLibrarySection
- 换成 `usePoemNote(id)` 等细粒度 hook，**只在对应诗词条目变化时重渲染**，而非整块 poemMarks 变化。

#### 第 4 批 · 整对象透传（约 6 文件，需人工甄别）

- **DailyChallenge**：`c.check(progress)` → 用 `useShallow` 投影 check 读取的字段。
- **TodayPage / ParentPage / WrongBookStats**（多字段）：文件内拆 `const a = useX(); const b = useY();` 组合，或拆子组件按需取字段。
- **PdfExport / ReportExporter / GrowthMuseumPage**：同样改为字段组合。

### A3 收尾与验证

1. 每批后：`npx tsc --noEmit` + 跑相关模块测试（poems / hanzi / wrongbook / today / parent）。
2. 全部迁移后：`useProgress()` 标 `@deprecated`，grep 确认 0 使用。
3. 用 React DevTools Profiler 在 TodayPage 连续答题，确认该页组件重渲染次数收敛。

### A4 风险与对策

- **最大陷阱——误造新对象**：细粒度 selector 必须返回**原始值 / 具体条目**（数字、string、`mastery[id]`），禁止返回 `{...map}` 之类每次新建的对象（会反而每次重渲染）；必须返回对象时用 `useShallow`（参考已落地的 PhoneticFamilies 模式）。
- **行为零变化**：纯 selector 替换，不改任何渲染逻辑；每批独立提交可回滚。

---

## Part B · speech.ts 拆分

### B0 现状（4 个主包锚点）

| 锚点文件 | 导入符号 | 说明 |
|---|---|---|
| `src/App.tsx:16` | `stopSpeaking` | 主包 |
| `src/components/ComboIndicator.tsx:5` | `speak` | 全局挂载 |
| `src/store/useStore.ts:9` | `registerTtsBridge` | 主包 |
| `src/components/ai/AiVoiceModal.tsx` | `speak` | 被 App 静态渲染 |

这 4 个引用把 realVoice / edgeNeuralTts / hanziAudio / letterAudio / pinyinAudio 整套引擎钉死在主包。

### B1 目标架构（两个模块）

**`src/lib/speechCore.ts`（新建，轻量 ~150 行，零引擎依赖）** —— 搬迁 speech.ts 中与引擎无关的状态：

```ts
synth getter + speechSupported
pendingQueue / currentPriority / currentUtterance
PRIORITY_RANK / moduleToPriority / defaultZhRate / defaultZhPitch
pushTtsState / registerTtsBridge     // 桥接本就与引擎无关
stopSpeaking / clearPendingQueue
新增 registerStopAction(fn)          // 引擎注册自己的 stop 回调
```

**`src/lib/speech.ts`（门面）** —— 保留全部重路径：

```ts
从 speechCore import 上述符号（不再自持状态，天然共享同一份状态）
模块加载时 registerStopAction(stopRealVoice) + registerStopAction(stopEdgeNeuralAudio)
speak / runSpeak / speakSequence / speakChant / speakXxx / announce* 函数体零改动
re-export 全量保留（兼容既有 import）
```

### B2 分 4 步实施（每步可独立验证）

#### Step 1 · 建 speechCore + 搬迁（纯搬移，风险最低）

- 把上述状态/函数原样搬进 speechCore，speech.ts 改为 import。
- 验证：`tsc` + 全量测试 + 手动回归（进页引导语、答题表扬、古诗范读、页面切换停音）。
- 顺带给 speechCore 的队列/优先级逻辑补最小单测（queue 优先级、stop 清空）。

#### Step 2 · 主包锚点 1+2（App.tsx / useStore.ts）

- App.tsx：`stopSpeaking` 改从 `@/lib/speechCore` 导入。
- useStore.ts：`registerTtsBridge` 改从 `@/lib/speechCore` 导入。
- 验证：`vite build` 后对比主包大小下降；页面切换停音正常。

#### Step 3 · 主包锚点 3（AiVoiceModal 懒加载）

- App.tsx 中 `<AiVoiceModal />` 改 `lazy(() => import(...))` + `<Suspense fallback={null}>`。
- 验证：构建后 AiVoiceModal 独立 chunk；语音对话功能回归。

#### Step 4 · 主包锚点 4（ComboIndicator 动态导入 speak）

- 调用点改 `import('@/lib/speech').then(m => m.speak(...))`（首次命中才下载 TTS chunk，之后走缓存）。
- 验证：构建后主包不再含 realVoice / edgeNeuralTts 符号（`grep -l "realVoice" dist/assets/index-*.js` 应无命中）；连击提示回归。

### B3 回归清单（拆分后必须人工验证）

1. 首页进入 → 页面引导语
2. 答题对/错 → 表扬/鼓励语音
3. 古诗范读 + 逐句高亮（speakChant）
4. 切页 → 立即停音（App.tsx stopSpeaking 走 core）
5. AI 语音对话（AiVoiceModal 懒加载后）
6. 连击"差一点"提示（ComboIndicator 动态导入后）

### B4 风险与对策

- **状态分裂**是最大风险 → speech.ts 必须 import speechCore 共享状态，禁止各自复制一份。
- **stopSpeaking 在 speech.ts 未加载时也需工作** → core 自带 synth.cancel() + 空 stopActions，天然兜底（行为更稳，不会比现状差）。
- **0 测试** → Step 1 顺带给 speechCore 的队列/优先级逻辑补最小单测，为后续测试铺路；函数体重路径暂不测（保持行为不变优先）。

---

## 建议执行顺序

**先做 Part B（speech 拆分）再做 Part A（useProgress 迁移）**：

- Part B 范围有界（4 个锚点 + 2 个模块）、验证点明确（主包体积 / 功能回归），且能顺带建立 speech 测试基础。
- Part A 面大但每步风险低，适合分 4 批慢慢推；且经过 Part B 后主包更干净，Part A 的重渲染收益也更清晰。

---

## 验收标准（全部完成后）

- [x] `useProgress()` 标记 `@deprecated`，全仓 0 使用（唯一保留点 ParentBackupSection：
      备份导出需完整序列化整个 progress，已注释说明）
- [x] 主包 index chunk 不再包含 realVoice / edgeNeuralTts 等 TTS 引擎符号
- [x] `npx tsc --noEmit` 通过（本项目用 `tsc -b --force`）
- [x] 全量测试通过（`npx vitest run`，687 个用例）
- [x] ESLint 预算门禁通过（`node scripts/lint-warn-budget.mjs`）
- [x] 生产构建成功（`npx vite build`）
- [ ] B3 回归清单 6 项人工验证通过

---

## 执行记录（2026-08-20）

### Part A · useProgress 细粒度迁移（已完成）

分 4 批完成，新增 selector：`useStars/useSpent/useBadges/useBadgeDates/useStickers/
useWrongBook/useWrongHistory/useLettersHeard/useStreak/useUnlockedLevel/useLevelStars/
useMastery/useSkillMastery/useDailyLog/usePoemsRead/usePoemFavorites/usePoemFavorite/
usePoemMarks/usePoemMark/usePoemNotes/usePoemNote/usePoemRecite/usePoemReciteStat/
usePoemMastery/useNumbersHeard/useGrowth/useResearchStats/useDiscoveries/useResearchNotes/
usePkCount/useCreativeCount/useChatHistory/useLessonDate/useLessonStep/
useBadgeMetricProgress/useAvailableStars`。

- 批1：`adaptiveDifficulty.ts` 改 useShallow 投影（20+ 模块受益）
- 批2：单字段直换（badges/mastery/dailyLog/growth/wrongBook/lettersHeard 等 ~40 文件）
- 批3：poems 模块按 id 细粒度（poemMarks/poemNotes/poemRecite/poemFavorites/poemsRead）
- 批4：整对象透传用 useShallow 按下游函数实际字段投影（LearningPath/HomeHero/DailyGoal/
  DailyChallenge/ParentAdvicePanel/PdfExport/ReportExporter/ParentPosterSection/GameCenterPage/
  AdventurePage/ResearchLaunchHub 等）；AiReport/WrongAnalyzeCard 改为点击时 getState() 快照
  （一次性 AI 任务无需响应式订阅）
- 唯一保留 `useProgress()`：ParentBackupSection（备份导出全量序列化）

### Part B · speech.ts 拆分（已完成）

4 个主包锚点全部消除，主包不再含 TTS 引擎符号。

### 遗留后续项

- P2-3：拆分巨型组件（QuizCard / CatVoiceChatModal）+ 核心模块单测（tts / ai/client）
- P2-4：82 个顶层组件按域归文件夹（games / quiz / feedback）

