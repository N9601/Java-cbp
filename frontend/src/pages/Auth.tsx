import { AlertCircle, Check, Eye, EyeOff, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/market';
import { Button, Field, Input } from '../components/ui';
import { errorMessage } from '../lib/api';
import { homeFor, useLogin, useRegister } from '../lib/auth';
import { cn } from '../lib/cn';

// Seeded demo accounts (see DataSeeder on the server).
const DEMO = {
  investor: { email: 'demo@marketlab.dev', password: 'Demo@1234' },
  admin: { email: 'admin@marketlab.dev', password: 'Admin@123' },
};

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link to="/" className="self-start" aria-label="MarketLab home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-subtle">Simulated prices for learning only. Not investment advice.</p>
      </div>
      <BrandPanel />
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[#13123a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(70% 60% at 80% 10%, rgba(129,140,248,0.45), transparent 60%), radial-gradient(50% 50% at 10% 90%, rgba(52,211,153,0.18), transparent 60%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
        }}
      />
      <div className="relative">
        <p className="text-sm font-medium text-indigo-200">MarketLab</p>
        <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight">
          Your practice floor for the share market.
        </h2>
        <ul className="mt-8 space-y-4 text-[15px] text-indigo-100/90">
          {[
            [Wallet, 'Start with ₹1,00,000 of virtual cash'],
            [TrendingUp, 'Live prices, charts and automatic profit and loss'],
            [ShieldCheck, 'Every trade is atomic and fully audited'],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Wallet;
            return (
              <li key={text as string} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <I className="h-4 w-4" />
                </span>
                {text as string}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="relative max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
        <p className="text-xs text-indigo-200">Portfolio value</p>
        <p className="num mt-1 text-2xl font-semibold">{'₹'}1,01,752.18</p>
        <p className="num mt-0.5 text-sm text-emerald-300">+{'₹'}1,752.18 (+1.75%) all time</p>
        <svg viewBox="0 0 300 60" className="mt-4 h-14 w-full" aria-hidden preserveAspectRatio="none">
          <path
            d="M0,48 C25,46 35,34 60,37 C85,40 100,22 125,26 C150,30 165,14 190,18 C215,22 230,8 255,10 C275,12 290,4 300,3"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-loss/30 bg-loss-soft px-3 py-2.5 text-[13px] text-loss">
      <AlertCircle className="mt-px h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="h-10 pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Login() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: string } | null)?.from;

  const submit = (creds: { email: string; password: string }) =>
    login.mutate(creds, {
      onSuccess: (user) => {
        const home = homeFor(user.role);
        navigate(from && from.startsWith(home) ? from : home, { replace: true });
      },
    });

  useEffect(() => {
    const demo = params.get('demo');
    if (demo === 'investor' || demo === 'admin') {
      setEmail(DEMO[demo].email);
      setPassword(DEMO[demo].password);
    }
  }, [params]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit({ email, password });
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your MarketLab workspace.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {login.error && <ErrorBox message={errorMessage(login.error)} />}
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-10" required autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-subtle">
        <div className="h-px flex-1 bg-border" />
        or explore with a demo account
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => submit(DEMO.investor)} disabled={login.isPending}>
          Demo investor
        </Button>
        <Button variant="secondary" onClick={() => submit(DEMO.admin)} disabled={login.isPending}>
          Demo admin
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to MarketLab?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

export function Register() {
  const register = useRegister();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const rules = [
    { ok: password.length >= 8, label: 'At least 8 characters' },
    { ok: /[A-Za-z]/.test(password) && /\d/.test(password), label: 'A letter and a number' },
  ];
  const ready = rules.every((r) => r.ok);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate({ name, email, password }, { onSuccess: () => navigate('/app', { replace: true }) });
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your wallet starts with <span className="font-medium text-foreground">{'₹'}1,00,000</span> of virtual cash.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {register.error && <ErrorBox message={errorMessage(register.error)} />}
        <Field label="Full name" htmlFor="name">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-10" required autoFocus />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-10" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <ul className="space-y-1">
          {rules.map((r) => (
            <li key={r.label} className={cn('flex items-center gap-2 text-xs', r.ok ? 'text-gain' : 'text-muted-foreground')}>
              <Check className={cn('h-3.5 w-3.5', !r.ok && 'opacity-40')} />
              {r.label}
            </li>
          ))}
        </ul>
        <Button type="submit" size="lg" className="w-full" loading={register.isPending} disabled={!ready}>
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
