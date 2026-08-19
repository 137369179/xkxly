/**
 * 🫀 人体奥秘探险
 * ------------------------------------------------------------
 * SVG 人体轮廓 + 6 大系统可点击 + 器官详情 + AI 探险故事
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { BODY_SYSTEMS, type BodySystemItem, type OrganItem } from '@/data/humanBody';
import { ScienceAiPanel } from './ScienceAiPanel';
import { useTranslation } from '@/i18n/useTranslation';

const SYSTEM_COLORS: Record<string, string> = {
  消化: '#ff5c7a',
  呼吸: '#55aee0',
  循环: '#ff6b96',
  骨骼: '#ffe9ad',
  神经: '#8b6ef0',
  感觉: '#5fd68b',
};

const SYSTEM_BG: Record<string, string> = {
  消化: 'from-red-50 via-orange-50 to-yellow-50',
  呼吸: 'from-blue-50 via-sky-50 to-cyan-50',
  循环: 'from-pink-50 via-rose-50 to-red-50',
  骨骼: 'from-yellow-50 via-amber-50 to-orange-50',
  神经: 'from-purple-50 via-violet-50 to-indigo-50',
  感觉: 'from-green-50 via-emerald-50 to-teal-50',
};

/** 人体 SVG 轮廓 */
function BodyOutline({
  activeSystem,
  onOrganClick,
}: {
  activeSystem: BodySystemItem | null;
  onOrganClick: (organ: OrganItem) => void;
}) {
  const { t: tr } = useTranslation();
  return (
    <div className="relative mx-auto max-w-xs">
      <svg viewBox="0 0 100 100" className="w-full" style={{ maxHeight: '400px' }}>
        {/* 人体轮廓 */}
        <path
          d="M 50 3
             C 44 3 40 7 40 12
             C 40 16 43 19 46 20
             L 46 22
             C 38 24 34 28 33 35
             L 31 45
             C 30 48 32 50 34 50
             L 36 48
             L 38 52
             L 36 58
             L 35 70
             C 34 75 35 80 37 82
             L 36 90
             C 36 93 38 95 40 95
             C 42 95 44 93 44 90
             L 45 82
             L 50 82
             L 55 82
             L 56 90
             C 56 93 58 95 60 95
             C 62 95 64 93 64 90
             L 63 82
             C 65 80 66 75 65 70
             L 64 58
             L 62 52
             L 64 48
             L 66 50
             C 68 50 70 48 69 45
             L 67 35
             C 66 28 62 24 54 22
             L 54 20
             C 57 19 60 16 60 12
             C 60 7 56 3 50 3 Z"
          fill={activeSystem ? `${SYSTEM_COLORS[activeSystem.system]}10` : '#FFE4C4'}
          stroke={activeSystem ? SYSTEM_COLORS[activeSystem.system] : '#D4A574'}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* 器官标记点 */}
        {activeSystem?.organs.map(organ => (
          <g key={organ.id}>
            {/* 脉冲圈 */}
            <circle
              cx={organ.position.x}
              cy={organ.position.y}
              r="4"
              fill={SYSTEM_COLORS[activeSystem.system]}
              opacity="0.2"
            >
              <animate
                attributeName="r"
                values="3;6;3"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* 器官点击区 */}
            <circle
              cx={organ.position.x}
              cy={organ.position.y}
              r="3.5"
              fill={SYSTEM_COLORS[activeSystem.system]}
              stroke="white"
              strokeWidth="0.5"
              className="cursor-pointer"
              onClick={() => { sfxTap(); onOrganClick(organ); }}
            />
            {/* emoji 标记 */}
            <text
              x={organ.position.x}
              y={organ.position.y + 1.2}
              textAnchor="middle"
              fontSize="3.5"
              className="pointer-events-none cursor-pointer"
              onClick={() => { sfxTap(); onOrganClick(organ); }}
            >
              {organ.emoji}
            </text>
          </g>
        ))}

        {/* 未选中系统时显示所有系统标记 */}
        {!activeSystem && BODY_SYSTEMS.map(sys => (
          <g key={sys.id}>
            <circle
              cx={sys.organs[0]!.position.x}
              cy={sys.organs[0]!.position.y}
              r="3"
              fill={SYSTEM_COLORS[sys.system]}
              opacity="0.4"
              className="cursor-pointer"
              onClick={() => { sfxTap(); onOrganClick(sys.organs[0]!); }}
            />
            <text
              x={sys.organs[0]!.position.x}
              y={sys.organs[0]!.position.y + 1}
              textAnchor="middle"
              fontSize="3"
              className="pointer-events-none"
            >
              {sys.emoji}
            </text>
          </g>
        ))}
      </svg>

      {/* 提示文字 */}
      <p className="mt-2 text-center text-xs text-ink-soft">
        {activeSystem ? tr('science.clickOrgan') : tr('science.pickSystem')}
      </p>
    </div>
  );
}

/** 器官详情弹窗 */
function OrganInfo({
  organ,
  system,
  onClose,
}: {
  organ: OrganItem;
  system: BodySystemItem;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="rounded-2xl bg-white p-3 shadow-lg border-2"
      style={{ borderColor: SYSTEM_COLORS[system.system] }}
    >
      <div className="flex items-center gap-2">
        <span className="text-3xl">{organ.emoji}</span>
        <div>
          <p className="text-3xl font-black leading-tight text-ink sm:text-4xl">{organ.nameZh}</p>
          <p className="text-[10px] font-bold text-ink-muted">{organ.nameEn}</p>
        </div>
        <button
          onClick={() => { sfxTap(); onClose(); }}
          className="ml-auto rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-xs font-bold text-ink">{organ.function}</p>
        <p className="text-[10px] text-ink-soft">💡 {organ.funFact}</p>
        <p className="text-[10px] text-green-700">📏 {organ.sizeComparison}</p>
      </div>
    </motion.div>
  );
}

/** 系统详情面板 */
function SystemDetail({
  system,
  onClose,
}: {
  system: BodySystemItem;
  onClose: () => void;
}) {
  const { t: tr } = useTranslation();
  const [selectedOrgan, setSelectedOrgan] = useState<OrganItem | null>(null);

  return (
    <Panel className={cn('border-2 bg-gradient-to-br', SYSTEM_BG[system.system])} >
      <div
        className="mb-3 rounded-t-2xl p-1"
        style={{ background: `${SYSTEM_COLORS[system.system]}20` }}
      />
      <button
        onClick={() => { sfxTap(); onClose(); }}
        className="mb-3 text-xs font-bold text-ink-soft hover:text-ink"
      >
        {tr('science.backToSystems')}
      </button>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* 人体图 */}
        <div className="shrink-0">
          <BodyOutline activeSystem={system} onOrganClick={(o) => setSelectedOrgan(o)} />
          {selectedOrgan && (
            <div className="mt-2">
              <OrganInfo organ={selectedOrgan} system={system} onClose={() => setSelectedOrgan(null)} />
            </div>
          )}
        </div>

        {/* 系统信息 */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{system.emoji}</span>
            <div>
              <h3 className="text-4xl font-black leading-tight text-ink sm:text-5xl">{system.nameZh}</h3>
              <p className="text-xs font-bold text-ink-muted">{system.nameEn} · {system.phonics}</p>
            </div>
          </div>
          <p className="text-sm font-bold text-ink">{system.desc}</p>
          <div className="rounded-xl bg-white/80 p-2 text-xs font-semibold text-ink-soft border" style={{ borderColor: `${SYSTEM_COLORS[system.system]}40` }}>
            💡 {system.funFact}
          </div>
          <div className="rounded-xl bg-yellow-50 p-2 text-xs font-bold text-orange-800 border border-yellow-200">
            🎵 {system.chant}
          </div>

          {/* 器官列表 */}
          <div className="space-y-1.5">
            <p className="text-xs font-extrabold text-ink">📋 {tr('science.includeOrgans')}：</p>
            {system.organs.map(organ => (
              <button
                key={organ.id}
                onClick={() => { sfxTap(); setSelectedOrgan(organ); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl p-2 text-left transition-all',
                  selectedOrgan?.id === organ.id ? 'bg-white shadow-md' : 'bg-white/50 hover:bg-white/80'
                )}
              >
                <span className="text-2xl">{organ.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-ink">{organ.nameZh}</p>
                  <p className="text-[10px] text-ink-muted">{organ.function}</p>
                </div>
              </button>
            ))}
          </div>

          {/* AI 探险故事 */}
          <div className="mt-3">
            <ScienceAiPanel
              topic={{
                id: `sci-body-${system.id}`,
                emoji: system.emoji,
                label: `${system.nameZh}探险`,
                stars: 2,
                tags: ['科学', '健康'],
                prompt: system.storyPrompt,
                fallback: system.storyFallback,
              }}
              triggerLabel={tr('science.exploreWithBuddy')}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** 系统选择卡片 */
function SystemGrid({ onSelect }: { onSelect: (s: BodySystemItem) => void }) {
  const { t: tr } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BODY_SYSTEMS.map(sys => (
        <button
          key={sys.id}
          onClick={() => { sfxTap(); onSelect(sys); }}
          className="flex flex-col items-center justify-center rounded-3xl border-2 bg-white p-4 text-center shadow-candy-sm transition-all hover:scale-105 active:scale-95 min-h-[48px]"
          style={{ borderColor: `${SYSTEM_COLORS[sys.system]}60` }}
        >
          <span className="text-5xl">{sys.emoji}</span>
          <span className="mt-2 text-2xl font-black leading-tight text-ink sm:text-3xl">{sys.nameZh}</span>
          
          <span className="text-[10px] font-bold" style={{ color: SYSTEM_COLORS[sys.system] }}>
            {tr('science.organsCount', { count: sys.organs.length })}
          </span>
        </button>
      ))}
    </div>
  );
}

function BodyAdventureImpl() {
  const [selectedSystem, setSelectedSystem] = useState<BodySystemItem | null>(null);
  const { t: tr } = useTranslation();

  return (
    <div className="space-y-4">
      {/* 总览人体图 */}
      {!selectedSystem && (
        <Panel className="border-2 border-green-200 bg-white/80">
          <h3 className="mb-2 text-center text-lg font-extrabold text-green-900">🫀 {tr('science.bodyAdventure')}</h3>
          <p className="mb-3 text-center text-xs text-ink-soft">{tr('science.bodyAdventureTip')}</p>
          <BodyOutline
            activeSystem={null}
            onOrganClick={(organ) => {
              // 找到器官所属的系统
              for (const sys of BODY_SYSTEMS) {
                if (sys.organs.some(o => o.id === organ.id)) {
                  setSelectedSystem(sys);
                  return;
                }
              }
            }}
          />
        </Panel>
      )}

      <AnimatePresence mode="wait">
        {selectedSystem ? (
          <motion.div
            key={selectedSystem.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SystemDetail system={selectedSystem} onClose={() => setSelectedSystem(null)} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SystemGrid onSelect={setSelectedSystem} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI 食物探险故事 */}
      {!selectedSystem && (
        <ScienceAiPanel
          topic={{
            id: 'sci-body-food-journey',
            emoji: '🍎',
            label: '食物去了哪里',
            stars: 2,
            tags: ['科学', '健康'],
            prompt: '带宝贝跟着一个苹果一起进入嘴巴，经过食道、胃、小肠、大肠，最后变成便便排出来。每到一个地方都介绍一下器官的功能，像探险一样！',
            fallback: '小苹果被宝贝咬了一口，扑通掉进嘴巴里！牙齿把它嚼碎，和口水混在一起变成糊糊。然后经过一条滑梯一样的食道，来到一个酸酸的袋子里——那是胃，会把小苹果搅来搅去。然后来到弯弯曲曲的小肠，营养被吸走了，送到全身各处。最后到大肠，水分被吸干，变成便便排出来。小苹果的旅行结束啦！',
          }}
          triggerLabel="🍎 食物去哪了？小智讲探险故事"
        />
      )}
    </div>
  );
}

export const BodyAdventure = memo(BodyAdventureImpl);
