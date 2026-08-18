#!/usr/bin/env python3
"""Final check of hanzi video coverage."""
import re
import os

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VIDEO_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')
IMG_DIR = os.path.join(ROOT, 'public', 'hanzi-imgs')
VOICE_DIR = os.path.join(ROOT, 'public', 'hanzi-voices')

# Load existing videos
existing_videos = set()
for f in os.listdir(VIDEO_DIR):
    if f.endswith('.mp4'):
        existing_videos.add(f.replace('-教学.mp4', ''))

# Load chars from hanzi.ts (main data source)
all_chars = {}
path = os.path.join(ROOT, 'src', 'data', 'hanzi.ts')
content = open(path).read()
pattern = r"\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}"
for m in re.finditer(pattern, content):
    all_chars[m.group(1)] = {
        'c': m.group(1),
        'p': m.group(2),
        'pd': m.group(3),
        'tone': int(m.group(4)),
        'radical': m.group(5),
        'strokes': int(m.group(6)),
        'origin': m.group(7),
        'evolve': m.group(8),
        'words': [w.strip().replace("'", '') for w in m.group(9).split(',')],
        'sentence': m.group(10),
    }

print(f"=== HANZI VIDEO STATUS REPORT ===")
print(f"Total chars in hanzi.ts: {len(all_chars)}")
print(f"Existing videos: {len(existing_videos)}")
print(f"Missing videos: {len(all_chars.keys() - existing_videos)}")

if all_chars.keys() <= existing_videos:
    print("\n✅ ALL Hanzi characters have videos!")
else:
    missing = sorted(all_chars.keys() - existing_videos)
    print(f"\n❌ Missing {len(missing)} videos:")
    for c in missing:
        d = all_chars[c]
        print(f"  {c} - pinyin: {d['pd']}, strokes: {d['strokes']}")

# Check images and voice coverage
img_exists = set(os.listdir(IMG_DIR))
voice_exists = set()
if os.path.exists(VOICE_DIR):
    for f in os.listdir(VOICE_DIR):
        if f.endswith('.mp3'):
            voice_exists.add(f.replace('.mp3', ''))

print(f"\nImage coverage: {len(all_chars & img_exists)}/{len(all_chars)}")
print(f"Voice coverage: {len(all_chars & voice_exists)}/{len(all_chars)}")
