/**
 * 用 Web Audio 现场合成音效，不引入任何音频资源文件，
 * 这样打包体积更小、离线也一定有反馈音。
 */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(v: boolean) {
  enabled = v;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, gain: number) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

function seq(steps: [number, number, number, OscillatorType, number][]) {
  if (!enabled) return;
  steps.forEach(([f, s, d, t, g]) => tone(f, s, d, t, g));
}

export const sfx = {
  tap() {
    seq([[520, 0, 0.07, 'triangle', 0.12]]);
  },
  correct() {
    seq([
      [660, 0, 0.1, 'sine', 0.16],
      [880, 0.09, 0.14, 'sine', 0.16],
    ]);
  },
  wrong() {
    seq([
      [320, 0, 0.14, 'sawtooth', 0.1],
      [240, 0.11, 0.18, 'sawtooth', 0.09],
    ]);
  },
  combo(n: number) {
    const base = 520 + Math.min(n, 12) * 40;
    seq([
      [base, 0, 0.09, 'triangle', 0.14],
      [base * 1.25, 0.08, 0.12, 'triangle', 0.13],
    ]);
  },
  levelUp() {
    seq([
      [523, 0, 0.12, 'sine', 0.16],
      [659, 0.11, 0.12, 'sine', 0.16],
      [784, 0.22, 0.14, 'sine', 0.16],
      [1047, 0.34, 0.22, 'sine', 0.18],
    ]);
  },
  win() {
    seq([
      [523, 0, 0.12, 'triangle', 0.15],
      [659, 0.12, 0.12, 'triangle', 0.15],
      [784, 0.24, 0.12, 'triangle', 0.15],
      [1047, 0.36, 0.3, 'triangle', 0.17],
    ]);
  },
  lose() {
    seq([
      [440, 0, 0.16, 'sine', 0.13],
      [349, 0.15, 0.16, 'sine', 0.13],
      [262, 0.3, 0.28, 'sine', 0.13],
    ]);
  },
  start() {
    seq([
      [392, 0, 0.1, 'square', 0.08],
      [523, 0.08, 0.16, 'square', 0.08],
    ]);
  },
};
