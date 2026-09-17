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
 * 没有 @capacitor/permissions 插件时，最可靠的触发方式是直接调用
 * getUserMedia —— 浏览器/WebView 会弹出系统授权框。
 * 拿到流之后立刻关掉所有轨道，只为了把权限「点亮」。
 */
export async function requestMicrophone(): Promise<boolean> {
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

/** 文件大小上限（AI 解析要传 base64，太大既慢又容易失败） */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12MB

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
    return { ok: false, message: `文件 ${mb}MB 超过 12MB 上限，请压缩或只上传需要的部分` };
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
