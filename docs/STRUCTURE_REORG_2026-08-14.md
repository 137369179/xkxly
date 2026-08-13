# 宝贝学习乐园 — 结构治理方案（2026-08-14）

> 目标：解决「网站结构有点乱」——现状的乱不是代码质量差，而是**文件放错家**：分层约定失守导致越界持续累积。
> 本方案分 4 个阶段，由低风险到高风险，每阶段独立可提交、可回滚。

---

## 一、诊断结论（全部经引用交叉验证）

### 1.1 分层边界失守（乱的主因）

项目有两种存放约定并存：`modules/<域>/`（页面 + 域私有组件）与 `components/`（共享组件）。但实际：

| 类别 | 文件 | 证据 |
|---|---|---|
| 模块私有组件误放 components/ 根（6 个） | `StoryBook.tsx`（仅 fun 用）、`PoetTimeline.tsx`（仅 poems）、`HanziEvolve.tsx`（仅 hanzi）、`WrongBookTrainer.tsx`（仅 rewards）、`NumberLearn.tsx`（仅 today）、`StudyPassport.tsx`（仅 rewards） | grep 单一引用方 |
| 路由页面放 components/（2 个） | `RealisticCatHousePage`（正式路由 realistic_cat）、`CatCompanion`（App.tsx:24 懒加载） | App.tsx:56 / App.tsx:24 |
| components/ 模块同名子目录（10 个） | `home/ letters/ pet/ hanzi/ companion/ realistic-cat/ …` 与 modules/ 平行 | 同一功能两个家 |
| 共享与私有混杂 | 根 `QuizCard.tsx` 被 17 文件引用（横跨 8 个模块 + lib），`RoundRunner` 被 5 处共用，与私有组件混在同一层 | 无法区分 |

### 1.2 死代码与重复（可安全清理，零行为影响）

| 类别 | 文件 | 说明 |
|---|---|---|
| 孤儿组件（5 个，全仓无引用） | `DailyGoal.tsx`、`RealFeltCat3D.tsx`（740 行）、`MilestoneCelebration.tsx`、`SmartRecommend.tsx`、`Companion.tsx`（根） | 已逐项 grep 确认无任何 import |
| 死重复 | `components/ui/QuizCard.tsx`（177 行，与根 570 行版本重复、无引用） | 删 |
| 双份文件 | `StudyPassport`：components/ 130 行 vs modules/rewards/ 202 行，**双份都活且版本不一** | 保留 modules 版，删 components 版 + 改 RewardsPage 引用 |
| 死数据 | `data/poems.json`（438KB，全仓无引用） | 删，dist -440KB |
| 已弃用索引 | `data/poemIndex.ts`（头注释自标 deprecated，仅 `lib/dailyPlan.ts:4` 引用） | 改 dailyPlan 用 poemsIndex 后删 |
| 重复脚本 | `scripts/gen-poems.mjs` / `enrich-poems.mjs` / `merge-poems.mjs` 三份诗处理脚本并存 | 并一份 |

> 注：`FlatCat2D.tsx` 曾被疑为孤儿，实被 `CyberMasterCat3D.tsx` 引用，**不在清理清单**。

### 1.3 巨型文件（拆分候选，高风险）

| 文件 | 行数 | 建议 |
|---|---|---|
| `store/useStore.ts` | 1227 | 按 action 域拆 slice（progress / pet / research / wrongbook） |
| `modules/pet/CatHousePage.tsx` | 1082 | 按板块拆子组件 |
| `modules/parent/ParentPage.tsx` | 767 | 按卡片拆 |
| `components/RealFeltCat3D.tsx` | 740 | 孤儿 → **直接删，不拆** |
| `modules/songs/SongsPage.tsx` | 669 | 按组件拆 |
| `lib/ai/prompts/learning.ts` | 640 | 按 prompt 主题拆 |

### 1.4 文档与特殊目录

- 根目录 6 份 md（AI接入方案 / BFF托管方案 / CODE_WIKI / overview / 升级建议 / 研究升级方案）与 `docs/` 25 份按日期迭代报告大量近重复（`overview.md` 与 `CODE_WIKI.md` 开头同一句）。
- `modules/tts-test/` 调试页（503 行）伪装成业务模块，且占**正式路由** `ttstest`（router.ts:21）。

---

## 二、分阶段方案

### Phase 0 — 清理死代码（零行为影响，先做，1 个提交）

目标：消除全部可安全删除项，立即见效。

1. 删 5 个孤儿组件：
   - `RealFeltCat3D.tsx`（740 行）、`MilestoneCelebration.tsx`、`SmartRecommend.tsx`、`Companion.tsx`（根）→ 直接删
   - `DailyGoal.tsx` → **不删，接线**：接入 `modules/today/TodayPage.tsx`（每日目标卡有产品价值，且近期刚修过"今日"判定 bug，接上即生效）
2. 删死重复：`components/ui/QuizCard.tsx`；双份 `StudyPassport` 保留 modules/rewards 版，删 components 版并改 `RewardsPage` 引用路径。
3. 删死数据：`data/poems.json`；改 `lib/dailyPlan.ts` 用 `poemsIndex` 后删 `data/poemIndex.ts`。
4. 脚本并一份：`scripts/` 三份诗脚本收敛为 `scripts/poems/*` 或删冗余两份。

验证：`tsc -b --force` + ESLint 0 error + 全量单测 + smoke。
预期：净删约 2500 行、dist -440KB。

### Phase 1 — 分层归位（低-中风险，codemod 批量改 import）

目标：建立「一个文件一个家」的边界。

1. 定规矩（写入 CODE_WIKI）：
   - `modules/<域>/` = 页面 + 域私有组件（含 `modules/<域>/components/` 子层）
   - `components/` = 仅跨模块共享组件；`components/ui/` = 纯 UI 原子（无业务）
   - `lib/` = 纯逻辑；`data/` = 数据与索引；`store/` = 状态
2. 6 个模块私有组件迁入对应域：
   - `StoryBook` → `modules/fun/`；`PoetTimeline` → `modules/poems/`；`HanziEvolve` → `modules/hanzi/`；`WrongBookTrainer` → `modules/rewards/`；`NumberLearn` → `modules/today/`；`StudyPassport`（若 P0 未删净）→ `modules/rewards/`
3. 2 个路由页面迁入：`RealisticCatHousePage` → `modules/pet/`；`CatCompanion` → `modules/companion/`
4. `components/` 模块同名子目录（home/letters/pet/hanzi/companion/realistic-cat 等 10 个）并入对应 `modules/<域>/`，只留真共享件。
5. `modules/tts-test/` 移出业务模块：改 `?debug=tts` 按需加载或并入 `modules/safety/` 调试区。
6. 共享组件归位：根 `QuizCard`/`RoundRunner` 等明确为共享件，可保留在 `components/` 根（带 `// shared` 标记）或收敛到 `components/shared/`。

执行方式：**codemod 脚本**批量重写 import 路径（node 脚本扫描 `@/components/X` → 新路径），每次迁移一个域、跑 tsc + 该域单测，小步提交。
验证：全量门禁 + smoke 无回归。

### Phase 2 — 巨型文件拆分（高风险，分步小提交）

1. `useStore.ts` 1227 行：按 action 域拆 slice（`store/slices/progress.ts` / `pet.ts` / `research.ts` / `wrongbook.ts`），zustand `create` 支持跨文件 compose。**每拆一个 slice 跑一次全量单测**。
2. `CatHousePage.tsx` 1082 行：按板块（猫咪状态 / 互动 / 打工 / 进化）拆 `modules/pet/components/*`。
3. `ParentPage.tsx` 767 行：按卡片（趋势 / 错题 / 报告 / 设置）拆。
4. `SongsPage.tsx` 669 行：按功能拆。
5. `lib/ai/prompts/learning.ts` 640 行：按 prompt 主题拆。

约束：**不动已正常工作逻辑，只搬不重写**；拆分期间每次提交必须全绿。

### Phase 3 — 文档与导航治理（低风险）

1. 根目录 6 份 md 归档到 `docs/archive/`，保留 `README.md` 精简为工程指引入口；`CODE_WIKI.md` 作为唯一权威文档。
2. `docs/` 按主题整理：SCAN_2026-08-10/11 系列 10 份并入 `docs/archive/`；保留 ROADMAP / 方案类。
3. 导航结构梳理：37 个路由的侧边栏分组是否合理（用户可见的"网站结构"）——单独评估 Sidebar 分组，不在本方案自动执行。

---

## 三、治理机制（防再乱）

1. **目录约定写入 CODE_WIKI**：四层边界 + 「新增组件三问」——被多个模块引用？→ components；只被一个模块用？→ 该模块内；纯 UI 无业务？→ components/ui。
2. **CI 加结构检查**（低成本脚本，进现有 lint 门禁）：
   - 禁止 `components/` 根新增「仅被单一模块引用」的组件（可检测：import 来源分布）
   - 禁止新增孤儿文件（无引用即报）
   - 新页面一律进 `modules/`（App.tsx 路由表人工审查项）
3. **新增功能文案独立 locale 文件**（已有约定，保持）——避免再膨胀 170KB 全局字典。

---

## 四、明确不做的事

- ❌ 不重写已正常工作的业务逻辑（如 QuizCard 内部算法、SRS 调度）——只搬位置、只删死代码。
- ❌ 不做激进目录扁平化（如把 lib/ 全部按主题重组）——收益低、风险高。
- ❌ 不在同一提交里混合 P0/P1/P2 的改动——每阶段独立提交、独立回滚。
- ❌ 不主动 push——每阶段完成本地提交，由用户确认后再推。

---

## 五、收益预期

| 指标 | 现值 | 治理后 |
|---|---|---|
| src 文件数 | 280 tsx + 164 ts | 约 -35（删死代码） |
| 死代码 / 死数据 | 34 文件 / 约 2MB | 0 |
| components/ 根私有混杂 | 6 私有 + 5 孤儿 + 2 路由页 | 0 越界 |
| 巨型文件 | 6 个 >640 行 | 拆分后 0 个 >600 行 |
| 新功能「放哪」决策 | 靠猜 | 有明文规则 + CI 兜底 |
