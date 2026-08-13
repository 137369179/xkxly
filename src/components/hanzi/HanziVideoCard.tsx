import { memo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface HanziVideoCardProps {
  char: string;
  pinyin: string;
  tone: number;
  learned?: boolean;
  onClick?: () => void;
}

/** 
 * 汉字视频卡片组件
 * 显示汉字配图 + 视频播放按钮
 */
const HanziVideoCard = memo(function HanziVideoCard({
  char,
  pinyin,
  tone,
  learned = false,
  onClick,
}: HanziVideoCardProps) {
  const { t } = useTranslation();
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 声调颜色映射
  const toneColors = {
    1: '#FF6B6B', // 一声 - 红色
    2: '#4ECDC4', // 二声 - 青色
    3: '#45B7D1', // 三声 - 蓝色
    4: '#96CEB4', // 四声 - 绿色
  };
  const toneColor = toneColors[tone as keyof typeof toneColors] || '#666';
  
  // 处理点击播放视频
  const handlePlayVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVideo(true);
  };
  
  // 关闭视频
  const handleCloseVideo = () => {
    setShowVideo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };
  
  // 点击卡片主体
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };
  
  return (
    <>
      {/* 卡片主体 */}
      <button
        onClick={handleCardClick}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-2xl overflow-hidden transition-all active:translate-y-[2px]',
          'min-h-[120px] w-full shadow-candy-sm hover:shadow-lg',
          'border-2 border-transparent hover:border-candy-purple-soft',
          learned && 'ring-2 ring-candy-green-soft'
        )}
        style={{
          background: learned ? 'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)' : 'rgba(255,255,255,0.9)',
          aspectRatio: '1/1',
        }}
      >
        {/* 已学标记 */}
        {learned && (
          <span className="absolute top-1 right-1 text-xs font-bold text-candy-green-deep">✓</span>
        )}
        
        {/* 汉字配图 */}
        <img 
          src={`/hanzi-imgs/${char}.png`} 
          alt={char}
          className="w-full h-20 object-cover rounded-t-xl"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        
        {/* 汉字和拼音 */}
        <div className="flex flex-col items-center justify-center p-2 flex-1">
          <span className="text-3xl font-black text-ink leading-none">{char}</span>
          <span 
            className="text-xs font-bold mt-0.5"
            style={{ color: toneColor }}
          >
            {pinyin}
          </span>
        </div>
        
        {/* 快捷语音播报按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            import('@/lib/speech').then(m => m.speak(char, { lang: 'zh-CN', rate: 0.7 }));
          }}
          className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-candy-blue-soft text-candy-blue-deep flex items-center justify-center text-xs font-bold hover:scale-105 transition-transform"
          aria-label={t('hanziVideoCard.readAria', { char })}
        >
          🔊
        </button>

        {/* 视频播放按钮 */}
        <button
          onClick={handlePlayVideo}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-candy-purple-deep/90 flex items-center justify-center hover:bg-candy-purple-deep transition-colors"
          aria-label={t('hanziVideoCard.playAria', { char })}
        >
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </button>
      </button>
      
      {/* 视频播放模态框 */}
      {showVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleCloseVideo}
        >
          <div 
            className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleCloseVideo}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label={t('hanziVideoCard.close')}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* 视频播放器 */}
            <video
              ref={videoRef}
              src={`/hanzi-videos/${char}-教学.mp4`}
              className="w-full aspect-video"
              controls
              autoPlay
            >
              {t('hanziVideoCard.videoUnsupported')}
            </video>
            
            {/* 视频信息 */}
            <div className="p-4 bg-gradient-to-r from-candy-purple-soft to-candy-blue-soft">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-black text-ink mr-2">{char}</span>
                  <span className="text-lg font-bold text-candy-purple-deep">{pinyin}</span>
                </div>
                <div className="text-sm font-bold text-ink-soft">
                  {t('hanziVideoCard.videoDuration')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export { HanziVideoCard };
