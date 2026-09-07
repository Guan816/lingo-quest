import type { ReactNode } from 'react';
import { useState } from 'react';
import { Flame, Mic2, Sparkles, Sword, Timer, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { ACHIEVEMENTS } from '../data/achievements';
import { ALL_LEVELS, WORLDS } from '../data/curriculum';
import { levelInfo } from '../lib/gamification';
import { formatMinutes, streakOf, todayKey } from '../lib/utils';
import { useProfileStore } from '../store/useProfileStore';
import { Button, ProgressBar, SectionTitle } from '../components/ui';

export default function Stats() {
  const stats = useProfileStore((s) => s.stats);
  const achievements = useProfileStore((s) => s.achievements);
  const progress = useProfileStore((s) => s.progress);
  const resetProfile = useProfileStore((s) => s.resetProfile);
  const [confirmReset, setConfirmReset] = useState(false);

  const info = levelInfo(stats.totalXp);
  const streak = streakOf(stats.practiceDays);
  const totalStars = Object.values(progress).reduce((a, p) => a + p.stars, 0);
  const cleared = Object.values(progress).filter((p) => p.cleared).length;

  return (
    <div className="space-y-6 pt-1">
      {/* 等级卡 */}
      <section className="rounded-[28px] bg-gradient-to-br from-brand-500 to-grape-600 p-5 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white/20">
            <span className="text-[10px] font-black leading-none opacity-80">LV</span>
            <span className="text-3xl font-black leading-none">{info.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black">{info.title}</p>
            <p className="text-xs text-white/85">累计 {stats.totalXp} XP</p>
            <div className="mt-2">
              <ProgressBar
                value={info.ratio}
                barClass="bg-white"
                height="h-2"
                className="bg-white/25"
              />
              <p className="mt-1 text-[11px] text-white/80">
                {info.current} / {info.need} 升到 Lv.{info.level + 1}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 数据 */}
      <section>
        <SectionTitle>练习数据</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={<Mic2 size={16} strokeWidth={3} />} value={stats.sentencesSpoken} label="开口句数" tone="text-brand-600" />
          <Metric icon={<TrendingUp size={16} strokeWidth={3} />} value={stats.perfectScores} label="90 分以上" tone="text-mint-600" />
          <Metric icon={<Flame size={16} strokeWidth={3} />} value={streak} label="连续天数" tone="text-coral-500" />
          <Metric icon={<Sword size={16} strokeWidth={3} />} value={stats.bossCleared} label="击败 BOSS" tone="text-grape-500" />
          <Metric icon={<Sparkles size={16} strokeWidth={3} />} value={stats.wordsLearned.length} label="掌握词汇" tone="text-sun-600" />
          <Metric icon={<Timer size={16} strokeWidth={3} />} value={formatMinutes(stats.minutesSpoken)} label="开口时长" tone="text-ink" />
        </div>
      </section>

      {/* 闯关进度 */}
      <section>
        <SectionTitle
          action={
            <span className="text-xs font-black text-ink-faint">
              {cleared}/{ALL_LEVELS.length} 关 · {totalStars} 星
            </span>
          }
        >
          闯关进度
        </SectionTitle>
        <div className="card space-y-3 p-4">
          {WORLDS.map((w) => {
            const c = w.levels.filter((l) => progress[l.id]?.cleared).length;
            return (
              <div key={w.id}>
                <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft">
                  <span>
                    {w.emoji} {w.name}
                  </span>
                  <span>
                    {c}/{w.levels.length}
                  </span>
                </div>
                <ProgressBar value={c / w.levels.length} barClass="bg-sun-500" height="h-2" />
              </div>
            );
          })}
        </div>
      </section>

      {/* 打卡 */}
      <section>
        <SectionTitle>最近 14 天</SectionTitle>
        <div className="card p-4">
          <div className="flex justify-between gap-1">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const key = todayKey(d);
              const on = stats.practiceDays.includes(key);
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <span
                    className={clsx(
                      'h-7 w-7 rounded-lg',
                      on ? 'bg-mint-500' : 'bg-ink/8',
                      key === todayKey() && !on && 'ring-2 ring-brand-300',
                    )}
                  />
                  <span className="text-[9px] font-bold text-ink-faint">{d.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 成就 */}
      <section>
        <SectionTitle
          action={
            <span className="text-xs font-black text-ink-faint">
              {achievements.length}/{ACHIEVEMENTS.length}
            </span>
          }
        >
          成就徽章
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={clsx(
                  'card flex items-center gap-3 p-3',
                  got ? '' : 'opacity-45 grayscale',
                )}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink/5 text-xl">
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink">{a.name}</p>
                  <p className="truncate text-[11px] text-ink-faint">{a.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 危险区 */}
      <section className="pb-4">
        {confirmReset ? (
          <div className="card space-y-3 p-4">
            <p className="text-sm font-black text-coral-600">确定清空全部进度？</p>
            <p className="text-xs text-ink-soft">经验、星星、成就、打卡记录都会消失，且无法恢复。</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                取消
              </Button>
              <Button
                variant="coral"
                size="sm"
                onClick={() => {
                  resetProfile();
                  setConfirmReset(false);
                }}
              >
                确认清空
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full rounded-2xl bg-white py-3 text-sm font-black text-coral-600 shadow-pop-sm btn-pop"
          >
            清空练习数据
          </button>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  tone: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink/5', tone)}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-black text-ink">{value}</p>
        <p className="truncate text-[11px] font-bold text-ink-faint">{label}</p>
      </div>
    </div>
  );
}
