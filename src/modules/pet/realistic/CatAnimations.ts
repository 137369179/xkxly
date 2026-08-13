/**
 * 猫咪动画状态机 (Cat Animation State Machine)
 */
import * as THREE from 'three';
import type { CatAnimation, CatExpression, CatState } from './types';

const animationClips = new Map<string, THREE.AnimationClip>();

export function createProceduralAnimation(name: CatAnimation): THREE.AnimationClip {
  if (animationClips.has(name)) return animationClips.get(name)!;
  let clip: THREE.AnimationClip;
  switch (name) {
    case 'idle_breathing': clip = createBreathingAnim(); break;
    case 'tail_swish': clip = createTailSwishAnim(); break;
    case 'ear_twitch': clip = createEarTwitchAnim(); break;
    case 'purr_vibrate': clip = createPurrVibrateAnim(); break;
    case 'sit_lick': clip = createSitLickAnim(); break;
    case 'stretch_yawn': clip = createStretchYawnAnim(); break;
    case 'jump_pounce': clip = createJumpPounceAnim(); break;
    case 'roll_over': clip = createRollOverAnim(); break;
    default: clip = createBreathingAnim();
  }
  animationClips.set(name, clip);
  return clip;
}

function createBreathingAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 3.0;
  t.push(new THREE.NumberKeyframeTrack('Cat_Body.scale', [0, d*0.4, d*0.6, d], [1, 1.03, 1.03, 1], THREE.InterpolateSmooth));
  t.push(new THREE.NumberKeyframeTrack('Cat_Head.position', [0, d*0.45, d*0.55, d], [0, 2.25, 2.25, 2.2], THREE.InterpolateSmooth));
  for (let i = 0; i < 6; i++) {
    t.push(new THREE.NumberKeyframeTrack(`Cat_Tail_Seg_${i}.rotation`, [0, d*0.25, d*0.5, d*0.75, d], [0, 0.08, 0, -0.08, 0], THREE.InterpolateSmooth));
  }
  return new THREE.AnimationClip('idle_breathing', d, t);
}

function createTailSwishAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 1.5;
  for (let i = 0; i < 6; i++) {
    const amp = 0.15 + i * 0.05, phase = i * 0.1;
    t.push(new THREE.NumberKeyframeTrack(`Cat_Tail_Seg_${i}.rotation`, [0, 0.25+phase, 0.5+phase, 0.75+phase, d], [0, amp, 0, -amp, 0], THREE.InterpolateSmooth));
  }
  return new THREE.AnimationClip('tail_swish', d, t);
}

function createEarTwitchAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 0.8;
  ([['Cat_Ear_L', -1], ['Cat_Ear_R', 1]] as [string, number][]).forEach(([name, s]) => {
    const phase = (s === -1 ? 0 : 0.15);
    t.push(new THREE.NumberKeyframeTrack(`${name}.rotation`, [0, 0.1+phase, 0.2+phase, 0.35+phase, d], [s * 0.3, s * 0.5, s * 0.25, s * 0.35, s * 0.3], THREE.InterpolateSmooth));
  });
  return new THREE.AnimationClip('ear_twitch', d, t);
}

function createPurrVibrateAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 0.15;
  ['Cat_Body', 'Cat_Head'].forEach((n) => {
    t.push(new THREE.NumberKeyframeTrack(`${n}.position`, [0, d*0.5, d], [n==='Cat_Body'?0:2.2, n==='Cat_Body'?0.003:2.203, n==='Cat_Body'?0:2.2], THREE.InterpolateLinear));
  });
  return new THREE.AnimationClip('purr_vibrate', d, t);
}

function createSitLickAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 4.0;
  t.push(new THREE.NumberKeyframeTrack('Cat_Head.rotation', [0, 0.3, 1.5, 2.5, 3.5, d], [0, -0.3, -0.6, -0.6, -0.3, 0], THREE.InterpolateSmooth));
  t.push(new THREE.NumberKeyframeTrack('Cat_Body.rotation', [0, 0.5, 2.0, 3.5, d], [0, 0.15, 0.15, 0.1, 0], THREE.InterpolateSmooth));
  return new THREE.AnimationClip('sit_lick', d, t);
}

function createStretchYawnAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 3.5;
  t.push(new THREE.NumberKeyframeTrack('Cat_Body.scale', [0, 0.5, 1.5, 2.5, d], [1, 1.15, 1.15, 1.05, 1], THREE.InterpolateSmooth));
  ['Cat_Leg_FL', 'Cat_Leg_FR'].forEach((n) => {
    const base = n.includes('_FL') ? -0.47 : 0.47;
    const ext = n.includes('_FL') ? -0.7 : 0.7;
    t.push(new THREE.NumberKeyframeTrack(`${n}.position`, [0, 0.5, 1.5, 2.5, d], [base, ext, ext, n.includes('_FL')?-0.5:0.5, base], THREE.InterpolateSmooth));
  });
  t.push(new THREE.NumberKeyframeTrack('Cat_Head.rotation', [0, 0.8, 2.0, d], [0, 0.4, 0.4, 0], THREE.InterpolateSmooth));
  return new THREE.AnimationClip('stretch_yawn', d, t);
}

function createJumpPounceAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 1.2;
  const kt = [0, 0.2, 0.5, 0.75, 1.0];
  t.push(new THREE.NumberKeyframeTrack('Cat_Body.position', kt, [1.0, 0.85, 1.4, 1.0, 1.0], THREE.InterpolateSmooth));
  t.push(new THREE.NumberKeyframeTrack('Cat_Body.rotation', kt, [0, 0, -0.2, -0.1, 0], THREE.InterpolateSmooth));
  for (let i = 0; i < 6; i++) {
    t.push(new THREE.NumberKeyframeTrack(`Cat_Tail_Seg_${i}.rotation`, kt, [0, 0.2, 0.3, 0.15, 0], THREE.InterpolateSmooth));
  }
  return new THREE.AnimationClip('jump_pounce', d, t);
}

function createRollOverAnim(): THREE.AnimationClip {
  const t: THREE.KeyframeTrack[] = [];
  const d = 3.0;
  t.push(new THREE.NumberKeyframeTrack('Cat_Body.rotation', [0, 0.8, 1.6, 2.4, d], [0, Math.PI*0.5, Math.PI, Math.PI*1.5, Math.PI*2], THREE.InterpolateSmooth));
  ['Cat_Leg_FL','Cat_Leg_FR','Cat_Leg_HL','Cat_Leg_HR'].forEach((n, idx) => {
    const sa = idx < 2 ? 0.4 : -0.3;
    t.push(new THREE.NumberKeyframeTrack(`${n}.rotation`, [0.8, 1.6, 2.4], [0, sa, 0], THREE.InterpolateSmooth));
  });
  return new THREE.AnimationClip('roll_over', d, t);
}

export function recommendAnimation(state: Partial<CatState>): CatAnimation {
  const { stats, expression, currentAnimation } = state;
  if (currentAnimation && !currentAnimation.startsWith('idle')) return currentAnimation;
  if (stats) {
    if (stats.fullness < 30) return 'beg_food';
    if (stats.cleanliness < 30) return 'groom_self';
    if (stats.energy < 20) return 'fall_asleep';
    if (stats.affection > 80 && Math.random() > 0.6) return 'roll_over';
  }
  switch (expression) {
    case 'sleepy': return 'idle_breathing';
    case 'excited': return Math.random()>0.5 ? 'jump_pounce' : 'tail_swish';
    case 'love': return 'purr_vibrate';
    case 'hungry': return 'beg_food';
    case 'dirty': return 'groom_self';
    default: return 'idle_breathing';
  }
}

export function getAnimationsForExpression(expr: CatExpression): CatAnimation[] {
  const m: Record<CatExpression, CatAnimation[]> = {
    happy: ['idle_breathing','tail_swish','ear_twitch'],
    cute: ['ear_twitch','purr_vibrate','idle_breathing'],
    thinking: ['ear_twitch','idle_sitting','tail_swish'],
    sleepy: ['idle_breathing','fall_asleep','stretch_yawn'],
    love: ['purr_vibrate','roll_over','idle_breathing'],
    excited: ['jump_pounce','tail_swish','pounce_play'],
    hungry: ['beg_food','idle_breathing'],
    dirty: ['groom_self','sit_lick'],
    angry: ['ear_twitch','tail_swish'],
    scared: ['ear_twitch','idle_breathing'],
  };
  return m[expr] || m.happy;
}
