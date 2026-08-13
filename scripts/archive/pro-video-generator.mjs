#!/usr/bin/env node
/**
 * 专业汉字教学视频生成器 v2.0
 * 
 * 设计理念：
 * 1. 基于六书分类理论
 * 2. 利用现有汉字数据（origin、evolve、words、sentence）
 * 3. 符合儿童认知发展规律
 * 4. 五维教学法：字源→故事→儿歌→组词→造句
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });

// ========== 六书分类规则 ==========
const LIUSHU_RULES = {
  // 象形字 - 画出来的字
  pictograph: [
    '日', '月', '山', '水', '火', '木', '人', '口', '手', '目', '心', '耳',
    '鱼', '鸟', '马', '羊', '牛', '雨', '雪', '花', '虫', '龙', '龟',
    '兔', '虎', '犬', '(cat猫)', '立', '大', '子', '女', '刀', '田', '天'
  ],
  
  // 指事字 - 用符号指示
  ideograph: [
    '一', '二', '三', '上', '下', '中', '七', '八', '六', '十',
    '本', '末', '朱', '甘', '氏', '寸', '丈', '凡', '亦', '亠'
  ],
  
  // 会意字 - 组合表意
  ideogrammic: [
    '明', '休', '林', '森', '从', '众', '男', '女', '好', '友', '朋',
    '春', '秋', '冬', '夏', '东', '西', '南', '北', '中', '间',
    '家', '安', '定', '宁', '室', '舍', '屋', '庙', '堂', '室',
    '看', '拜', '取', '收', '放', '关', '闻', '问', '哭', '笑',
    '采', '掰', '掰', '炎', '淼', '焱', '鑫', '磊', '品', '昌'
  ],
  
  // 形声字 - 形旁+声旁
  phonosemantic: [
    '妈', '爸', '河', '海', '江', '湖', '清', '晴', '请', '情',
    '读', '写', '语', '说', '话', '谈', '论', '认', '识', '知',
    '妈', '妹', '姐', '奶', '姨', '姑', '娘', '婆', '妇', '娃',
    '树', '枝', '林', '森', '桃', '李', '梅', '柳', '松', '柏'
  ]
};

// ========== 根据汉字自动判断六书类型 ==========
function getLiushuType(char) {
  for (const [type, chars] of Object.entries(LIUSHU_RULES)) {
    if (chars.includes(char)) return type;
  }
  
  // 根据部首推断
  const radicalMap = {
    '氵': 'phonosemantic', '亻': 'phonosemantic', '女': 'phonosemantic',
    '日': 'pictograph', '月': 'pictograph', '木': 'pictograph',
    '火': 'pictograph', '水': 'pictograph', '山': 'pictograph',
    '艹': 'phonosemantic', '纟': 'phonosemantic', '言': 'phonosemantic',
    '心': 'pictograph', '手': 'pictograph', '目': 'pictograph',
    '口': 'pictograph', '耳': 'pictograph', '辶': 'phonosemantic',
    '宀': 'phonosemantic', '冖': 'phonosemantic', '穴': 'phonosemantic',
    '广': 'phonosemantic', '疒': 'phonosemantic'
  };
  
  // 简单判断逻辑
  if (['一', '二', '三', '上', '下', '中', '不', '与', '之', '也'].includes(char)) {
    return 'ideograph';
  }
  if (['明', '休', '林', '森', '从', '众', '男', '好', '友', '朋', '春', '秋', '冬'].includes(char)) {
    return 'ideogrammic';
  }
  if (['妈', '爸', '河', '海', '请', '情', '晴', '清', '花', '草', '树', '马', '妈'].includes(char)) {
    return 'phonosemantic';
  }
  
  return 'other';
}

// ========== 六书类型名称映射 ==========
const LIUSHU_NAMES = {
  'pictograph': '象形字',
  'ideograph': '指事字',
  'ideogrammic': '会意字',
  'phonosemantic': '形声字',
  'other': '汉字'
};

// ========== 基于数据生成专业脚本 ==========
function buildProfessionalScript(hanzi) {
  const { c, pd, tone, radical, strokes, origin, evolve, words, sentence, level } = hanzi;
  const liushuType = getLiushuType(c);
  const liushuName = LIUSHU_NAMES[liushuType];
  const toneNames = ['', '一声', '二声', '三声', '四声'];
  const toneName = toneNames[tone];
  
  // 开场白
  let script = `小朋友们好！欢迎来到《宝贝学习乐园》！\n`;
  script += `今天我们学习一个新的汉字——「${c}」。\n\n`;
  
  // 读音和基本认识
  script += `这个字读作「${pd}」，是${toneName}。\n`;
  script += `它的部首是「${radical}」，一共有${strokes}画。\n\n`;
  
  // 六书分类讲解（核心部分）
  script += `你知道吗？汉字有四种造字方法。\n`;
  script += `「${c}」是个${liushuName}。\n\n`;
  
  // 字源故事（基于数据中的origin字段）
  script += `关于这个字，有一个有趣的故事：\n`;
  script += `${origin}\n\n`;
  
  // 字形演变（基于数据中的evolve字段）
  script += `从古到今，这个字的形状发生了变化：\n`;
  script += `${evolve}\n\n`;
  
  // 儿歌口诀（根据六书类型生成不同风格的儿歌）
  script += buildNurseryRhyme(c, liushuType, origin);
  script += `\n\n`;
  
  // 组词练习（使用数据中的words字段）
  const wordList = words.slice(0, 4).join('、');
  script += `这个字可以组成这些词语：${wordList}。\n`;
  script += `请跟我读：${words.slice(0, 3).join('，')}，${words.slice(0, 3).join('，')}。\n\n`;
  
  // 造句应用
  script += `我们用它造个句子吧：「${sentence}」\n\n`;
  
  // 复习巩固
  script += `让我们一起复习一下「${c}」字。\n`;
  script += `它是${liushuName}，${origin.substring(0, 15)}...\n`;
  script += `跟读：${pd}，${pd}，${c} ${c} ${c}。\n\n`;
  
  // 结尾鼓励
  script += `太棒了！你已经学会了「${c}」这个字！\n`;
  script += `给自己鼓鼓掌吧！\n`;
  
  return script;
}

// ========== 根据不同类型生成儿歌 ==========
function buildNurseryRhyme(char, type, origin) {
  const rhymes = {
    // 象形字儿歌 - 强调形象特征
    pictograph: [
      `${char}${char}真像画，古人照着实物描。`,
      `一看就知道意思，形象生动记得牢。`,
      `日月山水火木金，自然万物都是它。`,
      `学会象形好办法，汉字不难记心里。`
    ],
    
    // 指事字儿歌 - 强调符号指示
    ideograph: [
      `${char}${char}不简单，符号指示含义深。`,
      `一点一横有讲究，位置关系要分清。`,
      `上下左右东西南北，方位词儿记心间。`,
      `指事字儿有特点，一看就懂容易记。`
    ],
    
    // 会意字儿歌 - 强调组合意义
    ideogrammic: [
      `${char}${char}有意思，几个部件合一起。`,
      `你我有情感相依，日月同辉亮晶晶。`,
      `人靠树旁就是休，三口之家就是品。`,
      `会意字儿真奇妙，组合起来有深意。`
    ],
    
    // 形声字儿歌 - 强调形声规律
    phonosemantic: [
      `${char}${char}分左右，左边表意右边音。`,
      `形旁帮助理解义，声旁提示读音准。`,
      `妈妈妈妈女字旁，爸爸爸爸父字头。`,
      `形声字儿占多数，学会规律不发愁。`
    ],
    
    // 其他字
    other: [
      `${char}${char}了不起，中华文化传承远。`,
      `一笔一画有来历，一字一首小故事。`,
      `认真学习爱汉字，做个聪明好少年。`
    ]
  };
  
  return rhymes[type]?.join('\n') || rhymes.other.join('\n');
}

// ========== 生成语音文件 ==========
function generateSpeech(text, outputFile) {
  try {
    if (process.platform === 'darwin') {
      // 清理文本，确保say命令正常工作
      const safeText = text
        .replace(/"/g, "'")
        .replace(/\n/g, ' ')
        .substring(0, 500); // 限制长度避免超时
      
      execSync(`say -v "Mei-Jia" -r 125 -o "${outputFile}.aiff" "${safeText}"`, { 
        stdio: 'pipe',
        timeout: 60000 
      });
      
      // 转换为mp3
      execSync(`/usr/local/bin/ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { 
        stdio: 'pipe' 
      });
      
      // 清理临时文件
      try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
      
      return `${outputFile}.mp3`;
    }
  } catch (e) {
    console.log(`  TTS失败: ${e.message.substring(0, 50)}`);
  }
  return null;
}

// ========== 生成教学视频 ==========
async function generateVideo(hanzi) {
  const char = hanzi.c;
  const imageUrl = resolve(IMAGE_DIR, `${char}.png`);
  const videoPath = resolve(OUTPUT_DIR, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}`);
  
  // 检查图片是否存在
  if (!existsSync(imageUrl)) {
    console.log(`  ✗ ${char}: 图片不存在`);
    return false;
  }
  
  // 如果视频已存在，跳过
  if (existsSync(videoPath)) {
    console.log(`  ⏭ ${char}: 已存在，跳过`);
    return true;
  }
  
  try {
    // 生成专业脚本
    const voiceText = buildProfessionalScript(hanzi);
    
    // 生成语音
    const audioFile = generateSpeech(voiceText, voicePath);
    if (!audioFile) {
      console.log(`  ✗ ${char}: 语音生成失败`);
      return false;
    }
    
    // 生成视频（固定50秒，Ken Burns效果）
    const duration = 50;
    const filterComplex = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1280x720:fps=25,fade=t=in:st=0:d=3,fade=t=out:st=${duration-3}:d=3[v]`;
    
    execSync(`/usr/local/bin/ffmpeg -y -loop 1 -i "${imageUrl}" -i "${audioFile}" -filter_complex "${filterComplex}" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -shortest "${videoPath}"`, { 
      stdio: 'pipe',
      timeout: 180000
    });
    
    const sizeMB = existsSync(videoPath) ? Math.floor(readFileSync(videoPath).length / 1024 / 1024) : 0;
    console.log(`  ✓ ${char} (${duration}秒, ${sizeMB}MB)`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${char}: ${e.message.substring(0, 50)}`);
    return false;
  }
}

// ========== 主函数 ==========
async function main() {
  console.log('🎬 开始生成专业汉字教学视频...\n');
  
  // 加载汉字数据
  const dataFile = resolve(ROOT, 'src', 'data', 'hanzi.ts');
  const content = readFileSync(dataFile, 'utf-8');
  
  // 解析汉字数据
  const regex = /\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}/g;
  
  const hanziList = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    hanziList.push({
      c: match[1],
      p: match[2],
      pd: match[3],
      tone: parseInt(match[4]),
      radical: match[5],
      strokes: parseInt(match[6]),
      origin: match[7],
      evolve: match[8],
      words: match[9].split(',').map(w => w.trim().replace(/'/g, '')),
      sentence: match[10],
      level: parseInt(match[11]),
      freq: parseInt(match[12])
    });
  }
  
  console.log(`📚 加载了 ${hanziList.length} 个汉字数据\n`);
  
  // 生成前10个汉字的示例视频（用于审核）
  const sampleChars = ['日', '月', '山', '水', '明', '春', '休', '妈', '爸', '河'];
  const sampleList = hanziList.filter(h => sampleChars.includes(h.c));
  
  console.log(`📝 开始生成示例视频（共${sampleList.length}个）:\n`);
  
  let success = 0, failed = 0;
  for (let i = 0; i < sampleList.length; i++) {
    const h = sampleList[i];
    process.stdout.write(`[${i + 1}/${sampleList.length}] ${h.c} ... `);
    
    const result = await generateVideo(h);
    if (result) success++; else failed++;
    
    // 打印脚本预览
    if (result && i < 3) {
      const script = buildProfessionalScript(h);
      console.log(`\n     脚本预览: ${script.substring(0, 80)}...`);
    }
    console.log('');
  }
  
  console.log(`\n✅ 示例完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📁 视频目录: ${OUTPUT_DIR}`);
  console.log(`\n🔍 请检查以下示例视频:`);
  sampleChars.forEach(c => console.log(`   • ${c}-教学.mp4`));
  
  return { success, failed, sampleList };
}

main().catch(console.error);
