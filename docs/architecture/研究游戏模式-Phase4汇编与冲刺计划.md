# 研究游戏模式 · Phase 4 汇编与冲刺计划（CMML）

> 汇编人：游承峰（工作室主理人）｜日期：2026-08-12
> 上游：Phase 3 主架构（PASS，5 ADR 全 Accepted）、Phase 4 三专家并行产出（UX / 资产 / Epic）。
> 本文是 CMML 预制作阶段的**单一交付汇编**，列出全部产物、关键裁决与首个冲刺范围。

---

## 1. 文档谱系（单一事实源索引）

| 阶段 | 文档 | 路径 | 状态 |
|---|---|---|---|
| 概念/方向 | 功能可行性清单（F1–F19） | `docs/研究游戏模式-功能可行性清单.md` | ✅ 已定方向 |
| Phase 3 | 主架构（FSM/数据契约/接线/控制清单） | `docs/architecture/研究游戏模式-主架构.md` | ✅ PASS |
| Phase 3 | ADR-001~005 | `docs/architecture/研究游戏模式-ADR.md` | ✅ 全 Accepted |
| Phase 3 | 可访问性分级（Basic/Standard/Comprehensive） | `docs/architecture/研究游戏模式-可访问性分级.md` | ✅ |
| Phase 4 | UX 规格（7 状态界面流/儿童交互/降级矩阵） | `docs/architecture/研究游戏模式-UX规格.md` | ✅ |
| Phase 4 | 资产规格（资产清单/动效/色盲 token/TTS 态） | `docs/architecture/研究游戏模式-资产规格.md` | ✅ |
| Phase 4 | Epic 拆分与冲刺计划（6 Epic/Story/T1–T8） | `docs/architecture/研究游戏模式-Epic拆分.md` | ✅ |
| 本文件 | Phase 4 汇编 | `docs/architecture/研究游戏模式-Phase4汇编与冲刺计划.md` | ✅ |

---

## 2. 方向定论与已裁决项

- **方向**：CMML「好奇心驱动的多模态精熟闭环」——好奇触发→多模态探索→AI 知识卡→短提取测验→SRS 巩固→DDA 脚手架→游戏化回流。
- **主理人裁决（已写入主架构 §8.0，架构评审 CONCERNS→PASS）**：
  - **B1** AI 限速：content 独立桶 `bucket='content'`（Worker `POST /api/content/generate` 1 行改动，需重部署）。
  - **B2** 导航：不进底部 Tab（满 6/6），走第 8 品类 chip `research` + 首页 ExploreMore 卡片。
  - **B3** 知识卡：MVP 接受泛化卡片（复用 science/story + 注入主题上下文），F4 专属 explainer 端点留 P1。

---

## 3. Phase 4 三份文档要点

### 3.1 UX 规格（文策渊）
- 单路由 `#/research` 内 FSM 7 状态切换；双入口（首页卡片 + 第 8 chip）。
- 儿童交互铁律：揭示权归孩子（F18）、奖励绑行为不绑对错（F19）、无时间压力、错误中性禁红禁 shake、对/错四重冗余、TTS 显式入口、无声也能懂。
- 5 类 AI 降级均"不阻断闭环"，QUIZ 段永不依赖 AI。
- 家长视角不展示"正确率排名"，巩固 R8 行为激励；附 R8 缓解文案。
- 按钮基准统一 `CandyButton` 补 ARIA（不混用 AccessibleButton）；G1 字色修正（solid→ink 深字+size=lg）。

### 3.2 资产规格（林绘澄）
- 全量资产清单（emoji 优先零成本 + 需出图项），默认 **png 透明**（禁 jpg，避开 `CORE_JPG` 手维护）。
- **G1 硬约束**：研究模式内承载文字的 solid 按钮一律 ink 深字 + size=lg（对比度 3.81–9.38:1）。
- 动效区间落实：错误禁 shake、庆祝 ≤1200ms 可跳过、探索段循环动画 ≤1/测验段 0。
- 色盲安全 token：对/错 = 蓝 `#2196C9`/橙 `#E0742B` + ✓/○ + 文案 + 固定槽位（四重冗余）。
- TTS 视觉态、按 ageRange 插画密度规范、交付门禁 G1–G20。

### 3.3 Epic 拆分（程基岩）
- **6 Epic（A–F）**：A 编排层(F17) / B 进度与掌握度(C4/F19) / C 路由(C6) / D 探索与知识卡 / E 测验接线 / F 打磨扩展(P2)。
- **Sprint 1 中枢**：A（纯逻辑 FSM）+ B（C4 字段，崩全站守门）+ C（路由骨架）+ Worker B1。
- 测试映射 T1–T8：T1/T2/T3/T6/T7 纯逻辑可先行；T4 路由、T5 徽章、T8 预缓存分档。
- 跨切面门禁：C1–C7 责任归属 + 7 项前瞻风险（useSettingsStore 缺 merge、0 commit 基线、B1 部署门等）。

---

## 4. 首个冲刺计划（Sprint 1）

**目标**：钉死可纯逻辑验证的中枢层 + 跑通空壳路由，让 T1/T2/T3/T4/T6 在无 UI 下转绿。

| 纳入 | 产出 | 测试门 |
|---|---|---|
| A1 types | `lib/research/types.ts` | typecheck |
| A2 reducer | `lib/research/sessionMachine.ts` | **T1 + T2** |
| A3 draft | `lib/research/researchDraft.ts` | **T6** |
| B1+B2 | `types.ts#Progress` + `progress.ts` C4 双处登记 | **T3（首日合并）** |
| C1+C2 | `router.ts` + `App.tsx` lazy/case | typecheck |
| C3+C4 | `nav.ts`(4 点) + `i18n/*` | **T4** |
| Worker B1 | `worker/index.mjs` content 独立桶 | 部署门（外部） |

**Sprint 1 Done 定义**：① `typecheck` 0 错 ② T1/T2/T3/T4(+T6) 全绿 ③ 空壳 `#/research` 可导航、第 8 chip 文案非空白 ④ Worker B1 部署并回归（content/chat 互不挤兑）。

**关键风险**：B2(C4) 漏登记即崩全站（首页+成长博物馆）→ 首日合并；B1 为外部部署门；仓库 0 commit → 实现前 `git init` 建基线。

---

## 5. 里程碑

| 里程碑 | 范围 | 状态 |
|---|---|---|
| M1 | Sprint 1 中枢 + 路由 + B1 | 🟡 进行中（Phase 5 实现） |
| M2 | MVP 闭环可玩（A+D+E 全绿） | ⏳ |
| M3 | P1 体验扩展（F18/F19/F11/F13/F15） | ⏳ |
| M4 | P2 成长留存（F1–F7 打磨） | ⏳ |

---

## 6. 下一步（Phase 5 制作）
按 Sprint 1 范围由工程专业实现：纯逻辑 FSM + C4 进度字段 + 路由骨架 + Worker B1，配齐 T1–T3/T4/T6，本地 `lint && typecheck && test` 全绿后提交基线（不推送）。D/E/F 的 UI 实现在后续 Sprint 并行铺开。
