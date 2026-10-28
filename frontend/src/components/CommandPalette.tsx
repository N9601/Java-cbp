import { CornerDownLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { money } from '../lib/format';
import { useStocks } from '../lib/live';
import { ChangePill, StockAvatar } from './market';
import { Kbd } from './ui';

export interface PaletteLink {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

type Item =
  | { kind: 'page'; key: string; label: string; to: string; icon: PaletteLink['icon'] }
  | { kind: 'stock'; key: string; label: string; to: string; symbol: string; company: string; price: number; changePct: number };

export function CommandPalette({
  open,
  onClose,
  pages,
  stockBase,
}: {
  open: boolean;
  onClose: () => void;
  pages: PaletteLink[];
  stockBase: string;
}) {
  const navigate = useNavigate();
  const { data: stocks } = useStocks();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const pageItems: Item[] = pages
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .map((p) => ({ kind: 'page', key: 'p:' + p.to, label: p.label, to: p.to, icon: p.icon }));
    const stockItems: Item[] = (stocks ?? [])
      .filter((s) => !q || s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q))
      .sort((a, b) => {
        if (!q) return a.symbol.localeCompare(b.symbol);
        const ap = a.symbol.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.symbol.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || a.symbol.localeCompare(b.symbol);
      })
      .slice(0, q ? 12 : 6)
      .map((s) => ({
        kind: 'stock',
        key: 's:' + s.symbol,
        label: s.symbol,
        to: `${stockBase}/${encodeURIComponent(s.symbol)}`,
        symbol: s.symbol,
        company: s.companyName,
        price: s.price,
        changePct: s.changePct,
      }));
    return q ? [...stockItems, ...pageItems] : [...pageItems, ...stockItems];
  }, [query, pages, stocks, stockBase]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (item: Item | undefined) => {
    if (!item) return;
    navigate(item.to);
    onClose();
  };

  const stocksFirst = query.trim() !== '';
  const firstStock = items.findIndex((i) => i.kind === 'stock');
  const firstPage = items.findIndex((i) => i.kind === 'page');

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-2xl border bg-card shadow-pop" role="dialog" aria-modal="true" aria-label="Search">
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(items[active]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Search stocks by symbol, company or sector, or jump to a page"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
            aria-label="Search"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={list} className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin">
          {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matches for "{query}".</p>}
          {items.map((item, i) => (
            <div key={item.key}>
              {(i === firstStock || i === firstPage) && (
                <p className={cn('px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-subtle', i > 0 && 'pt-3')}>
                  {item.kind === 'stock' ? 'Stocks' : stocksFirst ? 'Pages' : 'Go to'}
                </p>
              )}
              <button
                data-index={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(item)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm',
                  i === active ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                {item.kind === 'page' ? (
                  <>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 font-medium">{item.label}</span>
                  </>
                ) : (
                  <>
                    <StockAvatar symbol={item.symbol} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{item.symbol}</span>
                      <span className="ml-2 truncate text-muted-foreground">{item.company}</span>
                    </span>
                    <span className="num text-[13px]">{money(item.price)}</span>
                    <ChangePill percent={item.changePct} />
                  </>
                )}
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-subtle" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
