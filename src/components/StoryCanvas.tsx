import { useEffect, useRef } from 'react';

interface StoryCanvasProps {
  theme?: string;
  bgColor?: string;
  emoji?: string;
}

export function StoryCanvas({ theme = 'space', bgColor = '#E1F5FE', emoji = '🚀' }: StoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布并绘制基础马卡龙渐变
    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 绘制装饰背景元素
    const lowerTheme = theme.toLowerCase();

    if (lowerTheme.includes('space') || lowerTheme.includes('star') || lowerTheme.includes('sky')) {
      // 绘制星星与小行星
      ctx.fillStyle = '#FFD166';
      for (let i = 0; i < 16; i++) {
        const x = (Math.sin(i * 99) * 0.5 + 0.5) * width;
        const y = (Math.cos(i * 33) * 0.5 + 0.5) * (height * 0.7);
        const r = (i % 3) + 3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // 行星环
      ctx.strokeStyle = '#7A5CE040';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(width * 0.75, height * 0.3, 40, 15, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (lowerTheme.includes('sea') || lowerTheme.includes('ocean') || lowerTheme.includes('water')) {
      // 气泡与波浪
      ctx.fillStyle = '#00B4D830';
      for (let i = 0; i < 10; i++) {
        const x = (i * 40 + 20) % width;
        const y = height - (i * 25) % (height * 0.8);
        ctx.beginPath();
        ctx.arc(x, y, (i % 4) * 4 + 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (lowerTheme.includes('forest') || lowerTheme.includes('tree') || lowerTheme.includes('magic')) {
      // 魔法小光斑
      ctx.fillStyle = '#06D6A040';
      for (let i = 0; i < 12; i++) {
        const x = (i * 35) % width;
        const y = (i * 20) % height;
        ctx.beginPath();
        ctx.arc(x, y, (i % 3) * 5 + 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 在插画中央绘制主角大 Emoji 和柔和波浪底座
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.65, 70, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // 绘制 Emoji
    ctx.font = '72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, width / 2, height * 0.5);
  }, [theme, bgColor, emoji]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-white shadow-inner">
      <canvas ref={canvasRef} width={360} height={200} className="h-44 w-full object-cover" />
    </div>
  );
}
