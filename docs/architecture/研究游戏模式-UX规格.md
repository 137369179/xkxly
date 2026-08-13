# 「研究游戏模式」UX 规格文档（CMML）

> 文档类型：交互 / 体验规格（Phase 4 预制作，预制作设计交付物）
> 作者角色：策划 / 设计（design-strategist · 文策渊）
> 上游依据：
> - `docs/architecture/研究游戏模式-主架构.md`（F17 状态机 / 契约表 / 降级路径 / 徽章 F19）
> - `docs/architecture/研究游戏模式-可访问性分级.md`（Basic/Standard/Comprehensive + G1–G20 + F18/F19 护栏 + 附录 C-5）
> - `docs/研究游戏模式-功能可行性清单.md`（F1–F19 / C1–C7 / R1–R9）
> 适用范围：本文档是**唯一 UX 真相源**；工程实现以本规格 + 主架构为准；美术以可访问性分级为准。本文**只写规格、不实现、不 git commit**。

---

## 0. 一句话设计立场

研究模式的体验核心是「**孩子掌控节奏的好奇心闭环**」：揭示权归孩子（F18）、奖励绑探索不绑对错（F19）、AI 故障是「一等公民路径」而非异常（主架构 §2.3）。所有界面决策都服务于「让 5–10 岁孩子**自主、低焦虑**地跑完探索→讲解→小测→巩固」这一条主线，任何会制造时间压力、焦虑、或把探索刷题化的设计一律否决（R6 / R8 / R9）。

---

## 1. 信息架构（IA）

### 1.1 站点级入口（两个，均不进底部 Tab）

依据主架构 §5 与 B2 裁决：**底部 Tab 已满 6/6，研究入口不进 bottom**，改走「首页 ExploreMore 卡片 + 第 8 个品类 chip `research`」双入口承载，与 `growth` 品类先例一致。

| 入口 | 位置 | 形态 | 依据 |
|---|---|---|---|
| **首页「探索更多」卡片** | `HomePage` 的 `ExploreMore` 折叠区 | 仿现有 `ExploreMore.tsx` 网格卡片（默认隐藏，展开后第 N 张）；点击 `navigate('research')` | F1 / F2；`ExploreMore` 已按 `NAV_ITEMS` 渲染，研究项 `bottom:false` 故只出现在折叠区 |
| **第 8 品类 chip** | `nav.ts` 的 `NAV_CATEGORY_META` 新增 `{ key:'research', emoji:'🔬', tone:'blue' }`，插在 `ai` 之后、`growth` 之前 | 分类筛选 chip，点入呈现研究主题列表（复用 `navByCategory()` 自动分组） | 主架构 §5.2；C6（须同步补 `categories.research` i18n 键，否则 chip 裸键名，T4 守门） |

> ⚠️ **C6 守门提醒**：`NAV_CATEGORY_META` 标签走 i18n `categories.*`，新增第 8 chip 若漏补 `zh-CN.json`/`en-US.json` 的 `categories.research`，chip 显示空白且**不报错**——此点无类型保护，必须由 T4 测试覆盖（主架构 §9.2 T4③）。

### 1.2 内部 7 状态屏幕 / 面板层级图

研究模式是**单路由页 `#/research` 内的 FSM 状态切换**，不跳子路由（主架构 §2.1）。层级自上而下：

```
┌─────────────────────────────────────────────────────────────────────┐
│  #/research 唯一路由页（ResearchModePage.tsx）                        │
│                                                                       │
│  ┌─ IDLE ───────────────────────────────────────────────┐           │
│  │  只读 researchDraft.load()；有草稿→RESUME_DRAFT        │           │
│  │  无草稿/恢复失败→ENTER→TOPIC_SELECT                      │           │
│  └───────────────────────────────────────────────────────┘           │
│                          │ SELECT_TOPIC(topicId)                       │
│                          ▼                                            │
│  ┌─ TOPIC_SELECT ────────────────────────────────────────┐           │
│  │  TopicGrid（仿 ExploreMore 网格）                        │           │
│  └───────────────────────────────────────────────────────┘           │
│                          │ SELECT_TOPIC → ResearchCanvas 挂载          │
│                          ▼                                            │
│  ┌─ EXPLORE ─────────────────────────────────────────────┐           │
│  │  ResearchCanvas（媒体槽 ExploreSlot + 渐进揭示壳层）       │           │
│  │   ├─ 核心层（F18 首屏，按 ageRange 取密度）               │           │
│  │   ├─ 「还有吗？」显性按钮（≥64px，固定位，归孩子触发）     │           │
│  │   ├─ 扩展层（追加于核心层下方，锚点不位移）               │           │
│  │   └─ 底部条：「我想知道更多」(REQUEST_CARD) ｜ 换主题      │           │
│  └──────────────┬──────────────────────────┬─────────────┘           │
│   REQUEST_CARD  │ EXPLORE_ACTION(计数 F19)  │ CHANGE_TOPIC             │
│                  ▼                          │                          │
│  ┌─ KNOWLEDGE_CARD ────────────────────────┐│                          │
│  │  KnowledgeCardPanel（AI 卡 + 渐进揭示）    ││                          │
│  │   + 朗读按钮(F11) + 收藏 + 「开始小测验」  ││                          │
│  │   status: idle/loading/ready/degraded    ││                          │
│  └──────────────┬───────────────────────────┘│                          │
│  START_QUIZ(ready/degraded 均可)            │                          │
│                  ▼                          │                          │
│  ┌─ QUIZ ──────────────────────────────────┐│                          │
│  │  RoundRunner（零改动复用，3–5 题）         ││                          │
│  │  冻结 quizRef；onRoundStart→DDA 落档(C3)  ││                          │
│  └──────────────┬───────────────────────────┘│                          │
│   ROUND_COMPLETE(stars)                     │                          │
│                  ▼                          │                          │
│  ┌─ REVIEW ────────────────────────────────┐│                          │
│  │  本轮小结 + 掌握度变化 + 待复习提示         ││                          │
│  └──────┬─────────────────────────┬─────────┘                          │
│  CONFIRM│              EXPLORE_AGAIN（同主题再探索，不重开小测）          │
│         ▼                                                                 │
│  ┌─ COMPLETE ─────────────────────────────┐                              │
│  │  结算 + 行为型徽章庆祝(F19) + 继续/重开    │                              │
│  └──────┬───────────────────────┬─────────┘                              │
│  RESTART│                     LEAVE → 回站点                               │
└─────────┴───────────────────────┴─────────────────────────────────────┘
```

> 关键：从 `EXPLORE` 可以到 `KNOWLEDGE_CARD` 再回到 `EXPLORE`（探索与小卡可往返），也可从 `REVIEW` 经 `EXPLORE_AGAIN` 回到 `EXPLORE`——**探索是主体，小测只是轻量收尾**（F7 / R6 纪律），禁止让小测成为唯一出口。

---

## 2. 逐状态界面规格（按 FSM 7 状态）

> 通用标注：**所有状态均满足 Basic 档（G1–G3, G5–G10, G13, G14, G18）**；P1 正式验收须达 Standard（G4, G11, G12, G15, G16, G17, G19, G20）。每个状态末尾列出「降级态 UX」。

### 2.1 IDLE

| 维度 | 规格 |
|---|---|
| 布局 | 极轻量：尝试 `researchDraft.load()`（主架构 §2.2）。命中有效且未超 24h TTL 的草稿 → 显示「继续上次的研究 / 重新开始」二选一（`C-6` 要求明确选择，勿直接弹回旧会话）；否则直接进入 `TOPIC_SELECT`。无独立视觉页，IDLE 是瞬态路由判定。 |
| 主操作 | 无（自动决策跳转）。 |
| 信息密度 | 0（瞬态）。 |
| 儿童交互 | 无感知；若弹「继续/重开」选择，两按钮均 `CandyButton size="lg"` ≥64px、相邻间距 ≥8px（G3）。 |
| 降级态 UX | 草稿 `load()` 异常（safeStorage 不可用）→ 静默降级为「新会话」，不报错、不白屏（C7 / `researchDraft.test.ts` T6）。 |

### 2.2 TOPIC_SELECT（仿 ExploreMore 选题网格）

| 维度 | 规格 |
|---|---|
| 布局 | 复用 `ExploreMore.tsx` 的网格语言：`grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4`，每张卡 `motion.button`（`whileHover scale 1.04 / whileTap 0.95`），`min-h-[110px]`，`rounded-[1.6rem]`，软渐变底 `linear-gradient(160deg, t.soft 0%, #ffffff 70%)`，内嵌 `FluffyIcon`（复用 `components/ui/FluffyIcon`）+ 主题 `emoji` + 标题（`t.deep` 字色）+ 一行 `desc`（`line-clamp-1 text-[10px] text-ink-soft`）。顶部 `PageHeader`（emoji 🔬 / title `research.title` / subtitle `research.subtitle` / tone="blue"，对齐 `ContentStationPage` 的 `PageHeader` 用法）。 |
| 主操作 | 点击主题卡 → `SELECT_TOPIC(topicId)` → 进入 `EXPLORE`。 |
| 信息密度 | 单屏 ≤ 8 张主题卡（按 6 主题 + 留白），无正文段落，仅图标 + 标题 + 一行描述（F18 / G9 检索友好）。 |
| 儿童交互 | 大热区卡（≥110px 高）；点击 `sfxTap()` 反馈（对齐既有点音效）。 |
| 降级态 UX | `researchTopics.ts` 数据读取失败（i18n 键缺失）→ 不渲染空白，至少显示 emoji + 占位标题，T7 测试守门（C7 数据文件无中文字面量）。 |

### 2.3 EXPLORE（探索画布 + F18 渐进揭示）

| 维度 | 规格 |
|---|---|
| 布局 | `ResearchCanvas` = 媒体槽（`ExploreSlot` lazy 注册表，主架构 §4.5）+ **F18 渐进揭示壳层**（包装容器，不动 Explore 组件内部）。竖向分区：① 媒体互动区（嵌入 ColorExplore/DinoWorld 等，占屏 55–70%，F18 §4.2）；② 右侧/下方「我的发现」采集条；③ 底部固定操作条。 |
| 核心层（首屏） | 按 `ageRange` 取密度（F18 §4.1）：**5–7 岁核心层 1 概念 / ≤2 条知识点 / 可见总字数 ≤40 / 单句 ≤12 字**；**8–10 岁核心层 ≤2 概念 / ≤3 条 / 总字数 ≤80 / 单句 ≤18 字**。核心层是「图的注解」，文字 ≤30% 面积，图文空间邻近 ≤16px。 |
| 扩展层触发（F18 §4.3） | **单一显性按钮「还有吗？」**（`CandyButton size="lg"` ≥64px，位置固定不跳动），归孩子触发；系统**禁止**自动/定时展开（违反 SDT 自主感 + 强加外在负荷）。点击后扩展层**追加在核心层下方**，核心层位置**不得位移**（锚点稳定，避免低龄丢失视觉锚点）。已展开可折叠（≤300ms）。 |
| 揭示节奏 | 上一句 TTS 播完 + **400ms** 最小间隔后才生效下一层（防连点瀑布）；扩展层数上限 5–7 岁 2 层 / 8–10 岁 3 层。 |
| 不预告总量 | **绝不显示「还有 5 条」**（制造任务量焦虑）；用「还有一个小秘密 🔍」式开放表达（见 §5 术语表）。 |
| 主操作 | ①「还有吗？」（揭示）；② 媒体区自由互动（触发 `EXPLORE_ACTION`，F19 行为计数源）；③ 底部「我想知道更多 💡」（REQUEST_CARD → KNOWLEDGE_CARD）；④「换主题」（CHANGE_TOPIC）。 |
| 信息密度 | 单屏可交互+图形元素：5–7 岁 ≤3 / 8–10 岁 ≤5（F18 §4.1）；背景装饰 ≤3（5–7）/≤5（8–10）且透明度 ≤20%/≤25%（G20）。 |
| 儿童交互 | 主 CTA ≥64px（G3 / S6）；揭示权归孩子（S1 / G10）；媒体区点击为最可靠交互（5–7 岁禁用拖拽作唯一交互）；探索行为计数经事件委托 `onClickCapture` 仅在校验 `closest('[data-explore-action]')` 后 +1（C-4 防虚高）。 |
| 动画 | 探索段同屏并发循环动画 **≤1 处**（float/bounce-soft 周期 ≥1.6s、幅度 ≤10px）；入场 ≤450ms；转场 250–400ms（F18 §4.4）。 |
| 降级态 UX | 媒体槽组件懒加载失败（Suspense 兜底）→ 显示该主题 emoji + 静态 `fallbackFactsI18nKey` 核心知识点占位，不阻断探索；AI 面板不可用时不影响媒体区（R1 隔离）。 |

### 2.4 KNOWLEDGE_CARD（AI 知识卡 + 渐进揭示 + 朗读 + 5 类降级）

| 维度 | 规格 |
|---|---|
| 布局 | `KnowledgeCardPanel` 仿 `ContentStationPage` 文章卡语言：`rounded-[1.8rem] border-4 border-white bg-gradient-to-br shadow-fluffy`，头部标题 + `tags` + 日期（若有），正文区。AI 流式讲解容器加 `aria-live="polite"` + `aria-busy`（S10 / G15）。 |
| 渐进揭示 | 知识卡同样遵循 F18：首屏核心句；「还有吗？」揭示更多（对齐 EXPLORE 节奏）。 |
| 朗读（F11） | **每张卡显式朗读按钮 ≥44px**（G3 / B5）：复用 `speak(text, { module:'research' })`（`speech.ts:246`）；朗读中 `IconButton` 呈 🔊 态 + 由 `useStore#ttsState` 给可见停止按钮 ≥44px；逐句高亮复用 `speakSequence({ onLine })`（S3 / G5 双向可读）。 |
| 主操作 | 「开始小测验 🎯」（`START_QUIZ`，**ready 或 degraded 都允许**，主架构 §2.2）；「收藏 ⭐」（→ `Progress.discoveries`，F5）；「回到探索」（BACK_TO_EXPLORE）。 |
| 视觉等价（G5/G6） | 每条知识点必有可见短文本（TTS 永唯一通道）；视觉演示（如调色）必须有文字等价描述（无声画也能读）。 |
| 5 类降级态（**均不允许阻断闭环，须有可见占位与文案**） | 见 §6 完整矩阵；核心是「即使 AI 全线不可用，QUIZ 段（静态/程序化题库）仍完整」（主架构 §2.3 铁律）。 |
| 信息密度 | 5–7 岁 ≤2 条 / 8–10 岁 ≤3 条（同 F18 §4.1）；卡片正文 `whitespace-pre-line leading-relaxed`（对齐 `ContentStationPage`）。 |
| 降级态 UX | 详 §6；所有降级都保留「开始小测验」主出口（闭环不断）。 |

### 2.5 QUIZ（复用 RoundRunner，3–5 题，零改动）

| 维度 | 规格 |
|---|---|
| 布局 | **零改动复用 `RoundRunner` + `QuizCard`**（主架构 §4.1）。`questionsPerRound` 取自冻结 `quizRef`（3–5，回合内恒定）；`makeQuestion` 闭包从 `researchTopics` 静态题池 + `drill.ts#makeSpacedDrill`（~35% 复习叠加）出题（C2：题库静态，绝不依赖 AI）。 |
| 无时间压力 | **不显示倒计时，不因超时判错**（S7 / G12）；DDA 的 `>12s` 仅内部难度信号，不得可视化为压力。 |
| 错误反馈（F19 / S8 / G4） | **禁止红色、禁止 `--animate-shake`**；改用中性色 + 轻微 `squishy 0.3s`（F18 §4.4）。**对/错四重冗余**：颜色（蓝=对 / 橙=待改进）+ 图标（✓/○ ≥24px 带 1.5px 描边）+ 文案（「对啦」/「再想想」）+ 固定槽位位置。灰度化 + deutan 模拟下仍须可分辨（G4 截图核验）。 |
| 主操作 | 作答 → 下一题（`QuizCard` 自带）；连错 3 题走 `StruggleModal` 鼓励（RoundRunner 既有，非惩罚）。 |
| 信息密度 | 单题单屏；选项 `CandyButton` ≥56px（G3 / S6）；测验段并发循环动画 **0 处**（F18 §4.1）。 |
| DDA 纪律（C3） | 难度只经 `onRoundStart → meta.syncNow()` 锁存；父组件**禁止**给 RoundRunner 加会在回合内变化的 `key`（会打回第 1 题，C-5 / T2）。 |
| 降级态 UX | **QUIZ 永不受 AI 降级影响**（C2 静态题库）；即使 AI 全线故障，提取测验 + SRS 巩固这条最硬证据链（原则 1+2）完整。 |

### 2.6 REVIEW（本轮小结 + 掌握度变化 + 待复习提示）

| 维度 | 规格 |
|---|---|
| 布局 | 单屏小结卡：① 本轮探索成果（「你发现了 N 条知识 / 提了 N 个好问题」，绑定行为计数 F19，非正确率）；② 掌握度变化（复用 `srs.ts#masteryRate` / `subjectLabel`，C-1 建议 `SUBJECTS` 补 `research` 条目以正确归类）；③ 待复习提示（复用 `srs.ts#dueText`）。正向、肯定基调。 |
| 主操作 | 「继续探索 🔍」（EXPLORE_AGAIN，同主题再探索不重开小测）/ 「完成 ✅」（CONFIRM → COMPLETE）。 |
| 信息密度 | 核心层 ≤3 条（8–10 岁）；不堆数据；掌握度以「进度段 + 数字/分段刻度」呈现（G5 颜色不编码类别）。 |
| 儿童交互 | 正向反馈，不出现「错题 X 道」惩罚性措辞（F19 / R8）。 |
| 降级态 UX | `srsRef` 更新失败 → 仅隐藏「掌握度变化」小节，其余小结照常（掌握度真相源恒为 `progress.mastery`，不依赖本会话引用）。 |

### 2.7 COMPLETE（结算 + 行为型徽章庆祝 + 继续/重开）

| 维度 | 规格 |
|---|---|
| 布局 | 结算卡：本轮行为回顾（发现数 / 探索次数 / 收藏数 —— **全部行为量，零正确率**，F19 / R8）+ 新解锁的研究徽章庆祝（F19 行为型规则，主架构 §6.2）。庆祝复用 `celebrate.ts`（`celebrateStars`/`celebrateBig`，已读 `matchMedia` 沿用 reduced-motion）。 |
| 主操作 | 「继续探索 🔍」（RESTART → TOPIC_SELECT）/ 「回到首页」（LEAVE）。 |
| 信息密度 | 单一庆祝焦点；徽章以 emoji + 名称 + 一句「你因为__解锁」呈现（行为原因可见，缓解 R8）。 |
| 儿童交互 | 庆祝 `≤1200ms 且可跳过`（F18 §4.4）；若 `prefers-reduced-motion` → 无粒子、转场 ≈0（G7）。 |
| 降级态 UX | `findNewBadges(p)` 异常 → 跳过徽章弹层，结算卡照常；`researchDraft.clear()` 失败不影响展示（C7 静默）。 |

---

## 3. 儿童交互规范（跨状态通用）

| # | 规范 | 量化 / 依据 | 守门项 |
|---|---|---|---|
| 3.1 | 触控目标 | 主 CTA（开始探索 / 还有吗？/ 朗读 / 开始小测验）`CandyButton size="lg"` ≥**64px**；测验选项卡 ≥**56px**；图标按钮（`IconButton`/朗读钮）≥**44px**；相邻目标间距 ≥8px | G3 / S6 / B3 |
| 3.2 | 无时间压力 | 探索段与测验段**不显示任何倒计时**；超时不判错；DDA 的 12s 信号不可视化 | S7 / G12 / B7(无压) |
| 3.3 | 揭示权归孩子 | 扩展层**只能由「还有吗？」显性按钮触发**；系统禁止自动/定时推进；静置 60s 不得自行展开 | S1 / G10 / F18 |
| 3.4 | 错误反馈不制造焦虑 | 错误态：中性色 + `squishy 0.3s`，**禁红禁 shake**；措辞「再想想」非「答错了」；连错走鼓励 Modal 非惩罚 | S8 / G4 / F19 / R8 |
| 3.5 | TTS 显式朗读入口 | 每张知识卡 / 发现 / 讲解均有显式朗读按钮 ≥44px + 全局停止入口；朗读失败/不支持给**可见提示**而非静默 | B5 / F11 / G17 / S12 |
| 3.6 | 无声也能懂 | 关闭朗读后，仅凭可见文本 + 图形完成理解与作答；所有 `speak()` 调用点有同义可见内容 | B6 / G5 / S6(特性9) |
| 3.7 | 无声画也能读 | 视觉演示（调色/对比）必须有文字/朗读等价描述，不能只靠动画传达结论 | G6 / S6(特性9) |
| 3.8 | 焦点可见 | 键盘/外接开关聚焦时有 ≥3:1 可见焦点环（复用 `CandyButton` 的 `focus-visible:outline-4` + `#7B57E8` 4.5:1） | B7 / G13 |
| 3.9 | 减少动效 | 尊重 `prefers-reduced-motion: reduce`（`index.css:303` 全局降级），研究模式新增 JS 动画**不得用内联绕过**；应用内 `reduceMotion` 开关与 `matchMedia` 取逻辑或 | B9 / G7 / S4 |
| 3.10 | 光敏安全 | 无 >3 次/秒闪烁、无 >25% 视口明暗跳变、无视差滚动、无不可暂停自动播放 | B8 / G18 |
| 3.11 | 静音一致性 | `settings.sound=false` 时朗读按钮呈「静音中，点此开启」可见态，而非点了没反应（`speak()` 不判 sound，须按钮自判） | S12 / G17 |
| 3.12 | 字号 token 化 | 研究模式新组件**禁用硬编码 px 字号**（`text-[15px]` 一类），一律 rem 级 token，否则 C1 自定义字号失效 | G8 / C-9(附录2) |
| 3.13 | 色彩非唯一载体 / 色盲安全 | 对/错/已选/可点状态须同时有非颜色线索（图标+文字+形状）；禁用「粉 vs 绿」配对（deutan 下 1.19:1）；用蓝 `#4FC3F7` vs 橙 `#FF9F5A` + 四重冗余 | B4 / S5 / G4 / 特性7 |

---

## 4. 家长 / 成长视角

### 4.1 家长中心（ParentPage）呈现研究进度

读取 `progress` 中研究字段（C4 已登记于 `createInitialProgress()`）：

| 数据 | 字段 | 呈现方式 |
|---|---|---|
| 研究时长 | `researchStats.exploreSeconds` | 按主题/日聚合的时长条 |
| 发现数 | `discoveries.length`（F5） | 发现画廊入口缩略 |
| 探索行为 | `researchStats.exploreActions` / `topicsExplored` / `cardsRead` / `sessionsCompleted` | 「好奇心雷达」：广度（主题数）+ 深度（探索次数） |
| 笔记 | `researchNotes`（F6） | 按主题列出孩子的一句话发现 |
| 掌握度 | `progress.mastery['research:<topicId>']` | 复用 `masteryRate` / `subjectLabel`（建议 C-1 补 `research` 条目，否则显示「其他」📘） |

> 关键：**家长中心展示「行为量 + 掌握度」，但不展示「正确率排名」**——与研究徽章 F19 行为型规则一致，从数据呈现层面巩固「奖励探索而非结果」（R8）。

### 4.2 成长博物馆（GrowthMuseumPage）衔接

- 研究徽章（F19 行为型：`research-first` / `research-explore-20` / `research-topics-5` / `research-cards-3` / `research-notes-5`）在博物馆统一展示，与全站徽章共用 `findNewBadges(p)` 流程。
- 「发现画廊」入口：从博物馆点入 `DiscoveryGallery`（仿 `ContentStationPage` 列表），回看孩子收藏的 AI 知识卡与本地笔记。

### 4.3 缓解 R8 困惑的一句文案（必放家长中心研究区顶部）

> **「研究徽章奖励的是好奇心和探索——你问得多、看得广、记得多，徽章就来啦。它不看你答对了几题，所以答对多不一定有研究徽章，这很正常 😊」**

> 设计意图：提前消解家长「孩子题全对却没研究徽章」的疑惑（R8 过度理由效应的旁观者版本），把评价焦点从结果拉回行为。

---

## 5. 文案基调与术语表

### 5.1 基调原则

- **平实肯定**，禁过度卖萌——尤其 8–10 岁段对「被当小孩」敏感，反感叠词/奶音（可访问性分级 §1.2；附录 B-5 待 A/B 验证）。
- 肯定落在「行为 + 具体观察」：「你发现了一个好问题」「你收藏了 3 张知识卡」，而非空洞「你真棒」。
- 错误中性化：「再想想」「换个角度看」，禁「答错了」「不对」。
- 所有文案走 `t('research.*')`，**组件禁硬编码中文**（C7 / T7）。

### 5.2 术语表（开放表达替代量化预告）

| 禁止表达 | 改用（开放 / 行为导向） | 依据 |
|---|---|---|
| 「还剩 5 条」 | 「还有一个小秘密 🔍」「再发现一点吧」 | F18 §4.3（不预告总量，防任务量焦虑） |
| 「第 3/5 题」 | 保留进度但不强调剩余（进度条 showLabel=false，对齐 RoundRunner 用法） | S7 无压 |
| 「答错了」 | 「再想想～」「换个角度试试」 | F19 / S8 / G4 |
| 「你真聪明/乖」 | 「你发现了一个好问题」「你记得真清楚」 | R8 行为归因 |
| 「AI 生成失败」 | 「小智有点忙，我们先来玩小测验 🎯」 | 主架构 §2.3 降级，闭环不断 |
| 「收藏成功」 | 「记下来啦 ⭐」（收藏 = 行为，强化 F19） | F5 / F19 |
| 倒计时数字压迫 | 改用温和占位「小智正在准备…」+ 软倒计时 | S7 / G12 |

---

## 6. 降级 / 错误 UX 矩阵（主架构 §2.3 五类 AI 失败 → 界面表现）

> 铁律：**所有降级均不允许阻断闭环**；QUIZ 段永不依赖 AI（C2 静态题库）。每条给出「用户看到什么」。

| # | 失败场景（架构检测点） | `status` | 用户看到什么（界面 + 文案） | 是否阻断闭环 |
|---|---|---|---|---|
| D1 | **10s 客户端冷却未过**（`generateContent` 返回 `{ok:false, cooldown:N}`） | `idle` | 知识卡区显示骨架占位 + 软倒计时「小智正在准备，再等 **N** 秒就能生成新的啦 ⏳」；「开始小测验」按钮**仍可用**；不消耗服务端配额 | 否（生成暂缓，测验照常） |
| D2 | **服务端 429 `rate_limited`**（`error='生成太频繁啦…'`） | `degraded` | 顶部横幅「小智有点忙，我们先来玩小测验 🎯」；知识卡区显示降级占位卡（标题 + 一句引导）；**「开始小测验」高亮可用** | 否 |
| D3 | **Worker 502 / parse_failed / 网络断** | `degraded` | 知识卡区渲染**静态兜底知识点**（`researchTopics.ts` 的 `fallbackFactsI18nKey`，source='fallback'），可见标注「这是小智准备好的小知识 📚」；朗读按钮可用；「开始小测验」可用 | 否（闭环完整） |
| D4 | **KV 不可用**（Worker 静默不持久，仍返回 item） | `ready`(读得到) | 卡片可读，但 `kvId=null` → **「收藏 ⭐」按钮隐藏/禁用**，附文案「这次的发现暂时不能收藏，下次再来~」 | 否（仅禁收藏） |
| D5 | **离线（PWA）**（`fetch` 抛错） | `degraded` | 顶部「你现在是离线状态，可以看之前看过的发现 📴」；生成按钮禁用；读 `safeStorage` 已缓存卡片展示；若本地无缓存则显示静态兜底（D3 路径） | 否 |

**通用降级占位规范**：所有加载/降级态**禁止空白等待**（R1 / G14 / S9）——必须有骨架屏 + 文案 + 至少一个可用出口（通常是「开始小测验」或「回到探索」）。灰度化 + 断网复现须可在 DEV 抽检（G14）。

---

## 7. 与既有页视觉连贯（组件基准）

### 7.1 按钮体系基准：**以 `CandyButton` 为唯一基准，补 ARIA**（可访问性分级附录 C-5）

> **决策**：`CandyButton` 与 `AccessibleButton` 是两套体系（C-5）。研究模式**不混用**两套视觉语言，统一以 `CandyButton` 为基准，并补齐 ARIA（`aria-label` / `aria-busy` / `focus-visible` 环 `CandyButton` 已内置 `focus-visible:outline-4`）。**理由**：`CandyButton` 已有尺寸表（sm44/md52/lg64/xl76）与糖果风格，与全站一致；`AccessibleButton` 的 blue/gray 通用配色会破坏研究模式的色调连贯。

### 7.2 G1 硬性约束（合入门禁）：研究模式内承载文字的按钮字色修正

| 变体 | 现状（既有 `CandyButton` 默认） | 研究模式修正 | 对比度 |
|---|---|---|---|
| `solid` | `color: t.on`（5 个色调白字 1.83–2.72:1，**违规**） | **`color: var(--color-ink) #4a3b4e` + `size="lg"`**（≥20px bold 落入 WCAG 大文本档） | 3.81–9.38:1 ✅ |
| `soft` | `color: t.deep`（2.18–3.94:1，普遍不合规） | **`color: var(--color-ink)`**（soft 底本就浅，ink 字 8.50–9.38:1） | 8.50–9.38:1 ✅ |
| `ghost` | `color: t.deep` | 保留 `t.deep`（深字，已合规） | — |

> 实现提示：`CandyButton` 的 `style` 由 `variant` 计算，研究模式须**在调用处注入 `style={{ color: 'var(--color-ink)' }}` 覆盖**（或新增 `research` tone 语义）。`grep` 守门：`modules/research/` 下不得出现白字 solid 按钮（G1 逐组件核对）。

### 7.3 复用 / 对齐的既有组件样式清单

| 研究组件 | 复用 / 对齐的既有样式 | 来源文件 |
|---|---|---|
| `TopicGrid` | 网格 `grid-cols-2 sm:grid-cols-4 gap-3`、`motion.button` 缩放反馈、`rounded-[1.6rem]`、`linear-gradient(160deg, t.soft 0%, #fff 70%)`、`FluffyIcon`、标题 `t.deep` + `desc line-clamp-1` | `ExploreMore.tsx` |
| `ResearchModePage` 顶部 | `PageHeader`（emoji/title/subtitle，tone="blue"） | `ContentStationPage.tsx` + `components/ui/Card` |
| `KnowledgeCardPanel` / `DiscoveryGallery` | 文章卡 `rounded-[1.8rem] border-4 border-white bg-gradient-to-br shadow-fluffy`；头部标题+tags+日期；朗读 `IconButton`（`rounded-full px-3 py-2 text-lg`，朗读中 `bg-candy-purple-deep text-white`）；正文 `whitespace-pre-line leading-relaxed text-[15px]` | `ContentStationPage.tsx` |
| `EXPLORE` / `KNOWLEDGE_CARD` 揭示按钮 | `CandyButton size="lg"`（≥64px）+ `sfxTap()` | `Button.tsx` / `DinoWorld.tsx` |
| `QUIZ` | **零改动** `RoundRunner` + `QuizCard`（含 `StruggleModal`、`ProgressBar`、`StarRating`、`celebrateStars/Big`） | `RoundRunner.tsx` / `QuizCard.tsx` |
| 音频指示器 | `useStore#ttsState` 全局朗读指示 | `speech.ts` / `useStore` |
| 庆祝 | `celebrate.ts`（已读 `matchMedia`） | `lib/celebrate.ts` |
| 图标 | `FluffyIcon`（模块图标）/ 主题 `emoji`（`researchTopics.emoji`） | `ExploreMore.tsx` / `nav.ts` |

### 7.4 视觉一致性守门

- 装饰元素透明度 ≤25% 且不与正文重叠（G20）；浅糖果色（`candy-*` on 白 1.35–2.53:1）**只做背景装饰，禁承载文字**（可访问性分级 §5.3-3）。
- 字号一律 rem 级 token，禁 `text-[Npx]`（G8）。
- 正文固定 `ink #4a3b4e` on `cream`；**禁用 `ink-soft #8a7791` 承载正文**（on cream 仅 3.84:1，G2）；`grep text-ink-soft` 在 `modules/research/` 下应为 0（仅 ≥24px 场景允许）。

---

## 8. 守门自检（UX 不违反可访问性门禁）

> 逐条核对 G1–G20 + F18/F19，确认本 UX 规格满足或显式给出处置。

| 门控项 | 本规格对应条款 | 结论 |
|---|---|---|
| **F18** 认知负荷护栏 | §2.3 核心/扩展层、密度阈值、不预告总量、锚点稳定、揭示归孩子 | ✅ 达标（Standard） |
| **F19** 内在动机保护 | §2.5/§2.7 错误中性、奖励绑行为不绑结果；§4.1 家长不展示正确率；§6 降级不惩罚 | ✅ 达标（Standard） |
| **G1** solid 禁白字 | §7.2 字色修正 + size="lg" | ✅ 硬性（红线） |
| G2 正文禁 ink-soft | §7.4 grep 守门 | ✅ 阻断 |
| G3 触控目标 | §3.1（主 CTA 64 / 选项卡 56 / 图标 44） | ✅ 阻断 |
| G4 对错四重冗余 | §2.5（蓝/橙+✓○+文案+槽位） | ✅ 阻断 |
| G5 无语音也能懂 | §3.6 / §5.2 | ✅ 阻断 |
| G6 无声画也能读 | §3.7 | ✅ 阻断 |
| G7 减少动效 | §3.9（prefers-reduced-motion + reduceMotion 或） | ✅ 阻断 |
| G8 字号 token 化 | §3.12（禁硬编码 px） | ✅ 阻断（C1 前置） |
| G9 信息密度上限 | §2.3 / §2.4（按 ageRange 取档） | ✅ 阻断 |
| G10 揭示不自动 | §2.3 / §3.3（静置 60s 不展开、锚点不位移） | ✅ 阻断 |
| G11 动画时长 | §2.3（入场≤450ms、错误禁 shake、庆祝≤1200ms 可跳过） | ✅ 阻断 |
| G12 无时间压力 | §2.5 / §3.2（无倒计时、超时不判错） | ✅ 阻断 |
| G13 焦点可见 | §3.8（CandyButton focus-visible + #7B57E8） | ✅ 阻断 |
| G14 加载/降级不留白 | §6（骨架+文案+可用出口） | ✅ 阻断 |
| G15 流式 aria-live | §2.4（KNOWLEDGE_CARD `aria-live=polite`） | ✅ 提醒 |
| G16 i18n 不截断 | §5.1（容器弹性，禁定高截断，en-US 长 30–60% 预留） | ✅ 提醒 |
| G17 静音一致性 | §3.11（sound=false 显式提示态） | ✅ 阻断 |
| G18 光敏安全 | §3.10 | ✅ 阻断 |
| G19 新 Settings 字段防 undefined | §3.9 注：MVP 研究**不新增任何 Settings 字段**（C-9 不触发）；若未来新增须补 `useSettingsStore` merge 或 `?? default` | ✅ 阻断（前瞻） |
| G20 装饰不争对比 | §7.4（透明度≤25%、不重叠） | ✅ 提醒 |

**架构约束引用核对**：C1（AI 全经 `contentClient`/`useAi` → Worker 安全链，降级为一等公民 ✅）、C2（QUIZ 静态题库，永不依赖 AI ✅）、C3（DDA 仅 `onRoundStart` 落档，禁回合内重评 / 禁变 key ✅）、C4（新 Progress 字段 `createInitialProgress` 登记，徽章 `?? 0` 防御 ✅）、C5（新增 jpg 须手改 `CORE_JPG` ✅）、C6（4 处路由同步 + `categories.research` 补键 T4 ✅）、C7（safeStorage 唯一存储、禁硬编码中文、i18n 红线 ✅）。

---

## 9. 待工程 / 美术对齐的开放项（非阻断，供排期）

1. **C-1**：`srs.ts#SUBJECTS` 建议补 `{ key:'research', label:'研究', emoji:'🔬' }`，否则家长中心研究显示「其他」📘（主架构 §4.4）。
2. **C-2**：`ageRange` 来源——MVP 建议取家长设置（`useProfilesStore`），F18 密度阈值按此取档；当前 `contentClient` 默认硬编码 `'7-8'`，需会话层显式传参。
3. **C-3 / C-4**：`ExploreSlot` 适配器逐个试装（先 `color`+`dino` 验证）；行为计数仅校验 `[data-explore-action]` 防虚高。
4. **B-5**：8–10 岁文案去卖萌需 A/B 验证（附录 B），MVP 先按「平实肯定」基线，埋点回收后固化。

---

*本文档为 UX 规格，不含实现与 git 操作。所有密度/动画阈值、对比度数据均可在可访问性分级文档（附录 A 实测）复算复核。*
