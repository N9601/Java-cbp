import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SideBadge } from '../../components/market';
import { Pagination } from '../../components/Pagination';
import { Card, Input, PageHeader, Segmented, Select, Skeleton, td, th, tr } from '../../components/ui';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { startOfLocalDay } from '../../lib/files';
import { dateTime, integer, money } from '../../lib/format';
import { useStocks } from '../../lib/live';
import type { TxnType } from '../../lib/types';

const PAGE_SIZE = 20;

export default function AdminTransactions() {
  const { data: stocks } = useStocks();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'ALL' | TxnType>('ALL');
  const [from, setFrom] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 250);
    return () => window.clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(0), [debounced, symbol, type, from]);

  const filter = { q: debounced || undefined, symbol: symbol || undefined, type: type === 'ALL' ? undefined : type, from: startOfLocalDay(from) };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-transactions', filter, page],
    queryFn: () => api.admin.transactions({ ...filter, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="All transactions" description="The complete, immutable trade record across every investor." />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <label className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Search</span>
            <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Investor, email or symbol" className="pl-9" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Stock</span>
            <Select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-40">
              <option value="">All stocks</option>
              {stocks?.map((s) => (
                <option key={s.symbol}>{s.symbol}</option>
              ))}
            </Select>
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Type</span>
            <Segmented<'ALL' | TxnType>
              label="Type"
              value={type}
              onChange={setType}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'BUY', label: 'Buy' },
                { value: 'SELL', label: 'Sell' },
              ]}
            />
          </div>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Since</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </label>
        </div>
        <div className={cn('overflow-x-auto transition-opacity', isFetching && !isLoading && 'opacity-70')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Time</th>
                <th className={th}>Investor</th>
                <th className={th}>Stock</th>
                <th className={th}>Type</th>
                <th className={cn(th, 'text-right')}>Qty</th>
                <th className={cn(th, 'hidden text-right sm:table-cell')}>Price</th>
                <th className={cn(th, 'text-right')}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }, (_, i) => (
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
                    <p className="font-medium">{t.userName}</p>
                    <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                  </td>
                  <td className={cn(td, 'font-semibold')}>{t.symbol}</td>
                  <td className={td}>
                    <SideBadge type={t.type} />
                  </td>
                  <td className={cn(td, 'num text-right')}>{integer(t.quantity)}</td>
                  <td className={cn(td, 'num hidden text-right sm:table-cell')}>{money(t.price)}</td>
                  <td className={cn(td, 'num text-right font-medium')}>{money(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.items.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No transactions match these filters.</p>}
        </div>
        {data && <Pagination page={page} total={data.total} size={PAGE_SIZE} onPage={setPage} />}
      </Card>
    </>
  );
}
