import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowRight, BarChart3, Landmark, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ActivityBars } from '../../components/charts';
import { SideBadge, StatCard, StockAvatar } from '../../components/market';
import { Card, CardHeader, PageHeader, Skeleton, Switch, td, th, tr } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { integer, money, moneyCompact, relative } from '../../lib/format';
import { useLive } from '../../lib/live';

export default function AdminOverview() {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: api.admin.stats, refetchInterval: 15_000 });
  const { lastTickAt } = useLive();

  const toggle = useMutation({
    mutationFn: (running: boolean) => api.admin.setSimulator(running),
    onSuccess: (st) => {
      toast.success(st.running ? 'Market simulator resumed' : 'Market simulator paused');
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['market-status'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Platform overview" description="Activity across every investor on MarketLab." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {isLoading || !s ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Investors" icon={<Users className="h-4 w-4" />} value={integer(s.investors)} sub={<span className="text-muted-foreground">{s.admins} admin{s.admins === 1 ? '' : 's'}</span>} />
            <StatCard
              label="Assets under management"
              icon={<Landmark className="h-4 w-4" />}
              value={<span className="num">{moneyCompact(s.assetsUnderManagement)}</span>}
              sub={<span className="text-muted-foreground">{moneyCompact(s.holdingsValue)} in stocks · {moneyCompact(s.cashHeld)} cash</span>}
            />
            <StatCard label="Trades, last 24 h" icon={<Activity className="h-4 w-4" />} value={integer(s.tradesToday)} sub={<span className="text-muted-foreground">{integer(s.totalTrades)} all time</span>} />
            <StatCard label="Volume, last 24 h" icon={<BarChart3 className="h-4 w-4" />} value={<span className="num">{moneyCompact(s.volumeToday)}</span>} sub={<span className="text-muted-foreground">across {s.stocks} listed stocks</span>} />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Trading activity" description="Trades per day, last 7 days (UTC)" />
          <div className="px-3 pb-4 pt-4">{s ? <ActivityBars data={s.activity} /> : <Skeleton className="mx-2 h-[220px]" />}</div>
        </Card>

        <Card>
          <CardHeader title="Market simulator" description="Background price engine" />
          {s && (
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-lg border p-3.5">
                <div>
                  <p className="text-sm font-semibold">{s.simulator.running ? 'Running' : 'Paused'}</p>
                  <p className="text-xs text-muted-foreground">{s.simulator.running ? 'Prices are moving' : 'Prices are frozen'}</p>
                </div>
                <Switch label="Run simulator" checked={s.simulator.running} onChange={(v) => toggle.mutate(v)} disabled={toggle.isPending} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Tick interval</dt>
                  <dd className="font-semibold">{s.simulator.intervalSeconds} seconds</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Max move per tick</dt>
                  <dd className="font-semibold">{s.simulator.maxChangePercent}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ticks this session</dt>
                  <dd className="num font-semibold">{integer(s.simulator.ticks)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Last tick</dt>
                  <dd className="font-semibold">{relative(lastTickAt ?? s.simulator.lastTickAt)}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">Pausing stops price changes and alert checks for everyone until it is resumed.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Recent trades"
            description="Latest orders on the platform"
            action={
              <Link to="/admin/transactions" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
                All transactions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Investor</th>
                  <th className={th}>Order</th>
                  <th className={cn(th, 'text-right')}>Amount</th>
                  <th className={cn(th, 'hidden text-right 2xl:table-cell')}>When</th>
                </tr>
              </thead>
              <tbody>
                {(s?.recent ?? []).map((t) => (
                  <tr key={t.id} className={tr}>
                    <td className={td}>
                      <p className="font-medium">{t.userName}</p>
                      <p className="text-xs text-muted-foreground" title={t.userEmail ?? undefined}>{relative(t.time)}</p>
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <SideBadge type={t.type} />
                        <span className="font-semibold">{t.symbol}</span>
                        <span className="text-muted-foreground">
                          {integer(t.quantity)} @ <span className="num">{money(t.price)}</span>
                        </span>
                      </div>
                    </td>
                    <td className={cn(td, 'num text-right font-medium')}>{money(t.amount)}</td>
                    <td className={cn(td, 'hidden text-right text-xs text-muted-foreground 2xl:table-cell')}>{relative(t.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Most traded" description="By value, last 7 days" />
          <ul className="space-y-1 p-3">
            {s?.mostTraded.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">No trades this week.</p>}
            {s?.mostTraded.map((m, i) => (
              <li key={m.symbol} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <span className="w-4 text-xs font-medium text-subtle">{i + 1}</span>
                <StockAvatar symbol={m.symbol} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.symbol}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.trades} trades</p>
                </div>
                <span className="num text-sm font-medium">{moneyCompact(m.volume)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
