import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellPlus, BellRing, CheckCircle2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { LivePrice, StockAvatar } from '../components/market';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Segmented, Select, Skeleton } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { dateTime, money, pct, relative } from '../lib/format';
import { useQuoteMap, useStocks } from '../lib/live';
import type { AlertCondition, PriceAlert } from '../lib/types';

export default function Alerts() {
  const qc = useQueryClient();
  const { data: alerts, isLoading } = useQuery({ queryKey: ['alerts'], queryFn: api.alerts });
  const quotes = useQuoteMap();

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteAlert(id),
    onSuccess: () => {
      toast.success('Alert deleted');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const active = (alerts ?? []).filter((a) => !a.triggered);
  const fired = (alerts ?? [])
    .filter((a) => a.triggered)
    .sort((a, b) => (b.triggeredAt ?? '').localeCompare(a.triggeredAt ?? ''));

  return (
    <>
      <PageHeader title="Price alerts" description="Get an in-app notification the moment a stock crosses a price that matters to you." />
      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <CreateAlert />

        <div className="space-y-4">
          <Card>
            <CardHeader title="Active" description="Checked on every market tick" action={<Badge tone="primary">{active.length}</Badge>} />
            <div className="p-3">
              {isLoading && <Skeleton className="m-2 h-24" />}
              {!isLoading && active.length === 0 && (
                <EmptyState icon={<BellRing className="h-5 w-5" />} title="No active alerts" className="py-8">
                  Create one on the left, or from any stock page.
                </EmptyState>
              )}
              <ul className="space-y-1">
                {active.map((a) => (
                  <AlertRow key={a.id} alert={a} livePrice={quotes.get(a.symbol)?.price ?? a.currentPrice} onDelete={() => remove.mutate(a.id)} />
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="Triggered" description="Alerts that have fired. Delete them once you've acted." />
            <div className="p-3">
              {!isLoading && fired.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing has fired yet.</p>}
              <ul className="space-y-1">
                {fired.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-gain" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p>
                        <Link to={`/app/markets/${encodeURIComponent(a.symbol)}`} className="font-semibold hover:underline">
                          {a.symbol}
                        </Link>{' '}
                        went {a.condition === 'ABOVE' ? 'above' : 'below'} <span className="num font-medium">{money(a.targetPrice)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground" title={a.triggeredAt ? dateTime(a.triggeredAt) : undefined}>
                        Triggered {relative(a.triggeredAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => remove.mutate(a.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-loss"
                      aria-label={`Delete alert for ${a.symbol}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function AlertRow({ alert: a, livePrice, onDelete }: { alert: PriceAlert; livePrice: number; onDelete: () => void }) {
  const distance = ((a.targetPrice - livePrice) / livePrice) * 100;
  // Closeness meter: full when the price is at the target, empty once it is 10% or more away.
  const progress = Math.max(4, Math.min(100, 100 - Math.abs(distance) * 10));
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
      <StockAvatar symbol={a.symbol} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <Link to={`/app/markets/${encodeURIComponent(a.symbol)}`} className="font-semibold hover:underline">
            {a.symbol}
          </Link>
          <span className="text-muted-foreground">
            {a.condition === 'ABOVE' ? 'goes above' : 'goes below'} <span className="num font-medium text-foreground">{money(a.targetPrice)}</span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${progress}%` }} />
          </div>
          <span className="num w-24 text-right text-xs text-muted-foreground">{pct(distance)} away</span>
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <LivePrice value={livePrice} className="text-sm" />
        <p className="text-xs text-subtle">now</p>
      </div>
      <button onClick={onDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-loss" aria-label={`Delete alert for ${a.symbol}`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function CreateAlert() {
  const qc = useQueryClient();
  const { data: stocks } = useStocks();
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<AlertCondition>('ABOVE');
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (!symbol && stocks?.length) setSymbol(stocks[0].symbol);
  }, [stocks, symbol]);

  const quote = useMemo(() => stocks?.find((s) => s.symbol === symbol), [stocks, symbol]);
  const t = Number(target);
  const distance = quote && t > 0 ? ((t - quote.price) / quote.price) * 100 : null;
  const wrongSide = quote && t > 0 && (condition === 'ABOVE' ? t <= quote.price : t >= quote.price);

  const create = useMutation({
    mutationFn: () => api.createAlert(symbol, condition, t),
    onSuccess: (a) => {
      toast.success(`Alert set for ${a.symbol}`, { description: `You'll be notified when it goes ${a.condition.toLowerCase()} ${money(a.targetPrice)}.` });
      setTarget('');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (e) => toast.error('Could not create alert', { description: errorMessage(e) }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (t > 0 && !wrongSide) create.mutate();
  };

  const presets = condition === 'ABOVE' ? [2, 5, 10] : [-2, -5, -10];

  return (
    <Card className="h-fit">
      <CardHeader title="New alert" description="Alerts stay active until the price crosses the target." />
      <form onSubmit={onSubmit} className="space-y-4 p-5">
        <Field label="Stock" htmlFor="alert-stock">
          <Select id="alert-stock" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {stocks?.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} - {s.companyName}
              </option>
            ))}
          </Select>
        </Field>
        {quote && (
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Current price</span>
            <LivePrice value={quote.price} className="font-semibold" />
          </div>
        )}
        <div className="space-y-1.5">
          <span className="block text-[13px] font-medium">Notify me when the price</span>
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
        </div>
        <Field
          label="Target price"
          htmlFor="alert-target"
          error={wrongSide ? `For ${condition === 'ABOVE' ? 'ABOVE' : 'BELOW'}, pick a target ${condition === 'ABOVE' ? 'above' : 'below'} the current price.` : undefined}
          hint={distance !== null ? `${pct(distance)} from the current price` : undefined}
        >
          <Input id="alert-target" type="number" min="0.01" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} className="num" placeholder={quote?.price.toFixed(2)} />
        </Field>
        {quote && (
          <div className="flex gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTarget((quote.price * (1 + p / 100)).toFixed(2))}
                className={cn('h-7 flex-1 rounded-md border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground')}
              >
                {p > 0 ? '+' : ''}
                {p}%
              </button>
            ))}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={!(t > 0) || !!wrongSide} loading={create.isPending}>
          <BellPlus className="h-4 w-4" /> Create alert
        </Button>
      </form>
    </Card>
  );
}
