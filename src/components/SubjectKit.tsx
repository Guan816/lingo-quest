/** 数学 / 计算机两个科目共用的入口页骨架与子组件 */

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** 顶部渐变横幅 */
export function SubjectHero({
  tag,
  tagIcon,
  title,
  desc,
  stats,
  bg,
  deco,
}: {
  tag: string;
  tagIcon: ReactNode;
  title: string;
  desc: string;
  stats: { label: string; value: ReactNode }[];
  bg: string;
  deco: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden rounded-[28px] p-5 text-white shadow-card ${bg}`}>
      <div className="relative z-10">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-black">
          {tagIcon}
          {tag}
        </span>
        <h1 className="text-balance text-2xl font-black leading-tight">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-white/85">{desc}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {stats.map((s, i) => (
            <div key={i} className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-lg font-black leading-none">{s.value}</p>
              <p className="mt-1 text-[10px] font-bold text-white/80">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-5 -top-5 text-white/15">{deco}</div>
    </section>
  );
}

/** 章节卡片（点进去刷这一章） */
export function ChapterCard({
  name,
  hint,
  count,
  stars,
  maxStars,
  accuracy,
  onClick,
  badge,
  icon,
}: {
  name: string;
  hint: string;
  count: number;
  stars: number;
  maxStars: number;
  accuracy: number | null;
  onClick: () => void;
  badge?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border-2 border-ink/8 bg-white p-3.5 text-left transition-colors active:border-brand-300"
    >
      {icon && (
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black text-ink">{name}</p>
          {badge && (
            <span className="shrink-0 rounded-full bg-grape-100 px-1.5 py-0.5 text-[9px] font-black text-grape-600">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-faint">{hint}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-bold text-ink-faint">
          <span>{count} 题</span>
          {accuracy !== null && <span>正确率 {accuracy}%</span>}
          <span className="text-sun-500">{'★'.repeat(stars)}{'☆'.repeat(Math.max(0, maxStars - stars))}</span>
        </div>
      </div>
      <ChevronRight size={18} className="mt-1 shrink-0 text-ink-faint" strokeWidth={2.6} />
    </button>
  );
}

/** 刷题入口大按钮 */
export function DrillButton({
  icon,
  title,
  desc,
  onClick,
  disabled,
  tone = 'brand',
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'brand' | 'mint' | 'sun';
}) {
  const tones = {
    brand: 'from-brand-500 to-brand-600',
    mint: 'from-mint-500 to-mint-600',
    sun: 'from-sun-500 to-coral-500',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-pop transition-transform active:scale-[0.98] disabled:opacity-50 ${tones[tone]}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/25">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-white/85">{desc}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2.8} />
    </button>
  );
}
