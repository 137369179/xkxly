# Changelog

本文件记录「宝贝学习乐园」各版本/提交的功能变更、缺陷修复与优化，便于复盘与回溯。
每条目的头部标注 `[R##]` 里程碑编号（若适用）与提交状态。

---

## [Unreleased] · 2026-08-21 · 分支 `学习乐园`（基于 R47 = `ca803cd`）

> 本批次为**待提交**改动，共 18 个修改文件 + 3 个新增测试文件（+205 −55），
> 逻辑上可分为三块：R48 渐进式闯关目标 / P0 缺陷修复 / P1 性能与安全优化。
> 全量验证：构建 ✓、`tsc -b` ✓、测试 70 文件 824 用例 ✓。

### 一、功能增强：闯关里程碑「目标等级化」（R48 · 渐进式难度）

**背景**：闯关里程碑条（StreakBar）此前固定「3 连对即通关」，难度越高目标不变，
难以在高难度维持「再对几题就通关」的投入感；固定目标也与渐进式难度设计不一致。

**改动**
- `src/lib/difficulty.ts`：新增 `streakTargetForLevel(level)`，目标连对数随难度爬坡
  （难度 1/2/3 → 2/3/4 连对）。
- `src/components/quiz/RoundRunner.tsx`：`streakBar` 属性升级为
  `{ target?, tone?, leveled? }`——`leveled` 模式下目标按 `difficulty` 动态推导；
  未给 `target` 时默认 3，零回归。
- `src/modules/hanzi/HanziLearn.tsx`、`src/modules/numbers/WordProblems.tsx`：里程碑条
  改用 `streakTargetForLevel(difficulty/level)`，通关判定与视觉进度一致。
- `src/modules/letters/LetterOrder.tsx`：目标随得分温和爬坡（0-4 分→2、5-9 分→3、10+ 分→4）。
- `src/modules/numbers/{CountingGame,MathExtra,MathQuiz}.tsx`：`target:3` → `leveled: true`。

**新增测试**：`src/lib/difficulty.test.ts` 补充 `streakTargetForLevel` 三档断言。

**效果**：闯关目标随难度/得分递增，渐进式体验统一到所有启用闯关条的模块。

---

### 二、缺陷修复（P0 · 全站功能审计发现并修复）

#### P0-1 · SpeedMath 快速连点导致重复计分 / SRS 放大
- **问题**：`handle` 用 `chosen`(state) 判重，同渲染帧内连点两选项时 `chosen` 未刷新，
  两次都计分 → 分数虚高、`practice`/`recordSpeed` 重复写入。
- **修复**：`src/modules/numbers/SpeedMath.tsx` 引入同步 ref 锁 `answeringRef`，
  换题时释放。**测试**：`SpeedMath.test.tsx` 覆盖「同帧连点同一/不同选项只计一次」。

#### P0-2 · MathLadder 无单题锁 + 结算读取 stale 计数
- **问题**：`submitAnswer` 无"已作答"保护，Enter 与「确认」并发时同一题重复提交。
- **修复**：`src/modules/numbers/MathLadder.tsx` 引入 `submittingRef` 同步锁，换题时释放。
  **测试**：`MathLadder.test.tsx` 覆盖「同帧双 Enter 只计一次」「锁不阻断下一题」。

#### P0-3 · SRS 已掌握(lv5)保温间隔口径分裂（due15天 vs 判定45天）
- **问题**：`review()` 给 lv5 排 `INTERVALS[5]=15` 天，而 `isDue()` 对 lv>5 额外 +30 天 → 实际 45 天；
  成语侧用裸 `due<=now`，与全局不一致。
- **修复**：`src/lib/srs.ts` 按产品注释统一为 **30 天**：`INTERVALS[5]=30`，
  `isDue()` 直通 `review` 排的 `due`（去除 +30 特判）。成语与全局自然对齐。
- **测试**：`srs.test.ts` 更新既有断言并按新口径新增「review 与 isDue 一致」；
  `idiomSrs.test.ts` 新增「lv5 成语复习时机与全局 SRS 一致」。(按你确认的 30 天口径)

#### P0-4 · 首页 LCP 图 preload 错位
- **问题**：`index.html` `fetchpriority` 预加载 `/hero_banner.jpg`（仅 og:image 用），
  真实首屏 Hero 是 `/hero_jelly.png`，未预加载。
- **修复**：`index.html` 预加载改为 `/hero_jelly.png`。**测试**：`__tests__/indexHtmlPreload.test.ts`
  断言 image preload 与 HomeHero 实际首屏图一致、且不含 og 专图。

---

### 三、性能与安全优化（P1）

#### P1-5 · Bundle 分包：en-US 英文词典懒加载
- **问题**：`useTranslation.ts` 静态引入 8 个语言 JSON，en-US 词典约 147KB 压入主包，
  中文默认用户白白下载。
- **修复**：`src/i18n/useTranslation.ts`——默认 `zh-CN` 及补丁内联；
  四档 en-US 词典改用 `import()` 按需加载（动态 chunk），就绪后经 `enTick` 重渲染切换，
  未就绪时走 zh-CN 回退链，接口（`t`/`translate`）保持不变。
- **效果**：构建后 `en-US-*.js`(143.77KB/gzip 54.65KB) 独立为懒加载 chunk，主入口 `index` 347KB，
  默认中文用户首屏不再加载英文词典。

#### P1-6 · CSP 安全收紧
- `public/_headers` 与 `shared/aiProxyCore.mjs`（`SECURITY_HEADERS`）同步新增
  `script-src-attr 'none'`：禁止内联事件属性（`on*=`/`javascript:`），React 不依赖内联事件处理器，收紧无副作用。
- 补充注释说明各白名单正当性：`'unsafe-inline'`+`cloudflareinsights`（CF Web Analytics 信标）、
  `'wasm-unsafe-eval'`（Kokoro WASM）、`cdn.jsdelivr.net`（Kokoro 库）、
  `style-src 'unsafe-inline'`（React 内联 style 必需）。

---

### 四、验证结果（本次提交前）
| 项 | 结果 |
|---|---|
| 生产构建 `npm run build`（prebuild+tsc+vite） | ✅ 44.44s，1509 模块 |
| 类型检查 `npx tsc -b` | ✅ 0 错误 |
| 全量测试 `npm run test` | ✅ 70 文件 / 824 用例全过 |

> 说明：构建剩余的 >900KB 警告（`vendor-three`/`vendor-opencc`/`data-poems`）为既有大型
> 按需 chunk，已由 `modulePreload` 排除预取 + `dynamic import` 懒加载，非本批次引入。

---

### 五、文件变更清单

**功能增强（R48）**
- `src/lib/difficulty.ts`、`src/lib/difficulty.test.ts`
- `src/components/quiz/RoundRunner.tsx`
- `src/modules/hanzi/HanziLearn.tsx`
- `src/modules/letters/LetterOrder.tsx`
- `src/modules/numbers/CountingGame.tsx`、`MathExtra.tsx`、`MathQuiz.tsx`、`WordProblems.tsx`

**缺陷修复（P0）**
- `src/modules/numbers/SpeedMath.tsx`、`MathLadder.tsx`
- `src/lib/srs.ts`、`src/lib/srs.test.ts`、`src/modules/idioms/idiomSrs.test.ts`
- `index.html`

**性能/安全（P1）**
- `src/i18n/useTranslation.ts`
- `public/_headers`、`shared/aiProxyCore.mjs`

**新增测试**
- `src/modules/numbers/SpeedMath.test.tsx`、`src/modules/numbers/MathLadder.test.tsx`
- `src/__tests__/indexHtmlPreload.test.ts`

---

<!-- 后续提交插入上方，保持最新在上 -->