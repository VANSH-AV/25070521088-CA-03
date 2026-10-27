import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/context.js';
import { isMyProjectsRoute } from '../utils/navigation.js';
import { Icon } from './icons.jsx';
import { Avatar, Button, Logo } from './ui.jsx';

export function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const isStudent = user.role === 'student';
  const myProjectsActive = isMyProjectsRoute(pathname);

  const handleLogout = async () => {
    setSigningOut(true);
    setError('');

    try {
      await logout();
      window.location.replace('/');
    } catch {
      setError('Logout could not reach the server. This session is still active.');
      setSigningOut(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link className="brand-link" to="/" aria-label="FLEXI home">
          <Logo />
        </Link>
        <nav className="dashboard-nav" aria-label="Studio">
          <NavLink to="/dashboard" end>
            Overview
          </NavLink>
          <NavLink to="/projects" end>
            Discover
          </NavLink>
          <Link
            to="/dashboard/projects"
            className={myProjectsActive ? 'active' : undefined}
            aria-current={myProjectsActive ? 'page' : undefined}
          >
            My projects
          </Link>
          <NavLink to="/dashboard/applications">My applications</NavLink>
          <NavLink to="/dashboard/profile">Profile</NavLink>
        </nav>
        <div className="dashboard-header__account">
          <Link className="dashboard-header__identity" to={`/students/${user.id}`}>
            <Avatar name={user.name} src={user.avatarUrl} size={34} decorative />
            <span>
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Admin' : 'Student'}</small>
            </span>
          </Link>
          {isStudent && (
            <Link className="button button--primary button--sm" to="/projects/new">
              New project
              <Icon name="plus" size={16} />
            </Link>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            loading={signingOut}
          >
            Log out
          </Button>
        </div>
      </header>

      {error && (
        <div className="dashboard-header-alert" role="alert">
          {error}
        </div>
      )}

      {children}
    </div>
  );
}
