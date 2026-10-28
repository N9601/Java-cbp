import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, Minus, Plus } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { integer, money, signedMoney } from '../lib/format';
import { usePortfolio, useQuoteMap, useStocks } from '../lib/live';
import type { TradeResult, TxnType } from '../lib/types';
import { LivePrice, StockAvatar } from './market';
import { Modal } from './Modal';
import { Button, Segmented, Select } from './ui';

const INVALIDATE = ['portfolio', 'me', 'transactions', 'performance', 'report', 'symbols'];

export function TradeTicket({
  symbol,
  side: initialSide = 'BUY',
  onDone,
}: {
  symbol: string;
  side?: TxnType;
  onDone?: (r: TradeResult) => void;
}) {
  const qc = useQueryClient();
  const quote = useQuoteMap().get(symbol);
  const { data: portfolio } = usePortfolio();
  const [side, setSide] = useState<TxnType>(initialSide);
  const [qty, setQty] = useState('1');

  useEffect(() => setSide(initialSide), [initialSide, symbol]);
  useEffect(() => setQty('1'), [symbol]);

  const held = portfolio?.holdings.find((h) => h.symbol === symbol)?.quantity ?? 0;
  const avg = portfolio?.holdings.find((h) => h.symbol === symbol)?.avgBuyPrice;
  const cash = portfolio?.cash ?? 0;
  const price = quote?.price ?? 0;
  const n = Math.floor(Number(qty));
  const valid = Number.isFinite(n) && n >= 1 && String(qty).trim() !== '';
  const amount = valid ? n * price : 0;
  const maxBuy = price ? Math.floor(cash / price) : 0;

  const problem = !valid
    ? 'Enter a quantity of at least 1.'
    : side === 'BUY' && amount > cash
      ? `Insufficient balance. You can afford up to ${integer(maxBuy)} share${maxBuy === 1 ? '' : 's'}.`
      : side === 'SELL' && n > held
        ? held
          ? `You hold ${integer(held)} share${held === 1 ? '' : 's'} of ${symbol}.`
          : `You don't hold any ${symbol} yet.`
        : null;

  const mutation = useMutation({
    mutationFn: () => (side === 'BUY' ? api.buy(symbol, n) : api.sell(symbol, n)),
    onSuccess: (r) => {
      toast.success(`${r.type === 'BUY' ? 'Bought' : 'Sold'} ${integer(r.quantity)} ${r.symbol} at ${money(r.price)}`, {
        description:
          r.type === 'SELL' && r.realisedPnl !== null
            ? `Realised P/L ${signedMoney(r.realisedPnl)}. Wallet now ${money(r.balance)}.`
            : `Total ${money(r.amount)}. Wallet now ${money(r.balance)}.`,
      });
      for (const key of INVALIDATE) qc.invalidateQueries({ queryKey: [key] });
      setQty('1');
      onDone?.(r);
    },
    onError: (e) => toast.error('Order rejected', { description: errorMessage(e) }),
  });

  const quick =
    side === 'BUY'
      ? [
          { label: '1', v: 1 },
          { label: '5', v: 5 },
          { label: '10', v: 10 },
          { label: 'Max', v: Math.max(maxBuy, 1) },
        ]
      : [
          { label: '25%', v: Math.max(1, Math.floor(held * 0.25)) },
          { label: '50%', v: Math.max(1, Math.floor(held * 0.5)) },
          { label: 'All', v: Math.max(held, 1) },
        ];

  const step = (d: number) => setQty(String(Math.max(1, (valid ? n : 0) + d)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!problem && !mutation.isPending) mutation.mutate();
      }}
      className="space-y-4"
    >
      <Segmented<TxnType>
        label="Order side"
        value={side}
        onChange={setSide}
        className="w-full"
        options={[
          { value: 'BUY', label: 'Buy', activeClass: '!bg-gain !text-white dark:!text-background' },
          { value: 'SELL', label: 'Sell', activeClass: '!bg-loss !text-white dark:!text-background' },
        ]}
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Market price</span>
        {quote ? <LivePrice value={price} className="font-semibold" /> : <span>-</span>}
      </div>

      <div>
        <label htmlFor={`qty-${symbol}`} className="mb-1.5 block text-[13px] font-medium">
          Quantity
        </label>
        <div className="flex items-center gap-2">
          <div className="flex h-10 flex-1 items-center rounded-lg border bg-card shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
            <button type="button" onClick={() => step(-1)} className="flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Decrease quantity">
              <Minus className="h-4 w-4" />
            </button>
            <input
              id={`qty-${symbol}`}
              inputMode="numeric"
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
              className="num h-full min-w-0 flex-1 bg-transparent text-center text-base font-semibold outline-none"
              data-autofocus
            />
            <button type="button" onClick={() => step(1)} className="flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Increase quantity">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setQty(String(q.v))}
              disabled={side === 'SELL' && held === 0}
              className="h-7 flex-1 rounded-md border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="space-y-2 rounded-lg bg-muted/60 p-3 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{side === 'BUY' ? 'Estimated cost' : 'Estimated proceeds'}</dt>
          <dd className="num font-semibold">{money(amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{side === 'BUY' ? 'Available cash' : 'Shares held'}</dt>
          <dd className="num">{side === 'BUY' ? money(cash) : integer(held)}</dd>
        </div>
        {side === 'SELL' && avg !== undefined && valid && n <= held && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estimated realised P/L</dt>
            <dd className={cn('num font-medium', price - avg >= 0 ? 'text-gain' : 'text-loss')}>
              {signedMoney((price - avg) * n)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border/70 pt-2">
          <dt className="text-muted-foreground">Cash after order</dt>
          <dd className="num">{money(side === 'BUY' ? cash - amount : cash + amount)}</dd>
        </div>
      </dl>

      {problem && valid && (
        <p className="text-[13px] text-loss" role="alert">
          {problem}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        variant={side === 'BUY' ? 'gain' : 'loss'}
        className="w-full"
        disabled={!!problem || !quote}
        loading={mutation.isPending}
      >
        {side === 'BUY' ? 'Buy' : 'Sell'} {valid ? integer(n) : ''} {symbol}
      </Button>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        Market order. It fills at the latest simulated price and is saved as one atomic transaction.
      </p>
    </form>
  );
}

interface TradeContextValue {
  openTrade: (symbol?: string, side?: TxnType) => void;
}

const TradeContext = createContext<TradeContextValue>({ openTrade: () => {} });

export function TradeProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [state, setState] = useState<{ open: boolean; symbol?: string; side: TxnType }>({ open: false, side: 'BUY' });
  const { data: stocks } = useStocks();
  const openTrade = useCallback((symbol?: string, side: TxnType = 'BUY') => setState({ open: true, symbol, side }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const symbol = state.symbol ?? stocks?.[0]?.symbol;
  const quote = useMemo(() => stocks?.find((s) => s.symbol === symbol), [stocks, symbol]);

  return (
    <TradeContext.Provider value={{ openTrade }}>
      {children}
      {enabled && (
        <Modal open={state.open} onClose={close} title="Place order" description="Trade with your virtual wallet.">
          <div className="mb-4 flex items-center gap-3 rounded-lg border p-2.5">
            {quote && <StockAvatar symbol={quote.symbol} />}
            <Select
              aria-label="Stock"
              value={symbol ?? ''}
              onChange={(e) => setState((s) => ({ ...s, symbol: e.target.value }))}
              className="border-0 shadow-none focus:ring-0"
            >
              {stocks?.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.companyName}
                </option>
              ))}
            </Select>
          </div>
          {symbol && <TradeTicket symbol={symbol} side={state.side} onDone={close} />}
        </Modal>
      )}
    </TradeContext.Provider>
  );
}

export const useTrade = () => useContext(TradeContext);
