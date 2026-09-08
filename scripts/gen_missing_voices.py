#!/usr/bin/env python3
"""为识字版块缺失的汉字生成语音文件（使用 macOS say + ffmpeg）"""
import json
import os
import re
import shutil
import subprocess
import sys
import time

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VOICE_DIR = os.path.join(ROOT, 'public', 'hanzi-voices')
DATA_FILE = os.path.join(ROOT, 'src', 'data', 'hanzi.ts')
IMG_DIR = os.path.join(ROOT, 'public', 'hanzi-imgs')
VID_DIR = os.path.join(ROOT, 'public', 'hanzi-videos')

os.makedirs(VOICE_DIR, exist_ok=True)

# 加载汉字数据
def load_hanzi_data():
    content = open(DATA_FILE, encoding='utf-8').read()
    entries = []
    pattern = r"\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}"
    for m in re.finditer(pattern, content):
        entries.append({
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
        })
    return entries

def build_voice_text(h):
    tone_names = ['', '一声', '二声', '三声', '四声']
    words = h['words'][:3]
    text = (
        f"小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「{h['c']}」。"
        f"这个字读「{h['pd']}」，是{tone_names[h['tone']]}。"
        f"它的部首是「{h['radical']}」，一共有{h['strokes']}画。"
        f"记忆小故事：{h['origin']}。"
        f"记住口诀：「{h['c']}{h['c']}{h['c']}，{h['pd']}{h['pd']}{h['pd']}」。"
        f"组词练习：{'、'.join(words)}。"
        f"跟读：{'，'.join(words)}。"
        f"造句：{h['sentence']}。"
        f"太棒了！你已经学会「{h['c']}」这个字了！给自己鼓鼓掌吧！下期再见！"
    )
    return text

def generate_speech(char, text, output_path):
    """使用 macOS say 生成 AIFF，然后转换为 MP3"""
    aiff_path = output_path + '.aiff'
    mp3_path = output_path + '.mp3'
    
    # macOS 中文 TTS - 生成 AIFF
    result = subprocess.run(
        ['say', '-v', 'Mei-Jia', '-r', '120', '-o', aiff_path, text],
        capture_output=True, text=True, timeout=90
    )
    if result.returncode != 0:
        print(f"  ✗ {char}: say failed - {result.stderr[:50]}")
        return False
    
    # 使用 afconvert 转换 AIFF 到 MP3（或者转换为 M4A）
    # macOS 原生支持 M4A/AAC 格式
    m4a_path = output_path + '.m4a'
    result = subprocess.run(
        ['afconvert', '-f', 'M4AF', '-d', 'aac', '-b', '128000', aiff_path, m4a_path],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        # 回退到原始 AIFF
        shutil.move(aiff_path, mp3_path.replace('.mp3', '.aiff'))
        print(f"  ✓ {char} (aiff)")
        return True
    
    # 清理临时文件
    try:
        os.remove(aiff_path)
    except:
        pass
    
    # 重命名为 .mp3 扩展名（实际是 M4A/AAC 格式，浏览器兼容）
    if os.path.exists(m4a_path):
        os.rename(m4a_path, mp3_path)
    
    return True

def main():
    hanzi_list = load_hanzi_data()
    print(f"📚 共 {len(hanzi_list)} 个汉字")
    
    # 检查现有语音
    existing_voices = set()
    if os.path.exists(VOICE_DIR):
        for f in os.listdir(VOICE_DIR):
            if f.endswith('.mp3'):
                existing_voices.add(f.replace('.mp3', ''))
    print(f"🔊 已有语音: {len(existing_voices)}")
    
    # 找出缺失的
    missing = [h for h in hanzi_list if h['c'] not in existing_voices]
    print(f"❌ 缺少语音: {len(missing)}")
    
    if not missing:
        print('✅ 所有汉字都有语音文件！')
        return
    
    print(f'\n🎙️ 开始生成语音...\n')
    
    done = 0
    failed = 0
    
    for i, h in enumerate(missing):
        char = h['c']
        voice_path = os.path.join(VOICE_DIR, char)
        text = build_voice_text(h)
        
        if generate_speech(char, text, voice_path):
            done += 1
            print(f"  ✓ {char} ({h['pd']}) [{i+1}/{len(missing)}]")
        else:
            failed += 1
            print(f"  ✗ {char}")
        
        # 进度提示
        if (i + 1) % 10 == 0:
            print(f"  进度: {i+1}/{len(missing)}, 成功: {done}, 失败: {failed}")
    
    print(f'\n📊 生成完成: 成功 {done}, 失败 {failed}')
    print(f'📁 语音目录: {VOICE_DIR}')
    
    # 最终统计
    final_count = len(os.listdir(VOICE_DIR)) if os.path.exists(VOICE_DIR) else 0
    print(f'✅ 总计语音数: {final_count}')
    
    return failed == 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
