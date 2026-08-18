import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { StoryCanvas } from '@/components/StoryCanvas';
import { storybookTask, fallbackStorybook } from '@/lib/ai/tasks';
import { generateStorybookPdf } from '@/lib/pdfBookGenerator';
import { chatStream } from '@/lib/ai/client';
import { safeParseJSON } from '@/lib/safeStorage';

import type { StoryBookData } from '@/lib/ai/prompts';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap, sfxWin, sfxFlip } from '@/lib/sfx';
import { isSpeechRecogSupported, speechRecog } from '@/lib/ai/speechRecog';
import { useTranslation } from '@/i18n/useTranslation';

const CHARACTERS = [
  { id: '🦁 狮子小豆', name: '狮子小豆', emoji: '🦁' },
  { id: '🐰 兔子米菲', name: '兔子米菲', emoji: '🐰' },
  { id: '🚀 飞天小狗', name: '飞天小狗', emoji: '🐶' },
  { id: '🤖 机器人小智', name: '机器人小智', emoji: '🤖' },
  { id: '🐱 喵喵队长', name: '喵喵队长', emoji: '🐱' },
];

const THEMES = [
  { id: '太空星际探险', label: '太空探险', emoji: '🌌' },
  { id: '深海寻宝记', label: '深海寻宝', emoji: '🌊' },
  { id: '魔法森林大冒险', label: '魔法森林', emoji: '🌲' },
  { id: '糖果城堡派对', label: '糖果城堡', emoji: '🍬' },
  { id: '恐龙世界游记', label: '恐龙世界', emoji: '🦕' },
];

const PRESET_PROMPTS = [
  '🚀 一起造火箭飞去月球上吃芝士蛋糕',
  '🪄 在神秘树洞里找到会说话的魔法棒',
  '🍦 掉进了草莓冰淇淋滑梯里畅饮欢呼',
  '💎 帮海底的小龙虾寻找失落的珍珠皇冠',
];


export function StoryBook() {
  const { t: tr } = useTranslation();
  const [character, setCharacter] = useState(CHARACTERS[0]!.id);
  const [theme, setTheme] = useState(THEMES[0]!.id);
  const [userPrompt, setUserPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [loading, setLoading] = useState(false);
  const [bookData, setBookData] = useState<StoryBookData | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0 为封面，1-4 为正文
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const activeStreamRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // 页面切换时停止音频并中断进行中的 AI 流
  useEffect(() => {
    return () => {
      activeStreamRef.current = false;
      abortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  // 语音输入定制故事点子
  const handleVoiceInput = () => {
    if (!isSpeechRecogSupported()) return;
    sfxTap();
    if (isListening) {
      speechRecog.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    speechRecog.start({
      onResult: (text, isFinal) => {
        setUserPrompt(text);
        if (isFinal) {
          setIsListening(false);
          speechRecog.stop();
        }
      },
      onError: () => setIsListening(false),
      onEnd: () => setIsListening(false),
    });
  };

  const handleGenerateStory = async () => {
    sfxTap();
    setLoading(true);
    setBookData(null);
    setCurrentPage(0);
    stopSpeaking();
    activeStreamRef.current = true;

    try {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const task = storybookTask(character, theme, userPrompt.trim());
      const generator = chatStream({ ...task, signal: ac.signal });
      let rawJson = '';

      for await (const chunk of generator) {
        if (!activeStreamRef.current) break;
        if (chunk.type === 'text') {
          rawJson += chunk.text;
        }
      }

      if (rawJson.trim() && activeStreamRef.current) {
        const parsed = safeParseJSON<StoryBookData | null>(rawJson, null);
        if (parsed?.pages?.length) {
          setBookData(parsed);
          sfxWin();
        } else {
          setBookData(fallbackStorybook(character, theme));
        }
      } else {
        setBookData(fallbackStorybook(character, theme));
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[storybook] 解析/操作失败，已回退默认', e);
      setBookData(fallbackStorybook(character, theme));
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPageAudio = (text: string) => {
    stopSpeaking();
    setIsPlayingAudio(true);
    speak(text, {
      lang: 'zh-CN',
      rate: 0.8,
      pitch: 1.15,
      onEnd: () => {
        setIsPlayingAudio(false);
      },
    });
  };

  const handlePrevPage = () => {
    sfxFlip();
    stopSpeaking();
    setIsPlayingAudio(false);
    setCurrentPage((p) => Math.max(0, p - 1));
  };

  const handleNextPage = () => {
    sfxFlip();
    stopSpeaking();
    setIsPlayingAudio(false);
    if (!bookData) return;
    setCurrentPage((p) => Math.min(bookData.pages.length, p + 1));
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (!bookData) return;
    sfxTap();
    setExportingPdf(true);
    try {
      const dataUrl = await generateStorybookPdf(bookData);
      const link = document.createElement('a');
      link.download = `绘本《${bookData.bookTitle}》电子书.png`;
      link.href = dataUrl;
      link.click();
      sfxWin();
    } catch (e) {
      if (import.meta.env.DEV) console.error('Export PDF failed:', e);
    } finally {
      setExportingPdf(false);
    }
  };


  return (
    <div className="space-y-6">
      {!bookData && !loading && (
        <Panel className="border-4 border-candy-purple/30 bg-gradient-to-b from-white to-cream-light p-6">
          <PanelTitle emoji="📖" title={tr('storybook.workTitle')} subtitle={tr('storybook.workSubtitle')} tone="purple" />

          {/* 选择小伙伴 */}
          <div className="mt-4">
            <label className="block text-sm font-extrabold text-ink mb-2">1. {tr('storybook.pickCharacter')}</label>
            <div className="flex flex-wrap gap-2">
              {CHARACTERS.map((c) => (
                <CandyButton
                  key={c.id}
                  tone={character === c.id ? 'purple' : 'blue'}
                  variant={character === c.id ? 'solid' : 'soft'}
                  size="sm"
                  onClick={() => {
                    sfxTap();
                    setCharacter(c.id);
                  }}
                >
                  {c.emoji} {c.name}
                </CandyButton>
              ))}
            </div>
          </div>

          {/* 选择场景 */}
          <div className="mt-5">
            <label className="block text-sm font-extrabold text-ink mb-2">2. {tr('storybook.pickTheme')}</label>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <CandyButton
                  key={t.id}
                  tone={theme === t.id ? 'purple' : 'green'}
                  variant={theme === t.id ? 'solid' : 'soft'}
                  size="sm"
                  onClick={() => {
                    sfxTap();
                    setTheme(t.id);
                  }}
                >
                  {t.emoji} {t.label}
                </CandyButton>
              ))}
            </div>
          </div>

          {/* 语音/文本定制特别点子 */}
          <div className="mt-5">
            <label className="block text-sm font-extrabold text-ink mb-2">3. {tr('storybook.yourIdea')}</label>
            <div className="relative flex items-center mb-2">
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={tr('storybook.ideaPlaceholder')}
                className="w-full rounded-2xl border-2 border-candy-purple/40 bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-candy-purple"
              />
              {isSpeechRecogSupported() && (
                <button aria-label="🎤"
                  type="button"
                  onClick={handleVoiceInput}
                  className={`absolute right-2 grid h-9 w-9 place-items-center rounded-xl transition-all ${
                    isListening ? 'bg-candy-red text-white animate-pulse' : 'bg-candy-purple/20 text-candy-purple hover:bg-candy-purple/30'
                  }`}
                  title={tr('storybook.voiceInput')}
                >
                  🎤
                </button>
              )}
            </div>

            {/* 灵感快捷点选 */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs font-bold text-ink/50 self-center mr-1">💡 {tr('storybook.quickIdeas')}:</span>
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setUserPrompt(p);
                  }}
                  className="rounded-xl border border-candy-purple/30 bg-purple-50/70 px-2.5 py-1 text-xs font-bold text-candy-purple hover:bg-candy-purple hover:text-white transition-all active:scale-95"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>


          {/* 生成大按钮 */}
          <div className="mt-6">
            <CandyButton
              tone="purple"
              size="lg"
              fullWidth
              onClick={handleGenerateStory}
            >
              ✨ {tr('storybook.generateBtn')}
            </CandyButton>
          </div>
        </Panel>
      )}

      {/* 生成中 Loading 态 */}
      {loading && (
        <Panel className="grid min-h-[360px] place-items-center text-center p-8 border-4 border-candy-yellow">
          <div>
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-7xl mb-4 inline-block"
            >
              📖
            </motion.div>
            <h3 className="text-2xl font-black text-ink-main">{tr('storybook.creating')}</h3>
            <p className="mt-2 text-sm font-bold text-ink-soft animate-pulse">
              {tr('storybook.creatingDesc')}
            </p>
          </div>
        </Panel>
      )}

      {/* 绘本展示与阅读态 */}
      {bookData && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CandyButton
              tone="purple"
              variant="soft"
              size="sm"
              onClick={() => {
                sfxTap();
                stopSpeaking();
                setBookData(null);
              }}
            >
              {tr('storybook.retheme')}
            </CandyButton>

            <span className="text-sm font-extrabold text-candy-purple-deep">
              {tr('storybook.pageN', { n: currentPage === 0 ? tr('storybook.cover') : `${currentPage} / ${bookData.pages.length}` })}
            </span>

            <div className="flex items-center space-x-2">
              <CandyButton
                tone="orange"
                variant="soft"
                size="sm"
                disabled={exportingPdf}
                onClick={handleExportPdf}
              >
                {exportingPdf ? tr('storybook.exporting') : tr('storybook.exportPdf')}
              </CandyButton>

              <CandyButton
                tone="green"
                variant="soft"
                size="sm"
                onClick={() => {
                  const text =
                    currentPage === 0
                      ? `绘本《${bookData.bookTitle}》，${bookData.moral}`
                      : bookData.pages[currentPage - 1]!.content;
                  handlePlayPageAudio(text);
                }}
              >
                {isPlayingAudio ? tr('storybook.reading') : tr('storybook.readPage')}
              </CandyButton>
            </div>
          </div>

          {/* 绘本书本主体卡片 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ rotateY: -15, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 15, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-3xl border-8 border-candy-yellow bg-white p-6 shadow-2xl min-h-[420px] flex flex-col justify-between"
              style={{
                backgroundColor:
                  currentPage === 0
                    ? '#fff4d6'
                    : bookData.pages[currentPage - 1]?.bgColor || '#FFFFFF',
              }}
            >
              {/* 封面页 */}
              {currentPage === 0 && (
                <div className="my-auto text-center space-y-4">
                  <div className="inline-block rounded-full bg-white/80 px-4 py-1 text-sm font-black text-candy-purple">
                    🌟 {tr('storybook.coProduced')}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-ink-main tracking-wide">
                    《{bookData.bookTitle}》
                  </h2>
                  <div className="text-7xl my-6 animate-bounce">
                    {CHARACTERS.find((c) => c.id === character)?.emoji || '📖'}
                  </div>
                  <p className="text-base font-extrabold text-ink-soft max-w-md mx-auto rounded-2xl bg-white/60 p-3">
                    💡 {tr('storybook.moral')}：{bookData.moral}
                  </p>
                </div>
              )}

              {/* 正文页 (1 - 4) */}
              {currentPage > 0 && currentPage <= bookData.pages.length && (
                <div className="space-y-4">
                  {/* 插画画布 */}
                  <StoryCanvas
                    theme={bookData.pages[currentPage - 1]!.illustrationTheme}
                    bgColor={bookData.pages[currentPage - 1]!.bgColor}
                    emoji={bookData.pages[currentPage - 1]!.emoji}
                  />

                  {/* 标题与故事内容 */}
                  <div className="rounded-2xl bg-white/90 p-4 shadow-sm space-y-2">
                    <h3 className="text-lg font-black text-candy-purple-deep flex items-center gap-2">
                      <span>{bookData.pages[currentPage - 1]!.emoji}</span>
                      <span>{bookData.pages[currentPage - 1]!.title}</span>
                    </h3>
                    <p className="text-base font-extrabold text-ink-main leading-relaxed">
                      {bookData.pages[currentPage - 1]!.content}
                    </p>
                  </div>
                </div>
              )}

              {/* 翻页控制按钮栏 */}
              <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4">
                <CandyButton
                  tone="blue"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={handlePrevPage}
                >
                  {tr('common.prevPage')}
                </CandyButton>

                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <span
                      key={`page-${idx}`}
                      className={`h-3 w-3 rounded-full transition-all ${
                        currentPage === idx ? 'bg-candy-purple scale-125' : 'bg-black/10'
                      }`}
                    />
                  ))}
                </div>

                <CandyButton
                  tone="purple"
                  size="sm"
                  disabled={currentPage === bookData.pages.length}
                  onClick={handleNextPage}
                >
                  {tr('common.nextPage')}
                </CandyButton>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
