const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const MINUS = '−';

export const money = (n: number) => inr.format(n);
export const moneyCompact = (n: number) => inrCompact.format(n);
export const number = (n: number) => plain.format(n);
export const integer = (n: number) => whole.format(n);

export function signedMoney(n: number): string {
  if (n === 0) return inr.format(0);
  return (n > 0 ? '+' : MINUS) + inr.format(Math.abs(n));
}

export function pct(n: number, signed = true): string {
  const v = Math.abs(n).toFixed(2) + '%';
  if (!signed || n === 0) return (n < 0 ? MINUS : '') + v;
  return (n > 0 ? '+' : MINUS) + v;
}

export type Tone = 'gain' | 'loss' | 'flat';
export const tone = (n: number): Tone => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');
export const toneText = (n: number) => (n > 0 ? 'text-gain' : n < 0 ? 'text-loss' : 'text-muted-foreground');

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

export const date = (iso: string) => dateFmt.format(new Date(iso));
export const dateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const time = (iso: string) => timeFmt.format(new Date(iso));
export const day = (iso: string) => dayFmt.format(new Date(iso));

export function relative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
