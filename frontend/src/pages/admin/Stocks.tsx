import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChangePill, LivePrice, StockAvatar } from '../../components/market';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { Badge, Button, Card, Field, Input, PageHeader, Select, Skeleton, td, th, tr } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { relative } from '../../lib/format';
import { useStocks } from '../../lib/live';
import type { Quote } from '../../lib/types';

export default function AdminStocks() {
  const qc = useQueryClient();
  const { data: stocks, isLoading } = useStocks();
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('all');
  const [editing, setEditing] = useState<Quote | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Quote | null>(null);

  const sectors = useMemo(() => [...new Set((stocks ?? []).map((s) => s.sector))].sort(), [stocks]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (stocks ?? []).filter(
      (s) => (sector === 'all' || s.sector === sector) && (!q || s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)),
    );
  }, [stocks, query, sector]);

  const remove = useMutation({
    mutationFn: (id: number) => api.admin.removeStock(id),
    onSuccess: () => {
      toast.success(`${deleting?.symbol} removed from the market`);
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['stocks'] });
    },
    onError: (e) => {
      toast.error('Could not remove stock', { description: errorMessage(e) });
      setDeleting(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Stocks"
        description="List, edit and remove the stocks available on the simulated market."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> List a stock
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol or company" className="pl-9" aria-label="Search stocks" />
          </div>
          <Select value={sector} onChange={(e) => setSector(e.target.value)} className="sm:w-52" aria-label="Sector">
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">{stocks?.length ?? 0} listed</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Stock</th>
                <th className={cn(th, 'hidden md:table-cell')}>Sector</th>
                <th className={cn(th, 'text-right')}>Price</th>
                <th className={cn(th, 'text-right')}>24h</th>
                <th className={cn(th, 'hidden lg:table-cell')}>Updated</th>
                <th className={cn(th, 'text-right')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-t">
                    <td colSpan={6} className="px-5 py-3">
                      <Skeleton className="h-8" />
                    </td>
                  </tr>
                ))}
              {rows.map((s) => (
                <tr key={s.stockId} className={tr}>
                  <td className={td}>
                    <Link to={`/admin/markets/${encodeURIComponent(s.symbol)}`} className="flex items-center gap-3">
                      <StockAvatar symbol={s.symbol} />
                      <div className="min-w-0">
                        <p className="font-semibold hover:underline">{s.symbol}</p>
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">{s.companyName}</p>
                      </div>
                    </Link>
                  </td>
                  <td className={cn(td, 'hidden md:table-cell')}>
                    <Badge>{s.sector}</Badge>
                  </td>
                  <td className={cn(td, 'text-right font-medium')}>
                    <LivePrice value={s.price} />
                  </td>
                  <td className={cn(td, 'text-right')}>
                    <ChangePill percent={s.changePct} />
                  </td>
                  <td className={cn(td, 'hidden text-muted-foreground lg:table-cell')}>{relative(s.updatedAt)}</td>
                  <td className={cn(td, 'text-right')}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${s.symbol}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => setDeleting(s)} aria-label={`Remove ${s.symbol}`} className="hover:text-loss">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <StockForm stock={editing} sectors={sectors} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.stockId)}
        loading={remove.isPending}
        title={`Remove ${deleting?.symbol}?`}
        confirmLabel="Remove stock"
      >
        This deletes the stock, its price history and any price alerts on it. Stocks that investors hold or have traded cannot be
        removed, so their records stay intact.
      </ConfirmDialog>
    </>
  );
}

function StockForm({ stock, sectors, onClose }: { stock: Quote | 'new' | null; sectors: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = stock === 'new';
  const [symbol, setSymbol] = useState('');
  const [company, setCompany] = useState('');
  const [sector, setSector] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (stock && stock !== 'new') {
      setSymbol(stock.symbol);
      setCompany(stock.companyName);
      setSector(stock.sector);
      setPrice(stock.price.toFixed(2));
    } else if (stock === 'new') {
      setSymbol('');
      setCompany('');
      setSector('');
      setPrice('');
    }
  }, [stock]);

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api.admin.addStock({ symbol: symbol.trim().toUpperCase(), companyName: company, sector, price: Number(price) })
        : api.admin.updateStock((stock as Quote).stockId, { companyName: company, sector, price: Number(price) }),
    onSuccess: (q) => {
      toast.success(isNew ? `${q.symbol} is now listed` : `${q.symbol} updated`);
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['sparklines'] });
      onClose();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <Modal
      open={stock !== null}
      onClose={() => {
        save.reset();
        onClose();
      }}
      title={isNew ? 'List a new stock' : `Edit ${symbol}`}
      description={isNew ? 'It joins the simulated market on the next tick.' : 'Changing the price logs a new point in its price history.'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {save.error && <p className="rounded-lg bg-loss-soft px-3 py-2 text-[13px] text-loss">{errorMessage(save.error)}</p>}
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Field label="Symbol" htmlFor="st-symbol" hint={isNew ? 'Letters, digits, & . -' : 'Cannot be changed'}>
            <Input id="st-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} disabled={!isNew} maxLength={20} required className="uppercase" />
          </Field>
          <Field label="Company name" htmlFor="st-company">
            <Input id="st-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={150} required />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sector" htmlFor="st-sector">
            <Input id="st-sector" list="sector-list" value={sector} onChange={(e) => setSector(e.target.value)} maxLength={60} required />
            <datalist id="sector-list">
              {sectors.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Price (INR)" htmlFor="st-price">
            <Input id="st-price" type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="num" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isNew ? 'List stock' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
