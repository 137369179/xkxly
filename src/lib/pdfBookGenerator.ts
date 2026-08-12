import type { StoryBookData } from '@/lib/ai/prompts';

/**加载辅助图片 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 导出 AI 绘本为专业高画质电子书图片长卷/电子画册 (支持另存/一键打印 PDF)
 */
export async function generateStorybookPdf(story: StoryBookData, childName = '小宝贝'): Promise<string> {
  const width = 1200;
  const pageHeight = 1600;
  const totalPages = story.pages.length + 2; // 1 封面 + 4 正文 + 1 荣誉证书
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = pageHeight * totalPages;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context creation failed');

  // 背景底色
  ctx.fillStyle = '#FAF5FF';
  ctx.fillRect(0, 0, width, canvas.height);

  let bgCertImg: HTMLImageElement | null = null;
  try {
    bgCertImg = await loadImage('/certificate_bg.jpg');
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Certificate bg load failed, fallback default background', e);
  }

  // ---------------- Page 1: 绘本封面 ----------------
  {
    const pageY = 0;
    // 渐变封面背景
    const grad = ctx.createLinearGradient(0, pageY, 0, pageY + pageHeight);
    grad.addColorStop(0, '#F3E8FF');
    grad.addColorStop(1, '#EDE9FE');
    ctx.fillStyle = grad;
    ctx.fillRect(0, pageY, width, pageHeight);

    // 封面花边卡片
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 12;
    ctx.strokeRect(60, pageY + 60, width - 120, pageHeight - 120);

    // 装饰顶部文字
    ctx.fillStyle = '#6D28D9';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ 宝贝 AI 奇幻故事绘本系列 ✨', width / 2, pageY + 160);

    // 大标题
    ctx.fillStyle = '#4C1D95';
    ctx.font = '900 68px sans-serif';
    ctx.fillText(story.bookTitle, width / 2, pageY + 300);

    // 封面大徽章 Emoji 组合展示
    ctx.font = '160px sans-serif';
    ctx.fillText('📖 🦁 🚀 🌌', width / 2, pageY + 600);

    // 寓意
    ctx.fillStyle = '#6D28D9';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`💡 启示：${story.moral}`, width / 2, pageY + 850);

    // 绘本小作者名章
    ctx.fillStyle = '#5B21B6';
    ctx.font = '900 44px sans-serif';
    ctx.fillText(`✍️ 绘本小作家：${childName}`, width / 2, pageY + 1100);

    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('宝贝学习乐园 · AI 儿童出版工作室 出品', width / 2, pageY + 1200);
  }

  // ---------------- Page 2 - N: 故事连环画正文 ----------------
  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i]!;
    const pageY = (i + 1) * pageHeight;

    // 白色纸张底
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(40, pageY + 40, width - 80, pageHeight - 80);

    // 装饰框
    ctx.strokeStyle = '#DDD6FE';
    ctx.lineWidth = 6;
    ctx.strokeRect(60, pageY + 60, width - 120, pageHeight - 120);

    // 顶端页码标记
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${i + 1} 章 · ${page.title}`, 100, pageY + 140);

    // 正文拼音 / 英文短句与故事文字
    ctx.fillStyle = '#1E1B4B';
    ctx.font = '900 42px sans-serif';
    
    // 换行绘制文本
    const lines = wrapText(ctx, page.content, width - 240);
    let textY = pageY + 240;
    lines.forEach((line) => {
      ctx.fillText(line, 100, textY);
      textY += 64;
    });

    // 正文插图绘图卡片
    const canvasBoxY = textY + 40;
    const boxHeight = pageHeight - (canvasBoxY - pageY) - 140;

    // 绘制彩色插图模拟背景
    ctx.fillStyle = '#F5F3FF';
    ctx.fillRect(100, canvasBoxY, width - 200, boxHeight);
    ctx.strokeStyle = '#C4B5FD';
    ctx.lineWidth = 4;
    ctx.strokeRect(100, canvasBoxY, width - 200, boxHeight);

    // 插图意境核心图形
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🎨 [画面场景] ${page.illustrationTheme}`, width / 2, canvasBoxY + boxHeight / 2);
  }

  // ---------------- Page Final: 绘本荣誉结业证书 ----------------
  {
    const pageY = (totalPages - 1) * pageHeight;

    if (bgCertImg) {
      ctx.drawImage(bgCertImg, 40, pageY + 40, width - 80, pageHeight - 80);
    } else {
      ctx.fillStyle = '#FFFBEB';
      ctx.fillRect(40, pageY + 40, width - 80, pageHeight - 80);
    }

    // 证书文字
    ctx.fillStyle = '#92400E';
    ctx.font = '900 64px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎓 绘本小作家荣誉证书', width / 2, pageY + 400);

    ctx.fillStyle = '#B45309';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(`恭喜【${childName}】大朋友/小朋友`, width / 2, pageY + 560);

    ctx.fillStyle = '#78350F';
    ctx.font = '900 36px sans-serif';
    ctx.fillText(`成功创作并出版儿童奇幻绘本`, width / 2, pageY + 660);
    ctx.fillText(`《${story.bookTitle}》`, width / 2, pageY + 740);

    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🌟 获得乐园“小作家创想星”勋章奖励！', width / 2, pageY + 900);

    const todayStr = new Date().toLocaleDateString('zh-CN');
    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`宝贝学习乐园 AI 出版社 · ${todayStr}`, width / 2, pageY + 1150);
  }

  return canvas.toDataURL('image/png');
}

/** 文本自动换行助手 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = words[0]! || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i]!!
    const width = ctx.measureText(currentLine + word).width;
    if (width < maxWidth) {
      currentLine += word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
