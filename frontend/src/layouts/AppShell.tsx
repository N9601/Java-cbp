import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Bell,
  BellRing,
  Briefcase,
  CandlestickChart,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette, type PaletteLink } from '../components/CommandPalette';
import { Logo } from '../components/market';
import { Popover } from '../components/Popover';
import { TradeProvider, useTrade } from '../components/TradeTicket';
import { Badge, Button, Kbd, Segmented, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth, useLogout } from '../lib/auth';
import { cn } from '../lib/cn';
import { initials, money, relative, signedMoney, toneText } from '../lib/format';
import { useLive, usePortfolio } from '../lib/live';
import { useTheme, type ThemeChoice } from '../lib/theme';
import type { PriceAlert, User } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const INVESTOR_NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/markets', label: 'Markets', icon: CandlestickChart },
  { to: '/app/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/app/alerts', label: 'Price alerts', icon: BellRing },
  { to: '/app/reports', label: 'Reports', icon: FileText },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/stocks', label: 'Stocks', icon: CandlestickChart },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/admin/markets', label: 'Market view', icon: LineChart },
];

export default function AppShell() {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';
  return (
    <TradeProvider enabled={!isAdmin}>
      <Shell user={user} />
    </TradeProvider>
  );
}

function Shell({ user }: { user: User }) {
  const isAdmin = user.role === 'ADMIN';
  const base = isAdmin ? '/admin' : '/app';
  const nav = isAdmin ? ADMIN_NAV : INVESTOR_NAV;
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const location = useLocation();
  const { openTrade } = useTrade();

  useEffect(() => setDrawer(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pages: PaletteLink[] = useMemo(
    () => [...nav, { to: `${base}/account`, label: 'Account settings', icon: Settings }],
    [nav, base],
  );
  const closePalette = useCallback(() => setPalette(false), []);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card lg:flex">
        <Sidebar user={user} nav={nav} base={base} />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] animate-pop-in flex-col border-r bg-card">
            <button
              onClick={() => setDrawer(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar user={user} nav={nav} base={base} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:gap-3 sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="-ml-1 rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPalette(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-subtle shadow-sm transition-colors hover:text-muted-foreground sm:max-w-sm"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search stocks or pages</span>
            <span className="ml-auto hidden items-center gap-0.5 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <MarketStatus />
            {!isAdmin && (
              <Button size="sm" onClick={() => openTrade()} className="hidden sm:inline-flex">
                <Plus className="h-4 w-4" />
                New order
              </Button>
            )}
            {!isAdmin && <Notifications />}
            <ThemeButton />
            <UserMenu user={user} base={base} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">
          {/* Pages load lazily; keep the shell on screen while a page's code arrives. */}
          <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandPalette open={palette} onClose={closePalette} pages={pages} stockBase={`${base}/markets`} />
    </div>
  );
}

function Sidebar({ user, nav, base }: { user: User; nav: NavItem[]; base: string }) {
  const isAdmin = user.role === 'ADMIN';
  return (
    <>
      <div className="flex h-14 items-center border-b px-5">
        <Link to={base} aria-label="MarketLab home">
          <Logo />
        </Link>
        {isAdmin && (
          <Badge tone="primary" className="ml-2">
            Admin
          </Badge>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-subtle">
          {isAdmin ? 'Administration' : 'Workspace'}
        </p>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
        <p className="px-2.5 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wide text-subtle">Settings</p>
        <NavLink
          to={`${base}/account`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Settings className="h-4 w-4" />
          Account
        </NavLink>
      </nav>
      {isAdmin ? <AdminFooter /> : <WalletCard />}
    </>
  );
}

function WalletCard() {
  const { data } = usePortfolio();
  return (
    <div className="m-3 rounded-xl border bg-gradient-to-br from-accent to-card p-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" />
        Virtual wallet
      </div>
      <p className="num mt-1.5 text-lg font-semibold tracking-tight">{data ? money(data.cash) : '-'}</p>
      {data && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          Net worth <span className="num font-medium text-foreground">{money(data.netWorth)}</span>
          <span className={cn('num ml-1', toneText(data.dayChange))}>{signedMoney(data.dayChange)} today</span>
        </p>
      )}
    </div>
  );
}

function AdminFooter() {
  return (
    <div className="m-3 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs text-muted-foreground">
      <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-primary" />
      Admin accounts manage stocks and users. Trading is limited to investor accounts.
    </div>
  );
}

function MarketStatus() {
  const { connected, lastTickAt } = useLive();
  const { data: status } = useQuery({ queryKey: ['market-status'], queryFn: api.marketStatus, refetchInterval: 15_000 });
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 5000);
    return () => window.clearInterval(t);
  }, []);

  const paused = status && !status.running;
  const label = !connected ? 'Connecting' : paused ? 'Market paused' : 'Live';
  const dot = !connected ? 'bg-subtle' : paused ? 'bg-warn' : 'bg-gain animate-live';
  const title = status
    ? `Simulated market. Prices tick every ${status.intervalSeconds}s (max ${status.maxChangePercent}% per tick). Last tick ${relative(lastTickAt ?? status.lastTickAt)}.`
    : 'Simulated market';
  return (
    <span
      title={title}
      className="hidden h-8 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium text-muted-foreground md:inline-flex"
    >
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
      {connected && !paused && lastTickAt && <span className="text-subtle">{relative(lastTickAt)}</span>}
    </span>
  );
}

const SEEN_KEY = 'ml-alerts-seen';

function Notifications() {
  const navigate = useNavigate();
  const { data: alerts } = useQuery({ queryKey: ['alerts'], queryFn: api.alerts });
  const [seen, setSeen] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(SEEN_KEY) ?? 0);
    } catch {
      return 0;
    }
  });
  const triggered = useMemo(
    () =>
      (alerts ?? [])
        .filter((a): a is PriceAlert & { triggeredAt: string } => a.triggered && !!a.triggeredAt)
        .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))
        .slice(0, 8),
    [alerts],
  );
  const unread = triggered.filter((a) => new Date(a.triggeredAt).getTime() > seen).length;

  const markSeen = (open: boolean) => {
    if (!open) return;
    const now = Date.now();
    setSeen(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  };

  return (
    <Popover
      onOpenChange={markSeen}
      className="w-80"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-loss px-1 text-[10px] font-semibold text-white dark:text-background">
              {unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <span className="text-xs text-muted-foreground">Triggered price alerts</span>
          </div>
          {triggered.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              No alerts have fired yet. You will be notified here the moment a price crosses your target.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {triggered.map((a) => (
                <li key={a.id} className="flex gap-3 px-4 py-2.5 hover:bg-muted/60">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <BellRing className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 text-[13px]">
                    <p>
                      <span className="font-semibold">{a.symbol}</span> went {a.condition === 'ABOVE' ? 'above' : 'below'}{' '}
                      <span className="num font-medium">{money(a.targetPrice)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{relative(a.triggeredAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t p-2">
            <button
              onClick={() => {
                close();
                navigate('/app/alerts');
              }}
              className="w-full rounded-lg py-2 text-[13px] font-medium text-primary hover:bg-muted"
            >
              Manage price alerts
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

function ThemeButton() {
  const { resolved, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
    >
      {resolved === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

function UserMenu({ user, base }: { user: User; base: string }) {
  const navigate = useNavigate();
  const logout = useLogout();
  const { choice, setChoice } = useTheme();
  return (
    <Popover
      className="w-64"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-offset-2 ring-offset-background hover:ring-2 hover:ring-ring/40"
          aria-label="Account menu"
        >
          {initials(user.name)}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <Badge tone={user.role === 'ADMIN' ? 'primary' : 'neutral'} className="mt-2">
              {user.role === 'ADMIN' ? 'Administrator' : 'Investor'}
            </Badge>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => {
                close();
                navigate(`${base}/account`);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] hover:bg-muted"
            >
              <Settings className="h-4 w-4 text-muted-foreground" /> Account settings
            </button>
          </div>
          <div className="border-t px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
            <Segmented<ThemeChoice>
              size="sm"
              label="Theme"
              className="w-full"
              value={choice}
              onChange={setChoice}
              options={[
                { value: 'light', label: <Sun className="h-3.5 w-3.5" aria-label="Light" /> },
                { value: 'dark', label: <Moon className="h-3.5 w-3.5" aria-label="Dark" /> },
                { value: 'system', label: <Monitor className="h-3.5 w-3.5" aria-label="System" /> },
              ]}
            />
          </div>
          <div className="border-t p-1.5">
            <button
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => navigate('/login', { replace: true }),
                })
              }
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-loss hover:bg-loss-soft"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}
