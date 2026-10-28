import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Spinner } from './components/ui';
import AppShell from './layouts/AppShell';
import { homeFor, useAuth } from './lib/auth';
import { LiveProvider } from './lib/live';
import { useTheme } from './lib/theme';
import type { Role } from './lib/types';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Markets = lazy(() => import('./pages/Markets'));
const StockDetail = lazy(() => import('./pages/StockDetail'));
const PortfolioPage = lazy(() => import('./pages/Portfolio'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Reports = lazy(() => import('./pages/Reports'));
const Account = lazy(() => import('./pages/Account'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminStocks = lazy(() => import('./pages/admin/Stocks'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminTransactions = lazy(() => import('./pages/admin/Transactions'));

function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const { resolved } = useTheme();
  return (
    <LiveProvider enabled={!!user}>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

          <Route path="/app" element={<RequireRole role="INVESTOR"><AppShell /></RequireRole>}>
            <Route index element={<Dashboard />} />
            <Route path="markets" element={<Markets />} />
            <Route path="markets/:symbol" element={<StockDetail />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/admin" element={<RequireRole role="ADMIN"><AppShell /></RequireRole>}>
            <Route index element={<AdminOverview />} />
            <Route path="stocks" element={<AdminStocks />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="markets" element={<Markets />} />
            <Route path="markets/:symbol" element={<StockDetail />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="bottom-right" theme={resolved} richColors closeButton />
    </LiveProvider>
  );
}
