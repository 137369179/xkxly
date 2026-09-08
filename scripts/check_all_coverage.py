#!/usr/bin/env python3
"""
汉字教学视频覆盖率完整检查脚本
检查所有数据源：hanzi.ts, hanzi500.ts, hanziSentences.ts
"""
import json
import os
import re

ROOT = "/Users/mac/WorkBuddy/学习天地/宝贝学习乐园"
VID_DIR = os.path.join(ROOT, "public", "hanzi-videos")
IMG_DIR = os.path.join(ROOT, "public", "hanzi-imgs")
SRC_DIR = os.path.join(ROOT, "src", "data")

# 加载已存在的视频
existing_vid = set()
for f in os.listdir(VID_DIR):
    if f.endswith(".mp4"):
        char = f.replace("-教学.mp4", "")
        existing_vid.add(char)

print(f"📹 已有视频: {len(existing_vid)}")

# 加载已存在的图片
existing_img = set()
for f in os.listdir(IMG_DIR):
    if f.endswith(".png") or f.endswith(".webp"):
        char = os.path.splitext(f)[0]
        existing_img.add(char)

print(f"🖼️  已有图片: {len(existing_img)}")

def extract_chars_from_file(filepath, pattern):
    """从TypeScript文件提取汉字字符"""
    chars = set()
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        matches = re.findall(pattern, content)
        for m in matches:
            if m and len(m) == 1 and '\u4e00' <= m <= '\u9fff':
                chars.add(m)
    return chars

# 从 hanzi.ts 提取
hanzi_chars = extract_chars_from_file(
    os.path.join(SRC_DIR, "hanzi.ts"),
    r"c:\s*'([^']+)'(?:,|\s)"
)
print(f"\n📚 hanzi.ts 汉字数: {len(hanzi_chars)}")

# 从 hanzi500.ts 提取
hanzi500_chars = extract_chars_from_file(
    os.path.join(SRC_DIR, "hanzi500.ts"),
    r"char:\s*'([^']+)'"
)
print(f"📚 hanzi500.ts 汉字数: {len(hanzi500_chars)}")

# 从 hanziSentences.ts 提取
sentences_chars = extract_chars_from_file(
    os.path.join(SRC_DIR, "hanziSentences.ts"),
    r"c:\s*'([^']+)'"
)
print(f"📚 hanziSentences.ts 汉字数: {len(sentences_chars)}")

# 合并所有唯一汉字
all_unique = hanzi_chars | hanzi500_chars | sentences_chars
print(f"\n🔢 唯一汉字总数: {len(all_unique)}")

# 检查缺失
missing_vid = sorted(all_unique - existing_vid)
missing_img = sorted(all_unique - existing_img)

print(f"\n❌ 缺失视频: {len(missing_vid)} 个")
if missing_vid:
    print("  字符:", ", ".join(missing_vid[:50]))
    if len(missing_vid) > 50:
        print(f"  ... 还有 {len(missing_vid) - 50} 个")

print(f"\n❌ 缺失图片: {len(missing_img)} 个")
if missing_img:
    print("  字符:", ", ".join(missing_img[:50]))
    if len(missing_img) > 50:
        print(f"  ... 还有 {len(missing_img) - 50} 个")

# 统计
only_vid_missing = [c for c in missing_vid if c in existing_img]
only_img_missing = [c for c in missing_img if c in existing_vid]
both_missing = [c for c in missing_vid if c in missing_img]

print(f"\n📊 分类:")
print(f"  只缺视频(图片存在): {len(only_vid_missing)} 个")
print(f"  只缺图片(视频存在): {len(only_img_missing)} 个")
print(f"  视频图片都缺: {len(both_missing)} 个")

if missing_vid:
    print(f"\n⚠️  有待生成的汉字: {len(missing_vid)} 个")
else:
    print(f"\n✅ 所有汉字都有对应的教学视频和配图!")
