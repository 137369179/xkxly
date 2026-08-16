/**
 * 家长中心 · 极简真人声音设置 (Kids RealVoice Settings)
 * -------------------------------------------------------------
 * 专为 6 岁儿童家长与孩子量身定制的极简面板：
 * 1. 3 大角色化主讲老师卡片（甜甜名师 👩‍🏫、晓晓姐姐 👧、云希哥哥 👦）；
 * 2. 大尺寸音量滑块与一键静音开关；
 * 3. 伴学名师一键试听；
 * 4. 彻底移除一切复杂的底层技术参数。
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sound, TEACHERS, type TeacherId } from '@/lib/sound';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

export function VoiceSettings() {
  const [currentTeacher, setCurrentTeacher] = useState<TeacherId>(() => sound.getTeacher().id);
  const [volume, setVolume] = useState(() => sound.getVolume());
  const [muted, setMuted] = useState(() => sound.isMuted());
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  useEffect(() => {
    return sound.subscribe(() => {
      setCurrentTeacher(sound.getTeacher().id);
      setVolume(sound.getVolume());
      setMuted(sound.isMuted());
    });
  }, []);

  const handleSelectTeacher = (id: TeacherId) => {
    sfxTap();
    sound.setTeacher(id);
    setCurrentTeacher(id);
    celebrateSmall();
    // 立即试听新老师的声音
    const teacher = TEACHERS.find((t) => t.id === id);
    if (teacher) {
      setIsPlayingSample(true);
      sound.speak(teacher.sampleText, {
        onEnd: () => setIsPlayingSample(false),
        onError: () => setIsPlayingSample(false),
      });
    }
  };

  const handleVolumeChange = (newVol: number) => {
    sound.setVolume(newVol);
    setVolume(newVol);
  };

  const handleToggleMute = () => {
    sfxTap();
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
  };

  const handlePlaySample = () => {
    sfxTap();
    setIsPlayingSample(true);
    const teacher = sound.getTeacher();
    sound.speak(teacher.sampleText, {
      onEnd: () => {
        setIsPlayingSample(false);
        sfxCorrect();
      },
      onError: () => setIsPlayingSample(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* 头部介绍 */}
      <Panel className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-4">
          <span className="text-5xl animate-bounce">🎙️</span>
          <div>
            <h2 className="text-xl font-black text-ink">伴学老师真人声音</h2>
            <p className="mt-1 text-xs font-bold text-ink-soft">
              全站已接入高保真少儿名师真人发音体系，字正腔圆，温润亲切，为 6 岁小朋友打造最自然的语言环境。
            </p>
          </div>
        </div>
      </Panel>

      {/* 老师选择卡片 */}
      <div>
        <h3 className="mb-3 text-base font-black text-ink flex items-center gap-2">
          <span>👩‍🏫</span> 选择孩子喜欢的伴学老师
        </h3>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {TEACHERS.map((t) => {
            const isSelected = currentTeacher === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectTeacher(t.id)}
                className={`relative flex flex-col items-start justify-between rounded-3xl p-5 border-3 transition-all text-left ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50/90 shadow-md ring-2 ring-amber-300'
                    : 'border-slate-200 bg-white hover:border-amber-200 hover:shadow-xs'
                }`}
              >
                {t.tag && (
                  <span
                    className={`absolute -top-3 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-black shadow-xs ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {t.tag}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{t.avatar}</span>
                  <div>
                    <div className="text-base font-black text-ink">{t.name}</div>
                    <div className="text-xs font-bold text-amber-800/80 mt-0.5">
                      {isSelected ? '✨ 当前正在使用' : '点击切换此声音'}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-600 leading-relaxed">
                  {t.desc}
                </p>
                <div className="mt-4 w-full flex items-center justify-between border-t border-amber-100/80 pt-3">
                  <span className="text-[11px] font-extrabold text-amber-700">
                    🔊 点击即刻试听
                  </span>
                  <span className="text-xs">{isSelected ? '✅' : '👉'}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 声音控制与试听 */}
      <Panel>
        <h3 className="mb-4 text-base font-black text-ink flex items-center gap-2">
          <span>🎛️</span> 声音大小与一键试听
        </h3>

        <div className="space-y-5">
          {/* 音量调节 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleMute}
                className="rounded-full bg-white p-2 text-xl shadow-xs border border-slate-200 active:scale-95 transition"
                title={muted ? '点击开启声音' : '点击静音'}
              >
                {muted ? '🔇' : '🔊'}
              </button>
              <div>
                <div className="text-sm font-black text-ink">乐园全局音量</div>
                <div className="text-xs font-bold text-ink-soft">
                  {muted ? '当前已开启静音模式' : `当前音量：${volume}%`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 sm:max-w-xs">
              <input
                type="range"
                min="0"
                max="100"
                value={muted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-xs font-black text-slate-600 min-w-8 text-right">
                {muted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>

          {/* 一键试听 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-amber-50/70 p-4 border border-amber-200">
            <div className="text-left w-full sm:w-auto">
              <div className="text-sm font-black text-ink">试听老师发音示范</div>
              <div className="text-xs font-bold text-amber-800 mt-0.5">
                “{sound.getTeacher().sampleText}”
              </div>
            </div>
            <CandyButton
              tone="orange"
              size="md"
              onClick={handlePlaySample}
              disabled={isPlayingSample}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              {isPlayingSample ? '🔊 正在说话中...' : '▶️ 点击试听示范'}
            </CandyButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export default VoiceSettings;

