import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Lock, Star, Swords } from 'lucide-react';
import { WORLDS } from '../data/curriculum';
import { useProfileStore } from '../store/useProfileStore';
import { SectionTitle, StarRow } from '../components/ui';

export default function MapPage() {
  const nav = useNavigate();
  const progress = useProfileStore((s) => s.progress);

  // 线性解锁：前一关通关才能进下一关
  let unlockedSoFar = true;

  return (
    <div className="space-y-5 pt-1">
      <div>
        <SectionTitle>闯关地图</SectionTitle>
        <p className="px-1 text-xs text-ink-faint">每关 2 分钟，通关拿星星，集满星星解锁下一片区域。</p>
      </div>

      {WORLDS.map((world, wi) => {
        const cleared = world.levels.filter((l) => progress[l.id]?.cleared).length;
        const stars = world.levels.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0);
        const maxStars = world.levels.length * 3;

        return (
          <section key={world.id} className="card overflow-hidden p-0">
            <div className={clsx('bg-gradient-to-r p-4 text-white', world.gradient)}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{world.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-black">
                    {wi + 1}. {world.name}
                  </h3>
                  <p className="truncate text-xs text-white/85">{world.subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/25 px-2 py-1 text-xs font-black">
                  <Star size={12} strokeWidth={3} fill="currentColor" />
                  {stars}/{maxStars}
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${(cleared / world.levels.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto p-4 hide-scroll">
              {world.levels.map((lv) => {
                const p = progress[lv.id];
                const unlocked = unlockedSoFar;
                // 本关通关后，下一关才解锁
                unlockedSoFar = unlockedSoFar && Boolean(p?.cleared);

                return (
                  <button
                    key={lv.id}
                    disabled={!unlocked}
                    onClick={() => nav(`/play/${lv.id}`)}
                    className="flex shrink-0 flex-col items-center gap-1.5 px-1"
                  >
                    <span
                      className={clsx(
                        'grid h-14 w-14 place-items-center rounded-2xl border-2 text-lg font-black transition-all',
                        !unlocked && 'border-ink/10 bg-ink/5 text-ink-faint',
                        unlocked && !p?.cleared && 'border-brand-500 bg-brand-50 text-brand-600 animate-float',
                        p?.cleared && 'border-sun-500 bg-sun-100 text-sun-600',
                      )}
                      style={{ boxShadow: unlocked && !p?.cleared ? '0 0 0 4px rgba(59,102,246,.16)' : undefined }}
                    >
                      {!unlocked ? (
                        <Lock size={18} strokeWidth={3} />
                      ) : lv.kind === 'boss' ? (
                        <Swords size={22} strokeWidth={2.6} />
                      ) : (
                        lv.order
                      )}
                    </span>
                    <span
                      className={clsx(
                        'max-w-[68px] truncate text-center text-[11px] font-bold',
                        unlocked ? 'text-ink-soft' : 'text-ink-faint',
                      )}
                    >
                      {lv.title}
                    </span>
                    <StarRow count={p?.stars ?? 0} size={11} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="h-2" />
    </div>
  );
}
