/**
 * 批量生成本地成语插画 · 待网络恢复后运行
 * ============================================================
 * 用法：node scripts/gen-idiom-art.mjs
 *
 * 职责：
 *   1. 从内置精选成语清单读取插画描述（与 src/data/idioms.ts 的 imagePrompt 保持同步）
 *   2. 逐一调用 text_to_image 生成并下载到 public/idioms/<id>.jpg（本地资源，避免外部链接）
 *   3. 用 macOS sips 重采样压缩（-Z 640 限制最长边），优化文件体积适应当地网络
 *
 * 幂等：重复运行会覆盖同名文件；已存在且可用的图不受影响。
 */
import { writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = resolve(ROOT, 'public', 'idioms');
const API = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';
const IMAGE_SIZE = 'square_hd';
/** 压缩后最长边（px） */
const MAX_EDGE = 640;

/** 精选成语插画描述（与 data/idioms.ts 的 imagePrompt 一一对应） */
const ARTS = [
  { id: 'i2', prompt: '儿童水彩插画，软萌果冻风，夜色下农夫正在修补小羊圈的栅栏，两三只圆滚滚的小羊羔在一旁好奇张望，暖黄马灯照明，柔和糖果色背景。' },
  { id: 'i3', prompt: '儿童水彩插画，软萌果冻风，圆脸农夫靠着一棵大树干打瞌睡，旁边长满野草的空田里有一只呆萌小兔子，柔和的绿与米色糖果色背景。' },
  { id: 'i4', prompt: '儿童水彩插画，软萌果冻风，两个小朋友低头对着地上一条画好的圆润小蛇，其中一个给蛇添上小脚丫，地上摆着一壶酒，活泼明亮的糖果色背景。' },
  { id: 'i5', prompt: '儿童水彩插画，软萌果冻风，一只圆润呆萌的小青蛙从古老井口探出头，看到头顶辽阔湛蓝天空和朵朵白云，井外的小鸟扇着翅膀，明亮的糖果色背景。' },
  { id: 'i6', prompt: '儿童水彩插画，软萌果冻风，胖胖的小狐狸得意洋洋地走在前面，身后跟着一只威风却憨憨的大老虎，小动物们好奇张望，柔和的森林糖果色背景。' },
  { id: 'i7', prompt: '儿童水彩插画，软萌果冻风，一只古式小船行驶在清澈江面上，船上的圆脸商人指着船舷上的小记号，水中一条小刀的剪影，蓝天白云暖黄色糖果背景。' },
  { id: 'i12', prompt: '儿童水彩插画，软萌果冻风，一颗晶莹小水珠滴落在圆润的青石上溅起小水花，旁边一只可爱小鸟歪头看着，暖绿与天蓝色糖果色背景。' },
  { id: 'i15', prompt: '儿童水彩插画，软萌果冻风，天刚泛白的清晨，两个圆脸小朋友在庭院里精神抖擞地舞着木剑，旁边一只大红公鸡跳上墙头啼叫，淡橘与暖黄色的清晨糖果色背景。' },
  { id: 'i16', prompt: '儿童水彩插画，软萌果冻风，白胡子圆脸老爷爷挑着两个小竹篮，一家老小黄悠悠地搬动一座大山的土石，山形柔和，远处暖阳，绿与橙的糖果色渐变背景。' },
  { id: 'i20', prompt: '儿童水彩插画，软萌果冻风，粉粉的桃花瓣随风飘落，花开满树，草地上蝴蝶飞舞、溪水泛光，远处蓝天白云，粉与薄荷绿的糖果色背景。' },
  { id: 'i36', prompt: '儿童水彩插画，软萌果冻风，一位圆脸小画家举着毛笔给墙上的胖青龙点眼睛，青龙眼睛一亮、腾空飞起，周围祥云朵朵，蓝与金黄的糖果色背景。' },
  { id: 'i42', prompt: '儿童水彩插画，软萌果冻风，大雪纷飞的暖橙色屋子里，圆脸大叔把一捆炭火递给瑟瑟发抖的一家人，炉火映红他们的笑脸，冷蓝与暖橙对比的糖果色背景。' },
];

function compress(id) {
  const file = resolve(OUT_DIR, `${id}.jpg`);
  if (!existsSync(file)) {
    console.log(`  [skip-compress] ${file} 不存在`);
    return;
  }
  const r = spawnSync('sips', ['-Z', String(MAX_EDGE), file], { stdio: 'ignore' });
  if (r.status !== 0) {
    console.warn(`  [warn-compress] sips 压缩失败: ${id}`);
  } else {
    const kb = (statSync(file).size / 1024).toFixed(1);
    console.log(`  [compress] ${id}.jpg -> ${kb} KB`);
  }
}

let ok = 0;
for (const { id, prompt } of ARTS) {
  const params = new URLSearchParams({ prompt, image_size: IMAGE_SIZE });
  const url = `${API}?${params.toString()}`;
  const out = resolve(OUT_DIR, `${id}.jpg`);
  process.stdout.write(`生成 ${id}.jpg ... `);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    if (!res.ok) {
      console.log(`FAIL HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) {
      console.log(`FAIL 空响应(${buf.length}B)`);
      continue;
    }
    await writeFile(out, buf);
    console.log(`OK (${(buf.length / 1024).toFixed(1)} KB 原始)`);
    compress(id);
    ok += 1;
  } catch (e) {
    console.log(`FAIL ${e?.message ?? e}`);
  }
}
console.log(`\n完成：成功 ${ok}/${ARTS.length}`);
if (ok === 0) console.log('提示：可能网络未恢复，稍后重跑 `node scripts/gen-idiom-art.mjs`。');