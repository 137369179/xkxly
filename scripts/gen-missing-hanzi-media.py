#!/usr/bin/env python3
"""Batch generate missing hanzi images and videos."""
import re, os, sys, json, subprocess, time
from pathlib import Path

ROOT = Path('/Users/mac/WorkBuddy/学习天地/宝贝学习乐园')
IMG_DIR = ROOT / 'public' / 'hanzi-imgs'
VID_DIR = ROOT / 'public' / 'hanzi-videos'
VOICE_DIR = ROOT / 'public' / 'hanzi-voices'
API_URL = 'http://localhost:8787/api/ai/image'

IMG_DIR.mkdir(parents=True, exist_ok=True)
VID_DIR.mkdir(parents=True, exist_ok=True)
VOICE_DIR.mkdir(parents=True, exist_ok=True)

# Load existing assets
existing_imgs = {f.stem for f in IMG_DIR.glob('*.png')}
existing_vids = {f.stem.replace('-教学', '') for f in VID_DIR.glob('*.mp4')}
existing_voices = {f.stem for f in VOICE_DIR.glob('*.mp3')}

# Load all chars from all data files
all_chars = {}
for fname in ['src/data/hanzi.ts', 'src/data/hanzi500.ts', 'src/data/hanziSentences.ts']:
    content = (ROOT / fname).read_text()
    for m in re.finditer(r"(?:c|char):\s*'([^']+)'", content):
        all_chars[m.group(1)] = fname

print(f"Total unique chars across data files: {len(all_chars)}")
print(f"Existing images: {len(existing_imgs)}, videos: {len(existing_vids)}, voices: {len(existing_voices)}")

# Determine what's missing
missing_imgs = sorted(set(all_chars.keys()) - existing_imgs)
missing_vids = sorted(set(all_chars.keys()) - existing_vids)
print(f"Missing images: {len(missing_imgs)}")
print(f"Missing videos: {len(missing_vids)}")

# Prompt templates for image generation
def get_img_prompt(char):
    prompts = {
        '零': 'zero egg number empty circle cold winter',
        '一': 'single golden rice grain on beige background',
        '二': 'two red apples side by side on green grass',
        '三': 'three fluffy white clouds in blue sky',
        '四': 'four colorful butterflies flying in garden',
        '五': 'five bright golden stars shining in night sky',
        '六': 'six playful puppies sitting in circle',
        '七': 'seven rainbow colors arched across sky',
        '八': 'two symmetrical peach halves showing seeds',
        '九': 'nine golden coins arranged in circle treasure theme',
        '十': 'ten tiny seedlings growing in row spring garden',
        '日': 'cute smiling sun with warm orange rays friendly face kawaii',
        '月': 'crescent moon with gentle smile soft golden glow stars around kawaii',
        '山': 'three cute green mountains with snow caps valley between cartoon',
        '水': 'flowing clear blue water with sparkles gentle waves kawaii',
        '火': 'warm friendly fire with orange and yellow flames cozy cartoon',
        '木': 'simple tree with roots and branches educational cartoon style',
        '林': 'two friendly trees standing together forest friends cartoon',
        '森': 'three trees forming a little forest cute woodland scene',
        '花': 'beautiful colorful flower with petals and happy face garden',
        '草': 'green grass blades with tiny flowers morning dew fresh',
        '树': 'tall green tree with round canopy and brown trunk bird on branch',
        '石': 'smooth gray rock with moss nature scene cartoon style',
        '田': 'green rice field divided into squares farmer in distance',
        '土': 'brown earth soil with green sprout emerging cartoon',
        '雨': 'raindrops falling from fluffy gray cloud colorful umbrellas below',
        '雪': 'soft white snowflakes falling winter scene with little snowman cute',
        '云': 'fluffy white cloud with cute face blue sky kawaii',
        '风': 'gentle wind blowing leaves and grass invisible breeze illustrated',
        '星': 'twinkling bright star with sparkle rays dark blue night sky',
        '天': 'blue sky with white clouds and flying birds peaceful cartoon',
        '地': 'green earth with flowers and grass warm brown soil cartoon',
        '人': 'simple happy person standing round head and smile cute cartoon',
        '口': 'friendly open mouth saying hello simple illustration',
        '手': 'open hand with fingers spread skin tone friendly gesture',
        '足': 'happy foot with toes walking pose cartoon style',
        '目': 'big eye seeing clearly focused cartoon style',
        '耳': 'ear listening attentively sound waves cartoon style',
        '心': 'red heart love symbol beating emotional center cute',
        '头': 'head top body part thinking idea brain cartoon',
        '身': 'whole body person healthy active moving cartoon',
        '上': 'arrow pointing upward happy person climbing stairs cute',
        '下': 'arrow pointing downward person sliding down cartoon',
        '中': 'target bullseye person standing at center winning cute',
        '大': 'big confident person with arms wide open proud stance cute',
        '小': 'tiny cute child looking up small precious cartoon',
        '长': 'long ruler measurement stretched distance far cartoon',
        '短': 'short stubby brief condensed little small cartoon',
        '高': 'tall skyscraper mountain reaching high up cartoon',
        '低': 'low ground level underground basement small cartoon',
        '多': 'many objects piles abundance crowd lots plenty cartoon',
        '少': 'few items scarce limited small amount little cartoon',
        '爸': 'father dad parent male caregiver loving cartoon',
        '妈': 'mother mom parent female caregiver caring cartoon',
        '爷': 'grandpa elderly male elder wise respected kind cartoon',
        '奶': 'grandma elderly female elder loving kind cartoon',
        '哥': 'brother older male sibling protective friendly cartoon',
        '姐': 'sister older female sibling caring helpful cartoon',
        '弟': 'brother younger male sibling playful friendly cartoon',
        '妹': 'sister younger female sibling cute sweet cartoon',
        '儿': 'son child young male offspring beloved cute cartoon',
        '女': 'daughter girl young female child loved cute cartoon',
        '跑': 'person running fast with speed lines energetic cartoon',
        '走': 'person walking briskly with motion lines cartoon style',
        '跳': 'jumping leaping bouncing spring energetic motion cartoon',
        '坐': 'person sitting cross-legged peacefully relaxed cartoon',
        '站': 'person standing straight proud confident posture cartoon',
        '飞': 'bird or person flying through sky clouds joyful cartoon',
        '看': 'hand shading eyes looking far away curious expression cartoon',
        '听': 'listening attentively ear focused sound waves cartoon',
        '说': 'speaking with speech bubbles communication friendly cartoon',
        '读': 'child reading book interest knowledge learning happy',
        '写': 'writing with pen paper creation artistic cute cartoon',
        '笑': 'happy laughing face with tears of joy cartoon',
        '哭': 'crying face with teardrops comfort needed sad cartoon',
        '吃': 'eating delicious meal hungry satisfied happy cartoon',
        '喝': 'drinking water refreshment thirsty quenched happy cartoon',
        '唱': 'singing melody notes voice happy musical cartoon',
        '叫': 'calling shouting yelling loud voice demanding attention cartoon',
        '好': 'good thumbs up happy approval positive smile cartoon',
        '坏': 'thumbs down disapprove negative angry cartoon',
        '美': 'beautiful pretty gorgeous lovely wonderful scene cartoon',
        '丑': 'ugly funny mismatched cartoon character silly',
        '真': 'true real genuine authentic honest trustworthy cartoon',
        '假': 'false fake pretend mock not real cartoon silly',
        '对': 'correct right proper accurate yes thumbs up',
        '错': 'wrong incorrect mistake error no X mark',
        '爱': 'love hearts everywhere warm feeling affection cartoon',
        '想': 'thinking pondering lightbulb idea understanding cartoon',
        '忘': 'forgetting memory fading cloud head cartoon',
        '念': 'missing cherishing thinking heartfelt love cartoon',
        '乐': 'happy joyful smiling laughter fun cartoon',
        '苦': 'bitter harsh unpleasant medicinal medicine cartoon',
        '忧': 'worried anxious concerned troubled frowning cartoon',
        '愁': 'sad contemplative melancholy rainy window cartoon',
        '喜': 'delighted joyful enthusiastic happy celebrating cartoon',
        '怒': 'angry mad furious outraged upset cartoon',
        '惧': 'fearful terrified frightened scared cartoon',
        '怕': 'scared timid fearful shy cartoon hiding',
        '红': 'bright red rose apple cheerful warm vibrant cartoon',
        '黄': 'bright sunny golden yellow cheerful warm cartoon',
        '蓝': 'blue sky ocean calm cool peaceful serene cartoon',
        '绿': 'green grass nature fresh vibrant alive cartoon',
        '白': 'white pure clean bright snow pristine minimal cartoon',
        '黑': 'black dark mysterious night elegant bold cartoon',
        '圆': 'round circle sphere globe curved complete shape pastel',
        '方': 'square box rectangle corner geometric shape pastel',
        '尖': 'pointed sharp tip apex peaked narrow end cartoon',
        '平': 'flat even level smooth horizontal balanced cartoon',
        '春': 'spring season renewal growth green warm flowers cute',
        '夏': 'summer season hot bright green lush sunny cartoon',
        '秋': 'autumn fall season harvest golden crisp leaves cartoon',
        '冬': 'winter season cold snow white still peaceful cute',
        '早': 'early morning sunrise dawn beginning fresh cartoon',
        '晚': 'evening sunset orange pink sky calm quiet cartoon',
        '晴': 'clear sunny bright weather beautiful blue sky cartoon',
        '阴': 'overcast cloudy gray dull weather muted cartoon',
        '江': 'wide river flowing water natural landscape cartoon',
        '河': 'river flowing water stream natural cartoon',
        '海': 'vast blue ocean waves coastal cartoon',
        '湖': 'calm lake reflection still water cartoon',
        '池': 'small pond reflection garden cartoon',
        '溪': 'stream small flowing water babbling nature',
        '沙': 'sand grains beach desert granular golden cartoon',
        '岸': 'shore bank edge water land cartoon',
        '鱼': 'cute orange goldfish with big eyes swimming in blue water',
        '鸟': 'small cheerful bird with wings spread singing on branch',
        '虫': 'tiny friendly caterpillar on green leaf dotted segments',
        '羊': 'fluffy white sheep with smile green meadow cartoon',
        '牛': 'cute spotted cow barn yard cartoon',
        '马': 'galloping horse with flowing mane open field cartoon',
        '虎': 'friendly striped tiger cub jungle background cartoon',
        '龙': 'cute Chinese dragon with scales clouds and mountains',
        '龟': 'slow turtle with shell pattern garden pond cartoon',
        '兔': 'white bunny with long ears carrot nearby cute cartoon',
        '猫': 'playful kitten with whiskers ball of yarn nearby cartoon',
        '狗': 'friendly puppy wagging tail bone cartoon style',
        '鸡': 'rooster chicken farmyard crowing morning bird cartoon',
        '鸭': 'duck quacking swimming pond water cartoon',
        '鹅': 'white goose honking long neck water cartoon',
        '猪': 'pink pig farmyard oinking mud cartoon',
        '鼠': 'mouse tiny rodent cheese loving small creature cartoon',
        '蛇': 'snake slithering reptile scales tropical creature cartoon',
        '蛙': 'green frog hopping pond cartoon',
        '鲤': 'colorful koi fish ornamental pond cartoon',
        '蝶': 'colorful butterfly wings flying garden insect cartoon',
        '蝉': 'cicada summer insect buzzing tree creature cartoon',
        '米': 'white rice grains spilled from basket cozy kitchen cartoon',
        '竹': 'green bamboo stalks with leaves gentle wind cartoon',
        '果': 'sweet juicy fruit healthy snack delicious cartoon',
        '茶': 'tea cup hot drink relaxing traditional cartoon',
        '糖': 'sweet candy treat dessert yummy cartoon',
        '饭': 'cooked rice meal food warm dish satisfied cartoon',
        '菜': 'vegetable greens healthy plant fresh cartoon',
        '豆': 'red beans soy beans bowl healthy food cartoon',
        '家': 'cozy happy home family warmth safe shelter cartoon',
        '国': 'country flag territory homeland proud cartoon',
        '城': 'city buildings streets bustling urban cartoon',
        '村': 'village cottage peaceful rural quiet cartoon',
        '园': 'garden park green nature flowers trees playground cartoon',
        '门': 'open wooden door showing garden beyond welcoming cartoon',
        '户': 'single wooden door half-open cozy home entrance cartoon',
        '屋': 'house roof walls windows cozy home cartoon',
        '车': 'car vehicle wheel transportation travel friendly cartoon',
        '船': 'boat ship sailing water voyage adventure cartoon',
        '书': 'open book knowledge pictures reading learning happy cartoon',
        '画': 'colorful painting on easel art class creative cartoon',
        '衣': 'colorful clothes hanging on line sunny day cartoon',
        '帽': 'nice hat brim sun protection cute cartoon',
        '鞋': 'shoe boot footwear protection walking comfortable cartoon',
        '灯': 'light lamp bulb illumination bright cartoon style',
        '镜': 'mirror reflecting glass surface shiny bathroom cartoon',
        '碗': 'ceramic bowl vessel food eating kitchen cartoon',
    }
    return prompts.get(char, f"Educational children illustration for Chinese character {char}, cute cartoon style, bright colors, white background, simple and clear for kids aged 3-8")

def get_voice_text(char_data):
    """Build TTS text for a character."""
    if not char_data:
        return f"小朋友们好！今天我们学习汉字{char_data['c'] if char_data else '?'}。这个字读作{char_data['pd'] if char_data else '?'}。"
    c = char_data['c']
    pd = char_data['pd']
    radical = char_data.get('radical', '')
    strokes = char_data.get('strokes', 0)
    origin = char_data.get('origin', '')
    words = char_data.get('words', [])[:3]
    sentence = char_data.get('sentence', '')
    
    return f"""小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「{c}」。
这个字读「{pd}」，它的部首是「{radical}」，一共有{strokes}画。
记忆小故事：{origin}。
组词练习：{'、'.join(words)}。跟读：{','.join(words)}。
造句：{sentence}。
太棒了！你已经学会「{c}」这个字了！给自己鼓鼓掌吧！下期再见！"""

def load_hanzi_data():
    """Load hanzi data from all sources."""
    data = {}
    # Priority: hanzi.ts > hanzi500.ts > hanziSentences.ts
    sources = [
        ('src/data/hanzi.ts', r"\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}"),
        ('src/data/hanzi500.ts', r"\{\s*id:\s*'[^']+',\s*char:\s*'([^']+)',\s*pinyin:\s*'([^']*)',\s*strokeCount:\s*(\d+),\s*radical:\s*'([^']*)',\s*category:\s*'[^']+',\s*words:\s*\[([^\]]+)\],\s*originDesc:\s*'([^']*)',\s*sentence:\s*'([^']*)'\s*\}"),
        ('src/data/hanziSentences.ts', r"\{\s*c:\s*'([^']+)',\s*pinyin:\s*'([^']+)',\s*word:\s*'([^']+)',\s*sentence:\s*'([^']+)'\s*\}"),
    ]
    for fname, pattern in sources:
        content = (ROOT / fname).read_text()
        for m in re.finditer(pattern, content):
            if fname == 'src/data/hanzi.ts':
                c, p, pd, tone, radical, strokes, origin, evolve, words, sentence, level, freq = m.groups()
                if c not in data:
                    data[c] = {'c': c, 'p': p, 'pd': pd, 'tone': int(tone), 'radical': radical, 'strokes': int(strokes), 'origin': origin, 'evolve': evolve, 'words': [w.strip().replace("'", '') for w in words.split(',')], 'sentence': sentence}
            elif fname == 'src/data/hanzi500.ts':
                char, pinyin, stroke_count, radical, words_str, origin_desc, sentence = m.groups()
                if char not in data:
                    data[char] = {'c': char, 'p': pinyin, 'pd': pinyin, 'tone': 1, 'radical': radical, 'strokes': int(stroke_count), 'origin': origin_desc, 'evolve': '', 'words': [w.strip().replace("'", '') for w in words_str.split(',')], 'sentence': sentence}
            elif fname == 'src/data/hanziSentences.ts':
                c, pinyin, word, sentence = m.groups()
                if c not in data:
                    data[c] = {'c': c, 'p': pinyin, 'pd': pinyin, 'tone': 1, 'radical': '', 'strokes': 0, 'origin': '', 'evolve': '', 'words': [word], 'sentence': sentence}
    return data

# Load all data
all_data = load_hanzi_data()
print(f"\nLoaded {len(all_data)} unique characters from all data sources")

# Generate missing images
generated_imgs = []
failed_imgs = []
for char in missing_imgs:
    if len(generated_imgs) + len(failed_imgs) >= 50:  # Batch limit per run
        break
    prompt = get_img_prompt(char)
    try:
        import urllib.request
        req = urllib.request.Request(API_URL, 
            data=json.dumps({'prompt': prompt, 'size': '1024x1024', 'n': 1}).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST')
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
            if result.get('ok') and result.get('data'):
                img_url = result['data'][0].get('url') or result.get('dataUrl')
                if img_url:
                    img_req = urllib.request.Request(img_url)
                    with urllib.request.urlopen(img_req, timeout=30) as img_resp:
                        img_data = img_resp.read()
                        (IMG_DIR / f"{char}.png").write_bytes(img_data)
                        generated_imgs.append(char)
                        print(f"  ✓ {char}")
                        continue
            failed_imgs.append(char)
            print(f"  ✗ {char}: no URL")
    except Exception as e:
        failed_imgs.append(char)
        print(f"  ✗ {char}: {str(e)[:50]}")
    time.sleep(0.5)  # Rate limiting

print(f"\nGenerated {len(generated_imgs)} images, {len(failed_imgs)} failed")

# Generate missing videos (only for chars that now have images)
all_imgs = {f.stem for f in IMG_DIR.glob('*.png')}
videos_to_gen = sorted(set(all_imgs) - existing_vids)
print(f"\nGenerating {len(videos_to_gen)} videos...")

generated_vids = []
failed_vids = []
for char in videos_to_gen[:100]:  # Limit to 100 per run
    img_path = IMG_DIR / f"{char}.png"
    if not img_path.exists():
        failed_vids.append(char)
        continue
    
    vid_path = VID_DIR / f"{char}-教学.mp4"
    voice_path = VOICE_DIR / char
    
    if vid_path.exists():
        continue
    
    char_data = all_data.get(char, {})
    voice_text = get_voice_text(char_data)
    
    try:
        # Generate speech
        aiff_path = str(voice_path) + '.aiff'
        mp3_path = str(voice_path) + '.mp3'
        subprocess.run(['say', '-v', 'Mei-Jia', '-r', '120', '-o', aiff_path, voice_text], 
                      capture_output=True, timeout=90)
        subprocess.run(['ffmpeg', '-y', '-i', aiff_path, '-acodec', 'libmp3lame', '-ab', '128k', mp3_path],
                      capture_output=True, timeout=60)
        os.unlink(aiff_path)
        
        # Generate video
        duration = 20
        filter_complex = f"[0:v]format=yuv420p,zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={duration*25}:s=1280x720:fps=25,fade=t=in:st=0:d=2,fade=t=out:st={duration-2}:d=2[v]"
        subprocess.run(['ffmpeg', '-y', '-loop', '1', '-i', str(img_path), '-i', mp3_path,
                       '-filter_complex', filter_complex, '-map', '[v]', '-map', '1:a',
                       '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-c:a', 'aac', '-b:a', '128k',
                       '-shortest', str(vid_path)],
                      capture_output=True, timeout=120)
        
        if vid_path.exists():
            generated_vids.append(char)
            size_mb = vid_path.stat().st_size // (1024 * 1024)
            print(f"  ✓ {char} ({size_mb}MB)")
        else:
            failed_vids.append(char)
            print(f"  ✗ {char}: no output")
    except Exception as e:
        failed_vids.append(char)
        print(f"  ✗ {char}: {str(e)[:50]}")
    
    time.sleep(0.3)  # Brief pause between videos

print(f"\nGenerated {len(generated_vids)} videos, {len(failed_vids)} failed")

# Final status
final_imgs = {f.stem for f in IMG_DIR.glob('*.png')}
final_vids = {f.stem.replace('-教学', '') for f in VID_DIR.glob('*.mp4')}
print(f"\n{'='*50}")
print(f"Final status:")
print(f"  Images: {len(final_imgs)} (was {len(existing_imgs)})")
print(f"  Videos: {len(final_vids)} (was {len(existing_vids)})")
print(f"  Still missing videos: {len(set(all_chars.keys()) - final_vids)}")
print(f"{'='*50}")
