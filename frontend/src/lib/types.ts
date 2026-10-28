export type Role = 'INVESTOR' | 'ADMIN';
export type TxnType = 'BUY' | 'SELL';
export type AlertCondition = 'ABOVE' | 'BELOW';
export type Range = '1H' | '1D' | '1W' | '1M';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  balance: number;
  createdAt: string;
}

export interface Quote {
  stockId: number;
  symbol: string;
  companyName: string;
  sector: string;
  price: number;
  refPrice: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  updatedAt: string;
}

export interface PricePoint {
  time: string;
  price: number;
}

export interface Movers {
  gainers: Quote[];
  losers: Quote[];
}

export interface Holding {
  stockId: number;
  symbol: string;
  companyName: string;
  sector: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  invested: number;
  marketValue: number;
  unrealisedPnl: number;
  unrealisedPnlPct: number;
  realisedPnl: number;
  dayChange: number;
  dayChangePct: number;
  weight: number;
}

export interface SectorSlice {
  sector: string;
  value: number;
  weight: number;
}

export interface Portfolio {
  cash: number;
  invested: number;
  marketValue: number;
  unrealisedPnl: number;
  unrealisedPnlPct: number;
  realisedPnl: number;
  totalPnl: number;
  netWorth: number;
  dayChange: number;
  dayChangePct: number;
  holdings: Holding[];
  allocation: SectorSlice[];
}

export interface Txn {
  id: number;
  symbol: string;
  companyName: string;
  type: TxnType;
  quantity: number;
  price: number;
  amount: number;
  time: string;
  realisedPnl: number | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface PriceAlert {
  id: number;
  symbol: string;
  companyName: string;
  condition: AlertCondition;
  targetPrice: number;
  currentPrice: number;
  triggered: boolean;
  createdAt: string;
  triggeredAt: string | null;
}

export interface TradeResult {
  txnId: number;
  type: TxnType;
  symbol: string;
  quantity: number;
  price: number;
  amount: number;
  balance: number;
  holdingQuantity: number;
  avgBuyPrice: number | null;
  realisedPnl: number | null;
  time: string;
}

export interface SimulatorStatus {
  running: boolean;
  intervalSeconds: number;
  maxChangePercent: number;
  lastTickAt: string | null;
  ticks: number;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: Role;
  balance: number;
  holdingsValue: number;
  holdings: number;
  trades: number;
  createdAt: string;
}

export interface PlatformStats {
  investors: number;
  admins: number;
  stocks: number;
  totalTrades: number;
  tradesToday: number;
  volumeToday: number;
  cashHeld: number;
  holdingsValue: number;
  assetsUnderManagement: number;
  activity: { day: string; trades: number; volume: number }[];
  mostTraded: { symbol: string; companyName: string; trades: number; volume: number }[];
  recent: Txn[];
  simulator: SimulatorStatus;
}

export interface PortfolioReport {
  generatedAt: string;
  investorName: string;
  investorEmail: string;
  summary: Portfolio;
}

export interface TickEvent {
  time: string;
  quotes: Quote[];
}

export interface TxnQuery {
  symbol?: string;
  type?: TxnType;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  size?: number;
}
