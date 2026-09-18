/**
 * 题库后台的共用小组件。
 *
 * 项目没有 Tabs / Select / Modal 组件库（ui.tsx 只有
 * Button / Card / Chip / ProgressBar / StarRow / ScoreRing / WordDiff /
 * SectionTitle / Confetti），所以这里用 chip 组 + 原生控件拼，
 * 不引任何新依赖。
 */
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Chip } from '../ui';

/* ─────────────── 单选 chip 组 ─────────────── */

export interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={clsx(
              'rounded-2xl border-2 px-3.5 py-2 text-left transition-colors active:scale-[0.98]',
              on ? 'border-brand-500 bg-brand-50' : 'border-ink/8 bg-white',
            )}
          >
            <span
              className={clsx(
                'block text-[13px] font-black',
                on ? 'text-brand-700' : 'text-ink',
              )}
            >
              {o.label}
            </span>
            {o.desc && (
              <span className="mt-0.5 block text-[10px] leading-tight text-ink-faint">
                {o.desc}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────── 多选 chip 组 ─────────────── */

export function ChipMulti<T extends string>({
  options,
  value,
  onChange,
  emptyHint,
}: {
  options: Option<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  emptyHint?: string;
}) {
  const toggle = (v: T) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  if (!options.length) {
    return <p className="text-[12px] text-ink-faint">{emptyHint ?? '暂无可选项'}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors active:scale-[0.97]',
              on ? 'bg-brand-500 text-white' : 'bg-ink/6 text-ink-soft',
            )}
          >
            {on && <Check size={12} strokeWidth={3.5} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────── 只读 chip ─────────────── */

export function ToneChip({
  tone,
  children,
}: {
  tone: string;
  children: ReactNode;
}) {
  return <Chip tone={tone}>{children}</Chip>;
}

/* ─────────────── 校验状态点 ─────────────── */

export type VerdictTone = 'passed' | 'doubtful' | 'rejected';

const VERDICT_STYLE: Record<VerdictTone, { dot: string; text: string; label: string; bg: string }> = {
  passed: { dot: 'bg-mint-500', text: 'text-mint-700', label: '通过', bg: 'bg-mint-50' },
  doubtful: { dot: 'bg-sun-500', text: 'text-sun-600', label: '存疑', bg: 'bg-sun-50' },
  rejected: { dot: 'bg-coral-500', text: 'text-coral-600', label: '驳回', bg: 'bg-coral-50' },
};

export function VerdictBadge({ verdict }: { verdict: VerdictTone }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black',
        s.bg,
        s.text,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

export function verdictStyle(v: VerdictTone) {
  return VERDICT_STYLE[v];
}

/* ─────────────── 分段进度条 ─────────────── */

export function StatSegments({
  items,
}: {
  items: { label: string; value: number; tone: string }[];
}) {
  return (
    <div className="flex gap-3">
      {items.map((it) => (
        <div key={it.label} className="flex-1 text-center">
          <p className={clsx('text-xl font-black', it.tone)}>{it.value}</p>
          <p className="mt-0.5 text-[10px] font-bold text-ink-faint">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── 数字输入 ─────────────── */

export function NumberField({
  value,
  onChange,
  min = 1,
  max = 999,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(Math.max(min, Math.min(max, Math.round(n))));
        }}
        className="w-20 rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-center text-sm font-black text-ink outline-none focus:border-brand-400"
      />
      {suffix && <span className="text-[12px] font-bold text-ink-faint">{suffix}</span>}
    </div>
  );
}

/* ─────────────── 原生下拉 ─────────────── */

export function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full appearance-none rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-black text-ink outline-none focus:border-brand-400"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
