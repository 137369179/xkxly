import { useState, useRef, useCallback, useEffect } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { AiPanel } from '@/components/ai';
import { useAiStream } from '@/lib/ai/useAi';
import { poemTutorTask } from '@/lib/ai/tasks';
import { sfxCorrect } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import type { DeepPoem } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

// Web Speech API 类型
interface SpeechRecognitionResult {
  transcript: string;
}
interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: SpeechRecognitionResult } } & { length: number };
  resultIndex: number;
}

import { VoiceScoreModal } from '@/components/VoiceScoreModal';

export function VoiceRecite({ poem }: { poem: DeepPoem }) {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<{ score: number; correct: number; total: number; missing: string[]; extra: string[] } | null>(null);
  const [error, setError] = useState('');
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const recRef = useRef<any>(null);

  const recordRecite = useStore(s => s.recordRecite);
  const tutor = useAiStream();

  const original = poem.lines.map(l => l.text).join('');
  const originalHan = original.replace(/[一-龥]/g, '');

  const supportRef = useRef(false);
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    supportRef.current = !!SR;
  }, []);

  const start = useCallback(() => {
    setError('');
    setTranscript('');
    setResult(null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError(t('poem.voiceRecite.unsupported'));
      return;
    }
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.continuous = true;
    rec.interimResults = false;
    recRef.current = rec;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      setListening(false);
      setError(e.error === 'not-allowed' ? t('poem.voiceRecite.micDenied') : t('poem.voiceRecite.recogError'));
    };
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i]![0]!.transcript;
      }
      setTranscript(prev => prev + text);
    };
    rec.start();
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  // Cleanup: stop speech recognition on unmount
  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  const grade = useCallback(() => {
    const userHan = transcript.replace(/[^一-龥]/g, '');
    const origHan = originalHan;
    let correct = 0;
    const missing: string[] = [];
    const used = new Set<number>();

    for (const ch of userHan) {
      let found = false;
      for (let i = 0; i < origHan.length; i++) {
        if (origHan[i] === ch && !used.has(i)) {
          used.add(i);
          found = true;
          correct++;
          break;
        }
      }
      if (!found && !missing.includes(ch)) {
        // user said extra chars
      }
    }

    for (let i = 0; i < origHan.length; i++) {
      if (!used.has(i)) missing.push(origHan[i]!);
    }

    const score = Math.round((correct / origHan.length) * 100);
    const extra = userHan.split('').filter(ch => !origHan.includes(ch));

    setResult({ score, correct, total: origHan.length, missing: [...new Set(missing)], extra: [...new Set(extra)] });
    recordRecite(poem.id, score, 4); // voice recite = level 4 (全隐)
    if (score >= 80) { sfxCorrect(); celebrateSmall(); }
  }, [transcript, originalHan, poem.id, recordRecite]);

  const reset = () => {
    setTranscript('');
    setResult(null);
    setError('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-extrabold text-candy-pink-deep">{t('poem.voiceRecite.title')}</p>
        <span className="text-xs font-bold text-ink-soft">{t('poem.voiceRecite.desc')}</span>
      </div>

      {/* 诗歌原文（参考） */}
      <Panel className="text-center">
        <p className="text-base font-bold text-ink-soft">{poem.title} · {poem.author}</p>
        <div className="mt-1 space-y-0.5">
          {poem.lines.map((l, i) => (
            <p key={`l-${i}`} className="text-lg font-bold text-ink">{l.text}</p>
          ))}
        </div>
      </Panel>

      {/* 开启 Web Audio 彩虹声波实时评分入口 */}
      <div className="rounded-2xl border-2 border-candy-purple/30 bg-gradient-to-r from-purple-100 via-pink-100 to-yellow-100 p-4 shadow-sm text-center">
        <h4 className="text-base font-black text-ink-main">{t('poem.voiceRecite.webAudioTitle')}</h4>
        <p className="text-xs font-bold text-ink-soft mb-3">{t('poem.voiceRecite.webAudioDesc')}</p>
        <CandyButton tone="purple" size="lg" fullWidth onClick={() => setScoreModalOpen(true)}>
          {t('poem.voiceRecite.startScore')}
        </CandyButton>
      </div>

      {/* 录音控制 */}
      <div className="flex gap-2">

        {!listening ? (
          <CandyButton tone="pink" size="lg" fullWidth onClick={start}>
            {t('poem.voiceRecite.start')}
          </CandyButton>
        ) : (
          <CandyButton tone="orange" size="lg" fullWidth onClick={stop}>
            {t('poem.voiceRecite.stop')}
          </CandyButton>
        )}
        <CandyButton tone="purple" variant="soft" size="lg" onClick={reset} disabled={listening}>
          {t('poem.voiceRecite.clear')}
        </CandyButton>
      </div>

      {error && (
        <p className="text-sm font-bold text-candy-orange-deep">{error}</p>
      )}

      {/* 识别文本 */}
      {transcript && (
        <Panel>
          <p className="text-sm font-bold text-ink-soft">{t('poem.voiceRecite.yourRecite')}</p>
          <p className="mt-1 text-base font-semibold text-ink">{transcript}</p>
        </Panel>
      )}

      {/* 评分 */}
      {transcript && !listening && (
        <CandyButton tone="green" size="lg" fullWidth onClick={grade}>
          {t('poem.voiceRecite.grade')}
        </CandyButton>
      )}

      {result && (
        <Panel className="text-center">
          <div className={`rounded-2xl p-3 ${result.score >= 80 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <p className={`text-3xl font-black ${result.score >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>{t('poem.voiceRecite.score', { score: result.score })}</p>
            <p className="text-sm font-bold text-ink-soft">{t('poem.voiceRecite.charsCorrect', { correct: result.correct, total: result.total })}</p>
          </div>
          {result.missing.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-bold text-candy-orange-deep">{t('poem.voiceRecite.missingChars', { chars: result.missing.join(' · ') })}</p>
            </div>
          )}
          {result.score < 80 && (
            <div className="mt-2">
              <CandyButton tone="purple" size="sm" variant="soft" onClick={() => tutor.run(poemTutorTask({ title: poem.title, author: poem.author, dynasty: poem.dynasty, text: original }, t('poem.voiceRecite.aiHelpPrompt')))}>
                {t('poem.voiceRecite.aiHelp')}
              </CandyButton>
            </div>
          )}
        </Panel>
      )}

      <AiPanel state={tutor} tone="purple" title={t('poem.voiceRecite.aiHelpTitle')} />

      {/* 实时彩虹声波背诵打分 Modal */}
      <VoiceScoreModal
        isOpen={scoreModalOpen}
        poemTitle={poem.title}
        onClose={() => setScoreModalOpen(false)}
      />
    </div>
  );
}

