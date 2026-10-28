import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Download, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SideBadge, StockAvatar } from '../components/market';
import { Pagination } from '../components/Pagination';
import { Button, Card, EmptyState, Input, PageHeader, Segmented, Select, Skeleton, td, th, tr } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { downloadCsv, startOfLocalDay } from '../lib/files';
import { dateTime, integer, money, signedMoney } from '../lib/format';
import type { Txn, TxnQuery, TxnType } from '../lib/types';

const PAGE_SIZE = 15;

export default function Transactions() {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'ALL' | TxnType>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  const filter: TxnQuery = {
    symbol: symbol || undefined,
    type: type === 'ALL' ? undefined : type,
    from: startOfLocalDay(from),
    to: startOfLocalDay(to, 1),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', filter, page],
    queryFn: () => api.transactions({ ...filter, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const { data: symbols } = useQuery({ queryKey: ['symbols'], queryFn: api.tradedSymbols });

  const reset = () => {
    setSymbol('');
    setType('ALL');
    setFrom('');
    setTo('');
    setPage(0);
  };
  const filtered = !!(symbol || type !== 'ALL' || from || to);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: Txn[] = [];
      for (let p = 0; ; p++) {
        const res = await api.transactions({ ...filter, page: p, size: 200 });
        all.push(...res.items);
        if ((p + 1) * 200 >= res.total) break;
      }
      downloadCsv(
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Time', 'Symbol', 'Company', 'Type', 'Quantity', 'Price', 'Amount', 'Realised P/L'],
        all.map((t) => [new Date(t.time).toLocaleString('en-IN'), t.symbol, t.companyName, t.type, t.quantity, t.price, t.amount, t.realisedPnl ?? '']),
      );
    } catch (e) {
      toast.error('Export failed', { description: errorMessage(e) });
    } finally {
      setExporting(false);
    }
  };

  const onChange = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every buy and sell you have made, with the price and time it executed."
        actions={
          <Button variant="secondary" onClick={exportCsv} loading={exporting} disabled={!data?.total}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Stock</span>
            <Select value={symbol} onChange={(e) => onChange(setSymbol)(e.target.value)} className="w-44">
              <option value="">All stocks</option>
              {symbols?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Type</span>
            <Segmented<'ALL' | TxnType>
              label="Type"
              value={type}
              onChange={onChange(setType)}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'BUY', label: 'Buy' },
                { value: 'SELL', label: 'Sell' },
              ]}
            />
          </div>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">From</span>
            <Input type="date" value={from} onChange={(e) => onChange(setFrom)(e.target.value)} className="w-40" max={to || undefined} />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">To</span>
            <Input type="date" value={to} onChange={(e) => onChange(setTo)(e.target.value)} className="w-40" min={from || undefined} />
          </label>
          {filtered && (
            <Button variant="ghost" size="md" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        <div className={cn('overflow-x-auto transition-opacity', isFetching && !isLoading && 'opacity-70')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Time</th>
                <th className={th}>Stock</th>
                <th className={th}>Type</th>
                <th className={cn(th, 'text-right')}>Qty</th>
                <th className={cn(th, 'text-right')}>Price</th>
                <th className={cn(th, 'text-right')}>Amount</th>
                <th className={cn(th, 'text-right')}>Realised P/L</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-t">
                    <td colSpan={7} className="px-5 py-3">
                      <Skeleton className="h-7" />
                    </td>
                  </tr>
                ))}
              {data?.items.map((t) => (
                <tr key={t.id} className={tr}>
                  <td className={cn(td, 'text-muted-foreground')}>{dateTime(t.time)}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <StockAvatar symbol={t.symbol} size="sm" />
                      <div>
                        <p className="font-semibold">{t.symbol}</p>
                        <p className="max-w-[180px] truncate text-xs text-muted-foreground">{t.companyName}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <SideBadge type={t.type} />
                  </td>
                  <td className={cn(td, 'num text-right')}>{integer(t.quantity)}</td>
                  <td className={cn(td, 'num text-right')}>{money(t.price)}</td>
                  <td className={cn(td, 'num text-right font-medium')}>{money(t.amount)}</td>
                  <td className={cn(td, 'num text-right', t.realisedPnl === null ? 'text-subtle' : t.realisedPnl >= 0 ? 'text-gain' : 'text-loss')}>
                    {t.realisedPnl === null ? '-' : signedMoney(t.realisedPnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.items.length === 0 && (
            <EmptyState icon={<ArrowLeftRight className="h-5 w-5" />} title={filtered ? 'No transactions match these filters' : 'No transactions yet'}>
              {filtered ? 'Try widening the date range or clearing a filter.' : 'Your orders will appear here as soon as you trade.'}
            </EmptyState>
          )}
        </div>
        {data && <Pagination page={page} total={data.total} size={PAGE_SIZE} onPage={setPage} />}
      </Card>
    </>
  );
}
