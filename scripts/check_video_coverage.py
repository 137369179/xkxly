#!/usr/bin/env python3
"""Check video coverage for hanzi module."""
import os
import re

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VIDEO_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')
IMG_DIR = os.path.join(ROOT, 'public', 'hanzi-imgs')
VOICE_DIR = os.path.join(ROOT, 'public', 'hanzi-voices')
DATA_FILE = os.path.join(ROOT, 'src', 'data', 'hanzi.ts')

# Load chars from hanzi.ts
content = open(DATA_FILE).read()
pattern = r"\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}"
hanzi_data = {}
for m in re.finditer(pattern, content):
    hanzi_data[m.group(1)] = {
        'c': m.group(1), 'p': m.group(2), 'pd': m.group(3),
        'tone': int(m.group(4)), 'radical': m.group(5),
        'strokes': int(m.group(6)), 'origin': m.group(7),
        'evolve': m.group(8), 'words': [w.strip().replace("'", '') for w in m.group(9).split(',')],
        'sentence': m.group(10)
    }

# Load existing assets
videos = set(f.replace('-教学.mp4', '') for f in os.listdir(VIDEO_DIR) if f.endswith('.mp4'))
# 2026-08-29：汉字配图已全量转 WebP（975MB → 68MB），需同时认 webp，
# 否则会误报「全部图片缺失」。
imgs = set(re.sub(r'\.(png|webp)$', '', f) for f in os.listdir(IMG_DIR) if f.endswith('.png') or f.endswith('.webp'))
voices = set(f.replace('.mp3', '') for f in os.listdir(VOICE_DIR) if f.endswith('.mp3'))

# Check coverage
missing_video = set(hanzi_data.keys()) - videos
missing_img = set(hanzi_data.keys()) - imgs
missing_voice = set(hanzi_data.keys()) - voices

print(f"=== 识字版块教学视频状态报告 ===")
print(f"汉字数据条目: {len(hanzi_data)}")
print(f"教学视频: {len(videos)}")
print(f"配图图片: {len(imgs)}")
print(f"语音文件: {len(voices)}")
print()
print(f"缺少视频: {len(missing_video)}")
print(f"缺少图片: {len(missing_img)}")
print(f"缺少语音: {len(missing_voice)}")
print()
if missing_video:
    print("缺少视频的字:", sorted(missing_video))
else:
    print("✅ 所有汉字都有教学视频！")

# Summary
all_have = len(missing_video) == 0 and len(missing_img) == 0 and len(missing_voice) == 0
print()
print("=" * 50)
if all_have:
    print("✅ 识字版块：300个汉字全部有完整的图文音视频素材")
else:
    print("⚠️ 部分汉字缺少素材")
print("=" * 50)