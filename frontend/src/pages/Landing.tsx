import {
  ArrowRight,
  BellRing,
  Database,
  FileDown,
  History,
  KeyRound,
  LineChart,
  Lock,
  Moon,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sun,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/market';
import { Button } from '../components/ui';
import { homeFor, useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

const FEATURES = [
  {
    icon: LineChart,
    title: 'A market that moves',
    body: 'Thirty-six listed stocks tick every five seconds on a bounded random walk, with full price history and charts from one hour to one month.',
  },
  {
    icon: ShoppingCart,
    title: 'Orders that obey the rules',
    body: 'Buy only what your wallet covers and sell only what you hold. Every order is checked before it reaches the database.',
  },
  {
    icon: Wallet,
    title: 'A portfolio that values itself',
    body: 'Quantity, average buy price, market value and profit or loss update with every tick. No spreadsheet formulas to maintain.',
  },
  {
    icon: History,
    title: 'One trustworthy history',
    body: 'Every BUY and SELL is recorded with its time, price and quantity, and filterable by stock, side and date.',
  },
  {
    icon: BellRing,
    title: 'Alerts you will not miss',
    body: 'Set a target ABOVE or BELOW the market. The simulator checks every tick and notifies you in the app the moment it fires.',
  },
  {
    icon: FileDown,
    title: 'Reports in one click',
    body: 'Export a portfolio summary with holdings, invested amount, current value and P/L as a CSV or a print-ready PDF.',
  },
];

const ENGINEERING = [
  { icon: Database, title: 'Atomic trades', body: 'Wallet, holding and history update in one JDBC transaction: committed together or rolled back together.' },
  { icon: KeyRound, title: 'Salted SHA-256', body: 'Passwords are stored only as salted hashes. Sessions live in HttpOnly cookies.' },
  { icon: ShieldCheck, title: 'Role-based access', body: 'Investors trade; admins manage stocks and users. Every query is scoped to its owner.' },
  { icon: Lock, title: 'Normalised schema', body: 'Six tables in 3NF with keys, CHECK constraints, a portfolio view and a price-logging trigger.' },
];

export default function Landing() {
  const { user } = useAuth();
  const { resolved, toggle } = useTheme();
  const home = user ? homeFor(user.role) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="MarketLab home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#engineering" className="hover:text-foreground">Under the hood</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Toggle theme">
              {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {home ? (
              <Link to={home}>
                <Button size="sm">Open dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button size="sm" variant="ghost">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 50% 0%, rgb(var(--primary) / 0.18), transparent 70%), linear-gradient(rgb(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border) / 0.6) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 44px 44px, 44px 44px',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Simulated market, real portfolio maths
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Learn to trade
              <br className="hidden sm:block" /> without risking a rupee.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              MarketLab gives you a virtual wallet of {'₹'}1,00,000, a live simulated stock market and a portfolio that
              values itself. Practise orders, track profit and loss, and get alerted when prices cross your targets.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={home ?? '/register'}>
                <Button size="lg" className="w-56">
                  {home ? 'Open dashboard' : 'Create free account'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {!home && (
                <Link to="/login?demo=investor">
                  <Button size="lg" variant="secondary" className="w-56">
                    Explore the demo
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4">
          {[
            ['36', 'listed stocks'],
            ['5 s', 'price tick interval'],
            ['100%', 'atomic trades'],
            ['CSV + PDF', 'portfolio reports'],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl font-semibold tracking-tight">{v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Features</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Everything a beginner needs to practise, and an investor needs to track.</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-sm font-semibold text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">From sign-up to your first report in minutes.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['Create an account', 'Register with your email. Your virtual wallet is funded with ₹1,00,000 straight away.'],
              ['Trade the simulated market', 'Search a stock, read its chart and place a buy or sell order. Rejected orders explain exactly why.'],
              ['Track, alert and report', 'Watch P/L update live, set price alerts and export a portfolio report whenever you need one.'],
            ].map(([t, b], i) => (
              <li key={t} className="relative rounded-xl border bg-background p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="engineering" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-primary">Under the hood</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Consistent by construction.</h2>
            <p className="mt-4 text-muted-foreground">
              A single trade changes your wallet, your holding and your history at once. MarketLab treats that as one unit of
              work, so the three can never disagree, even if something fails halfway.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Java 17 and Spring Boot, hand-written JDBC DAOs, MySQL 8 and a React interface.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ENGINEERING.map((e) => (
              <div key={e.title} className="rounded-xl border bg-card p-5 shadow-card">
                <e.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-[15px] font-semibold">{e.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{e.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 35%)' }}
          />
          <h2 className="relative text-3xl font-semibold tracking-tight">Your practice floor is open.</h2>
          <p className="relative mx-auto mt-3 max-w-xl opacity-90">Start with virtual money, make real decisions, and learn what moves your portfolio.</p>
          <Link to={home ?? '/register'} className="relative mt-8 inline-block">
            <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-indigo-700 shadow-sm hover:bg-white/90">
              {home ? 'Open dashboard' : 'Get started free'} <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>Share Market Portfolio Management System. Course-based project, Software Engineering Laboratory.</p>
          <p className="text-xs">Simulated prices for learning only. Not investment advice.</p>
        </div>
      </footer>
    </div>
  );
}

/** A static, illustrative picture of the dashboard for the landing page. */
function ProductPreview() {
  const path = 'M0,92 C30,88 45,70 70,74 C95,78 110,52 140,56 C170,60 185,40 215,46 C245,52 260,30 290,26 C320,22 335,36 360,30 C385,24 400,12 420,10';
  return (
    <div className="relative mx-auto mt-14 max-w-5xl">
      <div aria-hidden className="absolute -inset-x-10 -top-6 bottom-0 rounded-[32px] bg-primary/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-pop">
        <div className="flex items-center gap-1.5 border-b px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-loss/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-gain/60" />
          <span className="ml-3 rounded-md bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">marketlab / dashboard</span>
        </div>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Net worth', '₹1,01,752', '+1.75%'],
                ['Invested', '₹91,579', '10 stocks'],
                ['Total P/L', '+₹1,752', 'all time'],
              ].map(([l, v, s]) => (
                <div key={l} className="rounded-lg border p-3 text-left">
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                  <p className="num mt-1 text-sm font-semibold sm:text-base">{v}</p>
                  <p className="text-[11px] text-gain">{s}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border p-3 text-left">
              <p className="text-[11px] text-muted-foreground">Portfolio value, 1W</p>
              <svg viewBox="0 0 420 100" className="mt-2 h-28 w-full" preserveAspectRatio="none" aria-hidden>
                <defs>
                  <linearGradient id="lp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--gain))" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(var(--gain))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${path} L420,100 L0,100 Z`} fill="url(#lp)" />
                <path d={path} fill="none" stroke="rgb(var(--gain))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>
          <div className="space-y-2 rounded-lg border p-3 text-left">
            <p className="text-[11px] text-muted-foreground">Holdings</p>
            {[
              ['RELIANCE', '16', '+8.05%', true],
              ['INFY', '6', '+2.11%', true],
              ['TCS', '4', '−3.14%', false],
              ['ITC', '20', '+0.42%', true],
              ['HDFCBANK', '6', '−0.61%', false],
            ].map(([s, q, c, up]) => (
              <div key={s as string} className="flex items-center justify-between rounded-md px-1 py-1.5 text-xs">
                <span className="font-semibold">{s}</span>
                <span className="text-muted-foreground">{q} sh</span>
                <span className={up ? 'num font-medium text-gain' : 'num font-medium text-loss'}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
