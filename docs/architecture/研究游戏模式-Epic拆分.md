# 研究游戏模式 · Epic 拆分与冲刺计划

> 版本：v1.0（Phase 4 预制作）
> 作者：程基岩（工程专业主程）
> 上游依据：
> - 主架构 `docs/architecture/研究游戏模式-主架构.md`（§1.2 分层 / §8.0 主理人裁决 / §9 控制清单 / §9.4 实现顺序）
> - ADR `docs/architecture/研究游戏模式-ADR.md`（ADR-001~005 全 Accepted）
> - 功能可行性清单 `docs/研究游戏模式-功能可行性清单.md`（F1–F19 / C1–C7）
>
> **本文档只做规划拆分，不含代码实现，不执行 git 提交。**
> 所有文件路径、测试编号（T1–T8）、约束编号（C1–C7）均对齐主架构 §9，可直接转 Jira/Linear 工单。

---

## 0. 拆封总览（给主理人的 5 行）

1. 研究模式拆成 **6 个 Epic（A–F）**，按 MVP（P0）→ 体验扩展（P1）→ 成长留存（P2）三层推进，覆盖 F1–F19 与 G2。
2. **Epic A（编排层 F17）/ B（进度 C4）/ C（路由 C6）** 是 MVP 中枢，三者可**并行起步**；其中 **B 的 C4 登记最早落地**——它漏一项就会崩全站（首页 + 成长博物馆）。
3. **Epic D（探索+知识卡）/ E（测验接线）** 依赖 A 的 FSM 与 C 的路由，是「闭环可玩」的收尾段；**F（打磨扩展）** 依赖 D+E+B，是终端层。
4. **Sprint 1（1–2 周）** 只攻中枢：A 的纯逻辑 FSM（T1/T2，脱离 UI 即可绿）+ B 的 C4 字段（T3）+ C 的路由骨架（T4）+ Worker B1 独立桶改动。Done 定义 = typecheck 0 + 指定测试全绿 + 空壳 research 路由可导航。
5. 关键路径：**A1→A2→(A4+D+E)**，并行支线 **B2（C4）** 与 **C1–C4**；B1 Worker 改动须**重部署 + 回归**，是 Sprint 1 唯一带部署门的外部依赖。

---

## 1. Epic 划分

| Epic | 名称 | 覆盖功能点 | 层 | 优先级域 | 新建/改动核心文件 |
|---|---|---|---|---|---|
| **A** | 核心编排层 | F17、ADR-001/004 | L4 → L0 | P0（MVP 中枢） | `lib/research/types.ts`、`sessionMachine.ts`、`researchDraft.ts`、`store/researchSession.ts` |
| **B** | 进度与掌握度 | F9、C4、F19、C-1 | L2 | P0（C4 硬门槛）+ P1（徽章） | `types.ts#Progress`、`progress.ts#createInitialProgress`、`badges.ts`、`srs.ts` |
| **C** | 路由与导航 | F1、C6、B2 | L0 | P0 | `router.ts`、`App.tsx`、`nav.ts`(4 改动点)、`i18n/*` |
| **D** | 探索与知识卡 | F2、F3、F18、F11、F4 即时路径、C7 | L5 → L1 | P1 | `researchTopics.ts`、`modules/research/*`（ExploreSlot/ResearchCanvas/KnowledgeCardPanel） |
| **E** | 测验接线 | F7、F8、C2、C3 | L3 复用 + L4 接线 | P0 | `questions.ts`、`store/researchSession.ts`(钩子内接线)、`RoundRunner`(零改，仅挂载) |
| **F** | 打磨与扩展 | F4 专属、F5、F6、F10、F12、F16、G2(ADR-005) | 跨层 | P2 | `worker/index.mjs`(F4)、`modules/research/DiscoveryGallery`、`ParentPage`/`GrowthMuseumPage` 接入、预缓存 |

### 1.1 各 Epic 范围与边界（对齐主架构 §1.2 / §9.1）

- **Epic A** — 唯一新积木 `ResearchSession` FSM。纯 reducer（`sessionMachine.ts`，禁 `@/store`）+ React 钩子（`researchSession.ts`）+ 类型（`types.ts`）+ 草稿（`researchDraft.ts`，safeStorage + 版本 + 24h TTL）。**不触碰任何 L3/L2/L1 组件内部**（F17 out-of-scope）。
- **Epic B** — 进度真相源三字段（`researchNotes`/`discoveries`/`researchStats`）+ `createInitialProgress()` 双处同步登记（**C4 硬门槛**）+ 5 条行为型徽章（F19/ADR-003 反向铁律）+ `srs.ts` 补 `research` 条目（C-1，建议非阻塞）。
- **Epic C** — 4 处文件、7 改动点（§5）：`router.ts` ROUTES、`App.tsx` lazy+case、`nav.ts` 的 `NAV_ITEMS`/`NavCategory`/`NAV_CATEGORY_META`(第 8 chip)/`NAV_CATEGORY_MAP`、`i18n` 中英补键。**B2 裁决：不进 bottom，走第 8 品类 chip `research` + 首页 ExploreMore 卡片**。
- **Epic D** — 复用 6 个 Explore 组件的适配器（`ExploreSlot.tsx` lazy 注册表）+ 先接 `color`/`dino` 2 主题验证抽象（C-3）+ `ResearchCanvas` 探索画布与 F18 渐进揭示壳层 + `KnowledgeCardPanel` 与 §4.3 list-first 获取策略 + 5 条降级路径 + F11 TTS。
- **Epic E** — `questions.ts` 静态/程序化出题闭包（C2）+ `RoundRunner` 接线（`onRoundStart`→`meta.syncNow()` 唯一落档点 / `onAnswered`→`recordAttempt`+`practice` / `renderSummary` 注入）+ `quizRef` 冻结（C3）。**RoundRunner/QuizCard 零改动**。
- **Epic F** — P2 打磨：F4 专属 `explainer` Worker 端点（B3 裁决推迟至 P1/P2）、F5 发现画廊、F6 笔记、F10 家长中心、F12 离线、F16 徽章展示、G2 交错练习（ADR-005 推迟，仅 `makeResearchQuestion` 内实现）。

---

## 2. 各 Epic 的 Story 列表

> 估算档：S = ≤1 天；M = 2–3 天；L = ≥4 天或跨多模块。
> 优先级：P0 = MVP 中枢；P1 = 体验扩展；P2 = 成长留存。
> 验收标准括号内 `T*` = 主架构 §9.2 测试编号；具体断言 = 除测试外的逐条可验证项。

### Epic A — 核心编排层（F17）· P0

| Story | 标题 | 对应文件 | 验收标准 | 估算 | 优先级 |
|---|---|---|---|---|---|
| **A1** | FSM 类型契约 | `src/lib/research/types.ts` | §3 全部接口（`ResearchStatus`/`ResearchEvent` 18 成员/`ResearchSession`/`KnowledgeCard`/`QuizRef`/`ResearchStats`）存在且字段对齐；`noUncheckedIndexedAccess` 下索引访问用 `?? DEFAULT` 兜底（C-8），禁 `!` | S | P0 |
| **A2** | 纯 reducer（FSM 大脑） | `src/lib/research/sessionMachine.ts` | **T1**：全部合法跃迁正确；**非法事件必须 no-op 不抛错**；`CARD_FAILED→degraded` 后仍能 `START_QUIZ`；`ABORT` 保留草稿。**T2**：reducer 内**不含**任何难度重算——`START_QUIZ` 后再派发任意事件，`quizRef.frozenDifficulty` 恒定不变。**C2**：断言 `QUIZ` 态内 reducer 不派发任何内容请求事件 | M | P0 |
| **A3** | safeStorage 草稿持久化 | `src/lib/research/researchDraft.ts` | **T6**：草稿 round-trip；`version` 不匹配 → 返回 `null`；超 24h TTL → 返回 `null`；`safeStorage` 不可用时不抛错；写入节流（≥2s 或状态跃迁时落盘）；`QUIZ` 段不存 `attempts` 明细 | S | P0 |
| **A4** | 会话 React 钩子 | `src/store/researchSession.ts` | 集成 `useStore#practice` + `useAdaptiveDifficultyState('research')` + `researchDraft`；派发事件驱动 A2 reducer；`IDLE` 尝试恢复草稿失败则 `ENTER`；`COMPLETE` 跑 `findNewBadges(p)`；恢复时给「继续/重新开始」选择（C-6）。**依赖 B2 先落地**以免 `researchStats` 为 undefined | M | P0 |

> ⚠️ **文件归属注记**：`researchDraft.ts`（A3）逻辑上属 F17 编排层，其测试 **T6** 在本文档测试映射（§5）按主理人指示与 `researchTopics` 的 C7 红线（T7）一并归 Epic D 时序执行；团队亦可在 Sprint 1 将其与 A2 一并先行（纯逻辑、零 UI），二者不冲突。

### Epic B — 进度与掌握度（F9/C4/F19）· P0 + P1

| Story | 标题 | 对应文件 | 验收标准 | 估算 | 优先级 |
|---|---|---|---|---|---|
| **B1** | Progress 增 3 字段 + ResearchStats | `src/types.ts#Progress` | §6.1：`researchNotes: Record<string,string>`、`discoveries: string[]`、`researchStats: ResearchStats` 接口存在；`researchStats` 5 子字段齐 | S | P0 |
| **B2** | createInitialProgress 双处登记（**C4 硬门槛**） | `src/lib/progress.ts#createInitialProgress`、`src/types.ts` | **T3**：`createInitialProgress()` 返回对象**含** `researchNotes`/`discoveries`/`researchStats` 及其嵌套默认值；**老档案 merge 后字段不为 `undefined`**；确认 `storeHelpers` merge 路径不丢弃未知字段 | S | P0 |
| **B3** | 5 条行为型徽章（F19 反向铁律） | `src/data/badges.ts` | **T5**：所有 `id.startsWith('research-')` 徽章，在「`researchStats` 全 0 但 `mastery` 全满 + `stars` 极高」fixture 下**必须不解锁**；`check`/`meter` 用 `?? 0` 防御性兜底；5 条定义见 §6.2 | M | P1 |
| **B4** | srs.ts 补 research 条目（C-1） | `src/lib/srs.ts` | `SUBJECTS` 追加 `{ key:'research', label:'研究', emoji:'🔬', tone:'green', color:'#0ea5e9' }`；断言 `subjectLabel('research:dino')` 返回「研究」而非「其他」 | S | P1 |

> 🔴 **B2 是崩全站项**：漏登记会让 `findNewBadges(p)` 遍历时抛 `TypeError`，连带炸首页与成长博物馆（不仅研究页）。**Sprint 1 最早落地、最早守门**。

### Epic C — 路由与导航（F1/C6/B2）· P0

| Story | 标题 | 对应文件 | 验收标准 | 估算 | 优先级 |
|---|---|---|---|---|---|
| **C1** | ROUTES 追研 | `src/lib/router.ts` | `ROUTES` 追加 `'research'`；`RouteId` 自动派生；`npm run typecheck` 0 错 | S | P0 |
| **C2** | App 懒加载 + switch | `src/App.tsx` | 顶部 `lazy(() => import('@/modules/research/ResearchModePage'))`；`switch` 加 `case 'research'`；空壳页可先占位渲染（不依赖 D 完成） | S | P0 |
| **C3** | nav.ts 4 改动点（第 8 品类 chip） | `src/data/nav.ts` | `NAV_ITEMS` 项（`bottom:true` **不加**）；`NavCategory` 联合加 `'research'`；`NAV_CATEGORY_META` 加第 8 chip `{key:'research',emoji:'🔬',tone:'blue'}`（B2 裁决）；`NAV_CATEGORY_MAP` 加 `research:'research'`（穷尽守门）。**T4** 全绿 | M | P0 |
| **C4** | i18n 导航键（中英） | `src/i18n/locales/zh-CN.json`、`en-US.json` | `nav.research.label`/`.desc`；**`categories.research`**（第 8 chip 标签，漏则空白/裸键且不报错，C6 唯一无类型保护点）；`research.*` 基础导航键。中英双份。**T4③** | M | P0 |

### Epic D — 探索与知识卡（F2/F3/F18/F11/F4 即时路径）· P1

| Story | 标题 | 对应文件 | 验收标准 | 估算 | 优先级 |
|---|---|---|---|---|---|
| **D1** | 静态选题注册表 | `src/lib/research/researchTopics.ts` | **T7**：每 topic 的 `i18nKey`/`fallbackFactsI18nKey` 在 zh/en 两 locale 均存在；`exploreSlot ∈ SLOT_REGISTRY` 键；`density` 覆盖所有支持 `ageRange`；**数据文件内无中文字面量**（正则断言）。`density` 初值按 ADR-002（5-6→{2,1,3} / 7-8→{3,2,4}） | M | P1 |
| **D2** | ExploreSlot 适配器 + 先接 2 主题 | `src/modules/research/components/ExploreSlot.tsx` | lazy 注册表 6 槽；`color`/`dino` 可挂载验证抽象成立（C-3）；包装容器 `onClickCapture` 仅在 `[data-explore-action]` 计数（C-4 防虚高）；`<Suspense>` 兜底 | M | P1 |
| **D3** | ResearchCanvas + F18 渐进揭示壳层 | `src/modules/research/ResearchCanvas.tsx` | 首屏只渲染核心层（`density.core`）；`REVEAL_MORE` 每次 +`density.extended` 至 `maxReveal` 封顶；`revealLevel` 持久化草稿；揭示**不发放**即物质奖励（ADR-002⑥）；触发权归孩子，系统不自动/不倒计时（ADR-002③） | M | P1 |
| **D4** | KnowledgeCardPanel + §4.3 获取策略 + 降级 | `src/modules/research/KnowledgeCardPanel.tsx` | `REQUEST_CARD` 走 ①草稿→②safeStorage→③`listContent`(免限速读)→④`generateContent`(受限写)→⑤`fallback`；§2.3 五条降级全覆盖；`degraded` 仍允许 `START_QUIZ`；收藏仅当 `kvId !== null`（C1 自动继承护栏） | L | P1 |
| **D5** | TTS 集成（F11） | 复用 `src/lib/speech.ts` | 卡片/发现/讲解 `speak()` 受 `settings.voiceGuide` + `sound` 约束；`ttsState` 指示器联动；绝不裸调模型 | S | P1 |

### Epic E — 测验接线（F7/F8/C2/C3）· P0

| Story | 标题 | 对应文件 | 验收标准 | 估算 | 优先级 |
|---|---|---|---|---|---|
| **E1** | 静态出题闭包 | `src/lib/research/questions.ts` | `makeResearchQuestion(difficulty)` 只从 `researchTopics` 静态题池 / `drill.makeSpacedDrill`（~35% 复习混入）取题（**C2**：零 AI 依赖）；按 `ageRange` 调交错强度（为 G2 预留接缝） | S | P0 |
| **E2** | RoundRunner 接线 + C3 锁存 + DDA | `ResearchModePage.tsx` + `store/researchSession.ts` | 唯一落档点 `onRoundStart → meta.syncNow()`；`onAnswered → recordAttempt('research',{correct,ms,hintUsed,errorType})` + `practice('research:<id>',correct,1,d)`；`renderSummary` 注入研究结算；**禁给 `RoundRunner` 加会变 `key`**（C5 防护）；`QUIZ` 段零 AI 依赖 | M | P0 |
| **E3** | quizRef 冻结 | 同 E2 | `START_QUIZ` 时快照 `skillKey`/`questionsPerRound`(3–5)/`frozenDifficulty`；回合内不可变；仅供小结展示与 `practice` 透传核对，不作出题源（C3） | S | P0 |

### Epic F — 打磨与扩展（P2）

| Story | 标题 | 对应文件 | 验收标准 | 估算 | 优先级 |
|---|---|---|---|---|---|
| **F1** | F4 专属 explainer 端点（B3 推迟项） | `worker/index.mjs`、`contentClient.ts` | `CONTENT_TYPES` 加 `explainer` + `CONTENT_PROMPTS.explainer`（强制 JSON：3 知识点+1 延伸问）+ KV 前缀 `item:explainer:<topicId>:`；`AiContentType` 加 `'explainer'`；`ALLOWED_MODELS` 复核；C1 护栏继承；需重部署+回归 | L | P2 |
| **F2** | F5 发现画廊 | `DiscoveryGallery.tsx` | `listContent` 拉取 KV 卡 + `Progress.discoveries` 展示；仿 `ContentStationPage`；收藏回写 `discoveries`（走独立 action，不污染 `practice`） | M | P2 |
| **F3** | F6 研究笔记 | `types.ts`/`progress.ts`(已登) + UI | `setResearchNote(id,text)` 仿 `setPoemNote`；`Textarea`+`CandyButton`；可编辑/删除 | M | P2 |
| **F4** | F10 家长中心/成长博物馆视角 | `ParentPage.tsx`、`GrowthMuseumPage.tsx` | 读 `mastery` 中 `research:` 前缀项 + `researchNotes`/`discoveries` 计数；`subjectLabel`/`masteryRate` 聚合；展示研究徽章 | M | P2 |
| **F5** | F12 离线/PWA | `safeStorage` + `scripts/gen-sw-precache.mjs` | 发现/笔记离线可读；**新增 `.jpg` 须手改 `CORE_JPG`**；AI 段 `useAiStream` `fallback` 静默降级。**T8** | M | P2 |
| **F6** | F16 徽章展示 | `GrowthMuseumPage.tsx` | 研究徽章在成长博物馆展示位渲染（与 B3 联动） | S | P2 |
| **F7** | G2 交错练习（ADR-005） | `questions.ts` | **仅** `makeResearchQuestion` 闭包内实现，不改 `RoundRunner`；主序恒为 SRS 到期优先，交错只在同优先级组内打散；低龄/低档位减弱或关闭；题数 ≥6 才有意义——与 R6「测验轻量」张力须主理人届时拍板 | M | P2 |

---

## 3. 依赖关系与关键路径

### 3.1 依赖 DAG（文字描述）

```
                 A1(types) ──► A2(reducer) ──────┐
                      │                           │
                 B1(字段) ──► B2(C4登记) ─────────┤──► A4(钩子) ──┐
                      │                           │               │
                 C1(route) ──► C2(app) ──► C3/C4(nav+i18n) ──────┤               │
                                                                  │               │
                 D1(topics) ──► D2(slot:color/dino) ─────────────┤               │
                                 │                                │               │
                                 ├──► D3(canvas+F18) ─────────────┤               │
                                 │                                │               │
                                 └──► D4(card+降级) ──────────────┤               │
                                                                  │               │
                 E1(questions) ──► E2(接线+C3) ──► E3(冻结) ──────┤               │
                                                                  │               │
                                           A4 + D(2/3/4) + E(2/3) 全部完成后：
                                                  │
                                                  ▼
                                        闭环可玩 (MVP Done)
                                                  │
                                                  ▼
                                    F1..F7（依赖 D+E+B，终端层）
```

### 3.2 关键路径与并行起步

- **可并行起步（Sprint 1 起点）**：
  - **A 线**：A1 → A2（纯逻辑，T1/T2 可脱离 UI 全绿）
  - **B 线**：B1 → **B2（C4，最早期落地，崩全站守门）**
  - **C 线**：C1 → C2 → C3 → C4（路由骨架，空壳页可导航）
  - 三条线互不阻塞，可同日开干。
- **依赖 A 的下游**：A3（草稿）随 A2；A4（钩子）须等 B2（否则 `researchStats` undefined）+ A2。
- **关键路径**：`A1 → A2 → (A4 + D + E)`。其中 D 须 A（FSM 事件派发）+ C（路由渲染）+ D1（数据）；E 须 A（QUIZ 态/quizRef）+ B（practice/researchStats 结算）+ E1（题池）。
- **终端层 F**：须 D+E+B 全到位（画廊要 discoveries、家长视角要 mastery、离线要 D/E 的 safeStorage、交错要 E1 接缝）。F1（Worker explainer）另需独立部署回归。

### 3.3 关键路径瓶颈提示

- **B2（C4）是横切守门项**：它不属于任何单条关键路径的「末端」，而是 A4/E3 的**前置硬条件**。若 B2 晚于 A4 合并，全站徽章遍历即崩。→ Sprint 1 第一天就合并 B2 + T3。
- **D2 是抽象验证风险点**（C-3）：适配器若接 `color`/`dino` 不成立需返工，会拖 D3/D4。→ 把 D2 提到 D 线最前、且只验证 2 主题，不铺开。

---

## 4. 首个冲刺计划（Sprint 1，1–2 周）

> 聚焦 **MVP 中枢**，以「纯逻辑可先行 + 路由骨架跑通」为原则，让大量测试在无 UI 渲染下即转绿。

### 4.1 Sprint 1 纳入范围

| 来自 Epic | Story | 产出 | 测试门 |
|---|---|---|---|
| A | A1 types | `types.ts` | typecheck |
| A | A2 reducer | `sessionMachine.ts` | **T1 + T2** |
| A | A3 draft | `researchDraft.ts` | **T6**（随 D 时序或 Sprint1 先行均可） |
| B | B1 字段 | `types.ts#Progress` | typecheck |
| B | B2 C4 登记 | `progress.ts` | **T3**（**最高优先，首日合并**） |
| C | C1 route | `router.ts` | typecheck |
| C | C2 app | `App.tsx` | typecheck |
| C | C3 nav(4 点) | `nav.ts` | **T4** + typecheck |
| C | C4 i18n | `i18n/*` | **T4③** |
| — | **Worker B1** | `worker/index.mjs`（`POST /api/content/generate` 限速 `bucket='content'`） | **须重部署 + 回归**（部署门，非仓库内测试） |

> 为什么 Sprint 1 不含 D/E 的 UI 实现？—— D/E 依赖 A 的钩子与 C 的路由已成形，但**纯逻辑中枢（A2/B2/C 路由）可在无 UI 下完整验证闭环正确性**，先把最易崩、最可测的底层钉死，UI 层在 Sprint 2 并行铺开，返工面最小。

### 4.2 Sprint 1 Done 定义（验收门槛）

1. ✅ `npm run typecheck` **0 错误**（含 `noUncheckedIndexedAccess` 全清）。
2. ✅ 指定测试**全绿**：
   - **T1**（FSM 合法+非法跃迁 / degraded 仍可 START_QUIZ / ABORT 保留草稿）
   - **T2**（reducer 不含难度重算，frozenDifficulty 恒定）
   - **T3**（C4 三字段登记 + 老档案 merge 非 undefined）
   - **T4**（路由 4 处同步：MAP 穷尽 / NAV_ITEMS⊆ROUTES / categories 键中英齐全 / bottom≤6）
   - T6（草稿 round-trip/version/TTL，若 Sprint 1 先行）
3. ✅ **空壳 `research` 路由可导航**：`#/research` 进入 `ResearchModePage`（空壳占位即可），第 8 品类 chip `research` 在分类导航可见、文案非空白/裸键。
4. ✅ **Worker B1 已部署并回归**：`/api/content/generate` 改用 `bucket='content'`，`/api/content/list` 仍无限速；研究生成不再挤兑小智 chat 配额；BFF 回归无回归。

> ⚠️ B1 是**外部部署门**：仓库内测试无法覆盖，须主理人/运维批准部署并在预发环境跑回归（建议脚本化：并发 30 次 content 生成 + 30 次 chat，确认互不影响）。

### 4.3 Sprint 1 推荐排序（建议 5 个工作日）

| 日 | 重点 | 合并物 |
|---|---|---|
| D1 | B1+B2（C4 双处登记）+ T3；A1 types | `types.ts`、`progress.ts` |
| D2 | A2 reducer + T1/T2；A3 draft + T6 | `sessionMachine.ts`、`researchDraft.ts` |
| D3 | C1+C2 路由骨架 + 空壳页；App 可导航 | `router.ts`、`App.tsx` |
| D4 | C3 nav(4 点) + C4 i18n + T4；空壳可导航验证 | `nav.ts`、`i18n/*` |
| D5 | Worker B1 改动 + 部署回归；Sprint 1 全量 `lint && typecheck && test` | `worker/index.mjs`（部署） |

---

## 5. 测试策略映射（T1–T8）

| 测试 | 文件（新建/扩展） | 守门约束 | 归属 Epic/Story | 可先行性 |
|---|---|---|---|---|
| **T1** | `src/lib/research/sessionMachine.test.ts`（新） | F17 正确性：合法跃迁 / 非法 no-op / `CARD_FAILED→degraded` 仍可 `START_QUIZ` / `ABORT` 保留草稿 | **A / A2** | ✅ 纯逻辑（零 UI）最先 |
| **T2** | 同上 | **C3**：reducer 不含难度重算，`frozenDifficulty` 恒定 | **A / A2** | ✅ 纯逻辑 |
| **T3** | `src/lib/progress.test.ts`（新）或 `useStore.test.ts` | **C4**：三字段 + 嵌套默认；老档案 merge 非 undefined | **B / B2** | ✅ 纯逻辑（最先，崩全站守门） |
| **T4** | `src/data/nav.test.ts`（新） | **C6**：MAP 穷尽 / NAV_ITEMS⊆ROUTES / `categories` 键中英齐全 / bottom≤6 | **C / C3+C4** | 🟡 需 nav.ts + i18n 配置到位 |
| **T5** | `src/data/badges.test.ts`（新） | **F19/ADR-003**：`research-*` 徽章在「行为 0 但 mastery 满 + stars 高」下不解锁 | **B / B3** | 🟡 需 badges.ts 定义 |
| **T6** | `src/lib/research/researchDraft.test.ts`（新） | **C7**：草稿 round-trip / version 不符→null / TTL→null / safeStorage 不可用不抛错 | **A(D 时序)** / A3 | ✅ 纯逻辑（可 Sprint1 先行） |
| **T7** | `src/lib/research/researchTopics.test.ts`（新） | **C7**：i18n 键两 locale 存在 / `exploreSlot`∈注册表 / `density` 覆盖 ageRange / 数据无中文字面量 | **D / D1** | ✅ 纯逻辑（数据/配置） |
| **T8** | 扩展 `src/lib/__tests__/precache-manifest.test.ts` | **C5**：新增 `.jpg` 出现在 `buildManifest().urls` | **F / F5** | 🟡 仅当新增 jpg 资源时 |

> **先行性结论**：**T1 / T2 / T3 / T6 / T7 均为纯逻辑/数据测试，零 UI 依赖，可在 Sprint 1 先行转绿**；T4 需 nav/i18n 配置（Sprint 1 收尾）；T5 随 B3（P1）；T8 随 F5（P2）。

---

## 6. 风险与门禁（C1–C7 + 前瞻风险）

### 6.1 约束守门责任归属（对齐主架构 §9.3）

| 约束 | 落地方式 | 守门机制 | 责任归属 |
|---|---|---|---|
| **C1** AI 限速 + 儿童安全护栏 | 所有 AI 调用只经 `contentClient`/`useAi` → `worker`；禁新开通道；`degraded` 一等公民；生成须显式用户动作 | Code Review 门禁 + `grep` 确认无新 `fetch` 直连模型 + **B1 裁决（content 独立桶，Worker 改动，重部署回归）** | 主程（程基岩）评审 + 实现者自查 |
| **C2** AI 非实时题库 | 题目恒来自 `researchTopics` 静态题池 / `drill`；`QUIZ` 段零 AI | **T1**（断言 reducer 在 QUIZ 不派发内容请求）+ E1 出题闭包审查 | 实现者 + T1 |
| **C3** DDA 不回合内重评 | 唯一落档点 `onRoundStart→meta.syncNow()`；三条禁令（§2.4）；`quizRef` 冻结 | **T2** + 钩子层禁给 `RoundRunner` 加会变 `key` + E2 接线审查 | 实现者 + T2 + 评审 |
| **C4** Progress 字段登记 | `types.ts`+`progress.ts` 双处同步；徽章 `?? 0` 防御；**前瞻 C-9** | **T3** + 徽章 fixture 测试 | 实现者 + T3（**最高优先**） |
| **C5** PWA 预缓存 | png/字体自动；**jpg 须手改 `CORE_JPG`**；新 JS chunk 由 SW 运行时缓存 | **T8** + 新增 jpg 时人工核对 `CORE_JPG` | 实现者 + T8 |
| **C6** 4 处路由同步 | §5 清单逐项勾选；`NavCategory`+`NAV_CATEGORY_MAP` 由 typecheck 兜 2 项，其余靠测试 | `npm run typecheck` + **T4** | 实现者 + T4 |
| **C7** safeStorage + 禁硬编码中文 | 草稿只走 `researchDraft.ts`；所有 UI 文案 `t()`；`researchTopics.ts` 只存 i18n 键 | **T6 + T7** + `lint` + `grep -rn "localStorage" src/lib/research src/modules/research` 须为空 | 实现者 + T6/T7 |

### 6.2 前瞻风险（非阻塞，但须记入门禁）

| # | 风险 | 来源 | 处置 / 门禁 |
|---|---|---|---|
| **R-前瞻-1** | `useSettingsStore` persist **缺 `merge`**（浅合并会整体替换 `settings`） | 主架构 C-9 | 当前研究范围**不新增任何 Settings 字段 → 不触发**；但列为守门规则：**未来若给研究（或任何功能）加设置项，须同步给 `useSettingsStore` 补 `merge`（或消费侧 `?? default`）**，否则旧用户该配置为 `undefined` |
| **R-前瞻-2** | **仓库 0 commit 无基线**（实测无 git 仓库） | 主架构 C-7 | 实现前建议 `git init` 建立基线（主理人决策）；至少沿用 `cp -R src /tmp/src_backup` 快照惯例。**本文档不执行任何 git 操作** |
| **R-前瞻-3** | **B1 Worker 改动须重部署 + 回归** | 主架构 §8 B1 | Sprint 1 外部部署门；预发环境脚本化回归（content 30 并发 + chat 30 并发互不挤兑） |
| **R-前瞻-4** | `noUncheckedIndexedAccess` 已开，`density: Record<string,…>` / `SLOT_REGISTRY[key]` 退化 `T\|undefined` | 主架构 C-8 | 索引访问须 `?? DEFAULT` 兜底，禁 `!`；`density` 建议改有限联合键 `Record<AgeRangeKey,…>` 换穷尽检查 |
| **R-前瞻-5** | `ageRange` 在 `contentClient` 硬编码 `'7-8'` | 主架构 C-2 | MVP 可固定并标 `TODO`；5–6 岁拿到 7–8 密度——**P1 前须修**的已知缺口 |
| **R-前瞻-6** | 事件委托可能把空白点击计入 `exploreActions`，虚高 F19 计数 | 主架构 C-4 | 仅 `closest('[data-explore-action]')` 校验后计数；若观测刷量改「按主题去重计数」 |
| **R-前瞻-7** | 草稿不随档案隔离（全局单键） | ADR-004 负面 | 24h TTL + 恢复显式确认弹窗；严格隔离须把 profileId 并入键名（产品边界，MVP 接受 + 确认） |

### 6.3 冲刺级门禁清单（每次合并前）

- [ ] `npm run lint && npm run typecheck && npm run test` 全绿
- [ ] 涉及 `researchTopics.ts` / `modules/research` / `lib/research`：`grep -rn "localStorage"` 为空（C7）
- [ ] 新增 Progress 字段：已同步 `types.ts` + `progress.ts`，且 T3 扩展覆盖（C4）
- [ ] 新增 AI 调用：确认经 `contentClient`/`useAi` → `worker`，无裸 `fetch`（C1）
- [ ] 测验接线：确认 `onRoundStart` 是唯一 `meta.syncNow()` 落档点，`RoundRunner` 无会变 `key`（C3）
- [ ] 路由改动：确认 `NavCategory` + `NAV_CATEGORY_MAP` 穷尽 + T4 绿（C6）
- [ ] 新增静态资源：jpg 已手改 `CORE_JPG`（C5）

---

## 附录 · 工单转写速查

- **Jira/Linear 项目键建议**：`RESEARCH`（或 `RS`）。Epic 键：`RS-A`~`RS-F`；Story 键：`RS-A1`…`RS-F7`。
- **Story 字段模板**：标题 / 对应文件（多文件逗号分隔）/ 验收标准（T* + 断言）/ 估算（S/M/L）/ 优先级（P0/P1/P2）/ 依赖（上游 Story 键）。
- **里程碑**：M1 = Sprint 1 Done（中枢 + 路由 + B1）；M2 = MVP 闭环（A+D+E 全绿，可玩）；M3 = P1 体验扩展（D 全 + F18/F19/F11/F13/F15）；M4 = P2 成长留存（F1–F7）。
