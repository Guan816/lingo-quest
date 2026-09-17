import type { SpeechRecognitionLike } from '../vite-env.d';
import { requestPermission } from './permissionGate';

/**
 * 语音能力封装：TTS（朗读）与 ASR（语音识别）。
 * 两者都基于浏览器/系统 Web Speech API，无需下载模型。
 * 不支持时所有 API 都会优雅降级，调用方据此切换到「打字模式」。
 */

export const ASR_LANG = 'en-US';

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function asrSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* ───────────────────────── TTS ───────────────────────── */

let voices: SpeechSynthesisVoice[] = [];
/** 语音列表就绪后 resolve；Android WebView 上首次 getVoices() 往往为空，必须等事件 */
let voicesReady: Promise<void> | null = null;

/**
 * Android WebView / 部分 Chromium 上 getVoices() 首次调用返回空数组，
 * 语音列表是异步加载的，必须等 voiceschanged 事件。
 * 不等的话 pickVoice() 会拿到 null，导致 utterance 没有 voice —— 表现就是「不出声」。
 */
function ensureVoices(timeoutMs = 3000): Promise<void> {
  if (!ttsSupported()) return Promise.resolve();
  if (voices.length) return Promise.resolve();
  if (voicesReady) return voicesReady;

  voicesReady = new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      voices = synth.getVoices() || [];
      synth.removeEventListener?.('voiceschanged', onChange);
      resolve();
    };

    const onChange = () => finish();

    // 部分实现用 onvoiceschanged 属性而非事件监听
    synth.addEventListener?.('voiceschanged', onChange);
    if (typeof synth.onvoiceschanged !== 'function') {
      synth.onvoiceschanged = onChange;
    }

    // 先同步取一次，有的环境这里就有值
    const immediate = synth.getVoices() || [];
    if (immediate.length) {
      voices = immediate;
      finish();
      return;
    }

    // 兜底：超时后无论如何放行，避免永久挂起
    window.setTimeout(finish, timeoutMs);
  });

  return voicesReady;
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  if (voices.length) return voices;
  voices = window.speechSynthesis.getVoices() || [];
  return voices;
}

export function pickVoice(langPrefix = 'en'): SpeechSynthesisVoice | null {
  const list = loadVoices();
  if (!list.length) return null;
  const exact = list.find((v) => v.lang.toLowerCase() === 'en-us');
  if (exact) return exact;
  return list.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ?? null;
}

export function cancelSpeak() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  onStart?: () => void;
}

/** 朗读一段英文；resolve 表示播完或被合理取消 */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!ttsSupported() || !text.trim()) return;

  // 等语音列表就绪再取 voice，否则 Android WebView 上会没有 voice 而不出声
  await ensureVoices();
  return speakNow(text, opts);
}

function speakNow(text: string, opts: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.lang ?? 'en-US';
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1;
    const v = pickVoice();
    if (v) u.voice = v;

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    u.onstart = () => opts.onStart?.();
    u.onend = done;
    u.onerror = done;

    try {
      synth.speak(u);
    } catch {
      done();
      return;
    }

    // 兜底：某些 WebView 不触发 onend，按字数估算一个上限
    const est = Math.min(20000, 1200 + text.length * 90);
    window.setTimeout(done, est);
  });
}

/**
 * 在用户首次手势里调用，解锁 WebView 的音频播放。
 * Android WebView 要求音频由用户交互触发，否则后续 TTS 会被静默丢弃。
 */
export function primeTts(): void {
  if (!ttsSupported()) return;
  try {
    // 静音朗读一个空串，借用户手势把 TTS 通道打开
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    void ensureVoices();
  } catch {
    /* 忽略：不影响后续正常调用 */
  }
}


/* ───────────────────────── ASR ───────────────────────── */

export interface ListenResult {
  transcript: string;
  confidence: number;
  /** 用户主动取消或没听清 */
  empty: boolean;
}

export interface ListenOptions {
  lang?: string;
  /** 实时返回的部分识别结果 */
  onPartial?: (text: string) => void;
  /** 最长录音时间，毫秒 */
  timeoutMs?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export class SpeechError extends Error {
  kind: 'permission' | 'network' | 'unsupported' | 'unknown';
  constructor(kind: SpeechError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

let activeRecognition: SpeechRecognitionLike | null = null;

export function stopListening() {
  try {
    activeRecognition?.stop();
  } catch {
    /* ignore */
  }
}

/**
 * 录一次音并返回识别文本。
 * - 空结果（没听清）会 resolve 一个 empty=true 的结果而不是报错；
 * - 真正不可用时 reject SpeechError，调用方应切换到打字模式。
 *
 * 权限：进这里之前先过权限门控。没授权时会弹一个应用内说明，
 * 用户点「允许」才触发系统授权框；被拒则抛 permission 错误，
 * 由调用方切到打字模式。
 */
export async function listen(opts: ListenOptions = {}): Promise<ListenResult> {
  // 先确认能力，再申请权限 —— 语音识别根本不可用时不该去打扰用户要麦克风
  if (typeof window === 'undefined') {
    throw new SpeechError('unsupported', '当前环境不支持语音识别');
  }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    throw new SpeechError('unsupported', '当前浏览器不支持语音识别');
  }

  const permitted = await requestPermission('microphone');
  if (!permitted) {
    throw new SpeechError('permission', '没有麦克风权限，已切换到打字模式');
  }

  return new Promise<ListenResult>((resolve, reject) => {
    let rec: SpeechRecognitionLike;
    try {
      rec = new Ctor();
    } catch {
      reject(new SpeechError('unsupported', '无法创建语音识别实例'));
      return;
    }

    rec.lang = opts.lang ?? ASR_LANG;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let settled = false;
    let best = '';
    let bestConf = 0;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      activeRecognition = null;
      opts.onEnd?.();
      fn();
    };

    const timer = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      finish(() =>
        resolve({
          transcript: best.trim(),
          confidence: bestConf,
          empty: !best.trim(),
        }),
      );
    }, opts.timeoutMs ?? 9000);

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const alt = r[0];
        if (!alt) continue;
        if (r.isFinal) {
          best = alt.transcript;
          bestConf = alt.confidence ?? 0;
        } else {
          bestConf = alt.confidence ?? bestConf;
          opts.onPartial?.(alt.transcript);
        }
      }
      // 拿到最终结果就立刻结束，不必等 onend
      const last = e.results[e.results.length - 1];
      if (last?.isFinal) {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        finish(() =>
          resolve({
            transcript: best.trim(),
            confidence: bestConf,
            empty: !best.trim(),
          }),
        );
      }
    };

    rec.onerror = (e) => {
      const kind =
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'permission'
          : e.error === 'network'
            ? 'network'
            : 'unknown';
      if (e.error === 'no-speech' || e.error === 'aborted') {
        finish(() => resolve({ transcript: '', confidence: 0, empty: true }));
        return;
      }
      finish(() =>
        reject(
          new SpeechError(
            kind,
            kind === 'permission'
              ? '麦克风权限被拒绝，请允许后重试'
              : kind === 'network'
                ? '语音识别服务不可用，请检查网络'
                : '语音识别出错，请重试',
          ),
        ),
      );
    };

    rec.onend = () => {
      finish(() =>
        resolve({
          transcript: best.trim(),
          confidence: bestConf,
          empty: !best.trim(),
        }),
      );
    };

    rec.onstart = () => opts.onStart?.();

    activeRecognition = rec;
    try {
      rec.start();
    } catch {
      finish(() => reject(new SpeechError('unknown', '无法开始录音')));
    }
  });
}
