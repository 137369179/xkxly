# 汉字配图升级实施计划

## 📋 需求总结

### 1️⃣ 质量提升：AI 图像生成
- **目标**：使用 StepFun FLUX 模型替换 Canvas 兜底方案
- **现状**：Canvas 程序化绘制，风格简单
- **方案**：
  - 创建 `hanziImageAI.ts` 服务层
  - 集成 StepFun FLUX API（需配置 API Key）
  - 保持降级策略：AI → Canvas → Emoji
  - 支持缓存到 IndexedDB

### 2️⃣ 动画增强：演变 + 组装
- **目标**：真动画效果替代 emoji 占位符
- **演变动画**：
  - 已完成 `EvolutionAnimation.tsx` 重写
  - 使用 SVG 绘制真实图形（非 emoji）
  - 5阶段动画流程
  - 支持自动播放/手动控制
  
- **组装动画**：
  - 已完成 `AssemblyAnimation.tsx` 重写
  - 部件飞入动画效果
  - 组合完成庆祝动效
  - 语音讲解配合

### 3️⃣ 交互升级：听图故事
- **目标**：点击图片后小智语音讲解
- **实现**：
  - 已在 `HanziImageCard.tsx` 添加"听故事"按钮
  - 点击播放字源故事语音
  - 支持模式切换（开/关）

---

## 🔧 技术实现细节

### AI 图像生成集成

```typescript
// src/lib/hanziImageAI.ts
async function generateWithStepFun(char: string, config, origin, semantic) {
  const prompt = buildImagePrompt(char, liushu, origin, semantic);
  
  const response = await fetch(STEPFUN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STEPFUN_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'flux-schnell',
      prompt: prompt,
      size: '256x256',
    }),
  });
  
  return data.data?.[0]?.url;
}
```

### 环境变量配置

```bash
# .env.local
VITE_STEPFUN_API_KEY=your_api_key_here
```

### 动画帧率优化

- 使用 `requestAnimationFrame` 驱动动画
- CSS `will-change` 提示浏览器优化
- 媒体查询检测 `prefers-reduced-motion`

---

## 📊 文件变更清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/lib/hanziImageAI.ts` | ✅ 新建 | AI 图像生成服务层 |
| `src/components/hanzi/EvolutionAnimation.tsx` | ✅ 重写 | 真实 SVG 演变动画 |
| `src/components/hanzi/AssemblyAnimation.tsx` | ✅ 重写 | 部件飞入组装动画 |
| `src/components/hanzi/HanziImageCard.tsx` | ✅ 更新 | 添加听故事功能 |
| `src/lib/hanziImgDb.ts` | ✅ 现有 | IndexedDB 缓存层（无需修改） |
| `src/lib/hanziImgGen.ts` | ✅ 现有 | Canvas 生成器（降级用） |

---

## 🎨 视觉风格规范

### 儿童插画风格约束
- **配色**：低饱和度糖果色（粉色、薄荷绿、淡黄）
- **形状**：圆角、粗描边、简约几何
- **表情**：所有物体都有可爱笑脸
- **背景**：纯色或渐变，无复杂纹理

### 六书类型对应风格
| 类型 | 中文名称 | 风格特点 |
|------|----------|----------|
| pictographic | 象形字 | 画事物本身，写实简化 |
| ideographic | 指事字 | 示意图解，标注说明 |
| compound-ideographic | 会意字 | 场景拼合，左右/上下结构 |
| pictophonetic | 形声字 | 分屏展示，形旁+声旁 |

---

## ⏱️ 预计工作量

| 任务 | 预估时间 | 优先级 |
|------|----------|--------|
| StepFun API 集成 | 2h | P0 |
| 演变动画完善（更多汉字） | 4h | P1 |
| 组装动画完善（更多汉字） | 4h | P1 |
| 听故事语音库准备 | 2h | P2 |
| 性能优化 + 测试 | 2h | P1 |
| **总计** | **14h** | - |

---

## 🚀 后续优化建议

### 1. 批量预生成
```typescript
// 应用启动时预生成热门汉字配图
const POPULAR_CHARS = ['日', '月', '山', '水', '火', '木', '人', '口'];
preloadPopularCharacters(POPULAR_CHARS);
```

### 2. 用户自定义风格
- 提供多种画风选择（水彩、卡通、像素等）
- 根据孩子年龄调整复杂度

### 3. UGC 扩展
- 允许孩子自己绘制配图
- 社区分享优秀作品

---

*生成时间：2026-08-12*
