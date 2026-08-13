#!/usr/bin/env node
/**
 * 将现有视频扩展至50秒
 * 方法：放慢缩放速度 + 循环播放图片直到50秒
 */
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const FFPEG = '/usr/local/bin/ffmpeg';

// 目标时长
const TARGET_DURATION = 50;

// 扩展单个视频
function extendVideo(char) {
  const videoPath = resolve(VIDEO_DIR, `${char}-教学.mp4`);
  const imageUrl = resolve(IMAGE_DIR, `${char}.png`);
  const tempPath = resolve(VIDEO_DIR, `temp-${char}-教学.mp4`);
  
  if (!existsSync(videoPath) || !existsSync(imageUrl)) {
    return false;
  }
  
  try {
    // 获取原视频信息
    const info = execSync(`${FFPEG} -i "${videoPath}" 2>&1`, { encoding: 'utf-8' });
    const durationMatch = info.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    if (!durationMatch) {
      console.log(`  ⚠ ${char}: 无法获取视频信息`);
      return false;
    }
    
    const origDuration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3] + '.' + durationMatch[4]);
    
    // 计算缩放速度：让视频在50秒内完成缓慢缩放
    // 原视频如果是18秒，我们需要让它变成50秒
    const speedFactor = origDuration / TARGET_DURATION;
    const zoomSpeed = (0.001 * speedFactor).toFixed(4);
    
    // 生成50秒视频
    // 使用 zoompan 滤镜，很慢的缩放速度
    const filterComplex = `[0:v]format=yuv420p,zoompan=z='min(zoom+${zoomSpeed},1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${TARGET_DURATION * 25}:s=1280x720:fps=25,fade=t=in:st=0:d=3,fade=t=out:st=${TARGET_DURATION-3}:d=3[v]`;
    
    execSync(`${FFPEG} -y -loop 1 -i "${imageUrl}" -i "${videoPath}" -filter_complex "${filterComplex}" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 192k -t ${TARGET_DURATION} "${tempPath}"`, { 
      stdio: 'pipe' 
    });
    
    // 验证新视频
    const newInfo = execSync(`${FFPEG} -i "${tempPath}" 2>&1`, { encoding: 'utf-8' });
    const newDurationMatch = newInfo.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    if (newDurationMatch) {
      const newDur = parseInt(newDurationMatch[1]) * 3600 + parseInt(newDurationMatch[2]) * 60 + parseFloat(newDurationMatch[3] + '.' + newDurationMatch[4]);
      console.log(`  ✓ ${char}: ${origDuration.toFixed(1)}秒 → ${newDur.toFixed(1)}秒`);
      return true;
    }
    
    return false;
  } catch (e) {
    console.error(`  ✗ ${char}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🎬 开始扩展视频至50秒...\n');
  console.log(`⏰ 目标时长: ${TARGET_DURATION}秒\n`);
  
  const files = readdirSync(VIDEO_DIR).filter(f => f.endsWith('-教学.mp4') && !f.startsWith('temp-'));
  console.log(`📚 找到 ${files.length} 个视频文件\n`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const char = file.replace('-教学.mp4', '');
    process.stdout.write(`[${i + 1}/${files.length}] ${char} ... `);
    
    const result = extendVideo(char);
    if (result) {
      success++;
      console.log('✓');
    } else {
      failed++;
      console.log('✗');
    }
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📁 视频目录: ${VIDEO_DIR}`);
}

main().catch(console.error);
