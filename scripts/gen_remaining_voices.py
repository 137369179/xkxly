#!/usr/bin/env python3
"""Generate missing hanzi voice files using macOS say and convert to WAV."""
import os
import re
import subprocess
from pathlib import Path

ROOT = Path('/Users/mac/WorkBuddy/学习天地/宝贝学习乐园')
VOICE_DIR = ROOT / 'public' / 'hanzi-voices'
DATA_FILE = ROOT / 'src' / 'data' / 'hanzi.ts'

def load_hanzi_data():
    content = DATA_FILE.read_text(encoding='utf-8')
    pattern = r"\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}"
    entries = []
    for m in re.finditer(pattern, content):
        entries.append({
            'c': m.group(1), 'p': m.group(2), 'pd': m.group(3),
            'tone': int(m.group(4)), 'radical': m.group(5),
            'strokes': int(m.group(6)), 'origin': m.group(7),
            'evolve': m.group(8), 'words': [w.strip().replace("'", '') for w in m.group(9).split(',')],
            'sentence': m.group(10)
        })
    return entries

def build_voice_text(h):
    tone_names = ['', '一声', '二声', '三声', '四声']
    words = h['words'][:3]
    return (
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

def generate_speech(char, text, output_path):
    """Generate speech using macOS say and save as WAV."""
    aiff_path = str(output_path) + '.aiff'
    wav_path = str(output_path) + '.wav'
    
    # Generate AIFF using say
    result = subprocess.run(
        ['say', '-v', 'Mei-Jia', '-r', '120', '-o', aiff_path, text],
        capture_output=True, text=True, timeout=90
    )
    if result.returncode != 0:
        return False
    
    # Convert AIFF to WAV using afconvert
    result = subprocess.run(
        ['afconvert', '-f', 'WAVE', '-d', 'sowt@22050', aiff_path, wav_path],
        capture_output=True, text=True, timeout=30
    )
    
    # Clean up AIFF
    try:
        os.remove(aiff_path)
    except:
        pass
    
    return os.path.exists(wav_path)

def main():
    hanzi_list = load_hanzi_data()
    print(f"📚 共 {len(hanzi_list)} 个汉字")
    
    # Check existing voices
    existing_voices = set()
    for f in VOICE_DIR.glob('*'):
        if f.suffix in ['.mp3', '.m4a', '.aiff', '.wav']:
            existing_voices.add(f.stem)
    print(f"🔊 已有语音: {len(existing_voices)}")
    
    # Find missing
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
        voice_path = VOICE_DIR / char
        text = build_voice_text(h)
        
        if generate_speech(char, text, voice_path):
            done += 1
            print(f"  ✓ {char} ({h['pd']}) [{i+1}/{len(missing)}]")
        else:
            failed += 1
            print(f"  ✗ {char}")
        
        # Progress every 10 chars
        if (i + 1) % 10 == 0:
            print(f"  进度: {i+1}/{len(missing)}, 成功: {done}, 失败: {failed}")
    
    print(f'\n📊 生成完成: 成功 {done}, 失败 {failed}')
    print(f'📁 语音目录: {VOICE_DIR}')
    
    # Final count
    final_count = len(list(VOICE_DIR.glob('*')))
    print(f'✅ 总计语音数: {final_count}')
    
    return failed == 0

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
