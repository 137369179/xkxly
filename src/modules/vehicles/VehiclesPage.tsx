/**
 * 3D 羊毛毡交通工具与职业探索馆 🚗 (Vehicles & Occupations Explorer)
 * ------------------------------------------------------------
 * 1. 3D 羊毛毡交通工具 Fleet (消防车/警车/高铁/挖掘机)
 * 2. 🚒 宝宝巴士级「城市交通救援与职业大冒险」 (City Rescue Sim Pro)
 * 3. 职业角色与工具道具配对 (消防员-水枪, 医生-听诊器)
 */

import { useState, useMemo } from 'react';
import { shuffle } from '@/lib/utils';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore, useMastery } from '@/store/useStore';
import { CityRescueSim } from './CityRescueSim';

interface Vehicle {
  id: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  sound: string;
  usage: string;
  color: string;
}

const VEHICLES: Vehicle[] = [
  { id: 'fire_engine', nameZh: '消防车', nameEn: 'Fire Engine', emoji: '🚒', sound: '呜呜呜——', usage: '消防员叔叔开着它去灭火救人！', color: 'bg-red-100 border-red-300 text-red-900' },
  { id: 'police_car', nameZh: '警车', nameEn: 'Police Car', emoji: '🚓', sound: '嘟嘟嘟——', usage: '警察叔叔巡逻维护交通与社会治安！', color: 'bg-blue-100 border-blue-300 text-blue-900' },
  { id: 'ambulance', nameZh: '救护车', nameEn: 'Ambulance', emoji: '🚑', sound: '嘀嘟嘀嘟——', usage: '护送生病或受伤的人快速去医院！', color: 'bg-pink-100 border-pink-300 text-pink-900' },
  { id: 'airplane', nameZh: '飞机', nameEn: 'Airplane', emoji: '✈️', sound: '嗖——', usage: '在蓝天云朵间穿梭，带大家去远方旅行！', color: 'bg-sky-100 border-sky-300 text-sky-900' },
  { id: 'rocket', nameZh: '火箭', nameEn: 'Rocket', emoji: '🚀', sound: '轰隆隆——', usage: '飞向浩瀚太空，探索月球与火星！', color: 'bg-purple-100 border-purple-300 text-purple-900' },
  { id: 'excavator', nameZh: '挖掘机', nameEn: 'Excavator', emoji: '🚜', sound: '突突突——', usage: '大铲斗挖土挖石头，建造高楼大厦！', color: 'bg-amber-100 border-amber-300 text-amber-900' },
];

const FALLBACK_VEHICLE: Vehicle = {
  id: 'fire_engine',
  nameZh: '消防车',
  nameEn: 'Fire Engine',
  emoji: '🚒',
  sound: '呜呜呜——',
  usage: '消防员叔叔开着它去灭火救人！',
  color: 'bg-red-100 border-red-300 text-red-900',
};

const VEHICLE_NAME_KEYS: Record<string, string> = {
  fire_engine: 'vehicle.fireEngineName',
  police_car: 'vehicle.policeCarName',
  ambulance: 'vehicle.ambulanceName',
  airplane: 'vehicle.airplaneName',
  rocket: 'vehicle.rocketName',
  excavator: 'vehicle.excavatorName',
};

const JOB_NAME_KEYS: Record<string, string> = {
  '消防员': 'vehicle.firefighter',
  '医生': 'vehicle.doctor',
  '警察': 'vehicle.police',
  '厨师': 'vehicle.chef',
  '飞行员': 'vehicle.pilot',
};

const TOOL_NAME_KEYS: Record<string, string> = {
  '水枪与消防车': 'vehicle.toolFirefighter',
  '听诊器与医药箱': 'vehicle.toolDoctor',
  '警车与警笛': 'vehicle.toolPolice',
  '炒锅与厨师帽': 'vehicle.toolChef',
  '飞机与操纵杆': 'vehicle.toolPilot',
};

interface JobPair {
  jobZh: string;
  jobEn: string;
  jobEmoji: string;
  toolZh: string;
  toolEmoji: string;
}

const JOB_PAIRS: JobPair[] = [
  { jobZh: '消防员', jobEn: 'Firefighter', jobEmoji: '👨‍🚒', toolZh: '水枪与消防车', toolEmoji: '🚒' },
  { jobZh: '医生', jobEn: 'Doctor', jobEmoji: '👩‍⚕️', toolZh: '听诊器与医药箱', toolEmoji: '🩺' },
  { jobZh: '警察', jobEn: 'Police Officer', jobEmoji: '👮‍♂️', toolZh: '警车与警笛', toolEmoji: '🚓' },
  { jobZh: '厨师', jobEn: 'Chef', jobEmoji: '👨‍🍳', toolZh: '炒锅与厨师帽', toolEmoji: '🍳' },
  { jobZh: '飞行员', jobEn: 'Pilot', jobEmoji: '👨‍✈️', toolZh: '飞机与操纵杆', toolEmoji: '✈️' },
];

const FALLBACK_JOB: JobPair = {
  jobZh: '消防员',
  jobEn: 'Firefighter',
  jobEmoji: '👨‍🚒',
  toolZh: '水枪与消防车',
  toolEmoji: '🚒',
};

type VehicleTab = 'rescue' | 'fleet' | 'career';

export default function VehiclesPage() {
  const { t } = useTranslation();
  const { learnSkill, practice, tickTime } = useStore();
  const mastery = useMastery();

  const [tab, setTab] = useState<VehicleTab>('rescue');
  const [selectedV, setSelectedV] = useState<Vehicle>(VEHICLES[0] ?? FALLBACK_VEHICLE);
  const [jobQuiz, setJobQuiz] = useState<{ j: JobPair; options: JobPair[] } | null>(null);
  const [feedback, setFeedback] = useState('');

  const TABS: TabItem<VehicleTab>[] = useMemo(() => [
    { id: 'rescue', label: '城市救援大冒险', emoji: '🚒' },
    { id: 'fleet', label: t('vehicle.fleetTitle'), emoji: '🚘' },
    { id: 'career', label: t('vehicle.jobTitle'), emoji: '👨‍✈️' },
  ], [t]);

  const vehicleLearnedCount = VEHICLES.filter(
    (v) => {
      const item = mastery[`vehicle:${v.id}`];
      return item !== undefined && item.lv >= 0;
    }
  ).length;

  const handleSelectV = (v: Vehicle) => {
    sfxTap();
    setSelectedV(v);
    learnSkill(`vehicle:${v.id}`);
    tickTime(5);
    speak(t('vehicle.introSpeak', { nameZh: v.nameZh, nameEn: v.nameEn, sound: v.sound, usage: v.usage }), { lang: 'zh-CN' });
  };

  const startJobQuiz = () => {
    sfxTap();
    setFeedback('');
    const target = JOB_PAIRS[Math.floor(Math.random() * JOB_PAIRS.length)] ?? FALLBACK_JOB;
    const shuffled = shuffle(JOB_PAIRS).slice(0, 3);
    if (!shuffled.find(o => o.jobZh === target.jobZh)) {
      shuffled[0] = target;
    }
    setJobQuiz({ j: target, options: shuffled });

    speak(t('vehicle.quizSpeak', { job: target.jobZh }), { lang: 'zh-CN' });
  };

  const handleJobAnswer = (picked: JobPair) => {
    if (!jobQuiz) return;
    if (picked.jobZh === jobQuiz.j.jobZh) {
      sfxCorrect();
      setFeedback(t('vehicle.correctFeedback'));
      practice(`vehicle:job-${jobQuiz.j.jobZh}`, true, 2, 2);
      tickTime(5);
      speak(t('vehicle.correctSpeak', { job: jobQuiz.j.jobZh, tool: jobQuiz.j.toolZh }), { lang: 'zh-CN' });
    } else {
      sfxWrong();
      setFeedback(t('vehicle.wrongFeedback'));
      practice(`vehicle:job-${jobQuiz.j.jobZh}`, false, 0, 2);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={t('vehicle.title')}
        subtitle={t('vehicle.subtitle')}
        tone="amber"
      />

      <Tabs items={TABS} value={tab} onChange={setTab} tone="orange" layoutId="vehicle-tabs" />

      {/* 🚒 宝宝巴士级城市救援模拟器 */}
      {tab === 'rescue' && <CityRescueSim />}

      {/* 交通工具酷炫 Fleet */}
      {tab === 'fleet' && (
        <Panel className="border-2 border-amber-300 bg-amber-50 text-center space-y-4">
          <h3 className="text-lg font-black text-amber-900">{t('vehicle.fleetTitle')}</h3>
          <p className="text-sm font-bold text-amber-700">
            已认识 {vehicleLearnedCount}/{VEHICLES.length} 种交通工具
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {VEHICLES.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelectV(v)}
                className={`rounded-2xl border-2 px-3.5 py-2 text-sm font-black transition-transform active:scale-95 ${
                  selectedV.id === v.id ? 'bg-amber-500 text-white border-amber-600 scale-105 shadow-md' : 'bg-white text-amber-900 border-amber-200 hover:scale-102'
                }`}
              >
                {v.emoji} {t(VEHICLE_NAME_KEYS[v.id] ?? 'vehicle.fireEngineName', { defaultValue: v.nameZh })}
              </button>
            ))}
          </div>

          {/* 车队详情卡片 */}
          <div className={`mx-auto max-w-lg rounded-3xl border-2 p-5 text-left shadow-fluffy transition-all ${selectedV.color}`}>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm">
                {selectedV.emoji}
              </div>
              <div>
                <h4 className="text-xl font-black">{t(VEHICLE_NAME_KEYS[selectedV.id] ?? 'vehicle.fireEngineName')} <span className="text-sm font-extrabold opacity-80">({selectedV.nameEn})</span></h4>
                <p className="text-xs font-bold opacity-90">{t('vehicle.sound', { sound: selectedV.sound })}</p>
              </div>
            </div>
            <p className="text-xs font-bold leading-relaxed opacity-95">{t('vehicle.usage', { usage: selectedV.usage })}</p>
          </div>
        </Panel>
      )}

      {/* 职业角色对对碰 */}
      {tab === 'career' && (
        <Panel className="border-2 border-purple-300 bg-purple-50 text-center space-y-4">
          <h3 className="text-lg font-black text-purple-900">{t('vehicle.jobTitle')}</h3>

          {!jobQuiz ? (
            <CandyButton tone="purple" size="md" onClick={startJobQuiz}>
              {t('vehicle.startJobQuiz')}
            </CandyButton>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-4 text-base font-black text-purple-900 shadow-sm inline-block">
                {jobQuiz.j.jobEmoji} {t('vehicle.jobQuestion', { job: t(JOB_NAME_KEYS[jobQuiz.j.jobZh] ?? 'vehicle.firefighter'), en: jobQuiz.j.jobEn })}
              </div>

              <div className="flex justify-center flex-wrap gap-3">
                {jobQuiz.options.map(o => (
                  <button
                    key={o.jobZh}
                    type="button"
                    onClick={() => handleJobAnswer(o)}
                    className="rounded-2xl border-2 border-purple-200 bg-white px-5 py-3 text-base font-black text-purple-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                  >
                    {o.toolEmoji} {t(TOOL_NAME_KEYS[o.toolZh] ?? 'vehicle.toolFirefighter')}
                  </button>
                ))}
              </div>

              {feedback && (
                <div className="text-sm font-black text-purple-800">
                  {feedback}
                </div>
              )}

              <div>
                <CandyButton tone="orange" variant="soft" size="sm" onClick={startJobQuiz}>
                  {t('vehicle.nextLevel')}
                </CandyButton>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
