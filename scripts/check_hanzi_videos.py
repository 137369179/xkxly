#!/usr/bin/env python3
"""Check which hanzi are missing video files."""
import re
import os

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VIDEO_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')
IMG_DIR = os.path.join(ROOT, 'public', 'hanzi-imgs')

# Load existing videos
existing_videos = set()
for f in os.listdir(VIDEO_DIR):
    if f.endswith('.mp4'):
        existing_videos.add(f.replace('-教学.mp4', ''))

# Load chars from all data files
all_chars = {}
for filename in ['hanzi.ts', 'hanzi500.ts', 'hanziSentences.ts']:
    path = os.path.join(ROOT, 'src', 'data', filename)
    try:
        content = open(path).read()
        # Pattern 1: c: 'char'
        for m in re.finditer(r"c:\s*'([^']+)'", content):
            all_chars[m.group(1)] = filename
        # Pattern 2: char: 'char' (for hanzi500)
        for m in re.finditer(r"char:\s*'([^']+)'", content):
            all_chars[m.group(1)] = filename
    except Exception as e:
        print(f"Error reading {filename}: {e}")

missing = sorted(all_chars.keys() - existing_videos)
print(f"Total unique chars across data files: {len(all_chars)}")
print(f"Videos exist: {len(existing_videos)}")
print(f"Missing videos: {len(missing)}")
if missing:
    print(f"\nMissing chars: {missing[:50]}")

# Check images
img_exists = set(os.listdir(IMG_DIR))
no_img_missing = [c for c in missing if c not in img_exists]
if no_img_missing:
    print(f"\nAlso missing images: {no_img_missing[:20]}")
