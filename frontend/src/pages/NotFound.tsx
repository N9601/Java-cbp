import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, EmptyState } from '../components/ui';
import { homeFor, useAuth } from '../lib/auth';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title="Page not found"
        action={
          <Link to={user ? homeFor(user.role) : '/'}>
            <Button>{user ? 'Back to dashboard' : 'Go home'}</Button>
          </Link>
        }
      >
        The page you were looking for doesn't exist or has moved.
      </EmptyState>
    </div>
  );
}
