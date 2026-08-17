import { useState, useEffect, type ReactNode } from 'react';
import { CandyButton, IconButton } from '@/components/ui/Button';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FluffyIcon, type FluffyIconType } from '@/components/ui/FluffyIcon';
import { BabyMedal } from '@/components/ui/BabyMedal';
import { StarRating, StarCounter, StarIcon } from '@/components/ui/Stars';
import { FeedbackBanner, BigPraise, type FeedbackKind } from '@/components/ui/Feedback';
import { TONE_STYLE, TONES } from '@/lib/tones';
import { navigate } from '@/lib/router';

/* ============================================================
 * 果冻粉设计系统 · 线上组件库展示页
 * 单一真相源：src/styles/index.css（@theme 令牌）
 * 访问：#/design
 * ============================================================ */

// 顶部 Tabs 区可切换的章节标识：用联合类型约束，避免传入非法 id
type SectionTab = 'color' | 'tone' | 'shape';

const PINK_FAMILY = [
  { name: 'candy-pink', hex: '#FF6B96', note: '主粉' },
  { name: 'candy-pink-soft', hex: '#FFB6C9', note: '浅粉' },
  { name: 'candy-pink-light', hex: '#FFF0F4', note: '柔底' },
  { name: 'candy-pink-deep', hex: '#E05A80', note: '深粉' },
  { name: 'candy-red', hex: '#FF5C7A', note: '强调' },
];

const NEUTRALS = [
  { name: 'cream', hex: '#FFF9FA', note: '暖白' },
  { name: 'ink', hex: '#5C2E3D', note: '墨棕' },
  { name: 'ink-soft', hex: '#8A7A7E', note: '弱墨' },
];

const RADII = [
  { label: '8px', cls: 'rounded-lg' },
  { label: '14px', cls: 'rounded-[14px]' },
  { label: '24px', cls: 'rounded-3xl' },
  { label: '30px', cls: 'rounded-[30px]' },
  { label: '9999px', cls: 'rounded-full' },
];

// 组件库页抽样展示的图标（均为受支持的 FluffyIconType，便于类型校验）
const FLUFFY_ICON_SAMPLES: FluffyIconType[] = [
  'home', 'today', 'letters', 'poems', 'numbers', 'hanzi',
  'pinyin', 'words', 'songs', 'star', 'crown', 'medal',
];

// 组件库页抽样展示的勋章 id（星章另作未解锁态演示）
const MEDAL_SAMPLES = ['scholar', 'pinyin', 'math', 'nurture', 'words', 'poems'] as const;

// 浅色表面（柔白/暖白）需改用弱墨文字，避免浅底上用深粉导致对比不足
const LIGHT_SURFACES = new Set(['#fff0f4', '#fff9fa']);

function Swatch({ name, hex, note }: { name: string; hex: string; note: string }) {
  const useMutedText = LIGHT_SURFACES.has(hex.toLowerCase());
  return (
    <div className="card-candy overflow-hidden p-0">
      <div className="relative h-20 w-full" style={{ background: hex }}>
        <span className="jelly-shine absolute inset-0" />
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-extrabold text-ink">{name}</div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink-soft">{note}</span>
          <span className={`text-[11px] font-bold ${useMutedText ? 'text-ink-soft' : 'text-candy-pink-deep'}`}>
            {hex.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  index,
  title,
  desc,
  children,
}: {
  id?: string;
  index: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <div className="mb-5 flex items-end gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-candy-pink text-lg font-black text-white shadow-jelly">
          {index}
        </span>
        <div>
          <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card-candy p-5 sm:p-6 ${className}`}>{children}</div>
  );
}

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>('color');
  const [modalOpen, setModalOpen] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>('correct');
  const [praise, setPraise] = useState(false);
  // 庆祝提示自动消失：挂载定时器，并在卸载或状态变化前清理，避免内存泄漏
  useEffect(() => {
    if (!praise) return;
    const timer = setTimeout(() => setPraise(false), 1600);
    return () => clearTimeout(timer);
  }, [praise]);

  const tabItems: TabItem<SectionTab>[] = [
    { id: 'color', label: '色彩' },
    { id: 'tone', label: '语义色' },
    { id: 'shape', label: '质感' },
  ];
  // 各 Tab 对应的演示说明：用查表替代多重三元判断，降低冗余、便于维护
  const TAB_DEMO_TEXT: Record<SectionTab, string> = {
    color: '色彩章节展示果冻粉主色家族与中性色。',
    tone: '语义色章节展示 6 个 tone 的统一着色能力。',
    shape: '质感章节展示 Glass / Squish / Shine 三要素。',
  };

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-32 pt-6">
      {/* 装饰浮球 */}
      <div className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-candy-pink-soft/50 blur-3xl" />
      <div className="pointer-events-none absolute left-[-10%] top-1/3 h-48 w-48 rounded-full bg-candy-blue/30 blur-3xl" />

      {/* ===== Hero ===== */}
      <header className="jelly-shine relative mb-12 overflow-hidden rounded-[2rem] p-7 shadow-jelly-lg sm:p-10"
        style={{ background: 'linear-gradient(135deg,#FFF0F4 0%,#FFE4EF 48%,#F2EAFD 100%)' }}
      >
        <button
          onClick={() => navigate('home')}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 text-sm font-bold text-candy-pink-deep shadow-candy-sm backdrop-blur transition hover:scale-105 active:scale-95"
        >
          ← 返回乐园
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-candy-pink px-3 py-1 text-xs font-black text-white shadow-jelly">
            v1.0 · 儿童友好
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-candy-pink-deep">
            单一真相源 · index.css
          </span>
        </div>
        <h1 className="mt-4 text-4xl font-black text-ink sm:text-5xl">果冻粉设计系统</h1>
        <p className="mt-3 max-w-xl text-base text-ink-soft">
          宝贝学习乐园的儿童友好组件库 —— 把画布上的设计规范，变成浏览器里真正跑起来的活组件。
          全量令牌、质感与 10 大组件，均可在本页实时预览。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CandyButton tone="pink" size="md" icon={<span className="text-xl">🍓</span>} onClick={() => navigate('home')}>
            进入乐园首页
          </CandyButton>
          <CandyButton tone="purple" size="md" variant="soft" onClick={() => setModalOpen(true)}>
            查看组件总览
          </CandyButton>
        </div>
      </header>

      {/* ===== 01 色彩板 ===== */}
      <Section id="color" index="01" title="色彩板 · Color Palette" desc="果冻粉主色家族 + 中性色，全部来自 --color-candy-* 令牌。">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PINK_FAMILY.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-3">
          {NEUTRALS.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
      </Section>

      {/* ===== 02 语义色 ===== */}
      <Section index="02" title="语义色 · Tones" desc="6 个语义色调，驱动按钮、图标、进度与卡片的统一着色。">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TONES.map((tone) => {
            // TONES 已约束为 Tone[]，故 TONE_STYLE[tone] 必定存在，无需空值判断
            const ts = TONE_STYLE[tone];
            return (
              <div key={tone} className="card-candy flex items-center gap-3 p-4">
                <div
                  className="jelly-shine h-14 w-14 shrink-0 rounded-2xl"
                  style={{ background: ts.main, boxShadow: `0 4px 0 0 ${ts.deep}` }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold capitalize text-ink">{tone}</div>
                  <div className="text-[11px] font-semibold text-ink-soft">{ts.main}</div>
                  <div className="text-[11px] font-semibold text-ink-soft">{ts.deep}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ===== 03 质感三要素 ===== */}
      <Section index="03" title="质感三要素 · Glass · Squish · Shine" desc="果冻粉的「软、弹、亮」来自三种可复用质感。">
        <div className="grid gap-4 md:grid-cols-3">
          <Panel className="glass">
            <div className="text-sm font-extrabold text-ink">Glass 玻璃拟态</div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              白底 60% + blur 16px + 内发光粉边。用于浮动卡片、弹窗与导航。
            </p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-candy-pink-deep">透明</span>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-candy-pink-deep">毛玻璃</span>
            </div>
          </Panel>
          <Panel>
            <div className="text-sm font-extrabold text-ink">Squish 按压回弹</div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              0.94 收缩 → 弹性回弹 1，所有按钮 active 态统一 Q 弹手感。
            </p>
            <div className="mt-4">
              <CandyButton tone="green" size="sm" onClick={() => {}}>按我试试</CandyButton>
            </div>
          </Panel>
          <Panel className="jelly-shine">
            <div className="text-sm font-extrabold text-ink">Shine 高光弧</div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              左上 45° 白弧 + 1px 内白描边，让每块果冻都「发光」。
            </p>
            <div className="mt-4 flex gap-2">
              <span className="jelly-shine h-8 w-8 rounded-xl bg-candy-pink" />
              <span className="jelly-shine h-8 w-8 rounded-xl bg-candy-blue" />
              <span className="jelly-shine h-8 w-8 rounded-xl bg-candy-yellow" />
            </div>
          </Panel>
        </div>
      </Section>

      {/* ===== 04 圆角与阴影 ===== */}
      <Section index="04" title="圆角与阴影 · Radius & Shadow" desc="圆角阶梯 8→9999，阴影统一带果冻粉柔光。">
        <Panel>
          <div className="mb-4 text-sm font-extrabold text-ink">圆角半径</div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {RADII.map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-2">
                <div className={`h-16 w-16 bg-candy-pink-soft ${r.cls}`} />
                <span className="text-[11px] font-bold text-ink-soft">{r.label}</span>
              </div>
            ))}
          </div>
          <div className="mb-3 mt-7 text-sm font-extrabold text-ink">阴影</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid h-20 place-items-center rounded-2xl bg-white shadow-candy-sm">
              <span className="text-xs font-bold text-ink-soft">shadow-candy-sm</span>
            </div>
            <div className="grid h-20 place-items-center rounded-2xl bg-white shadow-jelly">
              <span className="text-xs font-bold text-ink-soft">shadow-jelly</span>
            </div>
            <div className="grid h-20 place-items-center rounded-2xl bg-white shadow-jelly-lg">
              <span className="text-xs font-bold text-ink-soft">shadow-jelly-lg</span>
            </div>
          </div>
        </Panel>
      </Section>

      {/* ===== 05 组件库 ===== */}
      <Section index="05" title="组件库 · Components" desc="10 大核心组件，均为真实生产组件，可在本页交互预览。">
        {/* Tabs 演示 */}
        <Panel className="mb-4">
          <div className="mb-3 text-sm font-extrabold text-ink">Tabs 分段切换</div>
          <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} tone="pink" />
          <div className="rounded-2xl bg-white/60 p-4 text-sm text-ink-soft">
            {TAB_DEMO_TEXT[activeTab]}
          </div>
        </Panel>

        {/* Buttons */}
        <Panel className="mb-4">
          <div className="mb-3 text-sm font-extrabold text-ink">Button 按钮</div>
          <div className="flex flex-wrap gap-3">
            {TONES.map((tone) => (
              <CandyButton key={tone} tone={tone} size="md">{tone}</CandyButton>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CandyButton tone="pink" size="sm">小</CandyButton>
            <CandyButton tone="pink" size="md">中</CandyButton>
            <CandyButton tone="pink" size="lg">大</CandyButton>
            <CandyButton tone="blue" variant="soft">soft</CandyButton>
            <CandyButton tone="green" variant="ghost">ghost</CandyButton>
            <IconButton tone="purple" label="收藏" onClick={() => {}}>⭐</IconButton>
            <CandyButton tone="pink" size="md" requireConfirm onClick={() => {}}>删除</CandyButton>
          </div>
        </Panel>

        {/* Progress + Stars */}
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Panel>
            <div className="mb-3 text-sm font-extrabold text-ink">ProgressBar 进度</div>
            <div className="space-y-3">
              <ProgressBar value={82} color="pink" showValue label="今日学习" />
              <ProgressBar value={46} color="blue" showValue label="汉字" />
              <ProgressBar value={67} color="green" showValue label="数学" />
              <ProgressBar value={30} color="yellow" showValue label="英语" />
            </div>
          </Panel>
          <Panel>
            <div className="mb-3 text-sm font-extrabold text-ink">Stars 评分</div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StarRating value={2} max={3} size={28} />
                <span className="text-sm font-bold text-ink-soft">3 星评分</span>
              </div>
              <StarCounter count={128} />
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon key={i} filled={i <= 4} size={26} />
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* Feedback */}
        <Panel className="mb-4">
          <div className="mb-3 text-sm font-extrabold text-ink">Feedback 即时反馈</div>
          <div className="mb-3 flex gap-2">
            <CandyButton tone="green" size="sm" variant="soft" onClick={() => setFeedbackKind('correct')}>答对</CandyButton>
            <CandyButton tone="orange" size="sm" variant="soft" onClick={() => setFeedbackKind('wrong')}>答错</CandyButton>
            <CandyButton tone="purple" size="sm" variant="soft" onClick={() => setPraise(true)}>庆祝</CandyButton>
          </div>
          <FeedbackBanner
            kind={feedbackKind}
            text={feedbackKind === 'correct' ? '太棒了，答对啦！' : feedbackKind === 'wrong' ? '再试一次，你可以的！' : ''}
          />
        </Panel>

        {/* Icons + Medals */}
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Panel>
            <div className="mb-3 text-sm font-extrabold text-ink">FluffyIcon 图标</div>
            <div className="flex flex-wrap gap-3">
              {FLUFFY_ICON_SAMPLES.map((iconType) => (
                <FluffyIcon key={iconType} type={iconType} size="md" />
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="mb-3 text-sm font-extrabold text-ink">BabyMedal 勋章</div>
            <div className="flex flex-wrap items-center gap-3">
              {MEDAL_SAMPLES.map((medalId) => (
                <BabyMedal key={medalId} id={medalId} size={56} />
              ))}
              <BabyMedal id="star" size={56} unlocked={false} />
            </div>
          </Panel>
        </div>

        {/* Modal + Input */}
        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <div className="mb-3 text-sm font-extrabold text-ink">Modal 弹窗</div>
            <CandyButton tone="pink" size="md" onClick={() => setModalOpen(true)}>打开弹窗</CandyButton>
          </Panel>
          <Panel>
            <div className="mb-3 text-sm font-extrabold text-ink">input-jelly 输入框</div>
            <input className="input-jelly mb-3 w-full px-4 py-3 text-base" placeholder="宝贝的名字" />
            <textarea className="input-jelly w-full px-4 py-3 text-base" rows={2} placeholder="想对宝贝说点什么…" />
          </Panel>
        </div>

        <p className="mt-4 text-xs text-ink-soft">
          * BottomTabs（全局底部导航）为固定外壳组件，其视觉即上方 FluffyIcon 图标组 + 果冻粉选中态，运行时见任意页面底部。
        </p>
      </Section>

      {/* ===== 06 设计令牌 ===== */}
      <Section index="06" title="设计令牌 · Design Tokens" desc="全量令牌定义在 src/styles/index.css 的 @theme 中，为唯一权威来源。">
        <Panel className="!p-0">
          <pre className="overflow-x-auto rounded-[2rem] bg-ink/95 p-5 text-[12px] leading-relaxed text-pink-100">
{`/* 果冻粉主色板 */
--color-candy-pink:      #FF6B96;
--color-candy-pink-soft: #FFB6C9;
--color-candy-pink-light:#FFF0F4;
--color-candy-pink-deep: #E05A80;
--color-candy-red:       #FF5C7A;

/* 6 语义色调 */
--color-candy-blue / yellow / green / purple / orange

/* 阴影 */
--shadow-jelly:     0 4px 0 0 rgb(255 107 150/.14),
                    0 10px 24px -4px rgb(255 107 150/.28);
--shadow-jelly-lg:  0 6px 0 0 rgb(255 107 150/.16),
                    0 20px 44px -8px rgb(255 107 150/.36);

/* 质感 utility */
@utility glass / jelly-shine / input-jelly`}
          </pre>
        </Panel>
      </Section>

      {/* ===== 页脚 ===== */}
      <footer className="mt-16 rounded-[2rem] bg-white/70 p-6 text-center shadow-candy-sm backdrop-blur">
        <div className="text-base font-extrabold text-ink">果冻粉设计系统 · v1.0</div>
        <p className="mt-1 text-xs text-ink-soft">
          单一真相源：<code className="rounded bg-candy-pink-light px-1.5 py-0.5 font-bold text-candy-pink-deep">src/styles/index.css</code>
          {' '}· 访问 <code className="rounded bg-candy-pink-light px-1.5 py-0.5 font-bold text-candy-pink-deep">#/design</code> 查看本页
        </p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-candy-pink px-4 py-1.5 text-sm font-bold text-white shadow-jelly transition hover:scale-105 active:scale-95"
        >
          ↑ 回到顶部
        </button>
      </footer>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} aria-label="组件总览">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-candy-pink text-3xl shadow-jelly">🍓</div>
          <h3 className="text-2xl font-black text-ink">10 大核心组件</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Button · Tabs · ProgressBar · Modal · BottomTabs · Feedback · FluffyIcon · BabyMedal · Stars · input-jelly
          </p>
          <div className="mt-5">
            <CandyButton tone="pink" size="md" fullWidth onClick={() => setModalOpen(false)}>知道了</CandyButton>
          </div>
        </div>
      </Modal>

      <BigPraise show={praise} text="你真棒！" emoji="🌟" />
    </div>
  );
}
