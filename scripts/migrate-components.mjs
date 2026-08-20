/**
 * P2-4 组件按域归类迁移脚本（一次性地执行）
 * ------------------------------------------------------------
 * 1. git mv 顶层 src/components/<Stem>.tsx 到子目录 src/components/<folder>/<Stem>.tsx
 * 2. 全局把 `@/components/<Stem>` 别名引用改写为 `@/components/<folder>/<Stem>`
 * 组件之间以别名互引为主；同组组件相对 `./X` 引用因同批移动仍有效。
 * 运行后由 tsc + 测试 + 构建验证。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { execSync } from 'node:child_process';

const SRC = join(process.cwd(), 'src', 'components');

/** filename(stem) → 目标子目录 */
const MAP = {
  // games：小游戏 / 益智 / 创意 / 3D
  AnimalCards: 'games', BalanceScale: 'games', BossBattle: 'games', CodeBotPro: 'games',
  CodeMaze: 'games', ColorExplore: 'games', ConnectMaze: 'games', CreativeExpress: 'games',
  CyberMasterCat3D: 'games', DualPK: 'games', EmotionCards: 'games', FlatCat2D: 'games',
  JobExplore: 'games', KaraokeReader: 'games', LetterLearn: 'games', ListenTrainer: 'games',
  MapView: 'games', MemoryMatch: 'games', MiniSudoku: 'games', MirrorDraw: 'games',
  PairMatch: 'games', PositionLearn: 'games', RadicalsMagic: 'games', RhythmRepeat: 'games',
  RiddleGame: 'games', SequenceLogic: 'games', ShadowMatch: 'games', SlidingPuzzle: 'games',
  SortClassify: 'games', SpotDifference: 'games', StoryCanvas: 'games', StorySort: 'games',
  StoryUnlock: 'games', SudokuEasy: 'games', SymmetryLearn: 'games', Tangram: 'games',
  TimeSequence: 'games', VehicleExplore: 'games', VirtualHanziGrid: 'games', WeatherSeasons: 'games',

  // quiz：答题 / 闪卡 / 回合调度
  // 注：QuizCard 保留在根（其子组件已位于 quiz/，自身有 2 个测试文件，移动会破坏 ./quiz 相对引用）
  QuizSessionRunner: 'quiz', RoundRunner: 'quiz',

  // quiz/daily：每日目标与挑战
  DailyChallenge: 'quiz', DailyGoal: 'quiz', GrowthTree: 'quiz',

  // feedback：鼓励 / 贴纸 / 徽章 / 声音反馈
  BadgeUnlock: 'feedback', ComboIndicator: 'feedback', StickerScene: 'feedback',
  StruggleModal: 'feedback', VoiceScoreModal: 'feedback', SpeechEvalButton: 'feedback',
  SoundMuteToggle: 'feedback', FollowRead: 'feedback', FriendlyLoading: 'feedback',

  // study：学习路径 / 报告 / 训练计划 / 守护
  LearningPath: 'study', ParentAdvicePanel: 'study', ReportExporter: 'study',
  PdfExport: 'study', WorksheetGenerator: 'study', TrainingBanner: 'study',
  ChainDashboard: 'study', StudyCalendar: 'study', StudyReminder: 'study',
  StudyGuard: 'study', WeekCompare: 'study', Leaderboard: 'study',
  AdaptiveDifficultyHint: 'study',
};

const moved = new Map(); // id -> { folder }

for (const [stem, folder] of Object.entries(MAP)) {
  const srcTsx = join(SRC, `${stem}.tsx`);
  const srcTs = join(SRC, `${stem}.ts`);
  const src = existsSync(srcTsx) ? srcTsx : existsSync(srcTs) ? srcTs : null;
  if (!src) {
    console.warn(`[skip] ${stem} 未找到`); continue;
  }
  // 已迁入子目录则跳过
  const relFromSrc = src.replace(SRC + sep, '').replace(/\\/g, '/');
  if (relFromSrc.includes('/')) {
    console.warn(`[skip] ${stem} 已在子目录 ${relFromSrc}`); continue;
  }
  moved.set(stem, { folder, src, ext: src.slice(-5) });
}

// ── 1. git mv ──
for (const [stem, { src, folder, ext }] of moved) {
  mkdirSync(join(SRC, folder), { recursive: true });
  const target = join(SRC, folder, `${stem}${ext}`);
  execSync(`git mv "${src}" "${target}"`, { cwd: process.cwd(), stdio: 'pipe' });
}

// 收集所有 src 下源文件
const allFiles = [];
function collect(dir) {
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    if (name.endsWith('.tsx') || name.endsWith('.ts')) allFiles.push(fp);
    else if (statSync(fp).isDirectory()) collect(fp);
  }
}
collect(join(process.cwd(), 'src'));

// ── 2. 改写别名引用 @/components/<Stem> ──
let changedFiles = 0;
for (const fp of allFiles) {
  let text = readFileSync(fp, 'utf8');
  let changed = false;
  for (const [stem, { folder }] of moved) {
    const re = new RegExp(`@/components/${stem}(?!([\\w]|/))`, 'g');
    if (re.test(text)) {
      text = text.replace(re, `@/components/${folder}/${stem}`);
      changed = true;
    }
  }
  if (changed) { writeFileSync(fp, text); changedFiles++; }
}

console.log(`迁移 ${moved.size} 个组件，改写 ${changedFiles} 个文件引用。`);
for (const [stem, { folder }] of moved) {
  console.log(`  ${stem} -> ${folder}/`);
}