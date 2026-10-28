import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from './api';
import { money } from './format';
import type { Portfolio, PriceAlert, Quote, TickEvent } from './types';

interface LiveState {
  connected: boolean;
  lastTickAt: string | null;
}

const LiveContext = createContext<LiveState>({ connected: false, lastTickAt: null });

/**
 * Opens the server-sent event stream once per signed-in session. Price ticks
 * are merged straight into the React Query cache, so every table and chart
 * that reads ['stocks'] re-renders with the new prices.
 */
export function LiveProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const qc = useQueryClient();
  const [state, setState] = useState<LiveState>({ connected: false, lastTickAt: null });

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource('/api/stream');
    es.addEventListener('ready', () => setState((s) => ({ ...s, connected: true })));
    es.addEventListener('tick', (e) => {
      const tick = JSON.parse((e as MessageEvent<string>).data) as TickEvent;
      setState({ connected: true, lastTickAt: tick.time });
      if (tick.quotes.length === 0) return;
      const byId = new Map(tick.quotes.map((q) => [q.stockId, q]));
      qc.setQueryData<Quote[]>(['stocks'], (old) => old?.map((q) => byId.get(q.stockId) ?? q));
      for (const q of tick.quotes) qc.setQueryData(['stock', q.symbol], q);
    });
    es.addEventListener('alert', (e) => {
      const a = JSON.parse((e as MessageEvent<string>).data) as PriceAlert;
      toast(`${a.symbol} crossed ${money(a.targetPrice)}`, {
        description: `Now ${money(a.currentPrice)}, ${a.condition === 'ABOVE' ? 'above' : 'below'} your target.`,
        icon: <BellRing className="h-4 w-4 text-primary" />,
        duration: 8000,
      });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    });
    es.onerror = () => setState((s) => ({ ...s, connected: false }));
    return () => {
      es.close();
      setState({ connected: false, lastTickAt: null });
    };
  }, [enabled, qc]);

  return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);

export function useStocks() {
  return useQuery({ queryKey: ['stocks'], queryFn: api.stocks, staleTime: 30_000, refetchInterval: 60_000 });
}

export function useQuoteMap() {
  const { data } = useStocks();
  return useMemo(() => new Map((data ?? []).map((q) => [q.symbol, q])), [data]);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Revalues the server's portfolio with the latest streamed prices. */
export function applyLivePrices(p: Portfolio, quotes: Quote[]): Portfolio {
  const byId = new Map(quotes.map((q) => [q.stockId, q]));
  let marketValue = 0;
  let dayChange = 0;
  const holdings = p.holdings.map((h) => {
    const q = byId.get(h.stockId);
    if (!q) {
      marketValue += h.marketValue;
      dayChange += h.dayChange;
      return h;
    }
    const mv = r2(h.quantity * q.price);
    const unrealised = r2(mv - h.invested);
    const dc = r2(h.quantity * (q.price - q.refPrice));
    marketValue += mv;
    dayChange += dc;
    return {
      ...h,
      currentPrice: q.price,
      marketValue: mv,
      unrealisedPnl: unrealised,
      unrealisedPnlPct: h.invested ? r2((unrealised / h.invested) * 100) : 0,
      dayChange: dc,
      dayChangePct: q.changePct,
    };
  });
  marketValue = r2(marketValue);
  const withWeights = holdings.map((h) => ({ ...h, weight: marketValue ? r2((h.marketValue / marketValue) * 100) : 0 }));
  const sectors = new Map<string, number>();
  for (const h of withWeights) sectors.set(h.sector, (sectors.get(h.sector) ?? 0) + h.marketValue);
  const allocation = [...sectors.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, value]) => ({ sector, value: r2(value), weight: marketValue ? r2((value / marketValue) * 100) : 0 }));
  const unrealisedPnl = r2(marketValue - p.invested);
  const prev = marketValue - dayChange;
  return {
    ...p,
    holdings: withWeights,
    allocation,
    marketValue,
    unrealisedPnl,
    unrealisedPnlPct: p.invested ? r2((unrealisedPnl / p.invested) * 100) : 0,
    totalPnl: r2(unrealisedPnl + p.realisedPnl),
    netWorth: r2(p.cash + marketValue),
    dayChange: r2(dayChange),
    dayChangePct: prev ? r2((dayChange / prev) * 100) : 0,
  };
}

export function usePortfolio(enabled = true) {
  const query = useQuery({ queryKey: ['portfolio'], queryFn: api.portfolio, refetchInterval: 30_000, enabled });
  const { data: quotes } = useStocks();
  const live = useMemo(
    () => (query.data && quotes ? applyLivePrices(query.data, quotes) : query.data),
    [query.data, quotes],
  );
  return { ...query, data: live };
}
