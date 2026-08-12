/**
 * 古诗飞花令 🌸 (Q3)
 * 给一个字，轮流说含该字的诗句 — 古诗深度加强
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

// 从常见诗中选取含目标字的诗句
const CHARS = ['春','月','花','风','雨','雪','云','山','水','夜','日','天','秋','人','心'];

// 预置诗句库（按关键字索引）
const POEM_DB: Record<string, { poet: string; text: string; title: string }[]> = {
  '春': [
    { poet:'孟浩然', text:'春眠不觉晓', title:'春晓' },
    { poet:'杜甫', text:'好雨知时节，当春乃发生', title:'春夜喜雨' },
    { poet:'王维', text:'人闲桂花落，夜静春山空', title:'鸟鸣涧' },
    { poet:'白居易', text:'野火烧不尽，春风吹又生', title:'赋得古原草送别' },
  ],
  '月': [
    { poet:'李白', text:'床前明月光', title:'静夜思' },
    { poet:'苏轼', text:'明月几时有', title:'水调歌头' },
    { poet:'张继', text:'月落乌啼霜满天', title:'枫桥夜泊' },
    { poet:'白居易', text:'露似真珠月似弓', title:'暮江吟' },
  ],
  '花': [
    { poet:'孟浩然', text:'花落知多少', title:'春晓' },
    { poet:'杜甫', text:'感时花溅泪', title:'春望' },
    { poet:'王维', text:'人闲桂花落', title:'鸟鸣涧' },
    { poet:'崔护', text:'人面桃花相映红', title:'题都城南庄' },
  ],
  '风': [
    { poet:'李峤', text:'风', title:'风' },
    { poet:'白居易', text:'春风吹又生', title:'赋得古原草送别' },
    { poet:'王之涣', text:'春风不度玉门关', title:'凉州词' },
    { poet:'李商隐', text:'昨夜星辰昨夜风', title:'无题' },
  ],
  '雨': [
    { poet:'杜甫', text:'好雨知时节', title:'春夜喜雨' },
    { poet:'杜牧', text:'清明时节雨纷纷', title:'清明' },
    { poet:'王维', text:'空山新雨后', title:'山居秋暝' },
    { poet:'苏轼', text:'山色空蒙雨亦奇', title:'饮湖上初晴后雨' },
  ],
  '雪': [
    { poet:'柳宗元', text:'独钓寒江雪', title:'江雪' },
    { poet:'白居易', text:'晚来天欲雪', title:'问刘十九' },
    { poet:'岑参', text:'忽如一夜春风来，千树万树梨花开', title:'白雪歌' },
  ],
  '山': [
    { poet:'王之涣', text:'白日依山尽', title:'登鹳雀楼' },
    { poet:'王维', text:'空山不见人', title:'鹿柴' },
    { poet:'杜甫', text:'会当凌绝顶，一览众山小', title:'望岳' },
    { poet:'苏轼', text:'不识庐山真面目', title:'题西林壁' },
  ],
  '水': [
    { poet:'李白', text:'疑是银河落九天', title:'望庐山瀑布' },
    { poet:'王维', text:'清泉石上流', title:'山居秋暝' },
    { poet:'苏轼', text:'水光潋滟晴方好', title:'饮湖上初晴后雨' },
    { poet:'白居易', text:'半江瑟瑟半江红', title:'暮江吟' },
  ],
  '夜': [
    { poet:'李白', text:'床前明月光，疑是地上霜', title:'静夜思' },
    { poet:'张继', text:'夜半钟声到客船', title:'枫桥夜泊' },
    { poet:'杜甫', text:'随风潜入夜', title:'春夜喜雨' },
    { poet:'王维', text:'夜静春山空', title:'鸟鸣涧' },
  ],
  '秋': [
    { poet:'杜牧', text:'停车坐爱枫林晚', title:'山行' },
    { poet:'张继', text:'月落乌啼霜满天', title:'枫桥夜泊' },
    { poet:'王维', text:'空山新雨后，天气晚来秋', title:'山居秋暝' },
    { poet:'刘禹锡', text:'自古逢秋悲寂寥', title:'秋词' },
  ],
  '天': [
    { poet:'王之涣', text:'白日依山尽', title:'登鹳雀楼' },
    { poet:'李白', text:'疑是银河落九天', title:'望庐山瀑布' },
    { poet:'苏轼', text:'明月几时有，把酒问青天', title:'水调歌头' },
    { poet:'龚自珍', text:'不拘一格降人材', title:'己亥杂诗' },
  ],
};

export function FlyingFlowers() {
  const { t } = useTranslation();
  const [char, setChar] = useState('春');
  const [used, setUsed] = useState<typeof POEM_DB[string]>([]);
  const [, setShowAll] = useState(true);
  const [score, setScore] = useState(0);
  const [nextIdx, setNextIdx] = useState(0);
  const pool = useMemo(() => POEM_DB[char] || [], [char]);

  const pickChar = (c: string) => {
    sfxTap();
    setChar(c);
    setUsed([]);
    setNextIdx(0);
    setShowAll(true);
    void speak(`飞花令：${c}`, { lang:'zh-CN', rate:0.8, module:'ai' });
  };

  const revealNext = () => {
    if (nextIdx >= pool.length) {
      void speak('已全部展示！', { lang:'zh-CN', rate:0.8, module:'ai' });
      return;
    }
    const next = pool[nextIdx]!!
    setUsed(prev => [...prev, next]);
    setNextIdx(i => i + 1);
    setScore(s => s + 1);
    sfxCorrect();
    void speak(next.text, { lang:'zh-CN', rate:0.8, module:'ai' });
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🌸 {t('poem.flyingTitle')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('poem.flyingSubtitle')}</p>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {CHARS.map(c => (
          <button key={c} onClick={()=>pickChar(c)}
            className={cn('rounded-xl px-3 py-2 text-lg font-extrabold shadow-sm transition-all hover:scale-105',
              char===c ? 'bg-candy-pink-deep text-white' : 'bg-white text-ink-soft'
            )}>
            {c}
          </button>
        ))}
      </div>

      <div className="mb-4 text-center">
        <span className="inline-block rounded-full bg-candy-pink-soft px-6 py-2 text-lg font-extrabold text-candy-pink-deep">
          🌸 {t('poem.flyingLabel', { char })}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <AnimatePresence>
          {used.map((p, i) => (
            <motion.div key={`${p.text}-${i}`} initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}}
              className="rounded-xl bg-candy-pink-soft/30 p-3">
              <p className="text-lg font-bold text-ink">「{p.text}」</p>
              <p className="text-xs text-ink-soft">— {p.poet}《{p.title}》</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {used.length === 0 && (
          <p className="text-center text-sm text-ink-muted">{t('poem.flyingEmpty', { char })}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-ink-soft">{t('poem.flyingProgress', { current: nextIdx, total: pool.length, score })}</span>
        <CandyButton tone="pink" size="sm" onClick={revealNext} disabled={nextIdx >= pool.length}>
          {nextIdx >= pool.length ? t('poem.flyingAll') : t('poem.flyingNext')}
        </CandyButton>
      </div>
    </div>
  );
}
