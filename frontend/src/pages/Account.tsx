import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, KeyRound, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Segmented } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, initials, money, relative } from '../lib/format';
import { useLive } from '../lib/live';
import { useTheme, type ThemeChoice } from '../lib/theme';

export default function Account() {
  const { user } = useAuth();
  const { choice, setChoice } = useTheme();
  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';

  return (
    <>
      <PageHeader title="Account" description="Your profile, security and preferences." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" /> Profile</span>} />
          <div className="flex items-center gap-4 p-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <Badge tone={isAdmin ? 'primary' : 'neutral'} className="mt-1.5">
                {isAdmin ? 'Administrator' : 'Investor'}
              </Badge>
            </div>
          </div>
          <dl className="grid grid-cols-2 border-t text-sm">
            <div className="px-5 py-4">
              <dt className="text-xs text-muted-foreground">Member since</dt>
              <dd className="mt-0.5 font-medium">{date(user.createdAt)}</dd>
            </div>
            <div className="border-l px-5 py-4">
              <dt className="text-xs text-muted-foreground">{isAdmin ? 'Access' : 'Wallet balance'}</dt>
              <dd className="num mt-0.5 font-medium">{isAdmin ? 'Stocks, users, all trades' : money(user.balance)}</dd>
            </div>
          </dl>
        </Card>

        <PasswordCard />

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground" /> Appearance</span>} description="Choose a theme or follow your system setting." />
          <div className="p-5">
            <Segmented<ThemeChoice>
              label="Theme"
              value={choice}
              onChange={setChoice}
              className="w-full"
              options={[
                { value: 'light', label: <><Sun className="h-4 w-4" /> Light</> },
                { value: 'dark', label: <><Moon className="h-4 w-4" /> Dark</> },
                { value: 'system', label: <><Monitor className="h-4 w-4" /> System</> },
              ]}
            />
          </div>
        </Card>

        <SimulationCard />
      </div>
    </>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && next !== confirm;
  const change = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => {
      toast.success('Password updated');
      setCurrent('');
      setNext('');
      setConfirm('');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!mismatch) change.mutate();
  };

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /> Password</span>} description="Stored only as a salted SHA-256 hash." />
      <form onSubmit={onSubmit} className="space-y-3 p-5">
        <Field label="Current password" htmlFor="pw-current">
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="New password" htmlFor="pw-new" hint="8+ characters, a letter and a number">
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </Field>
          <Field label="Confirm" htmlFor="pw-confirm" error={mismatch ? 'Passwords do not match.' : undefined}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
        </div>
        {change.error && <p className="text-[13px] text-loss">{errorMessage(change.error)}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={change.isPending} disabled={mismatch || !current || !next}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SimulationCard() {
  const { data } = useQuery({ queryKey: ['market-status'], queryFn: api.marketStatus, refetchInterval: 15_000 });
  const { connected, lastTickAt } = useLive();
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /> About the simulated market</span>} />
      <div className="space-y-3 p-5 text-sm text-muted-foreground">
        <p>
          Prices move on a bounded random walk: a shared market move plus a stock-specific move, capped per tick and gently pulled back
          towards each stock's anchor price. Every change is logged to the price history by a database trigger.
        </p>
        {data && (
          <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/60 p-3 text-foreground">
            <div>
              <dt className="text-xs text-muted-foreground">Tick interval</dt>
              <dd className="font-semibold">{data.intervalSeconds}s</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Max move</dt>
              <dd className="font-semibold">{data.maxChangePercent}% / tick</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="font-semibold">{data.running ? (connected ? 'Live' : 'Running') : 'Paused'}</dd>
            </div>
          </dl>
        )}
        <p className="text-xs">Last tick received {relative(lastTickAt ?? data?.lastTickAt)}.</p>
      </div>
    </Card>
  );
}
