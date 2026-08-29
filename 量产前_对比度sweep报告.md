# 量产前对比度 Sweep 报告

> 阶段：设计原型 v1 → 真码对账闭环 · a11y 收尾第 2 步
> 日期：2026-08-29
> 范围：重设计核心面（`today` + `hanzi` 模块），基于 `量产前_a11y专项审计报告.md` 界定的 MEDIUM 违规清单

---

## 1. 背景

`量产前_a11y专项审计报告.md` 扫描结论：交互可达性（非 button 的 div/span 带 onClick）0 命中、`<img>` 缺 alt 0 命中，唯一真实风险面是**对比度铁律**——白字压浅/中饱和背景（< WCAG 2.1 AA）。审计已顺手修掉最高危 2 处（`HanziStrokeWriter` 压 main 粉 / 压浅柔蓝），剩余 MEDIUM 项列为待办。

本报告记录剩余 MEDIUM 违规的**全量清剿 + 防回归机制**。

## 2. 执行过程

### 2.1 先建「守卫」，后做「清扫」（守卫即扫描器）

避免人工枚举的遗漏与不可复现，先写了对比度铁律 lint 守卫 `scripts/audit-contrast.mjs`，用**同一套规则**先产出精确违规清单，再逐项修复、重跑归零。

守卫规则要点（两轮修正后收敛为精确判定）：
- **同行匹配**（非三行窗口）——避免模板字符串折行误报
- **`hover:`/`focus:`/`active:` 前缀白字豁免**——深态悬停白字是合规的（如 `text-candy-pink-on hover:text-white`）
- **巨型装饰图标豁免**（`text-4xl`/`text-5xl`）——emoji/播放键白字为常规做法
- **基线模式** `--baseline=scripts/contrast-baseline.json`——只许降不许涨，与工程既有 `lint:budget` 同构，CI 不因历史债务阻断

### 2.2 精确枚举（核心面）

守卫初次全量运行：352 处（含 3 行窗口误报 + 全域历史债务）。修正规则后精确枚举，核心面（`today` + `hanzi`）收敛为 **25 处**：

| 模块 | 违规数 | 典型违规 |
|---|---|---|
| `today/*` | 8 | 白字压 `pink-500` / `emerald-400` / `amber-500` |
| `hanzi/*` | 17 | 白字压橙系渐变 / 浅中饱和背景 |

### 2.3 一次性 sweep codemod

`scripts/fix-contrast-in-scope.mjs`：只改**基础白字**（保留 `hover:text-white` 深态），范围严格限定 `today`/`hanzi` 模块，背景不变、仅文字改对应 `text-candy-*-on` 深字令牌。

执行结果：**25 处全部修复**。

### 2.4 重跑守卫：核心面归零

```
核心面残留（today/hanzi）：无
总违规（全域）：278 处 → 全部位于重设计核心面之外
  （storybook/science/voice/pet/numbers/music 等，属历史基线债务）
```

按 a11y 报告界定范围，本轮只收口重设计核心面；其余 278 处以**基线**形式纳入守卫防回归（只许降不许涨）。

### 2.5 播种基线 + 接入工程

- `scripts/contrast-baseline.json` — 播种 `count: 278`
- `package.json` — 新增 `"audit:contrast": "node scripts/audit-contrast.mjs --baseline=scripts/contrast-baseline.json"`
- `.github/workflows/ci.yml` — 新增「对比度铁律门禁」步骤（非阻断，`continue-on-error: true`，与 `lint:budget` 同构），最终由 status 步骤统一判定 + PR 评论摘要表展示

## 3. 验证（全绿）

| 验证项 | 结果 |
|---|---|
| `node scripts/audit-contrast.mjs` | ✅ 核心面 0 违规 |
| `npm run audit:contrast` | ✅ 278 ≤ 基线 278，exit 0 |
| `tsc -b` | ✅ 零类型错误 |
| `vite build` | ✅ 成功（35.46s） |
| CI 门禁接入 | ✅ 步骤/变量/摘要表三处均已落地 |

## 4. 交付物

| 文件 | 说明 |
|---|---|
| `scripts/audit-contrast.mjs` | 对比度铁律守卫（永久防回归，可复用） |
| `scripts/fix-contrast-in-scope.mjs` | 一次性 sweep codemod（已执行，可留档） |
| `scripts/contrast-baseline.json` | 对比度基线（278，只许降不许涨） |
| `src/modules/today/*.tsx`（8 处） | 白字 → `text-candy-*-on` |
| `src/modules/hanzi/*.tsx`（17 处） | 白字 → `text-candy-*-on` |
| `package.json` | `audit:contrast` 脚本 |
| `.github/workflows/ci.yml` | 对比度门禁步骤 + 摘要 |

## 5. 遗留与建议（非阻塞）

- **278 处全域历史债务**（核心面之外模块）已在基线内锁定，**只许降不许涨**；后续按模块逐个 sweep 即可持续收窄，机制已就位。
- 建议后续新增「main 色压字」一律用 `text-candy-*-on`（铁律），守卫会自动拦截新增违规。

## 6. 闭环结论

重设计核心面对比度违规 **25/25 全部修复**，防回归门禁上线（npm + CI），机制与 `lint:budget` 同构可长期维护。a11y 收尾三步（专项审计 → 高危修复 → 全量 sweep + 守卫）至此**完全闭环**。
