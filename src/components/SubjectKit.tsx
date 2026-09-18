/**
 * 数学 / 计算机两个科目共用的入口页骨架与子组件。
 *
 * 【统一的展示规范】三个科目页（高数 / 计算机 / 英语）都用这一套：
 *   SubjectHero   顶部渐变卡：tag + 标题 + 2 行核心文案 + 3 个统计项
 *   StructureCard 试卷结构 & 分值：题型 + 题量 + 分值 列表 + 1 句备考提示
 *   DrillButton   刷题入口大按钮：标题 + 1 行说明
 *   MiniEntry     半宽小入口（专项练习）
 *   ChapterCard   章节卡：名称 + 1 行考点 + 进度条 + 分值权重星
 */

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
  /** 核心文案，只放 2 行：分值占比 + 备考建议 */
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

/**
 * 试卷结构与分值。
 * 三个科目页共用同一个标题「试卷结构 & 分值」，避免各页叫法不一。
 */
export function StructureCard({
  rows,
  tip,
  icon,
  accent = 'border-brand-500',
  iconClass = 'text-brand-600',
}: {
  /** 每一行：题型 + 题量 + 分值 */
  rows: { name: string; count: string; score: string }[];
  /** 底部 1 句备考提示 */
  tip: string;
  icon: ReactNode;
  accent?: string;
  iconClass?: string;
}) {
  return (
    <section className={`card border-l-4 p-4 ${accent}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${iconClass}`}>{icon}</span>
        <div className="w-full text-xs leading-relaxed text-ink-soft">
          <p className="mb-2 text-sm font-black text-ink">试卷结构 &amp; 分值</p>
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.name} className="flex items-baseline gap-2">
                <span className="w-[74px] shrink-0 font-bold text-ink">{r.name}</span>
                <span className="min-w-0 flex-1 truncate text-ink-faint">{r.count}</span>
                <span className="shrink-0 font-black text-ink">{r.score}</span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 border-t border-ink/8 pt-2 text-ink-faint">{tip}</p>
        </div>
      </div>
    </section>
  );
}

/** 刷题入口大按钮（说明控制在一行） */
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
        <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-white/85">
          {desc}
        </span>
      </span>
      <ChevronRight size={18} strokeWidth={2.8} />
    </button>
  );
}

/** 半宽小入口：专项练习用（说明只有一行） */
export function MiniEntry({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 rounded-2xl border-2 border-ink/8 bg-white p-3.5 text-left active:border-brand-300"
    >
      {icon}
      <span className="text-sm font-black text-ink">{title}</span>
      <span className="w-full truncate text-[11px] leading-relaxed text-ink-faint">{desc}</span>
    </button>
  );
}

/**
 * 章节卡片。
 *   hint   —— 考点说明，压到 1 行
 *   done / total —— 做题进度条
 *   weight —— 「分值权重」星（不是熟练度！练得再多也不会涨星）
 */
export function ChapterCard({
  name,
  hint,
  count,
  stars,
  maxStars,
  accuracy,
  done = 0,
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
  /** 已做题数（用于进度条） */
  done?: number;
  onClick: () => void;
  badge?: string;
  icon?: ReactNode;
}) {
  const total = Math.max(1, count);
  const ratio = Math.min(1, done / total);
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
          {/* 星 = 分值权重，跟做题多少无关 */}
          <span
            className="ml-auto shrink-0 text-[10px] text-sun-500"
            title={`分值权重 ${stars}/${maxStars}`}
          >
            {'★'.repeat(stars)}
            {'☆'.repeat(Math.max(0, maxStars - stars))}
          </span>
        </div>

        <p className="mt-1 truncate text-[11px] leading-relaxed text-ink-faint">{hint}</p>

        {/* 进度条：已做 / 总题数 */}
        <div className="mt-2 flex items-center gap-2">
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/8">
            <span
              className="block h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${ratio * 100}%` }}
            />
          </span>
          <span className="shrink-0 text-[10px] font-bold text-ink-faint">
            {done}/{count}
          </span>
          {accuracy !== null && (
            <span className="shrink-0 text-[10px] font-bold text-mint-600">{accuracy}%</span>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="mt-1 shrink-0 text-ink-faint" strokeWidth={2.6} />
    </button>
  );
}
