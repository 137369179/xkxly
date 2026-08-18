/**
 * 学情成就海报生成器 (Canvas 导出 PNG)
 */

import type { Progress } from '@/types';

export interface PosterData {
  progress: Progress;
  childName?: string;
  aiRemark?: string;
}

export function generateAchievementPoster({
  progress,
  childName = '宝贝',
  aiRemark = '思维敏捷，学习习惯极佳！继续保持哦～',
}: PosterData): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const width = 800;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. 绘制彩虹背景渐变
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#FFEBF3');
    bgGrad.addColorStop(0.5, '#f0faf4');
    bgGrad.addColorStop(1, '#dcecfa');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. 绘制顶部卡片圆弧
    ctx.fillStyle = '#8b6ef0';
    ctx.beginPath();
    ctx.arc(width / 2, -300, 700, 0, Math.PI * 2);
    ctx.fill();

    // 3. 头部标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌈 宝贝学习乐园 · 个人成就榜', width / 2, 90);

    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#FFD166';
    ctx.fillText(`✨ ${childName} 的阶段学习结业证书 ✨`, width / 2, 140);

    // 4. 白色卡片区域
    const cardX = 50;
    const cardY = 190;
    const cardW = width - 100;
    const cardH = 940;
    const cardRadius = 36;

    ctx.save();
    ctx.shadowColor = 'rgba(122, 92, 224, 0.15)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    ctx.fill();
    ctx.restore();

    // 5. 个人头像 / 吉祥物
    ctx.font = '72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', width / 2, cardY + 90);

    // 6. 学情数据四宫格
    const stats = [
      { label: '连续打卡', val: `${progress.streak || 1} 天`, emoji: '🔥', color: '#ff5c7a' },
      { label: '收获星星', val: `${progress.stars} 颗`, emoji: '⭐', color: '#e5ac2e' },
      { label: '成就徽章', val: `${progress.badges.length} 枚`, emoji: '🏅', color: '#8b6ef0' },
      { label: '研读古诗', val: `${progress.poemsRead.length} 首`, emoji: '📜', color: '#33a863' },
    ];

    const gridX = cardX + 40;
    const gridY = cardY + 160;
    const itemW = (cardW - 110) / 2;
    const itemH = 130;

    stats.forEach((item, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = gridX + col * (itemW + 30);
      const y = gridY + row * (itemH + 20);

      // 背景小方块
      ctx.fillStyle = `${item.color}15`;
      ctx.beginPath();
      ctx.roundRect(x, y, itemW, itemH, 20);
      ctx.fill();

      // 数字与标签
      ctx.textAlign = 'left';
      ctx.font = '36px sans-serif';
      ctx.fillText(item.emoji, x + 24, y + 56);

      ctx.fillStyle = item.color;
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(item.val, x + 80, y + 56);

      ctx.fillStyle = '#8a7a7e';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(item.label, x + 24, y + 98);
    });

    // 7. AI 学情总结名言栏
    const remarkY = gridY + 310;
    ctx.fillStyle = '#f0dde2';
    ctx.beginPath();
    ctx.roundRect(gridX, remarkY, cardW - 80, 160, 24);
    ctx.fill();

    ctx.fillStyle = '#8b6ef0';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🤖 小智 AI 学情导师点评：', gridX + 24, remarkY + 44);

    ctx.fillStyle = '#5c2e3d';
    ctx.font = 'bold 20px sans-serif';
    // 简易换行
    const words = aiRemark.match(/.{1,22}/g) || [aiRemark];
    words.forEach((line, i) => {
      ctx.fillText(line, gridX + 24, remarkY + 84 + i * 32);
    });

    // 8. 扫码邀请区
    const footerY = remarkY + 200;
    ctx.fillStyle = '#f0faf4';
    ctx.beginPath();
    ctx.roundRect(gridX, footerY, cardW - 80, 190, 24);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#33a863';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('扫码跟我一起快乐学习！', gridX + 30, footerY + 60);

    ctx.fillStyle = '#5fd68b';
    ctx.font = '20px sans-serif';
    ctx.fillText('6 岁儿童启发式互动平台 · 科学复习', gridX + 30, footerY + 100);
    ctx.fillText('古诗学院 · 逻辑思维 · 字母数字大通关', gridX + 30, footerY + 136);

    // 右侧大二维码画框占位/标志
    ctx.fillStyle = '#8b6ef0';
    ctx.beginPath();
    ctx.roundRect(gridX + cardW - 240, footerY + 30, 130, 130, 16);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('扫码体验', gridX + cardW - 175, footerY + 85);
    ctx.fillText('学习乐园', gridX + cardW - 175, footerY + 115);

    // 9. 底部日期落款
    ctx.fillStyle = '#b38894';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    const dateStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.fillText(`颁发日期：${dateStr}`, width / 2, cardY + cardH - 30);

    // 导出 DataURL
    resolve(canvas.toDataURL('image/png'));
  });
}
