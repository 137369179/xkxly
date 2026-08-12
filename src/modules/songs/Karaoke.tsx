/**
 * 儿歌跟唱模式 - 歌词逐句高亮+录音回放
 */

import { useState, useRef, useCallback } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxStar, sfxCorrect } from '@/lib/sfx';
import { speak, stopSpeaking } from '@/lib/speech';
import { celebrateSmall } from '@/lib/celebrate';
import { motion } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';

interface SongData {
  title: string;
  lyrics: string[];  // 逐句歌词
  audio?: string;    // 可选音频 URL
}

// 经典儿歌歌词
const SONGS: SongData[] = [
  {
    title: '小星星',
    lyrics: [
      '一闪一闪亮晶晶', '满天都是小星星',
      '挂在天上放光明', '好像许多小眼睛',
      '一闪一闪亮晶晶', '满天都是小星星',
    ],
  },
  {
    title: '两只老虎',
    lyrics: [
      '两只老虎 两只老虎', '跑得快 跑得快',
      '一只没有耳朵', '一只没有尾巴',
      '真奇怪 真奇怪',
    ],
  },
  {
    title: '小兔子乖乖',
    lyrics: [
      '小兔子乖乖 把门儿开开', '快点儿开开 我要进来',
      '不开不开我不开', '妈妈没回来 谁来也不开',
      '小兔子乖乖 把门儿开开', '快点儿开开 妈妈要进来',
    ],
  },
  {
    title: '拔萝卜',
    lyrics: [
      '拔萝卜 拔萝卜', '嘿哟嘿哟拔萝卜',
      '嘿哟嘿哟拔不动', '老太婆 快快来',
      '快来帮我们拔萝卜',
    ],
  },
  {
    title: '小燕子',
    lyrics: [
      '小燕子 穿花衣', '年年春天来这里',
      '我问燕子你为啥来', '燕子说 这里的春天最美丽',
      '小燕子 告诉你', '今年这里更美丽',
    ],
  },
  {
    title: '找朋友',
    lyrics: [
      '找呀找呀找朋友', '找到一个好朋友',
      '敬个礼 握握手', '你是我的好朋友',
      '找呀找呀找朋友', '找到一个好朋友',
    ],
  },
];

export function Karaoke() {
  const { t: tr } = useTranslation();
  const [songIdx, setSongIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<'listen' | 'sing'>('listen');
  const [recording, setRecording] = useState(false);
  const [recordedLines, setRecordedLines] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const song = SONGS[songIdx]!!

  // 朗读歌词
  const speakLine = useCallback(async (idx: number, autoNext = true) => {
    stopSpeaking();
    await new Promise(r => setTimeout(r, 200));
    setLineIdx(idx);
    speak(song.lyrics[idx]!, { lang: 'zh-CN', rate: 0.75 });
    if (autoNext && idx < song.lyrics.length - 1) {
      // 等朗读完再自动下一句
      setTimeout(() => {
        setLineIdx(i => (i === idx ? idx + 1 : i));
      }, Math.max(2000, song.lyrics[idx]!.length * 300));
    }
  }, [song.lyrics]);

  // 播放全部歌词
  const playAll = async () => {
    setPlaying(true);
    for (let i = 0; i < song.lyrics.length; i++) {
      setLineIdx(i);
      speak(song.lyrics[i]!, { lang: 'zh-CN', rate: 0.7 });
      // 等待朗读时长
      await new Promise(r => setTimeout(r, Math.max(2500, song.lyrics[i]!.length * 350)));
    }
    setPlaying(false);
    setLineIdx(null);
    celebrateSmall();
  };

  // 录音功能
  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setRecordedLines(l => [...l, lineIdx!]);
        setRecording(false);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecording(true);
      sfxCorrect();
    } catch {
      // 麦克风不可用，静默降级
    }
  };

  const stopRecord = () => {
    mediaRecorderRef.current?.stop();
    sfxStar();
  };

  // 播放录音
  const playRecording = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    try {
      const audio = new Audio(url);
      await audio.play();
    } catch {
      // 自动播放被拒或格式不支持：静默忽略，不污染控制台
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader emoji="🎵" title={tr('song.karaokeTitle')} subtitle={song.title} tone="pink" />

      {/* 歌曲选择 */}
      <div className="flex gap-2 flex-wrap justify-center">
        {SONGS.map((s, i) => (
          <CandyButton
            key={`s-${i}`}
            tone={i === songIdx ? 'pink' : 'purple'}
            variant={i === songIdx ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { sfxTap(); setSongIdx(i); setLineIdx(null); setRecordedLines([]); setMode('listen'); }}
          >
            {s.title}
          </CandyButton>
        ))}
      </div>

      {/* 模式切换 */}
      <div className="flex justify-center gap-2">
        <CandyButton tone={mode === 'listen' ? 'pink' : 'purple'} variant={mode === 'listen' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setMode('listen'); }}>
          👂 {tr('song.karaokeListen')}
        </CandyButton>
        <CandyButton tone={mode === 'sing' ? 'pink' : 'purple'} variant={mode === 'sing' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setMode('sing'); }}>
          🎤 {tr('song.karaokeSing')}
        </CandyButton>
      </div>

      {/* 歌词区域 */}
      <Panel>
        <div className="space-y-3">
          {song.lyrics.map((line, i) => (
            <motion.div
              key={`line-${i}`}
              animate={{
                scale: lineIdx === i ? 1.05 : 1,
                opacity: lineIdx != null && lineIdx !== i ? 0.45 : 1,
              }}
            >
              <div
                className={`cursor-pointer rounded-xl p-2.5 text-center transition-all ${
                  lineIdx === i
                    ? 'bg-candy-pink-soft ring-2 ring-candy-pink-deep'
                    : recordedLines.includes(i)
                      ? 'bg-candy-green-soft'
                      : 'bg-white'
                }`}
                onClick={() => {
                  sfxTap();
                  if (mode === 'listen') {
                    speakLine(i, false);
                  } else {
                    setLineIdx(i);
                  }
                }}
              >
                <div className={`text-lg font-bold ${lineIdx === i ? 'text-candy-pink-deep' : 'text-ink'}`}>
                  {line}
                  {recordedLines.includes(i) && (
                    <span className="ml-1 text-xs">✅</span>
                  )}
                </div>
                {lineIdx === i && mode === 'sing' && (
                  <div className="mt-2 flex justify-center gap-2">
                    {!recording ? (
                      <CandyButton tone="pink" size="sm" onClick={startRecord}>
                        ⏺️ {tr('song.record')}
                      </CandyButton>
                    ) : (
                      <CandyButton tone="pink" size="sm" onClick={stopRecord}>
                        ⏹️ {tr('common.stop')}
                      </CandyButton>
                    )}
                    {recordedLines.includes(i) && chunksRef.current.length > 0 && (
                      <CandyButton tone="purple" size="sm" onClick={playRecording}>
                        ▶️ {tr('song.replay')}
                      </CandyButton>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* 操作栏 */}
      <div className="flex justify-center gap-2">
        {mode === 'listen' && (
          <CandyButton
            tone="pink"
            size="sm"
            disabled={playing}
            onClick={playAll}
          >
            ▶️ {playing ? tr('song.playing') : tr('song.playAll')}
          </CandyButton>
        )}
        <CandyButton
          tone="purple"
          variant="soft"
          size="sm"
          onClick={() => {
            sfxTap();
            stopSpeaking();
            setLineIdx(null);
            setRecordedLines([]);
          }}
        >
          {tr('common.retryNew')}
        </CandyButton>
      </div>

      {recordedLines.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-sm font-extrabold text-candy-green-deep">
            🎉 {tr('song.sungCount', { count: recordedLines.length, total: song.lyrics.length })}
          </p>
        </motion.div>
      )}
    </div>
  );
}
