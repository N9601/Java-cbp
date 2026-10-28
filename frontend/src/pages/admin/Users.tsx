import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../../components/Modal';
import { Badge, Button, Card, Input, PageHeader, Segmented, Skeleton, td, th, tr } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/cn';
import { date, initials, integer, money } from '../../lib/format';
import type { Role, UserSummary } from '../../lib/types';

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.admin.users });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'ALL' | Role>('ALL');
  const [removing, setRemoving] = useState<UserSummary | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => (role === 'ALL' || u.role === role) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  }, [users, query, role]);

  const remove = useMutation({
    mutationFn: (id: number) => api.admin.removeUser(id),
    onSuccess: () => {
      toast.success(`${removing?.name} removed`);
      setRemoving(null);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e) => {
      toast.error('Could not remove user', { description: errorMessage(e) });
      setRemoving(null);
    },
  });

  return (
    <>
      <PageHeader title="Users" description="Every account on the platform with its wallet and activity." />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="pl-9" aria-label="Search users" />
          </div>
          <Segmented<'ALL' | Role>
            label="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: 'ALL', label: 'All' },
              { value: 'INVESTOR', label: 'Investors' },
              { value: 'ADMIN', label: 'Admins' },
            ]}
          />
          <p className="text-xs text-muted-foreground sm:ml-auto">{users?.length ?? 0} accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>User</th>
                <th className={th}>Role</th>
                <th className={cn(th, 'text-right')}>Cash</th>
                <th className={cn(th, 'hidden text-right md:table-cell')}>Holdings</th>
                <th className={cn(th, 'hidden text-right lg:table-cell')}>Positions</th>
                <th className={cn(th, 'hidden text-right sm:table-cell')}>Trades</th>
                <th className={cn(th, 'hidden xl:table-cell')}>Joined</th>
                <th className={cn(th, 'text-right')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-t">
                    <td colSpan={8} className="px-5 py-3">
                      <Skeleton className="h-8" />
                    </td>
                  </tr>
                ))}
              {rows.map((u) => (
                <tr key={u.id} className={tr}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {initials(u.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {u.name}
                          {u.id === me?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <Badge tone={u.role === 'ADMIN' ? 'primary' : 'neutral'}>{u.role === 'ADMIN' ? 'Admin' : 'Investor'}</Badge>
                  </td>
                  <td className={cn(td, 'num text-right')}>{u.role === 'ADMIN' ? '-' : money(u.balance)}</td>
                  <td className={cn(td, 'num hidden text-right md:table-cell')}>{u.role === 'ADMIN' ? '-' : money(u.holdingsValue)}</td>
                  <td className={cn(td, 'num hidden text-right lg:table-cell')}>{integer(u.holdings)}</td>
                  <td className={cn(td, 'num hidden text-right sm:table-cell')}>{integer(u.trades)}</td>
                  <td className={cn(td, 'hidden text-muted-foreground xl:table-cell')}>{date(u.createdAt)}</td>
                  <td className={cn(td, 'text-right')}>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setRemoving(u)}
                      disabled={u.id === me?.id}
                      aria-label={`Remove ${u.name}`}
                      className="hover:text-loss"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && rows.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No users match.</p>}
        </div>
      </Card>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
        loading={remove.isPending}
        title={`Remove ${removing?.name}?`}
        confirmLabel="Remove user"
      >
        Their holdings, transaction history and price alerts are deleted with the account. This cannot be undone.
      </ConfirmDialog>
    </>
  );
}
