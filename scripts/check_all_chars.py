#!/usr/bin/env python3
"""Check all chars across data files for missing videos."""
import re
import os

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VIDEO_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')

# Load existing videos
existing_videos = set()
for f in os.listdir(VIDEO_DIR):
    if f.endswith('.mp4'):
        existing_videos.add(f.replace('-教学.mp4', ''))

print(f"Existing videos: {len(existing_videos)}")

# Check hanzi.ts format
hanzi_path = os.path.join(ROOT, 'src', 'data', 'hanzi.ts')
content = open(hanzi_path).read()

# Count entries using regex
pattern = r"\{\s*c:\s*'([^']+)',\s*p:"
matches = re.findall(pattern, content)
print(f"Chars in hanzi.ts: {len(matches)}")

# Check which ones have videos
missing = [m for m in matches if m not in existing_videos]
print(f"Missing videos for hanzi.ts: {len(missing)}")
if missing:
    print("First 20:", missing[:20])
else:
    print("✅ All hanzi.ts chars have videos!")
