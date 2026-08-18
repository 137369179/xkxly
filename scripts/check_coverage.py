#!/usr/bin/env python3
"""Check actual coverage of hanzi videos in the app."""
import re
import os

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VIDEO_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')
IMG_DIR = os.path.join(ROOT, 'public', 'hanzi-imgs')

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

# Load chars from hanzi500.ts
path2 = os.path.join(ROOT, 'src', 'data', 'hanzi500.ts')
content2 = open(path2).read()
pattern2 = r"char:\s*'([^']+)'"
existing_chars = set(all_chars.keys())
for m in re.finditer(pattern2, content2):
    existing_chars.add(m.group(1))

print(f"=== HANZI VIDEO STATUS REPORT ===")
print(f"Total unique chars needed: {len(existing_chars)}")
print(f"Total chars in hanzi.ts: {len(all_chars)}")
print(f"Total chars in hanzi500.ts: {len(set(re.findall(pattern2, content2)))}")

# Load existing videos
existing_videos = set()
for f in os.listdir(VIDEO_DIR):
    if f.endswith('.mp4'):
        existing_videos.add(f.replace('-教学.mp4', ''))

print(f"\nExisting videos: {len(existing_videos)}")

# Check actual missing videos
missing_hanzi_ts = sorted(all_chars.keys() - existing_videos)
print(f"Missing from hanzi.ts: {len(missing_hanzi_ts)}")

# Check which chars are referenced in UI components
ui_chars = set()
for f in os.listdir(os.path.join(ROOT, 'src')):
    if f.endswith('.tsx') or f.endswith('.ts'):
        fpath = os.path.join(ROOT, 'src', f)
        try:
            fcontent = open(fpath).read()
            # Find references to specific characters in data files
            for c in existing_chars:
                if f"'{c}'" in fcontent or f'"{c}"' in fcontent:
                    ui_chars.add(c)
        except:
            pass

print(f"\nChars referenced in UI: {len(ui_chars)}")

# Check if these "missing" ones actually have videos somewhere
print("\n=== ALL VIDEOS ===")
all_vids = set()
for f in os.listdir(VIDEO_DIR):
    if f.endswith('.mp4'):
        vid_name = f.replace('-教学.mp4', '')
        all_vids.add(vid_name)

print(f"Total videos in public/hanzi-videos/: {len(all_vids)}")

# Show first 50 video names
print("\nFirst 50 videos:")
for v in sorted(all_vids)[:50]:
    print(f"  {v}")
