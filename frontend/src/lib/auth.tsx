import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { Role, User } from './types';

export const homeFor = (role: Role) => (role === 'ADMIN' ? '/admin' : '/app');

/** Route prefix of the signed-in user's workspace. */
export function useBase() {
  const { user } = useAuth();
  return user ? homeFor(user.role) : '/app';
}

/** The signed-in user, or null when signed out. Undefined while loading. */
export function useAuth() {
  const query = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
  return { user: query.data, loading: query.isLoading, error: query.error };
}

/**
 * Swaps the signed-in user and drops every other cached query, so nothing
 * from the previous account leaks into the next. The ['me'] query itself is
 * kept (not cleared) so components already observing it see the change.
 */
function switchUser(qc: QueryClient, user: User | null) {
  qc.setQueryData(['me'], user);
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: (user) => switchUser(qc, user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) =>
      api.register(name, email, password),
    onSuccess: (user) => switchUser(qc, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => switchUser(qc, null),
  });
}
