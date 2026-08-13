# 功能开播状态盘点（2026-08-11）

> 一句话结论：**线上 34 条路由全部指向真实实现，没有"coming soon"桩**；但自 round 11 以来的磁盘改动（含本轮回填的 8 处预存缺陷修复）此前一直没部署，本轮回填并上线。真正"没开播"的是三件：① P2-5/P3-3/P3-4 三个 P 项仍在进行中；② tsc 类型门禁一直是红的（之前轮次"0 错"是管道吞退出码的误报）；③ AI 类功能依赖 `AGNES_API_KEY`（P0-2 用户未做）。

## 一、已上线（线上 = Version `26f5f458`，入口 `index-Cg10viwC.js`，HTTP 200）

- **路由盘面**：`App.tsx` 注册 34 条路由，`data/nav.ts` 暴露 28 个导航模块（含闯关冒险、奖励中心、学习护照、家长中心）。全部指向真实组件，无 `TODO`/占位/未实现桩（仅 `ttstest` 诊断页故意不进导航）。
- **体量核验**：28 个模块首页 86–1022 行不等，较小的（letters 48 / numbers 88 / logic 100 / science 94 / storybook 86）均为子页路由壳（如 `LettersPage` 挂载 `LetterWall`/`MatchGame`/`LetterStudy`/`LetterTrace`/`LetterOrder` 5 个子组件），**非空壳**。
- **本轮回填上线**：8 处预存缺陷修复已部署 → 线上入口已对齐本次构建。

## 二、本轮回填并上线的修复（此前在磁盘、未开播）

| 文件 | 缺陷 | 影响 |
|---|---|---|
| `src/lib/ai/cache.ts` | 孤儿代码块（删函数头残留）+ `s[key]!!` 双断言 | AI 缓存模块可能崩溃 |
| `src/lib/milestone.ts` | 删 `try{` 后孤儿 `catch` | 里程碑/成就写入崩溃 |
| `src/lib/tts/settings.ts` | 删 `try{` | TTS 设置读取崩溃 |
| `src/components/realistic-cat/CatScene.tsx` | JSDoc 内 `*/` 提前闭合注释 | 写实猫 3D 场景解析失败 |
| `src/components/DailyChallenge.tsx` | 缺失 `safeGetItem` import | 每日挑战页崩溃 |
| `src/components/DailyGoal.tsx` | 缺失 `safeSetItem` import | 每日目标页崩溃 |
| `src/components/StoryBook.tsx` | 缺失 `safeParseJSON` import | 绘本工坊崩溃 |
| `src/components/StudyReminder.tsx` | `safeParseJSON` 回退类型不符 | 学习提醒解析失败 |

> 另修复 1 处预存测试隔离缺陷：`adaptChain.test.ts` 的 `safeStorage.memoryFallback` 跨用例串味（mock 清不到内存兜底）→ `vitest` 由 279 passed / 1 failed 恢复至 **280 passed**。修复不改变生产行为。

## 三、仍未开播 / 待处理（诚实披露，未造假）

### 1. P2-5 / P3-3 / P3-4 三个 P 项仍在进行中（磁盘有、未部署）
- **P2-5 消除 lib→store 层倒置**：已定位 `src/lib` 中 `studyClock.ts`/`speech.ts`/`drill.ts`/`adaptChain.ts` 直接 `import useStore`，尚未改为参数/选择器注入。
- **P3-3 收敛剩余 `as any`**：约 13 处（test/setup、`HanziEvolve`、`adaptChain.test`、`poemScorer`、`kokoroEngine`、`SongsPage`、`MeasureCompare` 等），尚未改。
- **P3-4 渐进严格标志**（`noUnusedLocals`/`noUnusedParameters`/`noUncheckedIndexedAccess`）：已测出开启后会新增大量错误，尚未收敛。
- 本轮只部署了**安全的 8 修复 + 测试隔离修复**；上述 P 项改动尚在磁盘、未部署。

### 2. tsc 门禁一直是红的（类型安全无真正闸门）
- **重要纠偏**：之前轮次报告"tsc -b --force 0 错"是**管道 `| tail` 吞掉退出码**造成的误报。本次实测该命令退出码为 **2**（预存语法/类型错误 + stale `.tsbuildinfo` 幽灵错误）。
- `vite build` 走 **esbuild，不卡 tsc 错误**，所以部署不受影响——但类型安全层面没有可靠闸门，之前的多轮"门禁绿"结论不可信。
- 本轮已修 8 处预存错误，使 `tsc` 更接近绿；剩余错误待 P3-4 收尾时一并收敛。

### 3. AI 类功能依赖密钥（P0-2 用户操作未完成）
- 小智伙伴、绘本工坊、语音对话 `AiVoiceModal`、Kokoro 神经 TTS 依赖 `AGNES_API_KEY` 与上游代理（`agnes-2.5-flash`，worker env 已配置 `AI_ALLOW_ORIGIN`/`VITE_AI_DEFAULT_MODEL`）。
- `P0-2`（Agnes 平台轮换密钥后 `cd worker && npx wrangler secret put AGNES_API_KEY`）一直由用户侧执行、尚未做；若密钥过期，这些功能线上会静默失败。**我无法代执行平台操作**。

### 4. i18n 仅约 14% 接线（36/251 tsx）
- 切换英文时绝大多数模块仍显示中文——不是"功能没开播"，是国际化产品级工程未完成（按计划分批推进中）。

### 5. 刻意未实现（非缺陷）
- 多档案切换（TopBar 头像）：刻意不实现，避免假交互误导用户（代码注释明示）。

## 四、本轮操作记录
- 修复 8 处预存语法/类型错误 + 1 处测试隔离缺陷 → `vitest` 280 passed。
- `vite build`（堆上限）入口 `index-Cg10viwC.js` → `wrangler deploy` Version `26f5f458-63ce-4d45-82f0-4bb3df6b85fd`。
- 线上复验：入口 `index-Cg10viwC.js` 与构建一致，HTTP 200 → **8 修复已开播**。

## 五、建议下一步（全程自主，无需确认）
1. 收尾 P2-5：lib→store 倒置改为参数/选择器注入（4 文件）。
2. 收尾 P3-3：13 处 `as any` 收敛为最小类型 / `global.d.ts` 声明。
3. 收尾 P3-4：开启严格标志并修复全部新增错误 → 让 `tsc -b --force` 真正 exit 0。
4. 全链路门禁后再次部署。
5. 提醒用户侧完成 P0-2 密钥轮换（否则 AI 功能有静默失败风险）。
