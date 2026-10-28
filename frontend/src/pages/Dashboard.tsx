import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BellRing, Briefcase, CandlestickChart, FileDown, Plus, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AllocationBar, PriceChart, Sparkline } from '../components/charts';
import { ChangePill, Delta, LivePrice, SideBadge, StatCard, StockAvatar } from '../components/market';
import { useTrade } from '../components/TradeTicket';
import { Button, Card, CardHeader, EmptyState, PageHeader, Segmented, Skeleton, td, th, tr } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/cn';
import { dateTime, greeting, integer, money, pct, relative, signedMoney } from '../lib/format';
import { usePortfolio, useStocks } from '../lib/live';
import type { Range } from '../lib/types';

const RANGES: { value: Range; label: string }[] = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: p, isLoading } = usePortfolio();
  const { openTrade } = useTrade();
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <>
            <Link to="/app/reports">
              <Button variant="secondary">
                <FileDown className="h-4 w-4" />
                Report
              </Button>
            </Link>
            <Button onClick={() => openTrade()}>
              <Plus className="h-4 w-4" />
              New order
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {isLoading || !p ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Net worth"
              icon={<Wallet className="h-4 w-4" />}
              value={<LivePrice value={p.netWorth} />}
              sub={
                <span className="flex flex-wrap items-center gap-x-1.5">
                  <Delta value={p.dayChange} percent={p.dayChangePct} />
                  <span className="text-muted-foreground">today</span>
                </span>
              }
            />
            <StatCard
              label="Invested"
              icon={<Briefcase className="h-4 w-4" />}
              value={<span className="num">{money(p.invested)}</span>}
              sub={
                <span className="text-muted-foreground">
                  {p.holdings.length} position{p.holdings.length === 1 ? '' : 's'} · cash <span className="num">{money(p.cash)}</span>
                </span>
              }
            />
            <StatCard
              label="Unrealised P/L"
              value={<span className={cn('num', p.unrealisedPnl >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(p.unrealisedPnl)}</span>}
              sub={
                <span className="flex items-center gap-1.5">
                  <Delta percent={p.unrealisedPnlPct} />
                  <span className="text-muted-foreground">on open positions</span>
                </span>
              }
            />
            <StatCard
              label="Realised P/L"
              value={<span className={cn('num', p.realisedPnl >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(p.realisedPnl)}</span>}
              sub={
                <span className="text-muted-foreground">
                  Total P/L <span className={cn('num font-medium', p.totalPnl >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(p.totalPnl)}</span>
                </span>
              }
            />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PerformanceCard className="lg:col-span-2" />
        <Card>
          <CardHeader title="Allocation" description="Market value by sector" />
          <div className="p-5">
            {p && p.allocation.length > 0 ? (
              <AllocationBar slices={p.allocation} />
            ) : isLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <EmptyState icon={<Briefcase className="h-5 w-5" />} title="Nothing allocated yet" className="py-8">
                Buy your first stock to see how your money is spread across sectors.
              </EmptyState>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <HoldingsCard className="lg:col-span-2" />
        <MoversCard />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <RecentActivity className="lg:col-span-2" />
        <AlertsSummary />
      </div>
    </>
  );
}

function PerformanceCard({ className }: { className?: string }) {
  const [range, setRange] = useState<Range>('1W');
  const { data: raw, isLoading } = useQuery({
    queryKey: ['performance', range],
    queryFn: () => api.performance(range),
    refetchInterval: 30_000,
  });
  const { data: portfolio } = usePortfolio();
  // The server's last point is "now" at fetch time; replace it with the live net worth.
  const data = useMemo(
    () =>
      raw && portfolio
        ? [...raw.slice(0, -1), { time: new Date().toISOString(), price: portfolio.netWorth }]
        : raw,
    [raw, portfolio],
  );
  const first = data?.[0]?.price ?? 0;
  const last = data?.[data.length - 1]?.price ?? 0;
  const change = last - first;
  const changePct = first ? (change / first) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader
        title="Portfolio value"
        description="Cash plus holdings at market price, rebuilt from your trades"
        action={<Segmented size="sm" label="Range" value={range} onChange={setRange} options={RANGES} />}
      />
      <div className="px-5 pt-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="num text-2xl font-semibold tracking-tight">{data ? money(last) : '-'}</span>
          {data && <Delta value={change} percent={changePct} className="text-sm" />}
          <span className="text-xs text-muted-foreground">over {range === '1D' ? 'the last day' : range === '1W' ? 'the last week' : 'the last month'}</span>
        </div>
      </div>
      <div className="px-2 pb-3 pt-2 sm:px-3">
        {isLoading || !data ? <Skeleton className="mx-3 h-[260px]" /> : <PriceChart points={data} range={range} height={260} />}
      </div>
    </Card>
  );
}

function HoldingsCard({ className }: { className?: string }) {
  const { data: p, isLoading } = usePortfolio();
  const { data: sparks } = useQuery({ queryKey: ['sparklines'], queryFn: api.sparklines, refetchInterval: 60_000 });
  const navigate = useNavigate();
  const rows = p?.holdings.slice(0, 6) ?? [];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title="Top holdings"
        description="Your largest positions, valued live"
        action={
          <Link to="/app/portfolio" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <div className="mt-3 overflow-x-auto">
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<CandlestickChart className="h-5 w-5" />}
            title="You haven't bought anything yet"
            action={
              <Link to="/app/markets">
                <Button size="sm">Browse the market</Button>
              </Link>
            }
          >
            Your virtual wallet is ready. Pick a stock from the market to place your first order.
          </EmptyState>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Stock</th>
                <th className={cn(th, 'text-right')}>Qty</th>
                <th className={cn(th, 'hidden text-right 2xl:table-cell')}>Price</th>
                <th className={cn(th, 'hidden md:table-cell')}>1D</th>
                <th className={cn(th, 'text-right')}>Value</th>
                <th className={cn(th, 'text-right')}>P/L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.symbol} className={cn(tr, 'cursor-pointer')} onClick={() => navigate(`/app/markets/${encodeURIComponent(h.symbol)}`)}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <StockAvatar symbol={h.symbol} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold">{h.symbol}</p>
                        <p className="max-w-[150px] truncate text-xs text-muted-foreground">{h.companyName}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(td, 'num text-right')}>{integer(h.quantity)}</td>
                  <td className={cn(td, 'hidden text-right 2xl:table-cell')}>
                    <LivePrice value={h.currentPrice} />
                  </td>
                  <td className={cn(td, 'hidden md:table-cell')}>
                    <Sparkline values={sparks?.[h.symbol] ?? []} width={80} height={24} />
                  </td>
                  <td className={cn(td, 'num text-right font-medium')}>{money(h.marketValue)}</td>
                  <td className={cn(td, 'text-right')}>
                    <div className={cn('num font-medium', h.unrealisedPnl >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(h.unrealisedPnl)}</div>
                    <div className="num text-xs text-muted-foreground">{pct(h.unrealisedPnlPct)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

function MoversCard() {
  const { data: stocks } = useStocks();
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');
  const list = useMemo(() => {
    const all = [...(stocks ?? [])];
    return tab === 'gainers'
      ? all.filter((s) => s.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 5)
      : all.filter((s) => s.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  }, [stocks, tab]);

  return (
    <Card>
      <CardHeader
        title="Top movers"
        description="Change over the last 24 hours"
        action={
          <Segmented
            size="sm"
            label="Movers"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'gainers', label: 'Gainers' },
              { value: 'losers', label: 'Losers' },
            ]}
          />
        }
      />
      <ul className="p-3">
        {!stocks && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="m-2 h-10" />)}
        {stocks && list.length === 0 && <p className="px-2 py-8 text-center text-sm text-muted-foreground">No {tab} right now.</p>}
        {list.map((s) => (
          <li key={s.symbol}>
            <Link to={`/app/markets/${encodeURIComponent(s.symbol)}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
              <StockAvatar symbol={s.symbol} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.symbol}</p>
                <p className="truncate text-xs text-muted-foreground">{s.companyName}</p>
              </div>
              <div className="text-right">
                <LivePrice value={s.price} className="text-sm" />
                <div className="mt-0.5">
                  <ChangePill percent={s.changePct} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecentActivity({ className }: { className?: string }) {
  const { data } = useQuery({ queryKey: ['transactions', 'recent'], queryFn: () => api.transactions({ size: 5 }) });
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title="Recent activity"
        description="Your latest orders"
        action={
          <Link to="/app/transactions" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            History <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <div className="mt-3 overflow-x-auto">
        {data && data.items.length === 0 ? (
          <p className="px-5 pb-8 pt-4 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <table className="w-full">
            <tbody>
              {(data?.items ?? []).map((t) => (
                <tr key={t.id} className={tr}>
                  <td className={td}>
                    <SideBadge type={t.type} />
                  </td>
                  <td className={td}>
                    <span className="font-semibold">{t.symbol}</span>
                    <span className="ml-2 text-muted-foreground">
                      {integer(t.quantity)} @ <span className="num">{money(t.price)}</span>
                    </span>
                  </td>
                  <td className={cn(td, 'num hidden text-right sm:table-cell')}>{money(t.amount)}</td>
                  <td className={cn(td, 'text-right text-xs text-muted-foreground')} title={dateTime(t.time)}>
                    {relative(t.time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

function AlertsSummary() {
  const { data } = useQuery({ queryKey: ['alerts'], queryFn: api.alerts });
  const active = (data ?? []).filter((a) => !a.triggered).slice(0, 4);
  return (
    <Card>
      <CardHeader
        title="Watching"
        description="Active price alerts"
        action={
          <Link to="/app/alerts">
            <Button size="sm" variant="secondary">
              <BellRing className="h-3.5 w-3.5" /> Manage
            </Button>
          </Link>
        }
      />
      <ul className="space-y-1 p-3">
        {data && active.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No active alerts. Set one from any stock page.</p>
        )}
        {active.map((a) => {
          const distance = ((a.targetPrice - a.currentPrice) / a.currentPrice) * 100;
          return (
            <li key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <StockAvatar symbol={a.symbol} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{a.symbol}</p>
                <p className="text-xs text-muted-foreground">
                  {a.condition === 'ABOVE' ? 'Above' : 'Below'} <span className="num">{money(a.targetPrice)}</span>
                </p>
              </div>
              <span className="num text-xs text-muted-foreground">{pct(distance)} away</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
