# Safety 模块扩充任务 (P2)

**日期**: 2026-08-12
**目标**: 将 SafetyPage.tsx 的安全情景从 8 个扩充到 12 个

## 完成内容

### 1. 新增 4 个安全场景
- **scene9 – 交通安全**: 红灯停绿灯行，过马路走斑马线
- **scene10 – 防溺水**: 不独自去河边/池塘玩水
- **scene11 – 防拐骗**: 不跟陌生人走，不吃陌生人给的东西
- **scene12 – 用电安全**: 不用湿手触碰插座/电器

### 2. 实现方式
- 在 `SAFETY_SCENES` 数组中添加了 scene9–scene12 的 i18n key 条目
- 新增 `DEFAULT_TEXTS` 常量 map，为 4 个新场景提供内置默认中文文案（scene/safe/danger 三个字段）
- 新增 `resolveText()` 辅助函数：当 `translate()` 返回值等于 key 本身时（说明 i18n 缺失），从 `DEFAULT_TEXTS` 回退取值
- 所有使用 `translate(SAFETY_SCENES[...]!.scene)` 的地方都改为 `resolveText(translate, ..., 'scene')`，包括：
  - 场景标题展示
  - 选项按钮文案
  - `safetyAi.run()` 传参（AI 情景判断任务）

### 3. 类型检查
- `npx tsc --noEmit` 通过，零类型错误
- 严格 TypeScript，无 `any`
- 保持现有代码风格

## 修改文件
- `src/modules/safety/SafetyPage.tsx`

## 注意事项
- 新场景的 i18n key（safety.scene9 等）尚未添加到 `zh-CN.json` / `en-US.json`，当前依赖 `DEFAULT_TEXTS` fallback 机制工作
- 如需后续完善 i18n，只需在 JSON 中添加 scene9–scene12 相关 key 即可，`resolveText` 会自动优先使用 i18n 值
