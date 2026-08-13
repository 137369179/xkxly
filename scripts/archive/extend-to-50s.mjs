#!/usr/bin/env node
/**
 * 将现有视频扩展至50秒
 * 方法：放慢缩放速度，使18秒视频变为50秒
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');

// 确保 ffmpeg 可用
const FFPEG = '/usr/local/bin/ffmpeg';
const FFPROBE = '/usr/local/bin/ffprobe';

function getDuration(filePath) {
  try {
    const output = execSync(`${FFPROBE} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf-8' }).trim();
    return parseFloat(output);
  } catch (e) {
    return null;
  }
}

function extendVideo(inputPath, outputPath, targetDuration) {
  try {
    // 获取原始时长
    const duration = getDuration(inputPath);
    if (!duration) {
      console.log(`  ⚠ ${inputPath}: 无法获取时长`);
      return false;
    }
    
    // 计算缩放速度（使视频变慢）
    const scaleSpeed = duration / targetDuration; // 约 0.36
    
    // 使用 zoompan 滤镜，放慢速度
    const filterComplex = `[0:v]zoompan=z='min(zoom+${scaleSpeed.toFixed(4)},1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.floor(targetDuration * 25)}:s=1280x720:fps=25,fade=t=in:st=0:d=2,fade=t=out:st=${targetDuration-2}:d=2[v]`;
    
    execSync(`${FFPEG} -y -loop 1 -i "${inputPath}" -filter_complex "${filterComplex}" -map "[v]" -c:v libx264 -preset fast -crf 28 -pix_fmt yuv420p -t ${targetDuration} "${outputPath}"`, { 
      stdio: 'pipe' 
    });
    
    const newDuration = getDuration(outputPath);
    console.log(`  ✓ ${resolve(outputPath).split('/').pop()} (${newDuration?.toFixed(1)}秒)`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${resolve(outputPath).split('/').pop()}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🎬 开始扩展视频至50秒...\n');
  
  const files = readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4'));
  console.log(`📚 找到 ${files.length} 个视频文件\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const file of files) {
    const inputPath = resolve(VIDEO_DIR, file);
    const outputPath = resolve(VIDEO_DIR, `temp-${file}`);
    
    console.log(`[${success + failed + 1}/${files.length}] ${file}...`);
    
    const result = extendVideo(inputPath, outputPath, 50);
    if (result) {
      // 替换原文件
      execSync(`mv "${outputPath}" "${inputPath}"`, { stdio: 'pipe' });
      success++;
    } else {
      failed++;
      if (existsSync(outputPath)) {
        execSync(`rm "${outputPath}"`, { stdio: 'pipe' });
      }
    }
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📁 视频目录: ${VIDEO_DIR}`);
}

main().catch(console.error);
