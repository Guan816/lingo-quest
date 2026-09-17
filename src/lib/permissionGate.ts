/**
 * 权限门控（Permission Gate）。
 *
 * 目标：某个功能要用权限但用户还没开时，**自动**弹一个应用内说明，
 * 用户点「允许」之后再触发系统授权框。
 *
 * 为什么不直接调 getUserMedia 了事：
 *   - 直接调，系统框会毫无预兆地蹦出来，用户不知道为什么要给；
 *   - 一旦被拒，再调就再也不弹了，用户会以为功能坏了。
 *   所以先讲清用途，再走授权；被拒时给出去系统设置的指引。
 *
 * 这个模块只负责状态与流程，不渲染任何东西 —— 界面在
 * components/PermissionGate.tsx 里，挂在 App 根部。
 */
import { queryPermission, requestMicrophone } from './permissions';

/** 目前只有麦克风需要运行时申请（文件走 SAF，不需要权限） */
export type GatePermission = 'microphone';

export interface PendingRequest {
  name: GatePermission;
  /** 为什么需要这个权限，展示给用户看 */
  reason: string;
  /**
   * 已经试过系统授权但被拒了。
   * 这时弹窗不能直接关掉 —— 关掉用户就只看到一句「没权限」，
   * 不知道该去哪开。要切成「去系统设置」的指引再让用户手动关闭。
   */
  failed: boolean;
}

/** 权限的中文名与说明，弹窗直接用 */
export const PERMISSION_META: Record<
  GatePermission,
  { label: string; title: string; detail: string }
> = {
  microphone: {
    label: '麦克风',
    title: '需要用一下麦克风',
    detail:
      '语音识别要靠它听你说了什么，用来打分和判断句子有没有说对。' +
      '不同意也没关系，会自动切换成打字模式，功能照样能用。',
  },
};

/* ─────────────── 内部状态 ─────────────── */

type Listener = () => void;

let pending: PendingRequest | null = null;
let waiters: ((ok: boolean) => void)[] = [];
const listeners = new Set<Listener>();

/** 本次会话内已确认可用的权限，避免反复弹 */
const granted = new Set<GatePermission>();

/** 已被系统拒绝过的，记下来以便给出「去设置里开」的指引 */
const denied = new Set<GatePermission>();

function emit() {
  listeners.forEach((l) => l());
}

function settle(ok: boolean) {
  const name = pending?.name;
  if (name) {
    if (ok) {
      granted.add(name);
      denied.delete(name);
    } else {
      denied.add(name);
    }
  }
  pending = null;
  const ws = waiters;
  waiters = [];
  emit();
  ws.forEach((w) => w(ok));
}

/* ─────────────── 对外接口 ─────────────── */

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getPending(): PendingRequest | null {
  return pending;
}

export function isGranted(name: GatePermission): boolean {
  return granted.has(name);
}

export function isDenied(name: GatePermission): boolean {
  return denied.has(name);
}

/** 外部（如设置页自测）确认权限可用时，同步一下状态 */
export function markGranted(name: GatePermission): void {
  granted.add(name);
  denied.delete(name);
}

/**
 * 请求权限。已可用时直接返回 true；否则弹应用内说明并等用户选择。
 * 同一时刻只显示一个弹窗，多个调用共享同一次结果。
 */
export async function requestPermission(
  name: GatePermission,
  reason?: string,
): Promise<boolean> {
  if (granted.has(name)) return true;

  // 先问一下浏览器 —— 可能系统层面早就授权了，不必打扰用户
  const st = await queryPermission(name);
  if (st.granted) {
    granted.add(name);
    return true;
  }

  return new Promise<boolean>((resolve) => {
    waiters.push(resolve);
    if (pending) return; // 已有弹窗在等，复用它
    pending = {
      name,
      reason: reason || PERMISSION_META[name].detail,
      failed: false,
    };
    emit();
  });
}

/**
 * 用户在弹窗里点了「允许」。
 * 这里才真正触发系统授权框（getUserMedia 会拉起它）。
 *
 * 被拒时**不关闭弹窗**，而是把它切到「去设置」指引状态，
 * 让用户知道下一步该做什么。等用户点「知道了」再真正关掉。
 */
export async function confirmPending(): Promise<boolean> {
  if (!pending) return false;
  const name = pending.name;

  let ok = false;
  if (name === 'microphone') {
    ok = await requestMicrophone();
  }

  if (ok) {
    settle(true);
    return true;
  }

  // 系统拒绝了：留在原地，切到指引态
  denied.add(name);
  pending = { ...pending, failed: true };
  emit();
  return false;
}

/** 用户点了「暂不」 */
export function cancelPending(): void {
  settle(false);
}

/** 用户在被拒后的指引态点了「知道了」 */
export function dismissFailed(): void {
  settle(false);
}
