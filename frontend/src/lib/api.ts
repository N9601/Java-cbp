import type {
  AlertCondition,
  Movers,
  Page,
  PlatformStats,
  Portfolio,
  PortfolioReport,
  PriceAlert,
  PricePoint,
  Quote,
  Range,
  SimulatorStatus,
  TradeResult,
  Txn,
  TxnQuery,
  User,
  UserSummary,
} from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Init = Omit<RequestInit, 'body'> & { json?: unknown };

async function request<T>(path: string, init: Init = {}): Promise<T> {
  const { json, headers: rawHeaders, ...rest } = init;
  const headers = new Headers(rawHeaders);
  headers.set('Accept', 'application/json');
  let body: BodyInit | undefined;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }
  let res: Response;
  try {
    res = await fetch('/api' + path, { ...rest, headers, body, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check that the API is running.');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }
  if (!res.ok) {
    const err = (data ?? {}) as { code?: string; message?: string };
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  }
  const out = s.toString();
  return out ? `?${out}` : '';
}

const sym = (s: string) => encodeURIComponent(s);

export const api = {
  me: () => request<User>('/auth/me'),
  login: (email: string, password: string) => request<User>('/auth/login', { method: 'POST', json: { email, password } }),
  register: (name: string, email: string, password: string) =>
    request<User>('/auth/register', { method: 'POST', json: { name, email, password } }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/password', { method: 'POST', json: { currentPassword, newPassword } }),

  stocks: () => request<Quote[]>('/market/stocks'),
  stock: (symbol: string) => request<Quote>(`/market/stocks/${sym(symbol)}`),
  history: (symbol: string, range: Range) => request<PricePoint[]>(`/market/stocks/${sym(symbol)}/history${qs({ range })}`),
  movers: (n = 5) => request<Movers>(`/market/movers${qs({ n })}`),
  sparklines: () => request<Record<string, number[]>>('/market/sparklines'),
  marketStatus: () => request<SimulatorStatus>('/market/status'),

  portfolio: () => request<Portfolio>('/portfolio'),
  performance: (range: Range) => request<PricePoint[]>(`/portfolio/performance${qs({ range })}`),
  transactions: (q: TxnQuery) => request<Page<Txn>>(`/portfolio/transactions${qs({ ...q })}`),
  tradedSymbols: () => request<string[]>('/portfolio/symbols'),

  buy: (symbol: string, quantity: number) => request<TradeResult>('/trade/buy', { method: 'POST', json: { symbol, quantity } }),
  sell: (symbol: string, quantity: number) => request<TradeResult>('/trade/sell', { method: 'POST', json: { symbol, quantity } }),

  alerts: () => request<PriceAlert[]>('/alerts'),
  createAlert: (symbol: string, condition: AlertCondition, targetPrice: number) =>
    request<PriceAlert>('/alerts', { method: 'POST', json: { symbol, condition, targetPrice } }),
  deleteAlert: (id: number) => request<void>(`/alerts/${id}`, { method: 'DELETE' }),

  report: () => request<PortfolioReport>('/reports/portfolio'),
  exportUrl: (format: 'pdf' | 'csv') => `/api/reports/portfolio/export${qs({ format })}`,

  admin: {
    stats: () => request<PlatformStats>('/admin/stats'),
    users: () => request<UserSummary[]>('/admin/users'),
    removeUser: (id: number) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
    addStock: (s: { symbol: string; companyName: string; sector: string; price: number }) =>
      request<Quote>('/admin/stocks', { method: 'POST', json: s }),
    updateStock: (id: number, s: { companyName: string; sector: string; price: number }) =>
      request<Quote>(`/admin/stocks/${id}`, { method: 'PUT', json: s }),
    removeStock: (id: number) => request<void>(`/admin/stocks/${id}`, { method: 'DELETE' }),
    transactions: (q: TxnQuery) => request<Page<Txn>>(`/admin/transactions${qs({ ...q })}`),
    simulator: () => request<SimulatorStatus>('/admin/simulator'),
    setSimulator: (running: boolean) => request<SimulatorStatus>('/admin/simulator', { method: 'POST', json: { running } }),
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}
