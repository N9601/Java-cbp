import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { money, pct, signedMoney } from '../lib/format';

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M7 21.5l5.5-6 4.5 4 8-9.5"
          fill="none"
          className="stroke-primary-foreground"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="10" r="2.2" className="fill-primary-foreground/70" />
      </svg>
      {!compact && <span className="text-[15px] font-semibold tracking-tight">MarketLab</span>}
    </span>
  );
}

const AVATAR_TINTS = [
  'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  'bg-rose-500/10 text-rose-700 dark:text-rose-300',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function StockAvatar({ symbol, size = 'md' }: { symbol: string; size?: 'sm' | 'md' | 'lg' }) {
  const letters = symbol.replace(/[^A-Z0-9]/g, '').slice(0, 2);
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold',
        AVATAR_TINTS[hash(symbol) % AVATAR_TINTS.length],
        size === 'sm' && 'h-7 w-7 text-[10px]',
        size === 'md' && 'h-9 w-9 text-[11px]',
        size === 'lg' && 'h-12 w-12 text-sm',
      )}
    >
      {letters}
    </span>
  );
}

/** Coloured change with an arrow, so direction never relies on colour alone. */
export function Delta({
  value,
  percent,
  className,
  showIcon = true,
}: {
  value?: number;
  percent?: number;
  className?: string;
  showIcon?: boolean;
}) {
  const basis = value ?? percent ?? 0;
  const Icon = basis > 0 ? ArrowUpRight : basis < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'num inline-flex flex-wrap items-center gap-x-1 font-medium',
        basis > 0 ? 'text-gain' : basis < 0 ? 'text-loss' : 'text-muted-foreground',
        className,
      )}
    >
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {value !== undefined ? signedMoney(value) : percent !== undefined && pct(percent)}
      </span>
      {value !== undefined && percent !== undefined && <span className="whitespace-nowrap">({pct(percent)})</span>}
    </span>
  );
}

export function ChangePill({ percent, className }: { percent: number; className?: string }) {
  const Icon = percent > 0 ? ArrowUpRight : percent < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'num inline-flex min-w-[76px] items-center justify-end gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold',
        percent > 0 ? 'bg-gain-soft text-gain' : percent < 0 ? 'bg-loss-soft text-loss' : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {pct(percent)}
    </span>
  );
}

/** A price that briefly flashes green or red whenever it changes. */
export function LivePrice({ value, className, format = money }: { value: number; className?: string; format?: (n: number) => string }) {
  const previous = useRef(value);
  const [flash, setFlash] = useState<{ dir: 'up' | 'down'; n: number } | null>(null);

  useEffect(() => {
    if (value === previous.current) return;
    const dir = value > previous.current ? 'up' : 'down';
    previous.current = value;
    setFlash((f) => ({ dir, n: (f?.n ?? 0) + 1 }));
    const t = window.setTimeout(() => setFlash(null), 1100);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <span
      key={flash?.n ?? 0}
      className={cn(
        'num -mx-1 rounded px-1',
        flash?.dir === 'up' && 'animate-flash-up',
        flash?.dir === 'down' && 'animate-flash-down',
        className,
      )}
    >
      {format(value)}
    </span>
  );
}

/** Where the current price sits between the 24 h low and high. */
export function DayRange({ low, high, price }: { low: number; high: number; price: number }) {
  const span = high - low;
  const at = span > 0 ? Math.min(100, Math.max(0, ((price - low) / span) * 100)) : 50;
  return (
    <div className="w-32" title={`24h range ${money(low)} to ${money(high)}`}>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: `${at}%` }} />
        <div
          className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${at}%` }}
        />
      </div>
      <div className="num mt-1 flex justify-between text-[10px] text-subtle">
        <span>{low.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        <span>{high.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-subtle">{icon}</span>}
      </div>
      <div className="mt-2 text-[22px] font-semibold leading-tight tracking-tight sm:text-2xl">{value}</div>
      {sub && <div className="mt-1.5 text-[13px]">{sub}</div>}
    </div>
  );
}

export function SideBadge({ type }: { type: 'BUY' | 'SELL' }) {
  return (
    <span
      className={cn(
        'inline-flex w-12 items-center justify-center rounded-md py-0.5 text-[11px] font-semibold tracking-wide',
        type === 'BUY' ? 'bg-gain-soft text-gain' : 'bg-loss-soft text-loss',
      )}
    >
      {type}
    </span>
  );
}
