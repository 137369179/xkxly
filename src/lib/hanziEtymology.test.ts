import { describe, it, expect } from 'vitest';
import {
  LIUSHU_META,
  LIUSHU_ORDER,
  getEtymology,
  liushuOf,
  getComponents,
  hasDecomposition,
  getDerived,
  getByLiushu,
  countByLiushu,
  componentUsers,
  allComponents,
  getPrereqs,
  isReady,
  missingPrereqs,
  unlockValue,
  recommendByPrereq,
  explainRecommendation,
  buildFamilyGraph,
  listFamilies,
  liushuPeers,
  componentDistractors,
  explainFormation,
  formationTagline,
  semanticHint,
  type MasteryMap,
} from './hanziEtymology';
import { HANZI_ETYMOLOGY_LIST } from '@/data/hanziEtymology';
import { HANZI_DATA } from '@/data/hanzi';
import { nextHanzi } from '@/data/hanziIndex';

const POOL = new Set(HANZI_DATA.map((h) => h.c));
const learned = (chars: string[]): MasteryMap =>
  Object.fromEntries(chars.map((c) => [`hanzi:${c}`, { lv: 2 }]));

describe('字理数据完整性', () => {
  it('与字库一一对应，无重复', () => {
    expect(HANZI_ETYMOLOGY_LIST.length).toBe(HANZI_DATA.length);
    const chars = HANZI_ETYMOLOGY_LIST.map((e) => e.c);
    expect(new Set(chars).size).toBe(chars.length);
    for (const h of HANZI_DATA) expect(getEtymology(h.c)).toBeDefined();
  });

  it('六书分类计数之和等于字库总数', () => {
    const stat = countByLiushu();
    const sum = LIUSHU_ORDER.reduce((s, l) => s + stat[l], 0);
    expect(sum).toBe(HANZI_DATA.length);
    // 形声字应是最大的一类（现代汉字实况，也是数据合理性的粗校验）
    expect(stat.pictophonetic).toBeGreaterThan(50);
  });

  it('每种六书都有元数据与例字', () => {
    for (const l of LIUSHU_ORDER) {
      expect(LIUSHU_META[l].label).toBeTruthy();
      expect(LIUSHU_META[l].badge).toBeTruthy();
      expect(LIUSHU_META[l].kidHint).toBeTruthy();
      expect(LIUSHU_META[l].examples.length).toBeGreaterThan(0);
    }
  });
});

/**
 * 这一组是**教学正确性护栏**：数据由脚本生成，将来重新生成时
 * 一旦破坏下列任一不变量，就意味着会教错孩子，必须让测试红。
 */
describe('教学正确性不变量', () => {
  it('象形字不给部件拆分（象形是整体一幅画，拆笔画会教错）', () => {
    for (const e of HANZI_ETYMOLOGY_LIST) {
      if (e.liushu === 'pictographic') expect(e.components).toEqual([]);
    }
  });

  it('拆解要么不展示，要么至少 2 个部件（等式不能只有一半）', () => {
    for (const e of HANZI_ETYMOLOGY_LIST) {
      expect(e.components.length === 0 || e.components.length >= 2).toBe(true);
    }
  });

  it('部件不含 IDS 描述符与孩子读不出的构形碎片', () => {
    const IDS = /[\u2ff0-\u2fff]/;
    // 生成期已过白名单，这里再兜一层黑名单，防白名单被误扩
    const FRAGMENTS = new Set(['⺊', '龶', '丿', '丶', '乚', '𠂇', '⺍', '⺌', '⺼', '？']);
    for (const e of HANZI_ETYMOLOGY_LIST) {
      for (const comp of e.components) {
        expect(IDS.test(comp)).toBe(false);
        expect(FRAGMENTS.has(comp)).toBe(false);
        expect(comp.length).toBe(1);
      }
    }
  });

  it('形旁必须出现在展示的拆解里（否则孩子看不到指的是哪一块）', () => {
    for (const e of HANZI_ETYMOLOGY_LIST) {
      if (!e.semantic || !e.components.length) continue;
      expect(e.components).toContain(e.semantic);
    }
  });

  it('声旁必须在拆解里，且必须带读音关系（不表音就不许出现）', () => {
    for (const e of HANZI_ETYMOLOGY_LIST) {
      if (!e.phonetic) {
        // 没有声旁时不允许留下孤立的读音字段
        expect(e.soundRel).toBeUndefined();
        expect(e.phoneticPinyin).toBeUndefined();
        continue;
      }
      expect(e.components).toContain(e.phonetic);
      expect(e.soundRel).toBeTruthy();
      expect(e.phoneticPinyin).toBeTruthy();
      expect(['exact', 'rhyme', 'initial']).toContain(e.soundRel);
      // 只有形声字才谈声旁
      expect(e.liushu).toBe('pictophonetic');
    }
  });

  it('声旁已不表音的字（时/江/树）确实没有 phonetic 字段', () => {
    for (const c of ['时', '江', '树', '地', '池', '银']) {
      const e = getEtymology(c);
      expect(e).toBeDefined();
      expect(e?.phonetic).toBeUndefined();
      // 但形旁仍在，仍可教"表义"
      expect(e?.semantic).toBeTruthy();
    }
  });

  it('派生字必在字库内，且其拆解确实包含该根', () => {
    for (const e of HANZI_ETYMOLOGY_LIST) {
      for (const d of e.derived ?? []) {
        expect(POOL.has(d)).toBe(true);
        expect(getComponents(d)).toContain(e.c);
        expect(d).not.toBe(e.c);
      }
    }
  });

  it('重复部件保留（林=木+木 是教学核心，不可去重）', () => {
    expect(getComponents('林')).toEqual(['木', '木']);
  });

  it('典型形声字拆解与声旁正确', () => {
    const qing = getEtymology('清')!;
    expect(qing.components).toEqual(['氵', '青']);
    expect(qing.semantic).toBe('氵');
    expect(qing.phonetic).toBe('青');
    expect(qing.soundRel).toBe('exact');

    const cao = getEtymology('草')!;
    expect(cao.phonetic).toBe('早');
    expect(cao.soundRel).toBe('rhyme');   // cǎo / zǎo 同韵母
  });
});

describe('基础查询', () => {
  it('liushuOf / getComponents / hasDecomposition', () => {
    expect(liushuOf('清')).toBe('pictophonetic');
    expect(liushuOf('日')).toBe('pictographic');
    expect(liushuOf('不存在的字')).toBeUndefined();
    expect(getComponents('未收录')).toEqual([]);
    expect(hasDecomposition('清')).toBe(true);
    expect(hasDecomposition('日')).toBe(false);
  });

  it('getByLiushu 保持教学顺序', () => {
    const list = getByLiushu('pictophonetic');
    expect(list.length).toBeGreaterThan(0);
    const order = new Map(HANZI_DATA.map((h, i) => [h.c, i]));
    for (let i = 1; i < list.length; i++) {
      expect(order.get(list[i - 1]!.c)!).toBeLessThan(order.get(list[i]!.c)!);
    }
  });

  it('componentUsers 与 allComponents 一致', () => {
    const all = allComponents();
    expect(all.length).toBeGreaterThan(20);
    for (const { comp, count } of all.slice(0, 10)) {
      expect(componentUsers(comp).length).toBe(count);
    }
    // 频次降序
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1]!.count).toBeGreaterThanOrEqual(all[i]!.count);
    }
  });

  it('氵 是高频形旁，带出一批水相关的字', () => {
    const users = componentUsers('氵');
    expect(users.length).toBeGreaterThanOrEqual(5);
    expect(users).toContain('清');
  });
});

describe('依赖图', () => {
  it('先修部件只取字库内的字', () => {
    expect(getPrereqs('清')).toEqual(['青']);          // 氵 不是独立汉字
    expect(getPrereqs('明').sort()).toEqual(['日', '月']);
    expect(getPrereqs('日')).toEqual([]);              // 象形字无先修
    expect(getPrereqs('林')).toEqual(['木']);          // 重复部件去重
  });

  it('isReady / missingPrereqs 随掌握度变化', () => {
    expect(isReady('明', {})).toBe(false);
    expect(missingPrereqs('明', {}).sort()).toEqual(['日', '月']);
    expect(isReady('明', learned(['日']))).toBe(false);
    expect(isReady('明', learned(['日', '月']))).toBe(true);
    expect(missingPrereqs('明', learned(['日', '月']))).toEqual([]);
    // 无先修的字恒就绪
    expect(isReady('日', {})).toBe(true);
  });

  it('unlockValue 统计能解锁的未学派生字', () => {
    const derived = getDerived('日');
    expect(derived.length).toBeGreaterThan(0);
    expect(unlockValue('日', {})).toBe(derived.length);
    // 已学过的派生字不再计入
    expect(unlockValue('日', learned([derived[0]!]))).toBe(derived.length - 1);
  });
});

describe('依赖图推荐', () => {
  it('空掌握度时给出教学顺序前沿内的字', () => {
    const rec = recommendByPrereq({});
    expect(rec).toBeTruthy();
    const idx = HANZI_DATA.findIndex((h) => h.c === rec);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(12);          // 必在课程前沿窗口内，不会跳到生僻字
  });

  it('全部学完返回 null，且 nextHanzi 同步返回 null', () => {
    const all = learned(HANZI_DATA.map((h) => h.c));
    expect(recommendByPrereq(all)).toBeNull();
    expect(nextHanzi(all)).toBeNull();
  });

  it('推荐结果始终未学过', () => {
    let mastery: MasteryMap = {};
    for (let i = 0; i < 30; i++) {
      const rec = recommendByPrereq(mastery);
      expect(rec).toBeTruthy();
      expect(mastery[`hanzi:${rec}`]).toBeUndefined();
      mastery = { ...mastery, [`hanzi:${rec}`]: { lv: 2 } };
    }
  });

  it('前沿存在就绪字时，推荐的一定是就绪字（部件已学）', () => {
    // 模拟学了一批高频独体字后的状态
    const mastery = learned(['一', '二', '三', '人', '大', '小', '日', '月', '木', '口']);
    const rec = recommendByPrereq(mastery);
    expect(rec).toBeTruthy();
    expect(isReady(rec!, mastery)).toBe(true);
  });

  it('就绪字之间偏好枢纽字（能带出更多新字）', () => {
    const mastery: MasteryMap = {};
    const rec = recommendByPrereq(mastery)!;
    const frontier = HANZI_DATA.filter((h) => !mastery[`hanzi:${h.c}`]).slice(0, 12);
    const ready = frontier.filter((h) => isReady(h.c, mastery));
    const maxScore = Math.max(...ready.map((h) => unlockValue(h.c, mastery)));
    expect(unlockValue(rec, mastery)).toBe(maxScore);
  });

  it('limit 到单个 level 时只推该阶段的字', () => {
    const rec = recommendByPrereq({}, { level: 3 });
    expect(rec).toBeTruthy();
    expect(HANZI_DATA.find((h) => h.c === rec)?.level).toBe(3);
  });

  it('nextHanzi 返回的是字库条目且未掌握', () => {
    const mastery = learned(['一', '二', '三']);
    const h = nextHanzi(mastery);
    expect(h).toBeTruthy();
    expect(POOL.has(h!.c)).toBe(true);
    expect(mastery[`hanzi:${h!.c}`]).toBeUndefined();
  });

  it('explainRecommendation 给出可读理由', () => {
    const m = learned(['日', '月']);
    expect(explainRecommendation('明', m)).toContain('明');
    expect(explainRecommendation('明', m)).toMatch(/学过|带出|该学/);
  });
});

describe('字族', () => {
  it('声旁族：青 带出 清/情/晴，角色为声旁', () => {
    const fam = buildFamilyGraph('青');
    expect(fam).toBeTruthy();
    const chars = fam!.members.map((m) => m.c);
    expect(chars).toContain('清');
    expect(chars.length).toBeGreaterThanOrEqual(2);
    const qing = fam!.members.find((m) => m.c === '清')!;
    expect(qing.role).toBe('phonetic');
    expect(qing.pd).toBeTruthy();
    expect(qing.word).toBeTruthy();
    expect(fam!.rootPd).toBeTruthy();     // 青 在字库内，有拼音
  });

  it('形旁族：氵 带出一批水字，角色为形旁', () => {
    const fam = buildFamilyGraph('氵');
    expect(fam).toBeTruthy();
    expect(fam!.rootPd).toBe('');         // 氵 不是独立汉字，无拼音
    expect(fam!.members.every((m) => m.role === 'semantic' || m.role === 'component')).toBe(true);
    expect(fam!.members.length).toBeGreaterThanOrEqual(5);
  });

  it('不存在的根返回 null；max 参数生效', () => {
    expect(buildFamilyGraph('🍎')).toBeNull();
    expect(buildFamilyGraph('氵', { max: 3 })!.members.length).toBe(3);
  });

  it('listFamilies 按规模降序且都达标', () => {
    const fams = listFamilies(3);
    expect(fams.length).toBeGreaterThan(0);
    for (const f of fams) expect(f.size).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < fams.length; i++) {
      expect(fams[i - 1]!.size).toBeGreaterThanOrEqual(fams[i]!.size);
    }
  });

  it('liushuPeers 同类且排除自身', () => {
    const peers = liushuPeers('清', 5);
    expect(peers.length).toBeLessThanOrEqual(5);
    expect(peers).not.toContain('清');
    for (const p of peers) expect(liushuOf(p)).toBe('pictophonetic');
  });

  it('componentDistractors 不含目标字自身部件', () => {
    const own = new Set(getComponents('清'));
    const ds = componentDistractors('清', 3);
    expect(ds.length).toBe(3);
    expect(new Set(ds).size).toBe(3);
    for (const d of ds) expect(own.has(d)).toBe(false);
  });
});

describe('讲解措辞纪律', () => {
  it('形声字讲解含形旁义类与声旁读音', () => {
    const s = explainFormation('清');
    expect(s).toContain('氵');
    expect(s).toContain('和水有关');
    expect(s).toContain('青');
    expect(s).toMatch(/qīng/);
  });

  it('声旁已不表音的字，讲解绝不提读音（防教错）', () => {
    for (const c of ['时', '江', '树', '地']) {
      const s = explainFormation(c);
      expect(s).toBeTruthy();
      expect(s).not.toContain('提示读音');
      expect(s).not.toContain('读音一样');
      expect(s).not.toContain('韵母一样');
    }
  });

  it('会意字讲"合起来"，象形字讲"画出来"', () => {
    expect(explainFormation('林')).toContain('合起来');
    expect(explainFormation('日')).toContain('画出来');
  });

  it('存疑字（简化字）不做六书断言', () => {
    const uncertain = HANZI_ETYMOLOGY_LIST.filter((e) => e.uncertain);
    expect(uncertain.length).toBeGreaterThan(0);
    for (const e of uncertain) {
      const s = explainFormation(e.c);
      expect(s).toContain('特别的字');
      expect(s).not.toContain('象形字');
      expect(s).not.toContain('形声字');
      expect(formationTagline(e.c)).toBe('特别的字');
    }
  });

  it('未收录字返回空串，不抛异常', () => {
    expect(explainFormation('🍎')).toBe('');
    expect(formationTagline('🍎')).toBe('');
    expect(semanticHint('🍎')).toBe('');
  });

  it('全字库讲解句都非空且不含占位符', () => {
    for (const e of HANZI_ETYMOLOGY_LIST) {
      const s = explainFormation(e.c);
      expect(s.length).toBeGreaterThan(4);
      expect(s).not.toContain('undefined');
      expect(s).not.toContain('null');
      expect(s).not.toMatch(/\s{2,}/);
    }
  });

  it('形旁义类提示覆盖数据里出现的全部形旁', () => {
    const missing = new Set<string>();
    for (const e of HANZI_ETYMOLOGY_LIST) {
      if (e.semantic && !semanticHint(e.semantic)) missing.add(e.semantic);
    }
    // 允许少量罕见形旁没有义类提示（讲解句会自动省略该从句），但不应成片缺失
    expect(missing.size).toBeLessThanOrEqual(12);
  });
});
