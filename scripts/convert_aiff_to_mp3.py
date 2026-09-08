#!/usr/bin/env python3
"""Convert existing AIFF files to M4A (AAC) format."""
import os
import subprocess
import shutil

ROOT = '/Users/mac/WorkBuddy/学习天地/宝贝学习乐园'
VOICE_DIR = os.path.join(ROOT, 'public', 'hanzi-voices')

def main():
    count = 0
    failed = 0
    
    for filename in os.listdir(VOICE_DIR):
        if not filename.endswith('.aiff'):
            continue
        
        char = filename.replace('.aiff', '')
        aiff_path = os.path.join(VOICE_DIR, filename)
        m4a_path = os.path.join(VOICE_DIR, f"{char}.m4a")
        
        # Try different conversion approaches
        success = False
        
        # Method 1: afconvert with explicit output
        try:
            result = subprocess.run(
                ['afconvert', '-f', 'M4AF', '-d', 'aac', '-b', '128000', 
                 aiff_path, m4a_path],
                capture_output=True, timeout=30
            )
            if result.returncode == 0 and os.path.exists(m4a_path):
                success = True
        except Exception as e:
            pass
        
        # Method 2: afconvert to M4A directly
        if not success:
            try:
                result = subprocess.run(
                    ['afconvert', aiff_path, m4a_path],
                    capture_output=True, timeout=30
                )
                if result.returncode == 0 and os.path.exists(m4a_path):
                    success = True
            except Exception as e:
                pass
        
        # Method 3: Convert to WAV first then use aiff directly
        if not success:
            wav_path = os.path.join(VOICE_DIR, f"{char}.wav")
            try:
                result = subprocess.run(
                    ['afconvert', '-f', 'WAVE', '-d', 'sowt@22050', 
                     aiff_path, wav_path],
                    capture_output=True, timeout=30
                )
                if result.returncode == 0 and os.path.exists(wav_path):
                    # Try copying to m4a (for browsers that support WAV)
                    m4a_path = os.path.join(VOICE_DIR, f"{char}.wav")
                    success = True
            except Exception as e:
                pass
        
        if success:
            # Clean up old AIFF if M4A or WAV was created
            if os.path.exists(m4a_path):
                try:
                    os.remove(aiff_path)
                except:
                    pass
            count += 1
            print(f"  ✓ {char}")
        else:
            failed += 1
            print(f"  ✗ {char}: conversion failed")
    
    print(f"\n转换完成: 成功 {count}, 失败 {failed}")
    print(f"总计: {count + failed} 个文件")

if __name__ == '__main__':
    main()
