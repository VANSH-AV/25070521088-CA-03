import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './context.js';
import { safeReturnTo } from './returnTo.js';

function SessionLoading() {
  return (
    <main className="auth-loading" aria-busy="true" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>Checking your session…</p>
    </main>
  );
}

export function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status !== 'authenticated') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    const query = new URLSearchParams({ returnTo }).toString();

    return <Navigate to={`/login?${query}`} replace />;
  }

  return children;
}

export function GuestOnlyRoute({ children }) {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status === 'authenticated') {
    return <Navigate to={safeReturnTo(searchParams.get('returnTo'))} replace />;
  }

  return children;
}

export function StudentRoute({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (status !== 'authenticated') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    const query = new URLSearchParams({ returnTo }).toString();

    return <Navigate to={`/login?${query}`} replace />;
  }

  if (user.role !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
