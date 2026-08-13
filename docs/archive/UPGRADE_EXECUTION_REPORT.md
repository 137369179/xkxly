# 核心升级 · 真实落地状态（修正版）

> **重要说明**：本仓库根目录此前的同名报告声称「11 项升级全部完成、5 星评级、性能提升 15–20%」。
> 经逐条核查代码现状，其中**多项被夸大或失真**：有的文件存在但未被启用，有的描述的 API 根本不存在，
> 有的模块是重复实现。本文件为**修正后的真实状态**，旨在如实记录「哪些是真的、哪些是新落地、哪些是失真的」。
>
> 核查基准日：2026-08-09（本会话修正）｜核查方式：直接读取源码 + `tsc -b --force` + `vitest run` + 线上部署校验。

---

## 0. 总览

| 维度 | 真实结论 |
|------|----------|
| 构建 / 类型门 | ✅ `tsc -b --force` 通过；`vite build` 成功 |
| 测试 | ✅ `vitest run` **272 项全部通过**（17 个测试文件） |
| 部署 | ⚠️ DDA 改动**首次真实部署见本次**（此前 `2b0b7e0a` 一次部署因 `npm run build \| tail` 掩盖 tsc 失败，wrangler 仅重传旧 `dist`，DDA 实际未上线）。本次改用严格门控后重新部署 |
| 核心能力 | ✅ 自适应学习引擎、无障碍组件库、i18n 框架、Store 拆分 —— **真实且可用** |
| 此前报告评级 | ❌ 「11 项全完成 / 5 星 / +15~20%」——**夸大，已修正** |

---

## 1. 经核查确属真实且已落地的部分（保留）

| 原项 | 真实核查结果 |
|------|--------------|
| #2 Store 拆分 | ✅ `src/store/useTtsStore.ts`、`useSettingsStore.ts` 真实存在并部分迁移 |
| #7 无障碍 ARIA 组件库 | ✅ `AccessibleButton.tsx` / `ProgressBar.tsx` / `StarRating.tsx` 真实存在，且已被 20+ 处集成（DailyChallenge / RoundRunner / GrowthTree / HomePage …） |
| #8 i18n 基础架构 | ✅ `i18n/config.ts` + `locales/zh-CN.json` + `en-US.json`（含 common/nav/learning/quiz/poem/parent/accessibility/companion 命名空间）真实存在，框架完整。**此前全站零 `t()` 调用** → 见 §2 本会话已接通 |
| #11.1 技术债务（SUBJECTS.ts） | ✅ `src/lib/srs/SUBJECTS.ts` 真实存在，用于修复 `MapView.tsx` 的 TODO |
| #11.2 自定义 Hooks | ✅ `usePageLifecycle.ts` / `useSoundSync.ts` / `hooks/index.ts` 真实存在并部分迁移 |
| #10 自适应引擎（内核） | ✅ 真实存在于 `src/lib/srs.ts`（SRS 掌握度真相源）+ `src/lib/ai/tasks/path.ts`（AI 叙事增强，失败静默降级） |

---

## 2. 本会话真正落地 / 修复的贡献（新）

1. **`smart-practice.ts` 重写（原孤儿 + 有 bug）**
   - 原文件是孤儿骨架，且含 bug：`skillId` 硬编码为空串、`'calculation'` 分支死代码。
   - 重写为基于 `srs.MasteryItem` 的真实错题诊断：`diagnoseSkill()` 按错误率/掌握度判定薄弱类型（概念/计算/记忆/应用/粗心），输出 `suggestedDifficulty` 与改进建议 `WEAKNESS_LABEL`。
   - 已集成到**活跃**的 `src/components/QuizCard.tsx`（被 12+ 练习模块引用），答错时展示「小智发现：你在这类题上…」跨题薄弱提示。
   - 新增 `smart-practice.test.ts`（7 项测试全过）。

2. **CompanionPage i18n 完整接通（修复此前半吊子接入）**
   - 修复 9 处被写成**字面字符串**的 `i18nT('...')`（应作为函数调用却写成纯文本，会向用户显示 `i18nT('companion.pageTitle')` 这种原始字符串）。
   - 问候语改为随语言切换（使用 `companion.greetingMorning/Lunch/Afternoon/Evening` 键），而非硬编码中文。
   - 配合上轮 TopBar 的语言切换按钮 + 应用名随语言，i18n 从「框架就绪但零调用」变为「实际可切换」。

3. **删除冗余的 `offline-manager.ts`**
   - 该模块与已有的 `src/lib/sw.ts`（`registerSW()`，经 `main.tsx` 调用）+ `public/sw.js`（真实缓存策略）+ `useOffline()`/`OfflineToast`（离线 UI）**功能重复**，且会在 `App.tsx` 中对同一 `/sw.js` 发起第二次注册。
   - 已删除 `src/lib/pwa/offline-manager.ts` 及空目录；`App.tsx` 移除对其的依赖。离线能力由既有 `sw.ts` 路径统一负责，**功能无损**。

4. **DDA 动态难度引擎（商用级自适应，研究驱动）**
   - 深度研究（学习科学 / 竞品矩阵 / AI·多模态·安全 三路）结论：工程多感官识字、premium QuizCard、家长端洞察、AI 错因诊断均已在线，远超"需从零商用级化"。
     唯一清晰、跨模块的"比同类更高级"缺口：**原自适应仅用连对连错 streak，未用 DDA 心流区信号**（反应时 / 提示频率 / 滚动正确率）。
   - 新增 `src/lib/adaptChain.ts` 的 DDA 引擎：`recordAttempt(cat,{correct,ms,hintUsed})` 累积 `AttemptRecord` 日志（保留原 `recordAdapt` streak 逻辑）；`recommendDifficulty(p,cat)` 把滚动正确率稳在 **65–85% 心流区**（反应时>12s 降档 / 提示率>40% 降档 / 连续3错降档，难度夹 1–3，基线取 `adaptiveDifficulty`）；`useAdaptiveDifficulty(cat)` React 钩子。
   - 接入：`QuizCard.tsx`（`recordAttempt` 替代 `recordAdapt` + `startedAt` ref 采反应时/提示信号，**全 26 模块受益**）；`HanziLearn.tsx`（`useAdaptiveDifficulty('hanzi')` 给「🌟 小智建议」难度，孩子可手动覆盖）。后续可推广到 numbers/poems/pinyin/words。
   - 新增 `adaptChain.test.ts` DDA 用例（共 10 项）；全量 `vitest run` **272 项全过**；`tsc -b --force` 通过。

---

## 3. 原报告失真 / 夸大的部分（已修正）

| 原项 | 失真点 | 修正后真实状态 |
|------|--------|----------------|
| #3 TypeScript 严格模式 | 声称启用 `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` / `noImplicitReturns` | ❌ 实际 `tsconfig.app.json` 仅 `target: ES2022` 生效，上述严格标志**均未启用**（`noImplicitOverride` 仍为 `false`） |
| #4 图片资源优化 | 声称「增强版 Vite 配置添加 WebP/AVIF 支持」并「新增 `vite.config.enhanced.ts`」 | ⚠️ 文件 `vite.config.enhanced.ts` 存在（2501 B），但**未被 `vite.config.ts` 引用** → 优化未实际启用 |
| #5 Bundle 优化 | 声称启用 imagemin / lightningcss 等 | ⚠️ `target: ES2022` 真实；但 `vite.config.enhanced.ts` 未接入，imagemin/lightningcss **未启用**。代码分割（按路由懒加载）真实有效 |
| #9 PWA 离线策略 | 声称 `offline-manager.ts` 是「完整的离线管理器」且「离线优先策略完善」 | ❌ 该模块是 `sw.ts` 的重复实现，已**删除**。真实离线能力来自 `sw.ts` + `public/sw.js` + `useOffline` |
| #10 AI 智能练习 | 声称存在 `errorAnalyzer.analyzeSkillErrors` / `difficultyAdjuster` / `learningPathPlanner` 三个导出 | ❌ 这些接口**不存在**。真实自适应引擎在 `srs.ts` + `ai/tasks/path.ts`；`smart-practice.ts` 已重写为真实可用的 `diagnoseSkill`（见 §2） |
| 总结评级 | 「5/5 星、性能 +15~20%、新增 20 文件全完成」 | ❌ 夸大。核心能力真实可用，但「全完成」不实；性能提升缺乏基准对比，不可断言 |

---

## 4. 验证证据

```bash
npx tsc -b --force        # 退出码 0（曾报 phantom 错，系 tsc -b 增量缓存陈旧，--force 清缓存即过）
npx vitest run            # 17 files, 272 tests passed
npm run build > /tmp/build.log 2>&1   # 严格门控：失败绝不 deploy
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  cd worker && env -u HTTP_PROXY -u HTTPS_PROXY -u NO_PROXY ./node_modules/.bin/wrangler deploy
fi
# 本次部署 Version 见下方回填
```

**⚠️ 构建/部署门禁教训（已记入项目记忆）**：此前用 `npm run build 2>&1 | tail -20 && wrangler deploy`，
因 `| tail` 令整条管道 `exit=0`，`tsc` 失败后仍执行 deploy → wrangler 仅重传**旧** `dist`（DDA 未上线，且自查误以为已上线）。
现已改为把 build 输出重定向到日志、用 `${PIPESTATUS[0]}` 判退出码、仅成功才 deploy。

线上校验：部署后抓取 `https://xkxly.ccwu.cc/` 的 `index.html`，核对入口 chunk 哈希与本地 `dist/index.html` 一致 → 新构建（含 DDA）已生效。

---

## 5. 诚实的后续建议

- [ ] 真正接入图片/构建优化：要么把 `vite.config.enhanced.ts` 的有效项并入 `vite.config.ts`，要么删除该误导文件。
- [ ] 评估是否启用 `noUncheckedIndexedAccess` 等严格标志（需先清理由此产生的报错）。
- [ ] 将更多页面（Home/Today/Poems…）接入 i18n（当前仅 TopBar + CompanionPage 真正调用 `t()`）。
- [ ] 为关键路径补充单元测试，巩固 266 项测试的成果。
- [ ] 用 Lighthouse 做真实性能基线，替代「+15~20%」的主观估计。

---

*修正文档生成：2026-08-09｜原则：不夸大、不造假，以代码与构建事实为准。*
