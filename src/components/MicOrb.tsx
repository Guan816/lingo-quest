import clsx from 'clsx';
import { Loader2, Mic, Square, Volume2 } from 'lucide-react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const LABEL: Record<OrbState, string> = {
  idle: '按住 / 点击开口',
  listening: '正在听…',
  thinking: '评分中…',
  speaking: '示范朗读中…',
};

const STYLE: Record<OrbState, string> = {
  idle: 'bg-coral-500 shadow-pop',
  listening: 'bg-coral-600',
  thinking: 'bg-brand-400',
  speaking: 'bg-grape-500',
};

export function MicOrb({
  state,
  onClick,
  size = 88,
  disabled,
  hint,
}: {
  state: OrbState;
  onClick: () => void;
  size?: number;
  disabled?: boolean;
  hint?: string;
}) {
  const busy = state === 'thinking' || state === 'speaking';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {state === 'listening' && (
          <>
            <span className="orb-ring animate-pulse-ring" />
            <span className="orb-ring animate-pulse-ring" style={{ animationDelay: '0.6s' }} />
          </>
        )}
        <button
          onClick={onClick}
          disabled={disabled || busy}
          aria-label={LABEL[state]}
          className={clsx(
            'absolute inset-0 grid place-items-center rounded-full text-white transition-all',
            'btn-pop active:scale-95 disabled:opacity-60',
            STYLE[state],
          )}
          style={{ boxShadow: state === 'listening' ? '0 0 0 6px rgba(255,107,91,.18)' : undefined }}
        >
          {state === 'listening' ? (
            <Square size={size * 0.3} strokeWidth={3} fill="currentColor" />
          ) : state === 'thinking' ? (
            <Loader2 size={size * 0.34} strokeWidth={3} className="animate-spin" />
          ) : state === 'speaking' ? (
            <Volume2 size={size * 0.34} strokeWidth={2.6} />
          ) : (
            <Mic size={size * 0.36} strokeWidth={2.6} />
          )}
        </button>
      </div>
      <p className="text-xs font-bold text-ink-faint">{hint ?? LABEL[state]}</p>
    </div>
  );
}
