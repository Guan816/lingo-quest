import type { SpeechRecognitionLike } from '../vite-env.d';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { requestPermission } from './permissionGate';

/**
 * 语音能力封装：TTS（朗读）与 ASR（识别）。
 *
 * 【为什么要走原生插件】
 * Android WebView **不提供 Web Speech API** —— `window.speechSynthesis` 和
 * `webkitSpeechRecognition` 在这个环境里都不存在。所以打包成 APK 之后，
 * 光靠浏览器那套 API 会表现为「朗读没声、识别没反应」，
 * 这不是接口没配，是运行环境根本没有这个能力。
 *
 * 因此这里做成两条路：
 *   原生 App（Capacitor）→ 用 @capacitor-community 的 text-to-speech /
 *                          speech-recognition 插件，调系统 TTS 与识别服务
 *   浏览器 → 继续用 Web Speech API
 *
 * 两条路对外暴露同一组函数，调用方不用关心当前跑在哪。
 */

/** 是否跑在 Capacitor 原生壳里 */
function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export const ASR_LANG = 'en-US';

export function ttsSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNative()) return true; // 原生走系统 TTS 引擎
  return 'speechSynthesis' in window;
}

export function asrSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNative()) return true; // 原生走系统识别服务
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * 能力自检：给设置页展示用，帮助定位「为什么没声音 / 没反应」。
 * 出问题时这三行就能看出是环境不支持还是配置问题。
 */
export interface SpeechDiagnostics {
  /** 运行环境 */
  platform: '原生 App' | '浏览器';
  /** 朗读走的是哪条路 */
  tts: '系统 TTS 引擎' | '浏览器语音合成' | '不可用';
  /** 识别走的是哪条路 */
  asr: '系统识别服务' | '浏览器语音识别' | '不可用';
}

export function speechDiagnostics(): SpeechDiagnostics {
  const native = isNative();
  const hasWebTts = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const hasWebAsr =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  return {
    platform: native ? '原生 App' : '浏览器',
    tts: native ? '系统 TTS 引擎' : hasWebTts ? '浏览器语音合成' : '不可用',
    asr: native ? '系统识别服务' : hasWebAsr ? '浏览器语音识别' : '不可用',
  };
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
  if (isNative()) {
    void TextToSpeech.stop().catch(() => {});
    return;
  }
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
  if (isNative()) return speakNative(text, opts);

  // 等语音列表就绪再取 voice，否则 Android WebView 上会没有 voice 而不出声
  await ensureVoices();
  return speakNow(text, opts);
}

/**
 * 原生朗读：交给系统 TTS 引擎。
 *
 * 不抛错 —— 系统没装语音引擎、或没装英文语音包时，
 * 这里静默失败，界面照常显示文字，不会因为朗读失败而卡住流程。
 */
async function speakNative(text: string, opts: SpeakOptions): Promise<void> {
  opts.onStart?.();
  try {
    // 先停掉上一句，否则会把两句排队念完
    await TextToSpeech.stop().catch(() => {});
    await TextToSpeech.speak({
      text,
      lang: opts.lang ?? 'en-US',
      rate: opts.rate ?? 0.95,
      pitch: opts.pitch ?? 1,
      volume: 1,
      category: 'playback', // iOS：静音键也不拦
      queueStrategy: QueueStrategy.Flush,
    });
  } catch {
    /* 例如系统缺少 TTS 引擎：静默降级 */
  }
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
  // 原生走系统 TTS，不受 WebView 的「必须用户手势才能播音频」限制，无需预热
  if (isNative()) return;
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

/**
 * 朗读自检 —— 给设置页的「试听」按钮用。
 *
 * 和 speak() 的区别：speak() 为了不打断流程会吞掉所有错误，
 * 而这里要把失败原因如实带出来，否则用户只能说「没声音」，
 * 我们分不清是没装语音引擎、缺英文语音包，还是别的。
 */
export async function testSpeak(): Promise<{ ok: boolean; text: string }> {
  const sample = 'Hello! This is a test.';

  if (!ttsSupported()) {
    return { ok: false, text: '当前环境没有可用的朗读能力。' };
  }

  if (isNative()) {
    try {
      const { languages } = await TextToSpeech.getSupportedLanguages();
      if (!languages.length) {
        return {
          ok: false,
          text: '系统里没有安装语音引擎。到手机「设置 → 无障碍 → 文字转语音（TTS）」装一个再试。',
        };
      }
      const hasEn = languages.some((l) => l.toLowerCase().startsWith('en'));
      if (!hasEn) {
        return {
          ok: false,
          text: `系统语音引擎装了 ${languages.length} 种语言，但没有英文。到「设置 → 无障碍 → 文字转语音」给英文装上语音数据。`,
        };
      }
      await TextToSpeech.speak({
        text: sample,
        lang: 'en-US',
        rate: 0.95,
        pitch: 1,
        volume: 1,
        queueStrategy: QueueStrategy.Flush,
      });
      return { ok: true, text: `已交给系统朗读（引擎支持 ${languages.length} 种语言，含英文）。听到声音就正常。` };
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, text: `系统朗读失败：${m.slice(0, 80)}` };
    }
  }

  try {
    await speak(sample);
    return { ok: true, text: '已调用浏览器语音合成。听到声音就正常。' };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, text: `朗读失败：${m.slice(0, 80)}` };
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

/** 原生识别当前是否在监听（插件是单例，用这个标记避免重复 start） */
let nativeListening = false;

export function stopListening() {
  if (isNative()) {
    if (nativeListening) {
      nativeListening = false;
      void SpeechRecognition.stop().catch(() => {});
    }
    return;
  }
  try {
    activeRecognition?.stop();
  } catch {
    /* ignore */
  }
}

/**
 * 原生环境下的识别。
 *
 * 用 partialResults 模式：start() 立刻返回，识别过程中不断推
 * partialResults 事件（正好对应界面上的实时字幕），
 * 到时间或用户点停时再 stop()，取最后一条作为结果。
 */
async function listenNative(opts: ListenOptions): Promise<ListenResult> {
  // 再确认一次系统级权限（前面 permissionGate 已经过了一遍，
  // 但用户可能在系统里撤销过，这里兜底）
  try {
    let st = await SpeechRecognition.checkPermissions();
    if (st.speechRecognition !== 'granted') {
      st = await SpeechRecognition.requestPermissions();
    }
    if (st.speechRecognition !== 'granted') {
      throw new SpeechError('permission', '没有麦克风权限，已切换到打字模式');
    }
  } catch (e) {
    if (e instanceof SpeechError) throw e;
    // 权限接口本身不可用时继续尝试，交给下面 start() 报真实错误
  }

  try {
    const av = await SpeechRecognition.available();
    if (!av.available) {
      throw new SpeechError(
        'unsupported',
        '这台设备没有可用的语音识别服务，已切换到打字模式',
      );
    }
  } catch (e) {
    if (e instanceof SpeechError) throw e;
  }

  let latest = '';
  const handle = await SpeechRecognition.addListener('partialResults', (data) => {
    const t = data?.matches?.[0]?.trim() ?? '';
    if (t) {
      latest = t;
      opts.onPartial?.(t);
    }
  });

  const timeoutMs = opts.timeoutMs ?? 8000;

  try {
    opts.onStart?.();
    nativeListening = true;

    // partialResults: true → start() 立即返回，结果走事件
    await SpeechRecognition.start({
      language: opts.lang ?? ASR_LANG,
      maxResults: 1,
      partialResults: true,
      popup: false,
    });

    // 等用户说完或超时
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    });

    // 再给一小段时间收尾，避免最后一个词被吞
    await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|not allowed|denied/i.test(msg)) {
      throw new SpeechError('permission', '没有麦克风权限，已切换到打字模式');
    }
    if (/not available|unavailable|no service/i.test(msg)) {
      throw new SpeechError('unsupported', '这台设备没有可用的语音识别服务');
    }
    throw new SpeechError('unknown', `识别失败：${msg.slice(0, 60)}`);
  } finally {
    nativeListening = false;
    void SpeechRecognition.stop().catch(() => {});
    void handle.remove().catch(() => {});
    opts.onEnd?.();
  }

  return { transcript: latest, confidence: 0, empty: !latest.trim() };
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
  if (isNative()) {
    const permitted = await requestPermission('microphone');
    if (!permitted) {
      throw new SpeechError('permission', '没有麦克风权限，已切换到打字模式');
    }
    return listenNative(opts);
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
