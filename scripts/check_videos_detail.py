#!/usr/bin/env python3
"""Detailed check of missing videos and available assets."""
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

# Load chars from all data files with their pinyin data
all_chars = {}
for filename in ['hanzi.ts', 'hanzi500.ts']:
    path = os.path.join(ROOT, 'src', 'data', filename)
    try:
        content = open(path).read()
        # Pattern for full entries (hanzi.ts format)
        pattern_full = r"\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}"
        for m in re.finditer(pattern_full, content):
            char_data = {
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
            all_chars[m.group(1)] = char_data
        # Pattern for hanzi500.ts format
        pattern_500 = r"\{\s*id:\s*'[^']+',\s*char:\s*'([^']+)',\s*pinyin:\s*'([^']+)',\s*strokeCount:\s*(\d+),\s*radical:\s*'([^']*)',\s*category:\s*'([^']+)',\s*words:\s*\[([^\]]+)\],\s*originDesc:\s*'([^']+)',\s*sentence:\s*'([^']+)'(?:,\s*level:\s*(\d),\s*freq:\s*(\d))?\s*\}"
        for m in re.finditer(pattern_500, content):
            if m.group(1) not in all_chars:
                words_str = m.group(6)
                words = [w.strip().replace("'", '') for w in words_str.split(',') if w.strip()]
                all_chars[m.group(1)] = {
                    'c': m.group(1),
                    'p': m.group(2).lower().replace('ǚ', 'v').replace('ü', 'v').replace('ǐ', 'i').replace('ǒ', 'o').replace('ǔ', 'u').replace('ǎ', 'a'),
                    'pd': m.group(2),
                    'tone': 1,  # default
                    'radical': m.group(4),
                    'strokes': int(m.group(3)),
                    'origin': m.group(7),
                    'evolve': '',
                    'words': words,
                    'sentence': m.group(8),
                }
    except Exception as e:
        print(f"Error reading {filename}: {e}")

# Check what's available
img_exists = set(os.listdir(IMG_DIR))
voice_exists = set()
if os.path.exists(VOICE_DIR):
    for f in os.listdir(VOICE_DIR):
        if f.endswith('.mp3'):
            voice_exists.add(f.replace('.mp3', ''))

print(f"Total chars in data: {len(all_chars)}")
print(f"Videos exist: {len(existing_videos)}")
print(f"Images exist: {len(img_exists)}")
print(f"Voice files exist: {len(voice_exists)}")

# Categorize missing
missing_video = sorted(all_chars.keys() - existing_videos)
has_img = set(missing_video) & img_exists
no_img = set(missing_video) - img_exists

print(f"\nMissing videos: {len(missing_video)}")
print(f"  With images: {len(has_img)}")
print(f"  Without images: {len(no_img)}")

# Show sample with images
sample_with_img = sorted(has_img)[:30]
print(f"\nSample missing WITH images ({len(sample_with_img)}):")
for c in sample_with_img:
    d = all_chars[c]
    print(f"  {c} (p={d['p']}, strokes={d['strokes']}, words={d['words'][:2]})")

# Show sample without images
sample_no_img = sorted(no_img)[:20]
print(f"\nSample missing WITHOUT images ({len(sample_no_img)}):")
for c in sample_no_img:
    print(f"  {c}")
