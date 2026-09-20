import { Flame, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../store/useProfileStore';
import { useAuthStore } from '../lib/auth';

/**
 * 全局顶栏（5 个导航页共用）。
 *
 * 只保留右侧的功能按钮：连击火焰、排行榜/登录、设置。
 * 等级卡（LV）、等级称号（如「萌新开口」）与 XP 进度条已按产品要求移除，
 * 目的是把手机小屏的顶部空间还给内容。
 */
export function TopBar() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const combo = useProfileStore((s) => s.combo);

  return (
    <header className="safe-top sticky top-0 z-30 bg-cream/95 px-4 pb-2 backdrop-blur">
      <div className="flex items-center justify-end gap-3">
        {combo >= 2 && (
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-sun-100 px-2.5 py-1.5 text-sun-600">
            <Flame size={14} strokeWidth={3} />
            <span className="text-sm font-black">{combo}</span>
          </div>
        )}

        <button
          onClick={() => nav(user ? '/leaderboard' : '/login')}
          aria-label={user ? '排行榜' : '登录'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          {user ? (
            <span className="text-sm font-black text-brand-600">
              {(user.display_name || '?').slice(0, 1)}
            </span>
          ) : (
            <User size={18} strokeWidth={2.6} />
          )}
        </button>

        <button
          onClick={() => nav('/settings')}
          aria-label="设置"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          <Settings size={18} strokeWidth={2.6} />
        </button>
      </div>
    </header>
  );
}
