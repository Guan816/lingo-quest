import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { Star } from 'lucide-react';

/* ─────────────────────────── Button ─────────────────────────── */

type Variant = 'primary' | 'mint' | 'sun' | 'coral' | 'grape' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white shadow-pop border-brand-700/20',
  mint: 'bg-mint-500 text-white shadow-pop border-mint-600/20',
  sun: 'bg-sun-500 text-white shadow-pop border-sun-600/20',
  coral: 'bg-coral-500 text-white shadow-pop border-coral-600/20',
  grape: 'bg-grape-500 text-white shadow-pop border-grape-600/20',
  ghost: 'bg-transparent text-ink-soft',
  outline: 'bg-white text-ink border-2 border-ink/10 shadow-pop-sm',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm rounded-2xl',
  md: 'px-5 py-3 text-base rounded-2xl',
  lg: 'px-6 py-4 text-lg rounded-3xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'btn-pop inline-flex items-center justify-center gap-2 border font-bold select-none',
        'disabled:opacity-45 disabled:active:translate-y-0 disabled:shadow-pop-sm',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/* ─────────────────────────── Card ─────────────────────────── */

export function Card({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={clsx('card p-4', className)}>
      {children}
    </div>
  );
}

/* ─────────────────────────── Chip ─────────────────────────── */

const CHIP_TONES: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-700',
  mint: 'bg-mint-100 text-mint-600',
  sun: 'bg-sun-100 text-sun-600',
  coral: 'bg-coral-100 text-coral-600',
  grape: 'bg-grape-100 text-grape-600',
  gray: 'bg-ink/5 text-ink-soft',
};

export function Chip({
  tone = 'gray',
  className,
  children,
}: {
  tone?: keyof typeof CHIP_TONES | string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        CHIP_TONES[tone] ?? CHIP_TONES.gray,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ───────────────────────── ProgressBar ───────────────────────── */

export function ProgressBar({
  value,
  className,
  barClass = 'bg-brand-500',
  height = 'h-3',
  striped,
}: {
  value: number;
  className?: string;
  barClass?: string;
  height?: string;
  striped?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={clsx('w-full overflow-hidden rounded-full bg-ink/10', height, className)}>
      <div
        className={clsx('h-full rounded-full transition-all duration-500', barClass, striped && 'stripes')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─────────────────────────── Stars ─────────────────────────── */

export function StarRow({
  count,
  total = 3,
  size = 16,
  animate,
  delayStep = 140,
}: {
  count: number;
  total?: number;
  size?: number;
  animate?: boolean;
  delayStep?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={animate ? 'animate-star-pop' : undefined}
          style={animate ? { animationDelay: `${i * delayStep}ms` } : undefined}
        >
          <Star
            size={size}
            strokeWidth={2.5}
            className={i < count ? 'fill-sun-500 text-sun-500' : 'fill-ink/10 text-ink/10'}
          />
        </span>
      ))}
    </div>
  );
}

/* ────────────────────────── ScoreRing ────────────────────────── */

function ringColor(score: number): string {
  if (score >= 92) return '#22c58a';
  if (score >= 80) return '#3b66f6';
  if (score >= 65) return '#ffb020';
  return '#ff6b5b';
}

export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 100));
  const color = ringColor(score);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef7" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.34,1.2,.64,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-2xl font-black" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── 逐词染色 ───────────────────────── */

export function WordDiff({ words }: { words: { text: string; ok: boolean }[] }) {
  return (
    <p className="text-center text-lg leading-relaxed">
      {words.map((w, i) => (
        <span
          key={`${w.text}-${i}`}
          className={clsx(
            'mx-0.5 rounded px-1 font-semibold',
            w.ok ? 'text-ink' : 'bg-coral-100 text-coral-600 underline decoration-wavy',
          )}
        >
          {w.text}
        </span>
      ))}
    </p>
  );
}

/* ───────────────────────── SectionTitle ───────────────────────── */

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h2 className="text-lg font-black tracking-tight text-ink">{children}</h2>
      {action}
    </div>
  );
}

/* ─────────────────────────── Confetti ─────────────────────────── */

export function Confetti({ count = 26 }: { count?: number }) {
  const colors = ['#3b66f6', '#22c58a', '#ffb020', '#ff6b5b', '#8b5cf6'];
  const pieces = Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.6 + Math.random() * 1.4,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 6,
    rot: Math.random() * 360,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-6vh] block rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animation: `confetti-fall ${p.dur}s linear ${p.delay}s forwards`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes confetti-fall{to{transform:translateY(110vh) rotate(720deg);opacity:.9}}`}</style>
    </div>
  );
}
