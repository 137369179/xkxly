# 研究游戏模式 · 架构决策记录（ADR）

> 版本：v1.0（Phase 3 技术搭建）
> 作者：程基岩（工程专业主程）
> 配套主架构：`docs/architecture/研究游戏模式-主架构.md`
> 上游依据：`docs/研究游戏模式-功能可行性清单.md`
>
> **格式约定**：每条 ADR 含 `Status` / `Context` / `备选方案` / `Decision` / `Consequences`（正/负/中性三分）。
> `Status` 取值：`Proposed`（待主理人批准）/ `Accepted` / `Superseded by ADR-XXX` / `Deprecated`。
> **本文档 5 条 ADR 已于 2026-08-12 由主理人（游承峰）全部批准（Status: Accepted）**，可进入实现。

## 索引

| ADR | 主题 | 关联功能点 | Status |
|---|---|---|---|
| [ADR-001](#adr-001)| 研究会话采用显式 FSM 编排，而非扩展 RoundRunner 的「轮」抽象 | F17 | Accepted |
| [ADR-002](#adr-002)| 认知负荷护栏：Explore 信息密度渐进揭示策略 | F18 / G3 / R9 | Accepted |
| [ADR-003](#adr-003)| 动机保护：奖励绑定探索行为而非答对结果 | F19 / G4 / R8 | Accepted |
| [ADR-004](#adr-004)| 会话状态持久化边界：Progress 与 safeStorage 草稿分治 | F17 / C4 / C7 | Accepted |
| [ADR-005](#adr-005)| 交错练习题序（G2）推迟至闭环验证后，且以 SRS 为主序 | G2 | Accepted |

---

<a id="adr-001"></a>
## ADR-001 · 研究会话采用显式有限状态机（FSM）编排

**Status**：Accepted（主理人 游承峰 批准于 2026-08-12）
**决策日期**：2026-08-12
**关联**：F17（研究闭环编排层，MVP 中枢）、C2、C3
**影响文件**：`src/lib/research/sessionMachine.ts`（新）、`src/store/researchSession.ts`（新）

### Context

CMML 闭环有 7 步（好奇心触发 → 多模态探索 → AI 知识卡 → 短提取测验 → SRS 巩固 → DDA 递进 → 游戏化回流）。仓库中这些能力**都已存在但互不连通**：`ColorExplore` 等 6 个 Explore 组件、`generateContent`、`RoundRunner`、`practice()`/`srs.ts`、`adaptChain`、`badges.ts`。缺的是把它们串成一次连续体验的编排层。

现有唯一的「流程编排」抽象是 `src/components/RoundRunner.tsx` 的**「轮」模型**：一轮 N 题、`difficulty` 变化整轮重开、`onRoundStart` 落档、`onComplete` 结算。它在 drill 类模块（`adventure`/`numbers`/`logic` 等）被广泛复用且经过实战。

问题：研究会话能否直接用「轮」模型承载？

关键差异分析（实测 `RoundRunner.tsx` 全文后）：

| 维度 | RoundRunner 的「轮」模型 | 研究会话的实际需求 |
|---|---|---|
| 单元 | 同质的「题」，`makeQuestion(difficulty)` 可无限产 | **异质阶段**：探索 / 知识卡 / 测验 / 复盘，形态完全不同 |
| 顺序 | 固定题序，`idx` 单向递增到 `questionsPerRound` | 探索段**无固定序**，可反复 `REVEAL_MORE`、可 `CHANGE_TOPIC` 回退 |
| 时长 | 由题数决定 | 探索段由**孩子好奇心**决定，可能 10 秒也可能 5 分钟 |
| 异步 | 同步出题（`makeQuestion` 是纯函数） | 知识卡是**异步 AI 调用**，且有 cooldown / 429 / 502 / 离线四类失败 |
| 失败 | 无「出题失败」概念（兜底重试 4 次后强制返回） | AI 失败是**常态路径**，须有 `degraded` 一等公民状态 |
| 重开 | `difficulty` 变化即 `useEffect` 整轮重开（第 124–127 行） | 探索段**绝不能**因难度变化重开（会毁掉探索上下文） |

### 备选方案

**方案 A：扩展 `RoundRunner`，把「阶段」建模为特殊的「题」**
- 做法：给 `Question` 加 `kind: 'explore' | 'card' | 'quiz'`，让 `makeQuestion` 按 `idx` 返回不同阶段。
- 优点：零新抽象，复用现成结算/庆祝/进度条 UI。
- 致命缺点：① `RoundRunner` 的 `useEffect([difficulty])` 会在难度变化时**把整个研究会话重开**，包括已完成的探索段——这与 C3 精神直接冲突；② 异步 AI 失败无处安放（`makeQuestion` 是同步纯函数签名）；③ 探索段无固定序，与 `idx` 单向递增矛盾；④ 会**污染一个被 10+ 模块依赖的核心组件**，回归面极大。

**方案 B：不做编排层，用页面内 `useState` 手写 if/else 分支**
- 优点：最快出原型。
- 缺点：状态爆炸（7 阶段 × 4 种卡片状态 × 降级分支），跃迁散落在 JSX 里**无法单测**；`safeStorage` 草稿恢复需要一个可序列化的状态快照，散装 `useState` 给不出；这正是 G1 设计缺口反复强调的「四段互不连通」的成因。

**方案 C：显式 FSM（纯 reducer + React 钩子两层）**
- 优点：跃迁集中、可穷举、可单测；状态天然可序列化 → 直接支撑草稿恢复；异步失败建模为一等公民事件（`CARD_FAILED`）；`RoundRunner` **零改动**，只在 `QUIZ` 状态被挂载。
- 缺点：多一层抽象与约 1 个文件的样板代码。

**方案 D：引入 XState 等 FSM 库**
- 优点：可视化、守卫、并行状态等完整能力。
- 缺点：新增运行时依赖（与项目「自研 hash 路由、零多余依赖」的既有取向不符）；本场景只需 7 状态线性图，能力严重过剩；增加 bundle 体积（PWA 首屏敏感）。

### Decision

**采用方案 C：显式 FSM，拆为「纯 reducer（lib 层）+ React 钩子（store 层）」两半。**

- `src/lib/research/sessionMachine.ts` 导出纯函数 `reducer(state: ResearchSession, event: ResearchEvent): ResearchSession`，**零 React、零 `@/store` 依赖**
- `src/store/researchSession.ts` 导出 `useResearchSession()`，负责副作用：接 `useStore`（`practice`）、`useAdaptiveDifficultyState`、`contentClient`、`researchDraft`
- `RoundRunner` **零改动**，仅在 `status === 'QUIZ'` 时挂载，`difficulty` 传锁存值，`onRoundStart` 是全项目唯一合法落档点

分层拆法不是风格偏好，而是**复刻仓库既有先例**：`src/lib/adaptChain.ts`（纯逻辑）+ `src/store/adaptiveDifficulty.ts`（钩子）这一组合，正是为消除 `lib→store` 层倒置循环依赖而做的迁移——`adaptiveDifficulty.ts:1-7` 头注释原文写明「迁移自此前的 lib/adaptChain，目的是消除 lib→store 的层倒置循环依赖：纯逻辑留在 lib，需要订阅 store 的钩子放在本层」。研究模块若把 store 依赖写进 lib，会重新引入同一类循环依赖。

### Consequences

**正面**
- 跃迁可穷举、可单测：FSM 正确性与 C3（`frozenDifficulty` 回合内不变）都能在**不渲染任何组件**的情况下断言（控制清单 T1/T2）
- 状态可序列化 → `safeStorage` 草稿恢复几乎零额外成本（ADR-004 得以成立）
- AI 失败从「异常」升格为「路径」：`CARD_FAILED → degraded → 仍可 START_QUIZ`，保证 AI 全线故障时 CMML 最硬证据链（提取练习 + SRS）依然完整
- `RoundRunner` / `QuizCard` / 6 个 Explore 组件**零改动**，守住 F17 的 out-of-scope 边界，回归面被限制在新增文件内

**负面**
- 多一层抽象，新人需先读状态图才能改研究模式（已用 §2.1 mermaid 图 + §2.2 逐状态契约表缓解）
- reducer 必须保持纯净：**禁止**在 reducer 内调 `Date.now()` 之外的副作用、禁止调 `practice()`。落库时机由钩子层在跃迁后执行——这是一条需要人工守纪律的边界（评审守门）
- 样板代码：事件联合类型有 18 个成员，新增阶段需同时改类型与 reducer

**中性**
- 未引入 FSM 库，若将来阶段数显著膨胀（如并行状态、历史状态），可能需重新评估方案 D；届时本 ADR 应被 `Superseded`
- `questionsPerRound` 与 `frozenDifficulty` 在 `START_QUIZ` 时快照冻结，是 FSM 与「轮」模型的接缝；该接缝的正确性完全依赖「不给 `RoundRunner` 加会变的 `key`」这条禁令

---

<a id="adr-002"></a>
## ADR-002 · 认知负荷护栏：Explore 信息密度渐进揭示

**Status**：Accepted（主理人 游承峰 批准于 2026-08-12）
**决策日期**：2026-08-12
**关联**：F18、设计缺口 G3、风险 R9（认知超载）
**影响文件**：`src/modules/research/ResearchCanvas.tsx`（新）、`src/lib/research/researchTopics.ts`（新）

### Context

目标用户 5–10 岁，工作记忆容量有限（Sweller 认知负荷理论，2011）。风险 R9 明确：一次呈现过多媒体与知识点会超出工作记忆，导致**探索放弃、理解崩塌**。

而现状不利：研究会话的 `EXPLORE` 段要同屏承载 ① Explore 组件的媒体互动（本身已有丰富交互）② AI 知识卡文本 ③ 发现记录入口 ④ 导航与进度。若全部铺开，认知负荷在探索段就会击穿。

同时存在一个**相反方向的约束**（来自 ADR-003 讨论的同一理论族）：过度的显式引导与外在提示会削弱自主感。所以渐进揭示的触发权必须在孩子手里，不能变成系统强推的「教学步骤条」。

### 备选方案

**方案 A：静态密度上限（一次渲染，但限制条数）**
- 做法：按 `ageRange` 限制首屏事实条数（如 5 岁 2 条 / 7 岁 3 条），超出不显示。
- 优点：实现最简，零交互状态。
- 缺点：知识被硬截断，孩子**无法主动深入**——直接违背 CMML「好奇心驱动」的产品内核。好奇心被激发却撞到天花板，比不激发更糟。

**方案 B：分屏 / 分步向导（Wizard，强制分页推进）**
- 做法：把探索段拆成固定 N 步，「下一步」按钮线性推进。
- 优点：负荷控制最强，节奏可预测。
- 缺点：① 探索退化成流程化教学，与「探索段无固定序」的本质冲突（ADR-001 已论证）；② 强制推进剥夺自主感（SDT 三需求之一），与 ADR-003 的动机保护自相矛盾；③ 事实上把研究模式做成了「第二个 drill」——正是可行性清单反复警告的支柱漂移。

**方案 C：核心层 / 扩展层两阶段，由孩子主动揭示**
- 做法：首屏只渲染**核心层**（`density.core` 条最关键事实 + 媒体主交互）；孩子点「还有吗？」/ 提问 / 听完 TTS 后，每次追加 `density.extended` 条，至 `maxReveal` 层封顶。
- 优点：负荷受控且**上限由孩子的好奇心决定**；揭示动作本身就是 F19 要奖励的探索行为（两个功能点共享同一交互，无额外成本）。
- 缺点：需维护 `revealLevel` 状态与按年龄的阈值配置。

**方案 D：AI 动态判断该展示多少**
- 优点：理论上最个性化。
- 缺点：每次揭示都要调 AI → 直接撞上 C1 限速共享桶（主架构 §8 B1 的最高风险）；且引入不可预测的内容量，反而使负荷不可控。**明确否决**。

### Decision

**采用方案 C：核心层 / 扩展层两阶段渐进揭示，揭示权归孩子，阈值按 `ageRange` 配置。**

具体契约：

1. **阈值数据化**：写在 `researchTopics.ts` 的 `density: Record<ageRange, { core, extended, maxReveal }>`，**不硬编码在组件里**。建议初值：`5-6 → {core:2, extended:1, maxReveal:3}`；`7-8 → {core:3, extended:2, maxReveal:4}`。
2. **揭示只在壳层实现**：`ResearchCanvas` 控制核心层/扩展层显隐，**不改任何 Explore 组件内部**（F17 out-of-scope 边界）。
3. **触发权归孩子**：只由显式动作（点「还有吗？」、提问、TTS 播完）推进 `REVEAL_MORE`，系统**不自动**揭示、不倒计时催促。
4. **知识卡同受约束**：`KnowledgeCard.revealed` 字段让 AI 知识卡（`science` 类型返回的是条目数组）也按同一节奏逐条揭示，而非一次铺满。
5. **封顶而非截断**：达到 `maxReveal` 后不再有新扩展层，但引导转向下一阶段（`REQUEST_CARD` / `START_QUIZ`），把「知识用完了」转化为「我们去玩小测验」，避免挫败。
6. **避免过度理由效应**：揭示交互**不发放任何即时物质奖励**（不给星星、不弹奖杯）。它只累加 `exploreActions` 计数供后续行为徽章使用（详见 ADR-003）。

### Consequences

**正面**
- 直接缓解 R9：首屏负荷受控在 2–3 条事实
- 深度上限由孩子决定，保护 CMML 的好奇心内核
- 与 F19 共享同一交互（揭示 = 探索行为计数源），两功能点零额外交互成本
- 纯 UI + 配置，无新机制、无 AI 调用、无性能风险

**负面**
- `density` 阈值目前是**工程拍的初值，缺实证依据**。需要真实儿童测试或 A/B 才能校准（已在主架构 §8 C-2 记为关注项）
- `ageRange` 当前在 `contentClient.generateContent` 默认硬编码 `'7-8'`，会话层需显式传入；MVP 若沿用固定值，则 5–6 岁孩子拿到的是 7–8 岁密度 —— **这是一个已知的、需要在 P1 前修掉的缺口**
- 多一层 `revealLevel` 状态需在草稿中持久化（否则刷新后揭示进度丢失）

**中性**
- 「还有吗？」的文案与形态属美术/文案职责（林绘澄 / 文策渊），本 ADR 只定机制不定表现
- 若未来 F4 专属 `explainer` 端点落地（返回结构化「3 条知识点 + 1 个延伸问题」），本策略可直接消费该结构，`core`/`extended` 映射更自然——届时阈值配置可简化

---

<a id="adr-003"></a>
## ADR-003 · 动机保护：奖励绑定探索行为而非答对结果

**Status**：Accepted（主理人 游承峰 批准于 2026-08-12）
**决策日期**：2026-08-12
**关联**：F19、设计缺口 G4、风险 R8（奖励挤兑内在好奇）
**影响文件**：`src/data/badges.ts`、`src/types.ts`（`ResearchStats`）、`src/lib/progress.ts`

### Context

风险 R8 的理论依据是明确且强的：**过度理由效应**（Lepper, Greene & Nisbett 1973）与 Deci、Koestner & Ryan（1999）对 128 个实验的元分析均显示，**为本身有趣的活动施加外在的、与表现挂钩的奖励，会削弱内在动机**，且儿童对此更敏感。自我决定理论（SDT，Deci & Ryan 1985）指出内在动机依赖三项需求：**自主（autonomy）/ 胜任（competence）/ 联结（relatedness）**。

研究模式的产品内核恰恰是**好奇心（内在动机）**。若沿用全站既有的激励惯性——徽章绑定「答对多少」、星星按正确率发——就会把一个内在动机驱动的活动，改造成外在奖励驱动的活动，探索意愿反而下降。这不是理论洁癖：仓库现有徽章（实测 `src/data/badges.ts`）确实大量以结果量为条件（如 `p.lettersHeard.length`、`p.matchGamesWon`、`mathCorrect`），惯性很强，「顺手加个研究学霸徽章」几乎是默认动作。

同时存在张力：**完全取消奖励**也不对。SDT 的「胜任感」需要反馈；`RoundRunner` 的结算庆祝（`celebrateStars`/`celebrateBig`）与星星是全站一致的体验语言，突然在研究模式抽走会造成体验割裂。

### 备选方案

**方案 A：沿用结果型徽章（研究答对 N 题解锁）**
- 优点：与全站一致，零新设计。
- 缺点：直撞 R8，把好奇心挤兑成刷题动机。**否决。**

**方案 B：研究模式完全无奖励**
- 优点：理论上最保护内在动机。
- 缺点：抽掉胜任感反馈（SDT 需求之一）；与全站体验语言割裂；`RoundRunner` 的结算庆祝需要特殊化改造（违背零改动原则）。

**方案 C：奖励绑定探索行为，与结果解耦**
- 做法：新增 `ResearchStats` 行为计数（探索交互数 / 主题广度 / 知识卡收藏 / 笔记数 / 完成会话数），研究徽章**只读这些**，绝不读 `mastery`/`stars`/正确率。
- 优点：奖励的是「你去探索了」而非「你答对了」，符合 SDT 自主感；星星仍由 `practice()` 正常发放（胜任反馈保留），但**不作为研究徽章条件**。
- 缺点：需新增 3 个 Progress 字段（C4）；行为计数可被「乱点」刷高。

**方案 D：仅奖励「过程性努力」的口头/文字反馈，不给徽章**
- 优点：最贴近 SDT 的「信息性反馈」而非「控制性奖励」。
- 缺点：与既有徽章体系（成长博物馆展示位）不接轨，家长侧缺少可见成就物；实现上等于放弃 F16/F19 的既有机制复用。

### Decision

**采用方案 C，并附加一条反向铁律与一条防刷措施。**

1. **新增行为计数**（`Progress.researchStats`，登记 `createInitialProgress()`，C4）：
   `topicsExplored[]` / `exploreActions` / `cardsRead` / `sessionsCompleted` / `exploreSeconds`
2. **5 条研究徽章全部行为型**（主架构 §6.2 表）：好奇启程（完成 1 次会话）、小小探险家（20 次探索交互）、小博物学者（5 个主题）、知识收藏家（3 张卡）、小小记录员（5 条笔记）。**无一条读正确率。**
3. **反向铁律（可测）**：任何 `id.startsWith('research-')` 的徽章，其 `check(p)` / `meter(p)` **禁止**读取 `p.mastery` / `p.stars` / `p.mathCorrect` 等结果量。由控制清单 **T5** 守门：传入「行为计数全 0、但 `mastery` 全满且 `stars` 极高」的 fixture，断言**全部研究徽章不解锁**。这条测试的作用是**防未来回归**——它会拦住任何一次「顺手加个研究学霸徽章」。
4. **与 DDA 心流区协同**：`practice()` 照常发星（胜任反馈保留、体验不割裂），DDA 照常把成功率稳在 65–85%（`adaptChain` 的 `FLOW_LOW/FLOW_HIGH`）。分工是——**DDA 负责「胜任感」（让孩子处在会但不易的区间），F19 负责「自主感」（奖励他自己选择去探索）**。二者作用于不同 SDT 需求，不冲突。
5. **防刷**：`exploreActions` 只在有效交互元素上计数（事件委托时校验 `closest('[data-explore-action]')`），不把空白点击计入；徽章阈值取偏保守值。若观测到刷量，改为「按主题去重计数」而非全局累加。
6. **测验段保持轻量**：`questionsPerRound` 限 3–5 题（与 R6 一致），避免测验体量反过来主导会话、把研究模式拖回 drill。

### Consequences

**正面**
- 直接缓解 R8，保护 CMML 的产品内核
- 反向铁律以**可执行测试**固化，而非仅写在文档里——这是本 ADR 最重要的落地物
- 复用既有 `findNewBadges(p)` 流程与成长博物馆展示位，零新激励经济
- 与 DDA 明确分工（胜任 vs 自主），两套机制不打架

**负面**
- 新增 3 个 Progress 字段 → C4 风险面扩大（漏登记会崩 `findNewBadges`，进而炸首页与成长博物馆，不只研究页）。已由 T3 守门 + 徽章 `?? 0` 防御双保险
- 行为计数天然可被「乱点」刷高，激励精确性弱于结果型徽章（接受此代价，并以防刷措施与保守阈值缓解）
- 家长可能困惑「为什么孩子答对很多却没有研究徽章」→ 需在家长中心加一句说明（文案职责，交文策渊）

**中性**
- 徽章阈值（20 / 5 / 3 / 5）是工程拍的初值，需上线后按真实分布校准
- 可行性清单 R8 建议「以 A/B 验证奖励形态对探索时长的影响」——本 ADR 未包含 A/B 设施，属后续遥测工作项（当前仓库无 A/B 框架）
- 若未来产品希望研究模式也有「精熟」类成就，应新开**独立的、明确标注为结果型**的徽章族（如 `research-mastery-*`），且需重新评估 R8 —— 届时本 ADR 需修订而非默默绕过

---

<a id="adr-004"></a>
## ADR-004 · 会话状态持久化边界：Progress 与 safeStorage 草稿分治

**Status**：Accepted（主理人 游承峰 批准于 2026-08-12）
**决策日期**：2026-08-12
**关联**：F17、C4、C7、F15（多档案）
**影响文件**：`src/lib/research/researchDraft.ts`（新）、`src/types.ts`、`src/lib/progress.ts`

### Context

`ResearchSession` 是一个含 15+ 字段的状态对象，其中部分字段**秒级变化**（`exploreMs`、`exploreActions`、`attempts[]`、`exploreRevealLevel`）。需要决定它存哪里。

现有两条持久化通道（实测）：

1. **`Progress`（`useStore` + zustand persist）**：全站学习成果真相源，含 `mastery`/`growth`/`wrongBook` 等；由 `useProfilesStore` 在多档案（多娃）切换时同步回 active 仓库；新增字段**必须**登记 `createInitialProgress()`（C4），否则老档案 merge 后为 `undefined`
2. **`safeStorage` 直接读写**：`adaptChain` 的 `adapt-chain` 键即走此路（带 `CHAIN_VERSION` 版本校验、`LOG_CAP` 滚动窗口），**不进 Progress**

关键观察：`adaptChain` 已经给出了先例——**高频易变的 DDA 滚动日志刻意没进 `Progress`**，而是独立键 + 版本号。这不是随意选择，而是同类问题的既有答案。

### 备选方案

**方案 A：整个 `ResearchSession` 进 `Progress`**
- 优点：单一存储、自动获得多档案隔离（F15）与 persist 水合。
- 缺点：① **写放大**——探索段每次点击都触发一次全量 `Progress` 序列化落盘（`Progress` 已是含 `mastery`/`growth`/`poemNotes` 等的大对象），5–10 岁孩子高频点击会造成持续主线程 JSON 开销；② **语义污染**——`Progress` 是「学习成果」真相源，塞进一个半成品会话状态会让 `growth` 快照、家长报表、徽章遍历都要处理「进行中」的噪声；③ **多档案 merge 冲突**——切档时把「未完成的会话」跨档案 merge 语义不明；④ C4 面积扩大到 15+ 字段。

**方案 B：整个会话都不持久化（纯内存）**
- 优点：最简，零存储风险。
- 缺点：刷新 / 切路由 / 手机切后台回来即丢失探索进度。低龄用户误触概率高，体验代价大。

**方案 C：独立 KV 命名空间（服务端）**
- 优点：跨设备可续。
- 缺点：当前无账号体系（可行性清单 F15 明确「跨设备云同步既有未实现」）；引入服务端会话状态需要新端点 + 鉴权，远超 MVP 范围；且会撞 C1 限速面。

**方案 D：分治 —— 聚合量进 Progress，易变态进 safeStorage 草稿**
- 优点：各取所长。
- 缺点：两处存储，需明确边界规则以免漂移。

### Decision

**采用方案 D 分治，边界规则如下（一条判据）：**

> **能被徽章、家长报表或成长曲线消费的「跨会话聚合量」→ `Progress`（登记 C4）；
> 只在本次会话内有意义的「过程态」→ `safeStorage` 草稿（版本 + TTL）。**

| 数据 | 归属 | 备注 |
|---|---|---|
| `researchNotes` / `discoveries` / `researchStats` | **`Progress`**（3 个新字段，C4 登记） | 徽章与家长中心的唯一数据源 |
| 研究掌握度 | **`Progress.mastery['research:<topicId>']`** | **零新增字段**：`mastery` 已是通用 `Record<string, MasteryItem>` |
| `ResearchSession` 全体（status / revealLevel / exploreMs / attempts / knowledgeCard / quizRef） | **`safeStorage`** key `research-session-draft` | 版本 `DRAFT_VERSION` + 24h TTL |

草稿实现约束：

1. 只经 `src/lib/research/researchDraft.ts`，内部走 `safeGetJSON` / `safeSetJSON`（**C7 强制，禁裸 `localStorage`**）
2. `DRAFT_VERSION` 不匹配 → 直接丢弃返回 `null`（照搬 `adaptChain` 的 `CHAIN_VERSION` 手法）
3. 24h TTL：超期不恢复，避免「昨天没做完的会话」突然弹出
4. **写入节流**：`EXPLORE_ACTION` 等高频事件不得每次写盘，按 ≥2s 或状态跃迁时落盘
5. **不存 `attempts` 明细**：DDA 已在 `adapt-chain` 键存滚动窗口（`LOG_CAP=15`），会话草稿再存一份即双真相源。草稿只留本轮计数
6. 恢复时必须给孩子明确的「继续 / 重新开始」选择，不静默跳回中途状态

### Consequences

**正面**
- `Progress` 保持「学习成果真相源」的干净语义，写入频率不受探索段高频交互影响
- C4 面积从 15+ 字段收敛到 **3 个**，显著降低漏登记风险
- 掌握度零新增字段（复用通用 `mastery`），是全设计最省的一处
- 多档案（F15）无需特殊处理：3 个聚合字段随 `Progress` 自动隔离
- 与 `adaptChain` 的既有先例一致，无新范式

**负面**
- 草稿**不随档案隔离**：`research-session-draft` 是全局单键，多娃切档时理论上可能读到另一个娃的未完成会话。缓解：24h TTL + 恢复时显式确认；若产品要求严格隔离，须把 active profile id 并入键名（如 `research-session-draft:<profileId>`）—— **这是一个需要主理人确认的产品边界**（低频场景，MVP 建议接受 + 确认弹窗）
- 两处存储 → 边界可能随时间漂移。缓解：本 ADR 的判据须写入控制清单，评审时逐项对照
- 草稿是本地态，跨设备不可续（当前无账号体系，属既有限制而非本决策引入）

**中性**
- 若未来引入账号与云同步，`researchDraft` 可平滑替换为服务端会话（reducer 状态本就可序列化，ADR-001 的副产品），届时本 ADR 部分内容会被 `Superseded`
- 24h TTL 与 2s 节流阈值为工程初值，可按实测调整

---

<a id="adr-005"></a>
## ADR-005 · 交错练习题序（G2）推迟至闭环验证后，且以 SRS 为主序

**Status**：Proposed（待批准，范围为「推迟」本身）
**决策日期**：2026-08-12
**关联**：设计缺口 G2（交错练习）、F7、F9
**影响文件**：（MVP 不改）未来 `src/lib/research/questions.ts`、`src/lib/drill.ts`

### Context

交错练习（interleaving）指在一组练习中混合不同类型的题目，而非按类型分块（blocked practice）。证据强度中等（可行性清单评为 ★★☆，并注明「需与 SRS 协同」），且**低龄段证据弱于成人**：交错会提高即时练习难度（desirable difficulty），对工作记忆有限的 5–10 岁儿童可能表现为挫败而非增益。

现状（实测）：`RoundRunner` 的题序由 `makeQuestion(difficulty)` 闭包完全决定，`RoundRunner` 本身对题序**无意见**（只做去重：最近 5 题 id 不重复）。因此交错策略可以完全在 `makeResearchQuestion` 内实现，**不需要改 `RoundRunner`**。这意味着 G2 是一个**可延后且低耦合**的优化项。

同时研究模式的小测段只有 3–5 题。在 3 题的窗口里谈「交错 vs 分块」，统计意义与体验差异都极小。

### 备选方案

**方案 A：MVP 即实现交错题序**
- 缺点：3–5 题窗口内收益微小；会与既有 `drill.ts#makeSpacedDrill` 的 ~35% 复习混入逻辑产生策略叠加，难以归因效果；且在闭环尚未验证时引入额外变量，污染 MVP 的验证信号。

**方案 B：推迟到闭环验证后，MVP 用「SRS 主序 + 既有复习混入」**
- 优点：MVP 变量最少；复用既有 `makeSpacedDrill`，零新代码；把交错留作可独立 A/B 的后续优化。
- 缺点：暂时放弃交错的潜在收益。

**方案 C：永不实现**
- 缺点：放弃一个有中等证据的优化方向，无必要。

### Decision

**采用方案 B：MVP 不实现交错题序；小测段题序以 SRS 到期优先为主序，叠加 `drill.ts#makeSpacedDrill` 的既有复习混入比例。**

后续实现时（P2+）遵守以下预设契约，以保证届时仍是低耦合改动：

1. 交错**只在 `makeResearchQuestion` 闭包内**实现，**不改 `RoundRunner`**（它对题序无意见）
2. 主序恒为 SRS 到期优先（`srs.ts#dueSkills` 已按等级 → 错误率 → 逾期时长排序），交错只在**同优先级组内**打散类型，不得越过 SRS 优先级
3. 交错强度须随 `ageRange` 与 DDA 档位调节：低龄或低档位（`difficulty=1`）时**减弱或关闭**交错，避免叠加难度击穿心流区下界（`FLOW_LOW=0.65`）
4. 上线须以 A/B 验证，观测指标为 SRS 长期保持率而非即时正确率（交错的理论收益本就体现在延迟测试）
5. 题数须先从 3–5 题扩到 ≥6 题，交错才有意义；而扩题数会与 R6/ADR-003「测验保持轻量」冲突 —— **这个张力必须在届时一并决策**

### Consequences

**正面**
- MVP 范围收敛，验证信号干净（闭环是否成立 vs 题序策略是否有效，不混淆）
- 零成本：完全不写代码，且已论证未来改动低耦合
- 预设契约（尤其第 2、3 条）避免未来实现时破坏 SRS 优先级或击穿心流区

**负面**
- 暂时放弃交错的潜在长期保持收益
- 需在 backlog 明确记录，否则容易被永久遗忘（本 ADR 即为记录）

**中性**
- 若未来测验段题数因产品调整而显著增加（≥6 题），G2 的优先级应相应上调，本 ADR 需重新评估
- 第 5 条揭示的「扩题数 vs 保持轻量」张力，本质是产品定位问题（研究模式究竟允许多重的测验成分），需主理人届时拍板

---

## 附录 · 决策与约束交叉索引

| 约束 | 相关 ADR | 落地要点 |
|---|---|---|
| **C1** AI 限速 + 安全护栏 | ADR-001（`CARD_FAILED` 一等公民）、ADR-002（否决方案 D：AI 动态密度） | 知识卡须显式用户触发；降级不阻断闭环 |
| **C2** AI 非实时题库 | ADR-001（`QUIZ` 段零 AI 依赖）、ADR-005（题序走静态/程序化） | 题目恒来自静态题池 / `drill.ts` |
| **C3** DDA 不回合内重评 | ADR-001（`frozenDifficulty` 冻结 + 唯一落档点） | 由测试 T2 守门 |
| **C4** Progress 字段登记 | ADR-003（3 个新字段）、ADR-004（把面积收敛到 3 个） | 由测试 T3 守门 |
| **C5** PWA 预缓存 | —（无 ADR 级决策） | png/字体自动；**jpg 须手改 `CORE_JPG`** |
| **C6** 4 处路由同步 | —（见主架构 §5） | 由 typecheck + 测试 T4 守门 |
| **C7** safeStorage + 禁硬编码中文 | ADR-004（草稿只走 `researchDraft.ts`）、ADR-002（阈值与文案走 i18n 键） | 由测试 T6/T7 守门 |
