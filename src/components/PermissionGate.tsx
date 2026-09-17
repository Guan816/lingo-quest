/**
 * 权限申请弹窗。
 *
 * 挂在 App 根部，全局只此一个实例。
 * 任何地方调用 requestPermission() 都会让它显示出来。
 *
 * 两个状态：
 *   1) 询问态  —— 讲清用途，给「暂不 / 允许」
 *   2) 指引态  —— 点了允许但系统拒绝，改成告诉用户去哪手动开
 *      （不能直接关掉，否则用户只知道「没权限」，不知道怎么办）
 */
import { useState, useSyncExternalStore } from 'react';
import { Mic, ShieldAlert, Loader2 } from 'lucide-react';
import {
  cancelPending,
  confirmPending,
  dismissFailed,
  getPending,
  PERMISSION_META,
  subscribe,
} from '../lib/permissionGate';

export function PermissionGate() {
  const pending = useSyncExternalStore(subscribe, getPending, () => null);
  const [busy, setBusy] = useState(false);

  if (!pending) return null;

  const meta = PERMISSION_META[pending.name];
  const inGuidance = pending.failed;

  const allow = async () => {
    setBusy(true);
    await confirmPending();
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
    >
      <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-card">
        {/* 图标 + 标题 */}
        <div className="flex items-start gap-3.5">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${
              inGuidance
                ? 'bg-gradient-to-br from-sun-500 to-coral-500'
                : 'bg-gradient-to-br from-brand-500 to-grape-500'
            }`}
          >
            {inGuidance ? (
              <ShieldAlert size={22} strokeWidth={2.6} />
            ) : (
              <Mic size={22} strokeWidth={2.6} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black leading-tight text-ink">
              {inGuidance ? '系统里没给权限' : meta.title}
            </p>
            {!inGuidance && (
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{meta.detail}</p>
            )}
          </div>
        </div>

        {/* 被拒绝后的指引 */}
        {inGuidance && (
          <div className="mt-4 rounded-2xl bg-sun-50 px-3.5 py-3">
            <p className="text-[12px] font-bold leading-relaxed text-sun-700">
              刚才的授权被系统拒绝了。到手机的
              <b className="text-ink"> 设置 → 应用 → 漫记 → 权限 </b>
              里把「{meta.label}」打开，回来再点一次就行。
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-sun-600">
              在此之前，语音相关的地方会自动切换成打字模式，不影响使用。
            </p>
          </div>
        )}

        {/* 操作 */}
        <div className="mt-5 flex gap-2">
          {inGuidance ? (
            <button
              onClick={dismissFailed}
              className="flex-1 rounded-2xl bg-brand-500 py-3 text-sm font-black text-white shadow-pop btn-pop"
            >
              知道了
            </button>
          ) : (
            <>
              <button
                onClick={cancelPending}
                disabled={busy}
                className="flex-1 rounded-2xl bg-ink/6 py-3 text-sm font-black text-ink-soft disabled:opacity-50"
              >
                暂不
              </button>
              <button
                onClick={allow}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3 text-sm font-black text-white shadow-pop btn-pop disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                {busy ? '等待系统…' : '允许'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
