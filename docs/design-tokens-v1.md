# 宝贝学习乐园 · 设计令牌 v1（单一事实源 / Single Source of Truth）

> 来源：`src/lib/tones.ts`（六色）、`src/styles/index.css`（@theme + 工具类）、`src/components/ui/Button.tsx`、`src/components/layout/BottomTabs.tsx`、`src/lib/chartTokens.ts`
> 对齐：`docs/2026-08-28-儿童风格设计系统规范.md`、`docs/2026-08-29-品牌3D图标资产规范v1.md`
> ⚠️ **严格沿用设计系统 v1，不重建、不另选第三方系统。** 代码与文档冲突处一律以代码为准并标注 ⚠️。

---

## 1 色彩 Color

六色板采用 **main / soft / deep / on** 四值模型（brief 的 primary/soft/tint 中 primary=main、soft=soft；deep 承载白字、on 为 main 上的深字）。各值从 `tones.ts` 原样提取：

| tone | primary(main) | soft(浅底) | deep(承载白字) | on(main上深字) |
|---|---|---|---|---|
| pink | #FF5C8A | #FFE1EB | #C9285C | #3D1424 |
| blue | #3D9BFF | #DCEBFF | #0B5EC9 | #0C2D4F |
| yellow | #FFC53D | #FFF6D9 | #8A5B00 | #4A2B1F |
| green | #3FC26B | #DFF5E7 | #1B7A3D | #123B21 |
| purple | #8F5BFF | #EFE4FF | #5F2ECC | #160830 |
| orange | #FF9F2E | #FFF0DB | #B45F09 | #4A2B1F |

**果冻粉主调 = pink**：primary `#FF5C8A`、light `#FFF0F6`、deep `#C9285C`（全站强调/错误语义）。

中性：底 `#FFF8EF` ⚠️（body 实际 `background-color:#FFF9FA`，差一档，以 body 为准）· 卡 `#FFFFFF` · 描边 `#F3E3CF` ⚠️（组件实际用 pink-200 `#FFC9DA` / `#FFD1E1`）· 正文 `#4A2B1F` · 次级 `#8A6F5C`。
语义：success `#3FC26B` / warning `#FFC53D` / error `#FF5C8A`（复用 pink）/ info `#3D9BFF`。
**铁律**：高饱和 main 永不压白字（实测仅 1.6–2.9:1），main 用 on 深字、deep 用白字；orange deep `#B45F09` 白字 4.58 刚过线，切勿调浅。

## 2 排版 Typography

圆体 `--font-round`：`'Baloo 2','PingFang SC','Hiragino Sans GB','Microsoft YaHei',system-ui,-apple-system,'Segoe UI',sans-serif`（中文无圆体，靠字重补偿）。
楷体 `--font-han`：`'STKaiti','KaiTi','PingFang SC','Hiragino Sans GB','Songti SC',serif`（汉字大字/字源）。
字号阶梯：**17 / 19 / 22 / 26 / 32 / 44 px**，正文 ≥19（最小标签档 17）。⚠️ CandyButton 实际用 Tailwind 档 16/18/20/24（text-base/lg/xl/2xl），与文档阶梯有 2–3px 偏差。
字重：标题·按钮 900（font-black）、正文 500；`font-synthesis-weight:none` 防中文合成糊字。行高：中文 1.75。字距 -0.01em。

## 3 间距 Spacing（4pt 基准）

4 / 8 / 12 / 16 / 24 / 32 / 48 px；`--space-hub:16px`（岛屿卡距）。

## 4 圆角 Radius

base **12** · card **24**（`--radius-card`）· hero/大卡 **32**（`--radius-hero`，card-candy 2rem）· modal **28** · 胶囊 **9999px**。
⚠️ 文档称「按钮胶囊 9999」，但 CandyButton 实为 rounded-2xl(16)/1.25rem(20)/1.5rem(24)/1.75rem(28)，以代码为准。

## 5 阴影 Shadow（果冻暖调软阴影，deep `#C9285C`）

- sm：`0 2px 0 0 rgb(201 40 92 / .10), 0 6px 16px -4px rgb(201 40 92 / .18)`
- md：`0 4px 0 0 rgb(201 40 92 / .12), 0 10px 24px -4px rgb(201 40 92 / .22)`
- lg：`0 6px 0 0 rgb(201 40 92 / .18), 0 20px 44px -8px rgb(201 40 92 / .34)`
- pop：`0 4px 12px -2px rgb(201 40 92 / .15), 0 16px 36px -8px rgb(201 40 92 / .30)`

静置含硬影 + 柔影；按压 `translateY(4px)` 硬影归零（Duolingo 位移法）。

## 6 动效 Motion（Q 弹）

缓动 `--ease-jelly: cubic-bezier(.34,1.56,.64,1)`；进场 **240ms**、按压 **100ms**（squish 0.12s）、庆祝 **600ms**（celebrate 0.6s）；首帧响应 ≤300ms。
强调动效：缩放弹入（popIn/jellyPop）、落地压扁回弹（jellyBounce 0.5s）、永动轻摇（jellyWobble 2.4s）。全局 `prefers-reduced-motion` 彻底降级 + 小屏永动节流。

## 7 组件 Component

- **底栏 BottomTabs**：高 ≥72px、图标 36px、文字 17px/900；激活胶囊（soft 底 + jelly-shine + shadow-sm，layoutId spring）；4 Tab（home/hall/gamecenter/growth）；active scale 1.08–1.15。
- **卡片**：`card-candy`（32px、白 92%+blur12、粉边 3px `#FFD1E1`、shadow-jelly、左上高光弧）/ `jelly-card`（24px、白 90%、粉边 2px、按下 `translateY 2px scale .97`）。
- **大按钮 CandyButton**：档 sm44/md56/lg72/**xl88**（xl=唯一主 CTA，≥2cm 儿童触控）；solid 渐变 `0 6px 0 deep` + 内高光；按下 `translateY 4px` 影归零；三态（下沉/变绿对勾/2 秒撤销）。
- **头像/徽章**：`icon-chip` 胶囊（白渐变 + 粉边 + float 4.5s，档 16/20/28/40）；`badge-chip` 12px 胶囊角标（amber 价格/pink 穿戴/emerald 拥有/gray 买不起）。

## 8 图标映射 Icon Map（`public/icons/brand3d/`，WebP 256²）

- **首页** → `tab-home.webp`（orange）· **乐园大厅** → `tab-hall.webp`（purple）+ `island-learn.webp`(蓝)/`island-story.webp`(粉)/`island-explore.webp`(绿)/`island-create.webp`(橙) · **游戏乐园** → `tab-game.webp`（purple）· **我的成长** → `tab-growth.webp`（yellow）· **汉字（模块示例）** → `mod-hanzi.webp`（green）。
- 其余 31 模块图标命名 `mod-<id>.webp`（汉字 green / 拼音 blue / 字母 blue / 单词 pink / 数学 yellow / 逻辑 green / 古诗 pink / 成语 purple / 科学 green / 音乐 pink / 艺术 pink / 安全 blue / 交通 orange / 植物 green / AI小茜 green / 错题本 orange … 详见《品牌3D图标资产规范v1》表五）。`mod-camera`/`mod-ranking` 暂未接入。

## 9 候选微调方向（非主方向，仅供参考）

统一按钮圆角与文档「胶囊」预期：将 CandyButton lg/xl 圆角收口为 `9999px` 即可与规范文案一致；其余令牌已品牌级，不建议改。

---

## ✅ CSS :root 变量块（可直接贴入消费端）

```css
:root {
  /* —— 六色板 main/soft/deep/on（src/lib/tones.ts）—— */
  --c-pink-main:#FF5C8A;   --c-pink-soft:#FFE1EB;   --c-pink-deep:#C9285C;   --c-pink-on:#3D1424;
  --c-blue-main:#3D9BFF;   --c-blue-soft:#DCEBFF;   --c-blue-deep:#0B5EC9;   --c-blue-on:#0C2D4F;
  --c-yellow-main:#FFC53D; --c-yellow-soft:#FFF6D9; --c-yellow-deep:#8A5B00; --c-yellow-on:#4A2B1F;
  --c-green-main:#3FC26B;  --c-green-soft:#DFF5E7;  --c-green-deep:#1B7A3D;  --c-green-on:#123B21;
  --c-purple-main:#8F5BFF; --c-purple-soft:#EFE4FF; --c-purple-deep:#5F2ECC; --c-purple-on:#160830;
  --c-orange-main:#FF9F2E; --c-orange-soft:#FFF0DB; --c-orange-deep:#B45F09; --c-orange-on:#4A2B1F;

  /* —— 中性 / 语义（src/styles/index.css）⚠️ body 实际底 #FFF9FA —— */
  --color-bg:#FFF8EF; --color-surface:#FFFFFF; --color-border:#F3E3CF;
  --color-ink:#4A2B1F; --color-ink-soft:#8A6F5C;
  --color-success:#3FC26B; --color-warning:#FFC53D; --color-error:#FF5C8A; --color-info:#3D9BFF;

  /* —— 字体 —— */
  --font-round:'Baloo 2','PingFang SC','Hiragino Sans GB','Microsoft YaHei',system-ui,-apple-system,'Segoe UI',sans-serif;
  --font-han:'STKaiti','KaiTi','PingFang SC','Hiragino Sans GB','Songti SC',serif;

  /* —— 间距 4pt —— */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px; --space-8:32px; --space-12:48px; --space-hub:16px;

  /* —— 圆角 —— */
  --radius-base:12px; --radius-card:24px; --radius-hero:32px; --radius-modal:28px; --radius-pill:9999px;

  /* —— 果冻软阴影（deep #C9285C）—— */
  --shadow-sm:0 2px 0 0 rgb(201 40 92 / .10), 0 6px 16px -4px rgb(201 40 92 / .18);
  --shadow-md:0 4px 0 0 rgb(201 40 92 / .12), 0 10px 24px -4px rgb(201 40 92 / .22);
  --shadow-lg:0 6px 0 0 rgb(201 40 92 / .18), 0 20px 44px -8px rgb(201 40 92 / .34);
  --shadow-pop:0 4px 12px -2px rgb(201 40 92 / .15), 0 16px 36px -8px rgb(201 40 92 / .30);

  /* —— 动效 Q 弹 —— */
  --ease-jelly:cubic-bezier(.34,1.56,.64,1);
  --dur-enter:240ms; --dur-press:100ms; --dur-celebrate:600ms;
}
```
