import { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { cn } from '../lib/cn';
import { dateTime, day, integer, money, moneyCompact, pct } from '../lib/format';
import type { PricePoint, Range, SectorSlice } from '../lib/types';

const axisTick = { fill: 'var(--chart-axis)', fontSize: 11 };

function tickFormatter(range: Range) {
  return (t: number) => {
    const d = new Date(t);
    if (range === '1H' || range === '1D')
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };
}

function ChartTooltip({ active, payload, base }: TooltipProps<number, string> & { base?: number }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { t: number; p: number };
  const change = base ? ((point.p - base) / base) * 100 : null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-pop">
      <p className="text-muted-foreground">{dateTime(new Date(point.t).toISOString())}</p>
      <p className="num mt-0.5 text-sm font-semibold text-foreground">{money(point.p)}</p>
      {change !== null && (
        <p className={cn('num mt-0.5', change >= 0 ? 'text-gain' : 'text-loss')}>{pct(change)} in range</p>
      )}
    </div>
  );
}

/**
 * Single-series price or value chart: 2 px line, soft area, horizontal grid
 * only, crosshair tooltip. The line takes the gain or loss colour of the
 * range; the change itself is always printed beside the chart as well.
 */
export function PriceChart({
  points,
  range,
  height = 300,
  reference,
  referenceLabel,
}: {
  points: PricePoint[];
  range: Range;
  height?: number;
  reference?: number;
  referenceLabel?: string;
}) {
  const id = useId().replace(/:/g, '');
  const data = useMemo(() => points.map((p) => ({ t: new Date(p.time).getTime(), p: p.price })), [points]);
  const first = data[0]?.p ?? 0;
  const last = data[data.length - 1]?.p ?? 0;
  const up = last >= first;
  const color = up ? 'rgb(var(--gain))' : 'rgb(var(--loss))';

  const [min, max] = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const d of data) {
      lo = Math.min(lo, d.p);
      hi = Math.max(hi, d.p);
    }
    if (reference !== undefined) {
      lo = Math.min(lo, reference);
      hi = Math.max(hi, reference);
    }
    const pad = (hi - lo) * 0.08 || hi * 0.01 || 1;
    return [lo - pad, hi + pad];
  }, [data, reference]);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={tickFormatter(range)}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tickMargin={8}
          />
          <YAxis
            orientation="right"
            domain={[min, max]}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => (max >= 100000 ? moneyCompact(v) : integer(v))}
          />
          {reference !== undefined && (
            <ReferenceLine
              y={reference}
              stroke="var(--chart-axis)"
              strokeDasharray="3 4"
              label={
                referenceLabel
                  ? { value: referenceLabel, position: 'insideTopLeft', fill: 'var(--chart-axis)', fontSize: 11 }
                  : undefined
              }
            />
          )}
          <Tooltip
            content={<ChartTooltip base={first} />}
            cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1, strokeDasharray: '3 3' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p"
            stroke={color}
            strokeWidth={2}
            fill={`url(#fill-${id})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--card))', fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny trend line for table rows. Decorative: the row prints the actual change. */
export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <div style={{ width, height }} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - 2 - ((v - lo) / span) * (height - 4)).toFixed(1)}`)
    .join(' ');
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={up ? 'rgb(var(--gain))' : 'rgb(var(--loss))'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SERIES = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7'];

/**
 * Part-to-whole as one segmented bar plus a legend table. Sectors keep the
 * categorical palette order; anything past seven folds into "Other".
 */
export function AllocationBar({ slices }: { slices: SectorSlice[] }) {
  const rows = useMemo(() => {
    const top = slices.slice(0, SERIES.length).map((s, i) => ({ ...s, color: `var(${SERIES[i]})` }));
    const rest = slices.slice(SERIES.length);
    if (rest.length) {
      top.push({
        sector: 'Other',
        value: rest.reduce((a, s) => a + s.value, 0),
        weight: rest.reduce((a, s) => a + s.weight, 0),
        color: 'var(--series-other)',
      });
    }
    return top;
  }, [slices]);

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Allocation by sector">
        {rows.map((r) => (
          <div
            key={r.sector}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${Math.max(r.weight, 0.5)}%`, background: r.color }}
            title={`${r.sector}: ${r.weight.toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li key={r.sector} className="flex items-center gap-3 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: r.color }} />
            <span className="min-w-0 flex-1 truncate text-foreground">{r.sector}</span>
            <span className="num text-muted-foreground">{money(r.value)}</span>
            <span className="num w-14 text-right font-medium">{r.weight.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { day: string; trades: number; volume: number };
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-pop">
      <p className="text-muted-foreground">{day(row.day)}</p>
      <p className="mt-0.5 text-sm font-semibold">{row.trades} trades</p>
      <p className="num text-muted-foreground">{money(row.volume)} traded</p>
    </div>
  );
}

/** Admin: trades per day, one series, rounded data-ends. */
export function ActivityBars({ data, height = 220 }: { data: { day: string; trades: number; volume: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -18 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgb(var(--muted))' }} isAnimationActive={false} />
          <Bar dataKey="trades" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
