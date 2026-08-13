#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });

// 六书故事库 - 补充完整数据
const LIUSHU_STORIES = {
  // 象形字
  '七': { type: '象形', desc: '像一个人弯腰劳动', story: '古时候人们弯腰劳作，这个动作就像"七"字的形状', rhyme: '七色彩虹天上挂，七仙女下凡间啦' },
  '八': { type: '指事', desc: '两笔分开表示分开', story: '两笔向两边分开，就像分别的样子，表示分开', rhyme: '八字分开向两边，八分八散记心间' },
  '六': { type: '指事', desc: '像屋梁交叉的形状', story: '上面一点是屋顶尖，下面一个交错的架子，表示数字六', rhyme: '六个小朋友手拉手，六一儿童乐悠悠' },
  '口': { type: '象形', desc: '像张开的嘴巴', story: '张大嘴巴说"啊"，方方的形状就像"口"字', rhyme: '小嘴巴呀嗷嗷叫，吃饭说话都用它' },
  '冬': { type: '会意', desc: '冰柱垂下表示冬天', story: '上面是冰的象形，下面像丝线，表示一年到头都结冰寒冷', rhyme: '冬天到来北风吹，雪结冰柱真美丽' },
  '夏': { type: '象形', desc: '像一个人头大身小的形象', story: '像一个头戴装饰、四肢张开的人，夏天天气炎热，人们活动多', rhyme: '夏天来到太阳照，荷花开放知了叫' },
  '吃': { type: '形声', desc: '口字旁+乞的音', story: '左边是口字旁，吃东西要用嘴巴；右边是乞，读音相近', rhyme: '吃饭用口慢慢嚼，细嚼慢咽身体好' },
  '喝': { type: '形声', desc: '口字旁+曷的音', story: '左边是口字旁，喝水要用嘴巴；右边是曷，读音相近', rhyme: '喝水要用小口喝，身体健康笑呵呵' },
  '哥': { type: '会意', desc: '两个"可"叠加', story: '两个"可"字叠在一起，哥哥比我年长，我要尊敬他', rhyme: '哥哥哥哥真好，陪我玩耍教我做' },
  '哭': { type: '会意', desc: '两个口+犬的变体', story: '上面两个口代表大声哭喊，下面是犬，表示放声大哭', rhyme: '哭了哭了别伤心，擦擦眼泪笑一笑' },
  '奶': { type: '形声', desc: '女字旁+乃的音', story: '左边是女字旁，表示女性长辈；右边是乃，读音相近。奶奶', rhyme: '奶奶奶奶疼爱我，煮饭洗衣忙不完' },
  '妈': { type: '形声', desc: '女字旁+马的音', story: '左边是女字旁，表示妈妈是女性；右边是马，读音相近', rhyme: '妈妈妈妈真好，教我读书又画画' },
  '妹': { type: '形声', desc: '女字旁+未的音', story: '左边女字旁，右边未，读音相近。妹妹是年纪小的女孩', rhyme: '妹妹妹妹年纪小，蹦蹦跳跳真可爱' },
  '姐': { type: '形声', desc: '女字旁+且的音', story: '左边女字旁，右边且，读音相近。姐姐是年纪大的女孩', rhyme: '姐姐姐姐对我好，辅导作业耐心教' },
  '弟': { type: '指事', desc: '像弓形表示弟弟', story: '像一个弯曲的形状，弟弟是家里最小的男孩', rhyme: '弟弟弟弟年纪小，跟我一起长大好' },
  '手': { type: '象形', desc: '像张开的手掌', story: '伸出你的手五指张开，古人画下这只手掌就是"手"字', rhyme: '小手小手拍拍拍，动手动脑本领大' },
  '森': { type: '会意', desc: '三棵树就是森林', story: '一棵树是木，两棵树是林，三棵树就是森。很多树在一起就是森林', rhyme: '树木成林又成森，空气清新环境美' },
  '爷': { type: '形声', desc: '父字头+耶的音', story: '上面是父，表示爷爷；右边是耶，读音相近。爷爷', rhyme: '爷爷爷爷头发白，讲故事来最精彩' },
  '爸': { type: '形声', desc: '父字旁+巴的音', story: '上面是父，表示爸爸；下面是巴，读音相近。爸爸', rhyme: '爸爸爸爸力气大，把我举过头顶耍' },
  '画': { type: '指事', desc: '田地被框起来画格子', story: '像一块田地被人工划分成方格，用来画画写字', rhyme: '画画写字真有趣，小小画家出作品' },
  '真': { type: '会意', desc: '八字头+具的变体', story: '上面是十和目，下面是具，眼睛看得真切就是真实', rhyme: '真心真意对人好，实事求是最重要' },
  '站': { type: '形声', desc: '立字旁+占的音', story: '左边立字旁，表示站立；右边占，读音相近。站立', rhyme: '站如松坐如钟，姿势端正气轩昂' },
  '米': { type: '象形', desc: '米粒散落的形状', story: '像一粒粒米散落开来，中间是米粒，四周有米糠', rhyme: '大米米饭香喷喷，农民辛苦种粮田' },
  '美': { type: '会意', desc: '羊大为美', story: '上面是羊，下面是大，羊长得肥大就是美的意思', rhyme: '美丽风景看不够，美好生活乐悠悠' },
  '诗': { type: '形声', desc: '言字旁+寺的音', story: '左边言字旁，和语言有关；右边是寺，读音相近。诗歌', rhyme: '诗歌韵律优美听，吟诗作对最有情' },
  '读': { type: '形声', desc: '言字旁+卖的音', story: '左边言字旁，读书要用嘴读出来；右边是卖，读音相近', rhyme: '读书读书多有益，书中自有黄金屋' },
  '走': { type: '会意', desc: '十字头+止的变体', story: '上面是土，下面是止（脚），用脚走路就是走', rhyme: '走路要看好脚下，安全第一记心间' },
  '跑': { type: '形声', desc: '足字旁+包的音', story: '左边足字旁，表示用脚奔跑；右边包，读音相近。跑步', rhyme: '跑步运动身体好，天天锻炼不生病' },
  '跳': { type: '形声', desc: '足字旁+兆的音', story: '左边足字旁，表示用脚跳跃；右边兆，读音相近。跳高', rhyme: '跳高跳绳真好玩，身体健康棒又棒' },
  '休': { type: '会意', desc: '人靠在树旁休息', story: '走累了吗？靠在树边歇一歇。左边的"人"靠着右边的"木"，就是休息', rhyme: '小树旁边人休息，劳逸结合最合理' },
  '兔': { type: '象形', desc: '像一只小白兔', story: '上面是兔耳，中间是兔身，下面是兔尾，像一只跳跃的小兔子', rhyme: '小白兔白又白，两只耳朵竖起来' },
  '狗': { type: '形声', desc: '反犬旁+句的音', story: '左边是反犬旁表示动物，右边是句，读音相近', rhyme: '小狗小狗汪汪叫，看家护院好帮手' },
  '猫': { type: '形声', desc: '反犬旁+苗的音', story: '左边是反犬旁表示动物，右边是苗，读音相近', rhyme: '小猫小猫喵喵叫，捉老鼠来本领高' },
  '羊': { type: '象形', desc: '像有角的羊头', story: '上面是两个弯弯的角，下面是羊脸，像一只小羊', rhyme: '小羊咩咩叫得欢，白白毛毛真好看' },
  '虎': { type: '象形', desc: '像一只老虎', story: '上面是虎头，中间有虎纹，下面是虎爪，像一只威猛的老虎', rhyme: '老虎老虎山中王，威风凛凛百兽慌' },
  '虫': { type: '象形', desc: '像一条小虫子', story: '圆圆的头，弯曲的身体，像一条正在爬行的小虫子', rhyme: '小虫子扭扭腰，花园里面捉迷藏' },
  '龙': { type: '象形', desc: '像神话中的龙', story: '有龙头、龙身、龙爪，是中华民族传说中的神兽', rhyme: '龙飞龙飞云中舞，呼风唤雨真神气' },
  '龟': { type: '象形', desc: '像一只乌龟', story: '上面是龟壳，下面是四只脚，像一只爬行的乌龟', rhyme: '小乌龟慢慢爬，背着房子到处走' },
};

// 获取汉字信息
function getHanziInfo(char) {
  return LIUSHU_STORIES[char] || { type: '汉字', desc: '', story: `「${char}」是一个常用汉字`, rhyme: `${char} ${char} 真好玩，天天见面认识它` };
}

// 构建语音文本
function buildVoiceText(char) {
  const info = getHanziInfo(char);
  
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${char}」。\n\n` +
         `这个字是个${info.type}字。\n` +
         `${info.desc ? info.desc + '。\n' : ''}` +
         `记忆小故事：${info.story}。\n\n` +
         `记住口诀：「${info.rhyme}」。\n\n` +
         `太棒了！你已经学会了「${char}」这个字！给自己鼓鼓掌吧！`;
}

// 生成语音
function generateSpeech(text, outputFile) {
  try {
    if (process.platform === 'darwin') {
      const safeText = text.replace(/"/g, "'").replace(/\n/g, ' ');
      execSync(`say -v "Mei-Jia" -r 130 -o "${outputFile}.aiff" "${safeText}"`, { stdio: 'pipe', timeout: 120000 });
      execSync(`/usr/local/bin/ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
      try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
      return `${outputFile}.mp3`;
    }
  } catch (e) {
    console.log(`  TTS 失败: ${e.message}`);
  }
  return null;
}

// 生成视频
async function generateVideo(char) {
  const imageUrl = resolve(IMAGE_DIR, `${char}.png`);
  const videoPath = resolve(OUTPUT_DIR, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}`);
  
  if (!existsSync(imageUrl)) {
    console.log(`  ✗ ${char}: 图片不存在`);
    return false;
  }
  
  if (existsSync(videoPath)) {
    console.log(`  ⏭ ${char}: 已存在`);
    return true;
  }
  
  try {
    const voiceText = buildVoiceText(char);
    const audioFile = generateSpeech(voiceText, voicePath);
    if (!audioFile) {
      console.log(`  ✗ ${char}: 语音生成失败`);
      return false;
    }
    
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
    console.error(`  ✗ ${char}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🎬 开始生成缺失的汉字教学视频...\n');
  
  // 获取所有需要生成的字符
  const allChars = [];
  const imgFiles = existsSync(IMAGE_DIR) ? 
    readdirSync(IMAGE_DIR).filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')) : 
    [];
  
  for (const char of imgFiles) {
    const videoPath = resolve(OUTPUT_DIR, `${char}-教学.mp4`);
    if (!existsSync(videoPath)) {
      allChars.push(char);
    }
  }
  
  console.log(`需要生成: ${allChars.length} 个汉字\n`);
  
  let success = 0, failed = 0;
  for (let i = 0; i < allChars.length; i++) {
    const char = allChars[i];
    process.stdout.write(`[${i + 1}/${allChars.length}] ${char} ... `);
    const result = await generateVideo(char);
    if (result) success++; else failed++;
    
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 进度: ${success}成功, ${failed}失败`);
    }
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📁 视频目录: ${OUTPUT_DIR}`);
}

main().catch(console.error);
