import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellPlus, Info } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PriceChart } from '../components/charts';
import { Delta, LivePrice, SideBadge, StockAvatar } from '../components/market';
import { TradeTicket } from '../components/TradeTicket';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Segmented, Skeleton, td, th, tr } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth, useBase } from '../lib/auth';
import { cn } from '../lib/cn';
import { dateTime, integer, money, pct, relative, signedMoney } from '../lib/format';
import { usePortfolio, useQuoteMap, useStocks } from '../lib/live';
import type { AlertCondition, Range } from '../lib/types';

const RANGES: { value: Range; label: string }[] = [
  { value: '1H', label: '1H' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
];

export default function StockDetail() {
  const { symbol = '' } = useParams();
  const sym = symbol.toUpperCase();
  const base = useBase();
  const { user } = useAuth();
  const isInvestor = user?.role === 'INVESTOR';
  const { isLoading: stocksLoading } = useStocks();
  const quote = useQuoteMap().get(sym);
  const [range, setRange] = useState<Range>('1D');

  const history = useQuery({
    queryKey: ['history', sym, range],
    queryFn: () => api.history(sym, range),
    enabled: !!quote,
    refetchInterval: range === '1H' ? 15_000 : 60_000,
  });

  useEffect(() => {
    if (quote) document.title = `${quote.symbol} ${money(quote.price)} - MarketLab`;
    return () => {
      document.title = 'MarketLab';
    };
  }, [quote]);

  if (!quote) {
    return stocksLoading ? (
      <Skeleton className="h-96" />
    ) : (
      <EmptyState
        title={`No stock with symbol ${sym}`}
        action={
          <Link to={`${base}/markets`}>
            <Button variant="secondary">Back to markets</Button>
          </Link>
        }
      >
        It may have been removed from the market.
      </EmptyState>
    );
  }

  // Append the streamed price so the chart's last point is always live.
  const points = history.data ? [...history.data.slice(0, -1), { time: quote.updatedAt ?? new Date().toISOString(), price: quote.price }] : [];
  const first = points[0]?.price ?? quote.price;
  const rangeChange = quote.price - first;

  return (
    <>
      <Link to={`${base}/markets`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Markets
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <StockAvatar symbol={quote.symbol} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{quote.symbol}</h1>
              <Badge>{quote.sector}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{quote.companyName}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <LivePrice value={quote.price} className="text-3xl font-semibold tracking-tight" />
          <div className="mt-1 flex items-center gap-2 sm:justify-end">
            <Delta value={quote.change} percent={quote.changePct} className="text-sm" />
            <span className="text-xs text-muted-foreground">24h</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader
              title="Price"
              description={
                <span>
                  <span className={cn('num font-medium', rangeChange >= 0 ? 'text-gain' : 'text-loss')}>
                    {signedMoney(rangeChange)} ({pct(first ? (rangeChange / first) * 100 : 0)})
                  </span>{' '}
                  over this range
                </span>
              }
              action={<Segmented size="sm" label="Chart range" value={range} onChange={setRange} options={RANGES} />}
            />
            <div className="px-2 pb-3 pt-4 sm:px-3">
              {history.isLoading ? (
                <Skeleton className="mx-3 h-[320px]" />
              ) : (
                <PriceChart
                  points={points}
                  range={range}
                  height={320}
                  reference={range === '1D' ? quote.refPrice : undefined}
                  referenceLabel={range === '1D' ? '24h ago' : undefined}
                />
              )}
            </div>
            <dl className="grid grid-cols-2 border-t sm:grid-cols-4">
              {[
                ['24h ago', money(quote.refPrice)],
                ['24h high', money(quote.dayHigh)],
                ['24h low', money(quote.dayLow)],
                ['Last update', relative(quote.updatedAt)],
              ].map(([k, v], i) => (
                <div key={k} className={cn('px-5 py-3.5', i > 0 && 'sm:border-l', i % 2 === 1 && 'border-l', i > 1 && 'border-t sm:border-t-0')}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="num mt-0.5 text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {isInvestor && <YourTrades symbol={quote.symbol} />}
        </div>

        <div className="space-y-4">
          {isInvestor ? (
            <>
              <Card>
                <CardHeader title="Place order" description="Trade with your virtual wallet" />
                <div className="p-5">
                  <TradeTicket symbol={quote.symbol} />
                </div>
              </Card>
              <PositionCard symbol={quote.symbol} />
              <AlertQuickCreate symbol={quote.symbol} price={quote.price} />
            </>
          ) : (
            <Card className="p-5">
              <div className="flex gap-3 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  You are viewing as an administrator. Edit this stock's details or price from{' '}
                  <Link to="/admin/stocks" className="font-medium text-primary hover:underline">
                    Stocks
                  </Link>
                  .
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function PositionCard({ symbol }: { symbol: string }) {
  const { data } = usePortfolio();
  const h = data?.holdings.find((x) => x.symbol === symbol);
  return (
    <Card>
      <CardHeader title="Your position" />
      {h ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
          <Item label="Quantity" value={integer(h.quantity)} />
          <Item label="Avg buy price" value={money(h.avgBuyPrice)} />
          <Item label="Invested" value={money(h.invested)} />
          <Item label="Current value" value={money(h.marketValue)} />
          <div className="col-span-2 rounded-lg bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Unrealised P/L</dt>
            <dd className="mt-0.5">
              <Delta value={h.unrealisedPnl} percent={h.unrealisedPnlPct} />
            </dd>
            {h.realisedPnl !== 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Realised so far <span className={cn('num font-medium', h.realisedPnl >= 0 ? 'text-gain' : 'text-loss')}>{signedMoney(h.realisedPnl)}</span>
              </p>
            )}
          </div>
        </dl>
      ) : (
        <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground">You don't hold {symbol}. Buy shares to open a position.</p>
      )}
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

function AlertQuickCreate({ symbol, price }: { symbol: string; price: number }) {
  const qc = useQueryClient();
  const [condition, setCondition] = useState<AlertCondition>('ABOVE');
  const [target, setTarget] = useState('');
  const t = Number(target);
  const distance = t > 0 ? ((t - price) / price) * 100 : null;
  const create = useMutation({
    mutationFn: () => api.createAlert(symbol, condition, t),
    onSuccess: (a) => {
      toast.success(`Alert set for ${a.symbol}`, { description: `We'll notify you when it goes ${a.condition.toLowerCase()} ${money(a.targetPrice)}.` });
      setTarget('');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (e) => toast.error('Could not create alert', { description: errorMessage(e) }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (t > 0) create.mutate();
  };

  return (
    <Card>
      <CardHeader title="Price alert" description="Get notified when the price crosses a target" />
      <form onSubmit={onSubmit} className="space-y-3 p-5">
        <Segmented<AlertCondition>
          label="Condition"
          value={condition}
          onChange={setCondition}
          className="w-full"
          options={[
            { value: 'ABOVE', label: 'Goes above' },
            { value: 'BELOW', label: 'Goes below' },
          ]}
        />
        <Field
          label="Target price"
          htmlFor={`target-${symbol}`}
          hint={distance !== null ? `${pct(distance)} from the current ${money(price)}` : `Current price ${money(price)}`}
        >
          <Input id={`target-${symbol}`} type="number" step="0.01" min="0.01" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={price.toFixed(2)} className="num" />
        </Field>
        <Button type="submit" variant="secondary" className="w-full" disabled={!(t > 0)} loading={create.isPending}>
          <BellPlus className="h-4 w-4" /> Create alert
        </Button>
      </form>
    </Card>
  );
}

function YourTrades({ symbol }: { symbol: string }) {
  const { data } = useQuery({ queryKey: ['transactions', 'symbol', symbol], queryFn: () => api.transactions({ symbol, size: 8 }) });
  return (
    <Card className="overflow-hidden">
      <CardHeader title={`Your ${symbol} trades`} description="Most recent first" />
      <div className="mt-3 overflow-x-auto">
        {data && data.items.length === 0 ? (
          <p className="px-5 pb-6 pt-2 text-sm text-muted-foreground">You haven't traded {symbol} yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Side</th>
                <th className={th}>Time</th>
                <th className={cn(th, 'text-right')}>Qty</th>
                <th className={cn(th, 'text-right')}>Price</th>
                <th className={cn(th, 'text-right')}>Amount</th>
                <th className={cn(th, 'hidden text-right sm:table-cell')}>Realised P/L</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((t) => (
                <tr key={t.id} className={tr}>
                  <td className={td}>
                    <SideBadge type={t.type} />
                  </td>
                  <td className={cn(td, 'text-muted-foreground')}>{dateTime(t.time)}</td>
                  <td className={cn(td, 'num text-right')}>{integer(t.quantity)}</td>
                  <td className={cn(td, 'num text-right')}>{money(t.price)}</td>
                  <td className={cn(td, 'num text-right')}>{money(t.amount)}</td>
                  <td className={cn(td, 'num hidden text-right sm:table-cell', t.realisedPnl === null ? 'text-subtle' : t.realisedPnl >= 0 ? 'text-gain' : 'text-loss')}>
                    {t.realisedPnl === null ? '-' : signedMoney(t.realisedPnl)}
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
