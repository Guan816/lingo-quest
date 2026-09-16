import { Flame, Settings2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore, useTodayXp } from '../store/useProfileStore';
import { useAuthStore } from '../lib/auth';
import { levelInfo } from '../lib/gamification';

export function TopBar() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const xp = useProfileStore((s) => s.xp);
  const combo = useProfileStore((s) => s.combo);
  const dailyGoal = useProfileStore((s) => s.dailyGoal);
  const todayXp = useTodayXp();
  const info = levelInfo(xp);
  const dayPct = Math.min(1, todayXp / Math.max(1, dailyGoal));

  return (
    <header className="safe-top sticky top-0 z-30 bg-cream/95 px-4 pb-2 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={() => nav('/stats')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white shadow-pop-sm btn-pop"
        >
          <span className="text-[10px] font-black leading-none">LV</span>
          <span className="text-sm font-black leading-none">{info.level}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="truncate text-xs font-bold text-ink-soft">{info.title}</span>
            <span className="text-xs font-bold text-ink-faint">
              今日 {todayXp}/{dailyGoal} XP
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
              style={{ width: `${dayPct * 100}%` }}
            />
          </div>
        </div>

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
          <Settings2 size={18} strokeWidth={2.6} />
        </button>
      </div>
    </header>
  );
}
