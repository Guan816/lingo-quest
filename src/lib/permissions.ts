/**
 * Android 权限处理。
 *
 * 关键背景（这部分和直觉相反，写下来免得以后踩坑）：
 *
 * 1) **选文件不需要运行时权限**
 *    `<input type="file">` 在 Capacitor 的 WebView 里会走 Android 的
 *    存储访问框架（SAF）——系统弹出选择器，用户选中哪个文件就授权哪个，
 *    应用本身拿不到整个存储的访问权。所以「上传试卷」这个动作
 *    在现代 Android 上**不需要申请任何权限**，Manifest 里声明的
 *    READ_EXTERNAL_STORAGE 只是给 Android 12 及以下的老设备兜底。
 *
 * 2) **千万别随便声明 CAMERA**
 *    如果只用 `<input capture>` 让系统相机应用去拍照，照片由那个应用拍摄、
 *    通过 URI 回传，我们不需要 CAMERA 权限。
 *    但如果 Manifest 里声明了 CAMERA 却没在运行时授予，
 *    系统会**拒绝** ACTION_IMAGE_CAPTURE 请求 —— 也就是说，
 *    多声明这个权限反而会让拍照功能挂掉。所以这里刻意不声明它。
 *
 * 3) **麦克风才真正需要运行时申请**
 *    Web Speech API 的识别功能依赖 RECORD_AUDIO。Manifest 声明了还不够，
 *    Android 6+ 还要在运行时弹窗申请。
 */

export type PermissionName = 'microphone' | 'storage';

export interface PermissionStatus {
  /** 是否已获得授权 */
  granted: boolean;
  /** 是否无法判定（浏览器不支持 Permissions API） */
  unknown: boolean;
  /** 给用户看的说明 */
  hint: string;
}

/** 当前是否跑在 Capacitor 原生壳里（而不是普通浏览器） */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  const cap = w.Capacitor as { isNativePlatform?: () => boolean } | undefined;
  try {
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/**
 * 查询权限状态。
 * 尽量用 Permissions API；不支持时返回 unknown，由调用方按「先试再说」处理。
 */
export async function queryPermission(name: PermissionName): Promise<PermissionStatus> {
  const hintMap: Record<PermissionName, string> = {
    microphone: '语音识别需要麦克风权限。没授权时会自动切换到打字模式，不影响使用。',
    storage: '读取试卷文件由系统文件选择器授权，通常无需额外权限。',
  };

  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return { granted: false, unknown: true, hint: hintMap[name] };
  }

  try {
    // 注意：Chrome/WebView 对 'microphone' 支持较好；
    // 'storage' 在多数 WebView 里不存在，会抛错，这里直接兜底。
    const status = await navigator.permissions.query({
      name: name === 'microphone' ? 'microphone' : ('storage' as PermissionName),
    } as PermissionDescriptor);
    return {
      granted: status.state === 'granted',
      unknown: status.state === 'prompt',
      hint: hintMap[name],
    };
  } catch {
    return { granted: false, unknown: true, hint: hintMap[name] };
  }
}

/**
 * 触发麦克风授权弹窗。
 *
 * 两种环境走法不同：
 *  - **原生 App**：优先用 speech-recognition 插件的 requestPermissions，
 *    它直接调 Android 的 RECORD_AUDIO 授权流程，最可靠。
 *    WebView 里的 getUserMedia 不保证能拉起系统授权框。
 *  - **浏览器**：用 getUserMedia，浏览器会弹授权框。
 *
 * 拿到权限后立刻把音频轨道关掉，只为了把权限「点亮」。
 */
export async function requestMicrophone(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      let st = await SpeechRecognition.checkPermissions();
      if (st.speechRecognition !== 'granted') {
        st = await SpeechRecognition.requestPermissions();
      }
      if (st.speechRecognition === 'granted') return true;
    } catch {
      /* 插件不可用就退回下面的 getUserMedia */
    }
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * 上传文件前的准备。
 *
 * 因为走 SAF，这一步实际上什么都不用做；保留它是为了让调用点
 * 的意图明确（「准备上传」而不是「直接上传」），
 * 将来若切到需要权限的方案，改这里一处即可。
 */
export async function prepareFileAccess(): Promise<{ ok: boolean; message?: string }> {
  return { ok: true };
}

/**
 * 文件大小上限。
 *
 * 【当前 15MB（2026-09-20 从 8MB 上调）】
 * 这个上限看着是「前端能选多大的文件」，其实卡的是**服务端那一跳**：
 * 图片要转成 base64 塞进 JSON，**base64 会让体积膨胀约 33%**。
 * 15MB 的图到服务端时约 20MB 请求体，因此服务端那条线的配置必须同步：
 *   · server/src/app.ts 的 `express.json({ limit: '32mb' })`（/api/ai）
 *   · server/src/routes/ai.ts 的 `MAX_IMAGE_CHARS`（21_000_000 ≈ 20MB 字符）
 * 三处要一起改，只改一处就会表现为「选得了但传不上去」。
 *
 * 另外：图片在 paper.ts 里会先压缩到 1.6MB 再上路，
 * 所以这个 15MB 只是「源文件允许多大」，真正发给模型的体积由压缩逻辑决定。
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

/** base64 编码后的体积膨胀系数（4/3 再加一点 JSON 包装开销） */
export const BASE64_OVERHEAD = 1.34;

/** 估算一个字节数转成 base64 之后的体积 */
export function base64Size(bytes: number): number {
  return Math.ceil(bytes * BASE64_OVERHEAD);
}

export interface FileCheckResult {
  ok: boolean;
  message?: string;
}

/** 上传前的基本校验：类型、大小 */
export function checkUploadable(file: File): FileCheckResult {
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isImg =
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|heic)$/.test(name);
  const isText =
    file.type.startsWith('text/') ||
    /\.(txt|md|csv)$/.test(name);

  if (!isPdf && !isImg && !isText) {
    return { ok: false, message: '目前支持 PDF、图片（JPG/PNG 等）和纯文本文件' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      message:
        `文件 ${mb}MB 超过 15MB 上限。` +
        '扫描版 PDF 尤其大 —— 可以只截取要用的那几页，或者用图片方式分页上传。',
    };
  }
  if (file.size === 0) {
    return { ok: false, message: '这是个空文件' };
  }
  return { ok: true };
}

/** 把字节数转成好读的字符串 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
