#!/usr/bin/env python3
"""Generate teaching videos for missing hanzi characters using moviepy."""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
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

LIUSHU_STORIES = {
    '日':'象形，圆圆的太阳','月':'象形，弯弯的月亮','山':'象形，三座山峰','水':'象形，流动的水','火':'象形，跳动的火焰',
    '木':'象形，一棵树','人':'象形，侧身站立的人','口':'象形，张开的嘴巴','手':'象形，张开的手掌','心':'象形，心脏的形状',
    '鱼':'象形，有头有尾的鱼','鸟':'象形，一只小鸟','马':'象形，一匹奔马','羊':'象形，有角的羊头','牛':'象形，有角的牛头',
    '雨':'象形，天上下雨','雪':'形声，上面雨字头','花':'形声，草变化出花朵','春':'会意，太阳下草木生长','秋':'会意，禾苗熟了像火烧',
    '东':'会意，太阳从树后升起','西':'会意，鸟儿归巢','北':'会意，两人背靠背','南':'形声，用乐器表示南方',
}

def get_liushu(char):
    if char in LIUSHU_STORIES:
        return LIUSHU_STORIES[char]
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
    
    text = f"小朋友们好！欢迎来到宝贝学习乐园，今天我们一起来认识一个新的汉字——{h['c']}。"
    text += f"这个字读{pd}，是{TONE_NAMES[tone]}。它的部首是{radical}，一共有{strokes}画。"
    text += f"你知道吗？汉字有很多种类型，{h['c']}是个{liushu}字。"
    text += f"现在听我讲一个关于{h['c']}的故事：{info.get('origin', f'{h[\"c\"]}是一个常用的汉字')}。"
    if words:
        text += f"这个字可以组成这些词语：{'、'.join(words)}。"
    text += f"我们用它造个句子吧：{sentence}。好啦，让我们来复习一下今天学的{h['c']}字。"
    text += f"它是{liushu}字，我们一起念：{pd}，{pd}，{h['c']} {h['c']} {h['c']}。太棒了！你已经学会了{h['c']}这个字！给自己鼓鼓掌吧！下期节目再见！"
    return text

def gen_audio(char, pd):
    """Generate audio using macOS say command."""
    voice_path = os.path.join(VOICE_DIR, f"{char}-voice.aiff")
    if os.path.exists(voice_path):
        return voice_path
    text = build_voice_text({'c': char, 'pd': pd})
    try:
        subprocess.run(['say', '-v', 'Mei-Jia', '-r', '130', '-o', voice_path, text.replace('"', "'")], 
                      capture_output=True, timeout=60)
        return voice_path if os.path.exists(voice_path) else None
    except Exception as e:
        print(f"  TTS failed for {char}: {e}")
        return None

def gen_video(char, img_path, audio_path, duration_sec=50):
    """Generate video from image + audio using moviepy."""
    video_path = os.path.join(VID_DIR, f"{char}-教学.mp4")
    if os.path.exists(video_path):
        print(f"  ⏭ {char}: 已存在，跳过")
        return True
    
    try:
        from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip
        import numpy as np
        
        # Create image clip with zoom effect
        img_clip = ImageClip(img_path).set_duration(duration_sec)
        
        # Add slow zoom (ken burns effect)
        def make_frame(t):
            zoom = 1.0 + 0.08 * (t / duration_sec)
            w, h = img_clip.size
            new_w, new_h = int(w * zoom), int(h * zoom)
            # Center crop
            x1 = (new_w - w) // 2
            y1 = (new_h - h) // 2
            frame = img_clip.get_frame(t)
            return frame[y1:y1+h, x1:x1+w] if new_w > w else frame
        
        img_clip = img_clip.fl_frame(make_frame)
        img_clip = img_clip.set_fps(25)
        
        # Fade in/out
        img_clip = img_clip.crossfadein(3).crossfadeout(3)
        
        # Add audio
        audio = AudioFileClip(audio_path)
        img_clip = img_clip.set_audio(audio)
        
        # Write video
        img_clip.write_videofile(video_path, fps=25, codec='libx264', audio_codec='aac', 
                                  bitrate='128k', preset='fast', verbose=False, logger=None)
        
        size_mb = os.path.getsize(video_path) / 1024 / 1024
        print(f"  ✓ {char} ({duration_sec}秒, {size_mb:.1f}MB)")
        return True
    except Exception as e:
        print(f"  ✗ {char}: {e}")
        return False

def main():
    print("🎬 开始生成汉字教学视频...")
    success = 0
    skipped = 0
    failed = 0
    
    for char in TARGET:
        img_path = os.path.join(IMG_DIR, f"{char}.png")
        if not os.path.exists(img_path):
            print(f"  ✗ {char}: 图片不存在")
            failed += 1
            continue
        
        video_path = os.path.join(VID_DIR, f"{char}-教学.mp4")
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
