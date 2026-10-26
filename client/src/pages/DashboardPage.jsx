import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/context.js';
import { Icon } from '../components/icons.jsx';
import { Alert, Avatar, Button, Logo, SectionLabel } from '../components/ui.jsx';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  const firstName = user.name.split(/\s+/)[0];

  const handleLogout = async () => {
    setSigningOut(true);
    setError('');

    try {
      await logout();
      window.location.replace('/');
    } catch {
      setError('The server could not be reached, so this session is still active. Try again.');
      setSigningOut(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link className="brand-link" to="/" aria-label="FLEXI home">
          <Logo />
        </Link>
        <div className="dashboard-header__account">
          <span className="dashboard-header__identity">
            <Avatar name={user.name} size={34} decorative />
            <span>
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Admin' : 'Student'}</small>
            </span>
          </span>
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

      <main className="dashboard-main" id="main-content">
        <div className="container dashboard-main__inner">
          <section className="dashboard-hero" aria-labelledby="dashboard-title">
            <SectionLabel>
              <span className="eyebrow__index">03</span>
              Signed in
            </SectionLabel>
            <h1 id="dashboard-title">
              Good to see you, {firstName}.
            </h1>
            <p>
              Your session is live and your private account is protected by server-side checks.
              This is the authenticated landing placeholder for the next workspace phases.
            </p>
            <div className="dashboard-hero__actions">
              <Button href="/" variant="primary" icon="arrowRight">
                Explore the design preview
              </Button>
              <Button variant="ghost" onClick={handleLogout} loading={signingOut}>
                Sign out everywhere
              </Button>
            </div>
          </section>

          {error && (
            <Alert tone="warning" title="Session notice" className="dashboard-alert">
              {error}
            </Alert>
          )}

          <section className="dashboard-grid" aria-label="Account and session details">
            <article className="dashboard-card dashboard-card--ink">
              <p className="dashboard-card__label">Current account</p>
              <h2>{user.name}</h2>
              <dl className="dashboard-details">
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{user.role === 'admin' ? 'Admin' : 'Student'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="dashboard-status">
                      <span aria-hidden="true" />
                      Active
                    </span>
                  </dd>
                </div>
              </dl>
            </article>

            <article className="dashboard-card">
              <p className="dashboard-card__label">Session security</p>
              <h2>Private by default.</h2>
              <ul className="dashboard-list">
                <li>
                  <Icon name="checkCircle" size={18} />
                  The session cookie is HttpOnly, so JavaScript cannot read the token.
                </li>
                <li>
                  <Icon name="checkCircle" size={18} />
                  Every protected request reloads the account and checks revocation.
                </li>
                <li>
                  <Icon name="checkCircle" size={18} />
                  Signing out invalidates all outstanding sessions for this account.
                </li>
              </ul>
            </article>

            <article className="dashboard-card dashboard-card--accent">
              <p className="dashboard-card__label">What comes next</p>
              <h2>The workspace is next.</h2>
              <p className="dashboard-card__copy">
                Profile editing, project discovery, applications, and team workspaces arrive in
                later phases. Authentication is connected now; the project data remains sample
                content.
              </p>
              <Link className="dashboard-link" to="/">
                Return to the public preview
                <Icon name="arrowRight" size={16} />
              </Link>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
