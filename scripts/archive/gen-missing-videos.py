#!/usr/bin/env python3
"""Generate teaching videos for missing hanzi characters."""
import os
import re
import subprocess
import sys

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPTS_DIR)
IMG_DIR = os.path.join(ROOT, 'public', 'hanzi-imgs')
VID_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')
VOICE_DIR = os.path.join(ROOT, 'public', 'hanzi-voices')

os.makedirs(VID_DIR, exist_ok=True)
os.makedirs(VOICE_DIR, exist_ok=True)

# Load hanzi data
chars_data = {}
with open(os.path.join(ROOT, 'src', 'data', 'hanzi.ts')) as f:
    content = f.read()
for m in re.finditer(r"{ c: '([^']+)', p: '([^']+)', pd: '([^']+)', tone: (\d), radical: '([^']*)', strokes: (\d+), origin: '([^']*)', evolve: '([^']*)', words: \[([^\]]+)\], sentence: '([^']*)', level: (\d), freq: (\d+)", content):
    chars_data[m.group(1)] = {
        'pd': m.group(3), 'tone': int(m.group(4)), 'radical': m.group(5),
        'strokes': int(m.group(6)), 'origin': m.group(7), 'words': [w.strip().strip("'") for w in m.group(9).split(',')],
        'sentence': m.group(10)
    }

TARGET = ['芳','轻','边','过','近','还','远','送','道','遥','酒','醉','重','野','金','银','问','闲','间','闻','阳','阴','雁','霜','香']
TONE_NAMES = ['', '一声', '二声', '三声', '四声']

def get_liushu(char):
    r = chars_data.get(char, {}).get('radical', '')
    if r in ['氵','讠','亻','女','纟','忄']:
        return '形声'
    if r in ['艹','竹','石','土']:
        return '形声'
    return '汉字'

def build_voice_text(h):
    info = chars_data.get(h['c'], {})
    pd = info.get('pd', h['pd'])
    tone = info.get('tone', 1)
    strokes = info.get('strokes', 3)
    radical = info.get('radical', '')
    liushu = get_liushu(h['c'])
    words = info.get('words', [])[:3]
    sentence = info.get('sentence', '这是一个常用的汉字')
    origin = info.get('origin', '')
    char = h['c']
    
    text = "小朋友们好！欢迎来到宝贝学习乐园，今天我们一起来认识一个新的汉字——" + char + "。"
    text += "这个字读" + pd + "，是" + TONE_NAMES[tone] + "。它的部首是" + radical + "，一共有" + str(strokes) + "画。"
    text += "你知道吗？汉字有很多种类型，" + char + "是个" + liushu + "字。"
    if origin:
        text += "现在听我讲一个关于" + char + "的故事：" + origin + "。"
    else:
        text += "现在听我讲一个关于" + char + "的故事：" + char + "是一个常用的汉字。"
    if words:
        text += "这个字可以组成这些词语：" + "、".join(words) + "。"
    text += "我们用它造个句子吧：" + sentence + "。好啦，让我们来复习一下今天学的" + char + "字。"
    text += "它是" + liushu + "字，我们一起念：" + pd + "，" + pd + "，" + char + " " + char + " " + char + "。太棒了！你已经学会了" + char + "这个字！给自己鼓鼓掌吧！下期节目再见！"
    return text

def gen_audio(char, pd):
    voice_path = os.path.join(VOICE_DIR, char + "-voice.aiff")
    if os.path.exists(voice_path):
        return voice_path
    text = build_voice_text({'c': char, 'pd': pd})
    try:
        cmd = ['say', '-v', 'Mei-Jia', '-r', '130', '-o', voice_path, text.replace('"', "'")]
        subprocess.run(cmd, capture_output=True, timeout=90)
        return voice_path if os.path.exists(voice_path) else None
    except Exception as e:
        print(f"  TTS failed for {char}: {e}")
        return None

def gen_video(char, img_path, audio_path, duration_sec=50):
    video_path = os.path.join(VID_DIR, char + "-教学.mp4")
    if os.path.exists(video_path):
        print(f"  ⏭ {char}: 已存在，跳过")
        return True
    
    filter_complex = (
        f"[0:v]format=yuv420p,zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={duration_sec*25}:s=1280x720:fps=25,"
        f"fade=t=in:st=0:d=3,fade=t=out:st={duration_sec-3}:d=3[v]"
    )
    
    cmd = [
        '/usr/local/bin/ffmpeg', '-y',
        '-loop', '1', '-i', img_path,
        '-i', audio_path,
        '-filter_complex', filter_complex,
        '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
        '-c:a', 'aac', '-b:a', '128k',
        '-shortest', video_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=180)
        if result.returncode != 0:
            print(f"  ✗ {char}: ffmpeg error\n{result.stderr.decode()[:200]}")
            return False
        
        size_mb = os.path.getsize(video_path) / 1024 / 1024
        print(f"  ✓ {char} ({duration_sec}秒, {size_mb:.1f}MB)")
        return True
    except subprocess.TimeoutExpired:
        print(f"  ✗ {char}: timeout")
        return False
    except Exception as e:
        print(f"  ✗ {char}: {e}")
        return False

def main():
    print("🎬 开始生成汉字教学视频...")
    success = 0
    skipped = 0
    failed = 0
    
    for char in TARGET:
        img_path = os.path.join(IMG_DIR, char + ".png")
        if not os.path.exists(img_path):
            print(f"  ✗ {char}: 图片不存在")
            failed += 1
            continue
        
        video_path = os.path.join(VID_DIR, char + "-教学.mp4")
        if os.path.exists(video_path):
            print(f"  ⏭ {char}: 已存在，跳过")
            skipped += 1
            continue
        
        info = chars_data.get(char, {})
        pd = info.get('pd', char)
        
        print(f"📝 {char}: 生成中...")
        audio = gen_audio(char, pd)
        if not audio:
            print(f"  ✗ {char}: 语音生成失败")
            failed += 1
            continue
        
        ok = gen_video(char, img_path, audio, duration_sec=50)
        if ok:
            success += 1
        else:
            failed += 1
    
    print(f"\n✅ 完成！成功: {success}, 跳过: {skipped}, 失败: {failed}")

if __name__ == '__main__':
    main()
