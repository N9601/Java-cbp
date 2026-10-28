import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { Logo } from '../components/market';
import { Button, Card, PageHeader, Skeleton, td, th } from '../components/ui';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import { dateTime, integer, money, pct, signedMoney } from '../lib/format';

export default function Reports() {
  const { data: report, isLoading, refetch, isFetching } = useQuery({ queryKey: ['report'], queryFn: api.report });
  const s = report?.summary;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Holdings, invested amount, current value and profit or loss in one summary."
        actions={
          <>
            <Button variant="ghost" onClick={() => refetch()} loading={isFetching} aria-label="Refresh report">
              {!isFetching && <RefreshCw className="h-4 w-4" />} Refresh
            </Button>
            <a href={api.exportUrl('csv')} download>
              <Button variant="secondary">
                <FileSpreadsheet className="h-4 w-4" /> Download CSV
              </Button>
            </a>
            <a href={api.exportUrl('pdf')} download>
              <Button>
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
            </a>
          </>
        }
      />

      {isLoading || !report || !s ? (
        <Skeleton className="h-[480px] rounded-xl" />
      ) : (
        <Card className="mx-auto max-w-5xl overflow-hidden">
          <div className="flex flex-col gap-4 border-b bg-muted/30 px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
            <div>
              <Logo />
              <h2 className="mt-4 text-xl font-semibold tracking-tight">Portfolio report</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.investorName} · {report.investorEmail}
              </p>
            </div>
            <div className="text-sm sm:text-right">
              <p className="text-muted-foreground">Generated</p>
              <p className="font-medium">{dateTime(report.generatedAt)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Amounts in INR</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 border-b md:grid-cols-4">
            {[
              ['Net worth', money(s.netWorth), null],
              ['Cash balance', money(s.cash), null],
              ['Invested', money(s.invested), null],
              ['Current value', money(s.marketValue), null],
              ['Unrealised P/L', `${signedMoney(s.unrealisedPnl)} (${pct(s.unrealisedPnlPct)})`, s.unrealisedPnl],
              ['Realised P/L', signedMoney(s.realisedPnl), s.realisedPnl],
              ['Total P/L', signedMoney(s.totalPnl), s.totalPnl],
              ['Positions', String(s.holdings.length), null],
            ].map(([label, value, tone], i) => (
              <div key={label as string} className={cn('px-6 py-4 sm:px-8', i % 4 !== 0 && 'md:border-l', i % 2 === 1 && 'border-l', i >= 2 && 'border-t', i >= 4 && 'md:border-t', i < 4 && i >= 2 && 'md:border-t-0')}>
                <dt className="text-xs text-muted-foreground">{label as string}</dt>
                <dd className={cn('num mt-1 font-semibold', tone === null ? '' : (tone as number) >= 0 ? 'text-gain' : 'text-loss')}>{value as string}</dd>
              </div>
            ))}
          </dl>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className={th}>Symbol</th>
                  <th className={cn(th, 'hidden 2xl:table-cell')}>Company</th>
                  <th className={cn(th, 'text-right')}>Qty</th>
                  <th className={cn(th, 'hidden text-right md:table-cell')}>Avg buy</th>
                  <th className={cn(th, 'text-right')}>Price</th>
                  <th className={cn(th, 'hidden text-right xl:table-cell')}>Invested</th>
                  <th className={cn(th, 'text-right')}>Value</th>
                  <th className={cn(th, 'text-right')}>Unrealised P/L</th>
                  <th className={cn(th, 'hidden text-right 2xl:table-cell')}>Realised P/L</th>
                </tr>
              </thead>
              <tbody>
                {s.holdings.map((h) => (
                  <tr key={h.symbol} className="border-t">
                    <td className={cn(td, 'font-semibold')}>{h.symbol}</td>
                    <td className={cn(td, 'hidden text-muted-foreground 2xl:table-cell')}>{h.companyName}</td>
                    <td className={cn(td, 'num text-right')}>{integer(h.quantity)}</td>
                    <td className={cn(td, 'num hidden text-right md:table-cell')}>{money(h.avgBuyPrice)}</td>
                    <td className={cn(td, 'num text-right')}>{money(h.currentPrice)}</td>
                    <td className={cn(td, 'num hidden text-right xl:table-cell')}>{money(h.invested)}</td>
                    <td className={cn(td, 'num text-right')}>{money(h.marketValue)}</td>
                    <td className={cn(td, 'num text-right', h.unrealisedPnl >= 0 ? 'text-gain' : 'text-loss')}>
                      {signedMoney(h.unrealisedPnl)} <span className="text-xs">({pct(h.unrealisedPnlPct)})</span>
                    </td>
                    <td className={cn(td, 'num hidden text-right 2xl:table-cell', h.realisedPnl > 0 ? 'text-gain' : h.realisedPnl < 0 ? 'text-loss' : 'text-subtle')}>
                      {signedMoney(h.realisedPnl)}
                    </td>
                  </tr>
                ))}
                {s.holdings.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={9} className="px-8 py-10 text-center text-sm text-muted-foreground">
                      No open positions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t px-6 py-4 text-xs text-muted-foreground sm:px-8">
            Prices come from the simulated market and are not real quotes. Realised P/L uses the weighted-average cost of each
            holding at the time of sale.
          </p>
        </Card>
      )}
    </>
  );
}
