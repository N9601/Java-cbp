import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronRight, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkline } from '../components/charts';
import { ChangePill, DayRange, Delta, LivePrice, StockAvatar } from '../components/market';
import { useTrade } from '../components/TradeTicket';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Skeleton, td, th, tr } from '../components/ui';
import { api } from '../lib/api';
import { useAuth, useBase } from '../lib/auth';
import { cn } from '../lib/cn';
import { pct } from '../lib/format';
import { useStocks } from '../lib/live';
import type { Quote } from '../lib/types';

type SortKey = 'symbol' | 'price' | 'change' | 'sector';

export default function Markets() {
  const { user } = useAuth();
  const base = useBase();
  const isInvestor = user?.role === 'INVESTOR';
  const { data: stocks, isLoading } = useStocks();
  const { data: sparks } = useQuery({ queryKey: ['sparklines'], queryFn: api.sparklines, refetchInterval: 60_000 });
  const { openTrade } = useTrade();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'symbol', dir: 'asc' });

  const sectors = useMemo(() => [...new Set((stocks ?? []).map((s) => s.sector))].sort(), [stocks]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (stocks ?? []).filter(
      (s) =>
        (sector === 'all' || s.sector === sector) &&
        (!q || s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)),
    );
    const value = (s: Quote) =>
      sort.key === 'price' ? s.price : sort.key === 'change' ? s.changePct : sort.key === 'sector' ? s.sector : s.symbol;
    return filtered.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const c = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number);
      return sort.dir === 'asc' ? c : -c;
    });
  }, [stocks, query, sector, sort]);

  const breadth = useMemo(() => {
    const all = stocks ?? [];
    const up = all.filter((s) => s.changePct > 0).length;
    const down = all.filter((s) => s.changePct < 0).length;
    const best = [...all].sort((a, b) => b.changePct - a.changePct)[0];
    const worst = [...all].sort((a, b) => a.changePct - b.changePct)[0];
    const avg = all.length ? all.reduce((a, s) => a + s.changePct, 0) / all.length : 0;
    return { up, down, best, worst, avg, total: all.length };
  }, [stocks]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'change' || key === 'price' ? 'desc' : 'asc' }));

  const SortHead = ({ k, children, className }: { k: SortKey; children: string; className?: string }) => (
    <th className={cn(th, className)} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
        {children}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        title="Markets"
        description={`${breadth.total || 'All'} listed stocks. Simulated prices refresh live every few seconds.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <BreadthCard label="Advancing" value={breadth.up} total={breadth.total} tone="gain" icon={<TrendingUp className="h-4 w-4" />} />
        <BreadthCard label="Declining" value={breadth.down} total={breadth.total} tone="loss" icon={<TrendingDown className="h-4 w-4" />} />
        <MoverCard label="Top gainer" quote={breadth.best} base={base} />
        <MoverCard label="Top loser" quote={breadth.worst} base={base} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol or company" className="pl-9" aria-label="Search stocks" />
          </div>
          <Select value={sector} onChange={(e) => setSector(e.target.value)} className="sm:w-52" aria-label="Sector">
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            Average move <span className={cn('num font-medium', breadth.avg >= 0 ? 'text-gain' : 'text-loss')}>{pct(breadth.avg)}</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <SortHead k="symbol">Company</SortHead>
                <SortHead k="sector" className="hidden lg:table-cell">Sector</SortHead>
                <SortHead k="price" className="text-right">Price</SortHead>
                <th className={cn(th, 'hidden text-right sm:table-cell')}>Change</th>
                <SortHead k="change" className="text-right">24h</SortHead>
                <th className={cn(th, 'hidden 2xl:table-cell')}>24h range</th>
                <th className={cn(th, 'hidden md:table-cell')}>Trend</th>
                <th className={cn(th, 'hidden text-right sm:table-cell')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-t">
                    <td colSpan={8} className="px-5 py-3">
                      <Skeleton className="h-8" />
                    </td>
                  </tr>
                ))}
              {rows.map((s) => (
                <tr key={s.symbol} className={cn(tr, 'cursor-pointer')} onClick={() => navigate(`${base}/markets/${encodeURIComponent(s.symbol)}`)}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:block">
                        <StockAvatar symbol={s.symbol} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{s.symbol}</p>
                        <p className="max-w-[110px] truncate text-xs text-muted-foreground sm:max-w-[180px]">{s.companyName}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(td, 'hidden lg:table-cell')}>
                    <Badge>{s.sector}</Badge>
                  </td>
                  <td className={cn(td, 'text-right font-medium')}>
                    <LivePrice value={s.price} />
                  </td>
                  <td className={cn(td, 'hidden text-right sm:table-cell')}>
                    <Delta value={s.change} showIcon={false} className="text-[13px]" />
                  </td>
                  <td className={cn(td, 'text-right')}>
                    <ChangePill percent={s.changePct} />
                  </td>
                  <td className={cn(td, 'hidden 2xl:table-cell')}>
                    <DayRange low={s.dayLow} high={s.dayHigh} price={s.price} />
                  </td>
                  <td className={cn(td, 'hidden md:table-cell')}>
                    <Sparkline values={sparks?.[s.symbol] ?? []} width={80} />
                  </td>
                  <td className={cn(td, 'hidden text-right sm:table-cell')}>
                    <div className="flex items-center justify-end gap-1">
                      {isInvestor && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTrade(s.symbol);
                          }}
                        >
                          Trade
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-subtle" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && rows.length === 0 && (
            <EmptyState icon={<Search className="h-5 w-5" />} title="No stocks match your filters">
              Try a different search term or choose another sector.
            </EmptyState>
          )}
        </div>
      </Card>
    </>
  );
}

function BreadthCard({ label, value, total, tone, icon }: { label: string; value: number; total: number; tone: 'gain' | 'loss'; icon: ReactNode }) {
  const share = total ? (value / total) * 100 : 0;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className={tone === 'gain' ? 'text-gain' : 'text-loss'}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">of {total}</span>
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-muted">
        <div className={cn('h-full rounded-full', tone === 'gain' ? 'bg-gain' : 'bg-loss')} style={{ width: `${share}%` }} />
      </div>
    </Card>
  );
}

function MoverCard({ label, quote, base }: { label: string; quote?: Quote; base: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      {quote ? (
        <Link to={`${base}/markets/${encodeURIComponent(quote.symbol)}`} className="mt-2 flex items-center gap-3">
          <span className="hidden sm:block">
            <StockAvatar symbol={quote.symbol} size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{quote.symbol}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <LivePrice value={quote.price} className="text-xs text-muted-foreground" />
              <ChangePill percent={quote.changePct} className="min-w-0" />
            </div>
          </div>
        </Link>
      ) : (
        <Skeleton className="mt-2 h-10" />
      )}
    </Card>
  );
}
