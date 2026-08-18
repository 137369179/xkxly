#!/usr/bin/env python3
"""Check actual coverage of hanzi videos in the app."""
import re
import os

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VIDEO_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')
IMG_DIR = os.path.join(ROOT, 'public', 'hanzi-imgs')

# Load all chars from all data files
all_chars = set()

# hanzi.ts
content = open(os.path.join(ROOT, 'src', 'data', 'hanzi.ts')).read()
pattern1 = r"\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)'"
matches1 = re.findall(pattern1, content)
for m in matches1:
    all_chars.add(m[0])

print(f"hanzi.ts entries: {len(matches1)}")

# hanzi500.ts
content2 = open(os.path.join(ROOT, 'src', 'data', 'hanzi500.ts')).read()
pattern2 = r"char:\s*'([^']+)'"
matches2 = re.findall(pattern2, content2)
for m in matches2:
    all_chars.add(m)

print(f"hanzi500.ts entries: {len(matches2)}")

print(f"\nTotal unique Chinese characters needed: {len(all_chars)}")

# Load existing videos
existing_videos = set()
for f in os.listdir(VIDEO_DIR):
    if f.endswith('-教学.mp4'):
        existing_videos.add(f.replace('-教学.mp4', ''))

print(f"Existing videos: {len(existing_videos)}")

missing = sorted(all_chars - existing_videos)
print(f"Missing videos: {len(missing)}")

if missing:
    print("\nMissing:")
    for c in missing[:30]:
        print(f"  {c}")
else:
    print("\n✅ ALL Chinese characters have teaching videos!")

# Check images
existing_images = set()
for f in os.listdir(IMG_DIR):
    if f.endswith('.png'):
        existing_images.add(f.replace('.png', ''))

print(f"\nExisting images: {len(existing_images)}")
missing_img = sorted(all_chars - existing_images)
print(f"Missing images: {len(missing_img)}")

if missing_img:
    print("\nMissing images:")
    for c in missing_img[:20]:
        print(f"  {c}")
