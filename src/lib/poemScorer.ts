export interface ScoreResult {
  score: number;       // 0 - 100
  stars: number;       // 1 - 3
  title: string;       // 评语标题
  feedback: string;    // 详细评语
  fluencyScore: number;
  pitchScore: number;
}

/**
 * 古诗吟诵 Web Audio 声波与节奏评分算法
 */
export class PoemAudioScorer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private volumeHistory: number[] = [];
  private startTime = 0;

  /**
   * 开启麦克风声波分析
   */
  async start(onFrame: (volume: number, freqData: Uint8Array) => void): Promise<void> {
    this.volumeHistory = [];
    this.startTime = Date.now();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = stream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('当前浏览器不支持 AudioContext，无法评分');
    }
    this.audioCtx = new AudioCtx();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;

    const source = this.audioCtx.createMediaStreamSource(stream);
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      // 计算 RMS 音量大小
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]!;
      }
      const avgVol = sum / bufferLength;
      this.volumeHistory.push(avgVol);

      onFrame(avgVol, dataArray);
      this.animFrameId = requestAnimationFrame(update);
    };

    update();
  }

  /**
   * 结束背诵，停止分析并进行多维打分
   */
  stop(): ScoreResult {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    const durationSec = (Date.now() - this.startTime) / 1000;

    // 默认兜底得分
    if (this.volumeHistory.length === 0 || durationSec < 1) {
      return {
        score: 85,
        stars: 2,
        title: '朗诵流畅',
        feedback: '小诗人发音很清晰，继续保持哦！',
        fluencyScore: 85,
        pitchScore: 85,
      };
    }

    // 1. 流畅度/持继度分析
    const activeFrameCount = this.volumeHistory.filter((v) => v > 15).length;
    const activeRatio = activeFrameCount / this.volumeHistory.length;
    const fluencyScore = Math.min(100, Math.round(activeRatio * 120 + 20));

    // 2. 抑扬顿挫/声调变化幅度分析
    const maxVol = Math.max(...this.volumeHistory);
    const minVol = Math.min(...this.volumeHistory.filter((v) => v > 5));
    const range = maxVol - (isFinite(minVol) ? minVol : 0);
    const pitchScore = Math.min(100, Math.round((range / 120) * 40 + 60));

    // 综合加权总分
    const totalScore = Math.min(100, Math.max(70, Math.round(fluencyScore * 0.6 + pitchScore * 0.4)));

    let stars = 3;
    let title = '🎉 小声仙/小诗人！';
    let feedback = '抑扬顿挫，声如洪钟！展现了出色的诗词韵味与表达力！';

    if (totalScore < 80) {
      stars = 1;
      title = '👍 继续加油';
      feedback = '背诵很努力，声音再响亮抑扬顿挫一点会更好哦！';
    } else if (totalScore < 90) {
      stars = 2;
      title = '🌟 朗诵小能手';
      feedback = '吐字清晰，感情真挚，很有小诗人的范儿！';
    }

    return {
      score: totalScore,
      stars,
      title,
      feedback,
      fluencyScore,
      pitchScore,
    };
  }
}

export const poemScorer = new PoemAudioScorer();
