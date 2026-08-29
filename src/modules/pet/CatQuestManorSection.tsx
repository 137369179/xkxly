import { Panel } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { CatManorIcon } from './PetIcons';
import {
  QUESTS,
  type QuestConfig,
  formatDuration,
  useCountdown,
} from './catData';

/** 单个探险任务卡片：三种状态（空闲/进行中/可领取） */
function QuestCard({
  config,
  quest,
  onDispatch,
  onClaim,
}: {
  config: QuestConfig;
  quest: { id: string; name: string; endAt: number; reward: number } | undefined;
  onDispatch: () => void;
  onClaim: () => void;
}) {
  const { t } = useTranslation();
  const { Icon } = config;
  const remaining = useCountdown(quest?.endAt);
  const isDone = quest && remaining === 0;

  return (
    <div className="rounded-2xl bg-white p-3 border border-indigo-200 shadow-xs flex flex-col justify-between items-center text-center">
      <div>
        <div className="flex justify-center mb-1">
          <Icon size={36} />
        </div>
        <span className="text-base">{t(config.name)}</span>
        <p className="text-xs text-indigo-600 mt-1">
          {t('pet.questDuration', { time: formatDuration(config.durationSec, t), count: config.reward })}
        </p>
      </div>

      {/* 空闲：派遣按钮 */}
      {!quest && (
        <button
          onClick={onDispatch}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-1.5 text-white hover:bg-indigo-700 active:scale-95"
        >
          {t('pet.dispatchBtn')}
        </button>
      )}

      {/* 进行中：倒计时 */}
      {quest && !isDone && (
        <div className="mt-3 w-full rounded-xl bg-indigo-100 py-1.5 text-indigo-700 flex items-center justify-center gap-1">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
          {t('pet.exploring', { time: formatDuration(remaining, t) })}
        </div>
      )}

      {/* 完成：领取按钮 */}
      {isDone && (
        <button
          onClick={onClaim}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-1.5 text-candy-orange-on font-black hover:from-amber-600 hover:to-orange-600 active:scale-95 animate-pulse"
        >
          {t('pet.claimBtn', { count: config.reward })}
        </button>
      )}
    </div>
  );
}

export function CatQuestManorSection({
  catQuests,
  onDispatch,
  onClaim,
}: {
  catQuests: readonly { id: string; name: string; endAt: number; reward: number }[];
  onDispatch: (q: QuestConfig) => void;
  onClaim: (q: QuestConfig) => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel className="border-2 border-indigo-300 bg-indigo-50 text-center space-y-3">
      <h3 className="text-lg font-black text-indigo-950 flex items-center justify-center gap-2">
        <CatManorIcon size={26} /> {t('pet.questManor')}
      </h3>
      {/* 探险场景横幅 */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200 shadow-xs">
        <img
          src="/cat/cat-manor-adventure.jpg"
          alt={t('pet.manorAlt')}
          className="w-full h-44 object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-indigo-900/20 to-transparent flex items-end">
          <p className="p-3 text-white text-sm font-black text-left">
            {t('pet.questBanner')}
          </p>
        </div>
      </div>
      <p className="text-xs font-bold text-indigo-700">{t('pet.questDesc')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-black text-indigo-900">
        {QUESTS.map((q) => {
          const quest = catQuests.find((x) => x.id === q.id);
          return (
            <QuestCard
              key={q.id}
              config={q}
              quest={quest}
              onDispatch={() => onDispatch(q)}
              onClaim={() => onClaim(q)}
            />
          );
        })}
      </div>
    </Panel>
  );
}
