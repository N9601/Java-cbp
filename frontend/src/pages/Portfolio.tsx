import { ArrowDown, ArrowUp, Briefcase, FileDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AllocationBar } from '../components/charts';
import { Delta, LivePrice, StockAvatar } from '../components/market';
import { useTrade } from '../components/TradeTicket';
import { Button, Card, CardHeader, EmptyState, PageHeader, Skeleton, td, th, tr } from '../components/ui';
import { cn } from '../lib/cn';
import { integer, money, pct, signedMoney } from '../lib/format';
import { usePortfolio } from '../lib/live';
import type { Holding } from '../lib/types';

type SortKey = 'symbol' | 'marketValue' | 'unrealisedPnl' | 'unrealisedPnlPct' | 'dayChangePct' | 'weight';

export default function PortfolioPage() {
  const { data: p, isLoading } = usePortfolio();
  const { openTrade } = useTrade();
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'marketValue', dir: 'desc' });

  const rows = useMemo(() => {
    const list = [...(p?.holdings ?? [])];
    return list.sort((a, b) => {
      const c = sort.key === 'symbol' ? a.symbol.localeCompare(b.symbol) : (a[sort.key] as number) - (b[sort.key] as number);
      return sort.dir === 'asc' ? c : -c;
    });
  }, [p, sort]);

  const best = useMemo(() => [...(p?.holdings ?? [])].sort((a, b) => b.unrealisedPnl - a.unrealisedPnl), [p]);

  const Head = ({ k, children, className }: { k: SortKey; children: string; className?: string }) => (
    <th className={cn(th, className)} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        onClick={() => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'symbol' ? 'asc' : 'desc' }))}
        className="inline-flex items-center gap-1 uppercase hover:text-foreground"
      >
        {children}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Holdings valued at live market prices. Average buy price uses the weighted-average cost method."
        actions={
          <Link to="/app/reports">
            <Button variant="secondary">
              <FileDown className="h-4 w-4" /> Export report
            </Button>
          </Link>
        }
      />

      {isLoading || !p ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : (
        <Card className="grid grid-cols-2 divide-border md:grid-cols-3 xl:grid-cols-6 [&>*]:border-border">
          <Summary
            label="Net worth"
            value={<LivePrice value={p.netWorth} />}
            sub={
              <span className="flex items-center gap-1">
                <Delta percent={p.dayChangePct} className="text-xs" />
                <span className="text-muted-foreground">today</span>
              </span>
            }
          />
          <Summary label="Cash balance" value={money(p.cash)} sub={<span className="text-muted-foreground">available to trade</span>} />
          <Summary label="Invested" value={money(p.invested)} sub={<span className="text-muted-foreground">{p.holdings.length} positions</span>} />
          <Summary label="Current value" value={money(p.marketValue)} sub={<span className="text-muted-foreground">at market price</span>} />
          <Summary
            label="Unrealised P/L"
            value={<span className={p.unrealisedPnl >= 0 ? 'text-gain' : 'text-loss'}>{signedMoney(p.unrealisedPnl)}</span>}
            sub={<Delta percent={p.unrealisedPnlPct} className="text-xs" />}
          />
          <Summary
            label="Realised P/L"
            value={<span className={p.realisedPnl >= 0 ? 'text-gain' : 'text-loss'}>{signedMoney(p.realisedPnl)}</span>}
            sub={<span className="text-muted-foreground">from closed sales</span>}
          />
        </Card>
      )}

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Holdings" description={p ? `${p.holdings.length} open positions` : undefined} />
        <div className="mt-3 overflow-x-auto">
          {p && p.holdings.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-5 w-5" />}
              title="No open positions"
              action={
                <Link to="/app/markets">
                  <Button size="sm">Browse the market</Button>
                </Link>
              }
            >
              Once you buy shares, each holding appears here with its average price and live profit or loss.
            </EmptyState>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <Head k="symbol">Stock</Head>
                  <th className={cn(th, 'text-right')}>Qty</th>
                  <th className={cn(th, 'hidden text-right lg:table-cell')}>Avg price</th>
                  <th className={cn(th, 'text-right')}>LTP</th>
                  <th className={cn(th, 'hidden text-right 2xl:table-cell')}>Invested</th>
                  <Head k="marketValue" className="text-right">Value</Head>
                  <Head k="unrealisedPnl" className="text-right">P/L</Head>
                  <Head k="dayChangePct" className="hidden text-right 2xl:table-cell">Today</Head>
                  <Head k="weight" className="hidden text-right xl:table-cell">Weight</Head>
                  <th className={cn(th, 'text-right')}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={10} className="px-5 py-3">
                        <Skeleton className="h-8" />
                      </td>
                    </tr>
                  ))}
                {rows.map((h) => (
                  <HoldingRow
                    key={h.symbol}
                    h={h}
                    onOpen={() => navigate(`/app/markets/${encodeURIComponent(h.symbol)}`)}
                    onBuy={() => openTrade(h.symbol, 'BUY')}
                    onSell={() => openTrade(h.symbol, 'SELL')}
                  />
                ))}
              </tbody>
              {p && p.holdings.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td className={td}>Total</td>
                    <td className={td} />
                    <td className={cn(td, 'hidden lg:table-cell')} />
                    <td className={td} />
                    <td className={cn(td, 'num hidden text-right 2xl:table-cell')}>{money(p.invested)}</td>
                    <td className={cn(td, 'num text-right')}>{money(p.marketValue)}</td>
                    <td className={cn(td, 'num text-right', p.unrealisedPnl >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(p.unrealisedPnl)}</td>
                    <td className={cn(td, 'num hidden text-right 2xl:table-cell', p.dayChange >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(p.dayChange)}</td>
                    <td className={cn(td, 'num hidden text-right xl:table-cell')}>100%</td>
                    <td className={td} />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </Card>

      {p && p.holdings.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Sector allocation" description="Share of current market value" />
            <div className="p-5">
              <AllocationBar slices={p.allocation} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Contribution to P/L" description="Unrealised profit or loss by holding" />
            <ul className="space-y-3 p-5">
              {best.map((h) => {
                const max = Math.max(...best.map((x) => Math.abs(x.unrealisedPnl)), 1);
                const w = (Math.abs(h.unrealisedPnl) / max) * 50;
                return (
                  <li key={h.symbol} className="grid grid-cols-[88px_1fr_96px] items-center gap-3 text-sm">
                    <span className="font-medium">{h.symbol}</span>
                    <div className="relative h-2 rounded-full bg-muted">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                      <div
                        className={cn('absolute inset-y-0 rounded-full', h.unrealisedPnl >= 0 ? 'bg-gain' : 'bg-loss')}
                        style={h.unrealisedPnl >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
                      />
                    </div>
                    <span className={cn('num text-right font-medium', h.unrealisedPnl >= 0 ? 'text-gain' : 'text-loss')}>
                      {signedMoney(h.unrealisedPnl)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

function Summary({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="border-b p-4 sm:p-5 xl:border-b-0 xl:border-r xl:last:border-r-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="num mt-1.5 text-lg font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs">{sub}</div>
    </div>
  );
}

function HoldingRow({ h, onOpen, onBuy, onSell }: { h: Holding; onOpen: () => void; onBuy: () => void; onSell: () => void }) {
  return (
    <tr className={cn(tr, 'cursor-pointer')} onClick={onOpen}>
      <td className={td}>
        <div className="flex items-center gap-3">
          <StockAvatar symbol={h.symbol} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold">{h.symbol}</p>
            <p className="max-w-[180px] truncate text-xs text-muted-foreground">{h.sector}</p>
          </div>
        </div>
      </td>
      <td className={cn(td, 'num text-right')}>{integer(h.quantity)}</td>
      <td className={cn(td, 'num hidden text-right lg:table-cell')}>{money(h.avgBuyPrice)}</td>
      <td className={cn(td, 'text-right')}>
        <LivePrice value={h.currentPrice} />
      </td>
      <td className={cn(td, 'num hidden text-right 2xl:table-cell')}>{money(h.invested)}</td>
      <td className={cn(td, 'num text-right font-medium')}>{money(h.marketValue)}</td>
      <td className={cn(td, 'text-right')}>
        <div className={cn('num font-medium', h.unrealisedPnl >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(h.unrealisedPnl)}</div>
        <div className="num text-xs text-muted-foreground">{pct(h.unrealisedPnlPct)}</div>
      </td>
      <td className={cn(td, 'hidden text-right 2xl:table-cell')}>
        <Delta percent={h.dayChangePct} className="text-[13px]" />
      </td>
      <td className={cn(td, 'hidden text-right xl:table-cell')}>
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-12 rounded-full bg-muted lg:block">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(h.weight, 100)}%` }} />
          </div>
          <span className="num w-12 text-right text-[13px]">{h.weight.toFixed(1)}%</span>
        </div>
      </td>
      <td className={cn(td, 'text-right')} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="secondary" onClick={onBuy} className="text-gain">
            Buy
          </Button>
          <Button size="sm" variant="secondary" onClick={onSell} className="text-loss">
            Sell
          </Button>
        </div>
      </td>
    </tr>
  );
}
