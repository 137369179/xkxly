// 批量接线 ExploreReward（最终修正版）。
// 策略：在「最后一个 import 行」后加 import；在主返回的根元素【最后一个闭合标签之前】
// 插入奖励按钮，使其成为根元素的最后一个子节点（绝不置于根元素之外）。
// 根闭合标签优先级：</div> > </Panel> > </>（仅当无 div/Panel 时回退到 fragment 根）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve('.');

const targets = [
  ['src/modules/hanzi/HanziEvolve.tsx', 'hanzi-evolve', 'hanzi', 'blue'],
  ['src/modules/hanzi/ComponentBreakdown.tsx', 'hanzi-component', 'hanzi', 'blue'],
  ['src/modules/hanzi/RadicalBrowser.tsx', 'hanzi-radical', 'hanzi', 'blue'],
  ['src/modules/hanzi/PhoneticFamilies.tsx', 'hanzi-phonetic', 'hanzi', 'blue'],
  ['src/modules/hanzi/HanziFamilyTree.tsx', 'hanzi-family', 'hanzi', 'blue'],
  ['src/modules/hanzi/HanziVideoCard.tsx', 'hanzi-video', 'hanzi', 'blue'],
  ['src/modules/hanzi/HanziWorksheet.tsx', 'hanzi-worksheet', 'hanzi', 'blue'],
  ['src/modules/hanzi/Hanzi500Page.tsx', 'hanzi-500', 'hanzi', 'blue'],
  ['src/modules/hanzi/HanziTrailMap.tsx', 'hanzi-trail', 'hanzi', 'blue'],
  ['src/modules/hanzi/HanziListen.tsx', 'hanzi-listen', 'hanzi', 'blue'],
  ['src/modules/hanzi/AssemblyAnimation.tsx', 'hanzi-assembly', 'hanzi', 'blue'],
  ['src/modules/hanzi/FormationExplainer.tsx', 'hanzi-formation', 'hanzi', 'blue'],
  ['src/modules/letters/LetterStudy.tsx', 'letter-study', 'letter', 'purple'],
  ['src/modules/letters/LetterWall.tsx', 'letter-wall', 'letter', 'purple'],
  ['src/modules/letters/FluffyLetterVisual.tsx', 'letter-visual', 'letter', 'purple'],
  ['src/modules/numbers/NumberTrace.tsx', 'number-trace', 'number', 'green'],
  ['src/modules/numbers/NumberWall.tsx', 'number-wall', 'number', 'green'],
  ['src/modules/numbers/MeasureCompare.tsx', 'number-measure', 'number', 'green'],
  ['src/modules/numbers/ClockTrainer.tsx', 'number-clock', 'number', 'green'],
  ['src/modules/numbers/VerticalMath.tsx', 'number-vertical', 'number', 'green'],
  ['src/modules/numbers/SpeedRankings.tsx', 'number-speed', 'number', 'green'],
];

const IMPORT_LINE = "import { ExploreReward } from '@/components/study/ExploreReward';";

let patched = 0;
let skipped = 0;

for (const [rel, key, scene, tone] of targets) {
  const full = resolve(ROOT, rel);
  if (!existsSync(full)) {
    console.log('MISSING:', rel);
    skipped++;
    continue;
  }
  let s = readFileSync(full, 'utf8');
  if (s.includes('@/components/study/ExploreReward')) {
    console.log('ALREADY:', rel);
    continue;
  }

  // ① 插入 import（在最后一个 import 行之后）
  const lines = s.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s.+\sfrom\s/.test(lines[i])) lastImport = i;
  }
  if (lastImport === -1) {
    console.log('NO-IMPORT:', rel);
    skipped++;
    continue;
  }
  lines.splice(lastImport + 1, 0, IMPORT_LINE);
  s = lines.join('\n');

  // ② 找到根元素的最后一个闭合标签（作为插入点之前的位置）
  let idx = s.lastIndexOf('</div>');
  if (idx === -1) idx = s.lastIndexOf('</Panel>');
  if (idx === -1) idx = s.lastIndexOf('</>');
  if (idx === -1) {
    console.log('NO-CLOSE-TAG:', rel);
    skipped++;
    continue;
  }

  // ③ 在该闭合标签【之前】插入奖励按钮，成为根元素最后一个子节点
  const reward = `\n      <ExploreReward rewardKey="${key}" scene="${scene}" tone="${tone}" />`;
  s = s.slice(0, idx) + reward + s.slice(idx);

  writeFileSync(full, s);
  patched++;
  console.log('PATCHED:', rel, `(${key})`);
}

console.log(`\n=== done: patched=${patched} skipped=${skipped} ===`);
