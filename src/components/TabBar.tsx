import { BarChart3, Cpu, GraduationCap, Home, Sigma } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const TABS = [
  { to: '/', label: '首页', icon: Home },
  { to: '/cet4', label: '英语', icon: GraduationCap },
  { to: '/math', label: '数学', icon: Sigma },
  { to: '/cs', label: '计算机', icon: Cpu },
  { to: '/stats', label: '我的', icon: BarChart3 },
];

export function TabBar() {
  return (
    <nav className="safe-bottom sticky bottom-0 z-30 border-t border-ink/5 bg-white/95 px-2 pt-1.5 backdrop-blur">
      <div className="flex items-stretch">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition-colors',
                isActive ? 'text-brand-600' : 'text-ink-faint',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'grid h-8 w-12 place-items-center rounded-xl transition-all',
                    isActive ? 'bg-brand-100' : 'bg-transparent',
                  )}
                >
                  <Icon size={20} strokeWidth={2.6} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
