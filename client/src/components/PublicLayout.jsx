import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/context.js';
import { Icon } from './icons.jsx';
import { Avatar, Logo } from './ui.jsx';

const navLinks = [
  { label: 'Projects', to: '/projects' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function PublicLayout({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();
  const isAuthenticated = status === 'authenticated';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => {
      if (event.matches) {
        setMenuOpen(false);
      }
    };

    desktop.addEventListener('change', handleChange);
    return () => desktop.removeEventListener('change', handleChange);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="brand-link" to="/" aria-label="FLEXI home">
            <Logo />
          </Link>

          <nav
            className={['site-nav', menuOpen && 'is-open'].filter(Boolean).join(' ')}
            id="primary-navigation"
            aria-label="Primary"
          >
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            <div className="site-nav__mobile-actions">
              {isAuthenticated ? (
                <Link
                  className="button button--primary button--sm button--full"
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                >
                  Open dashboard
                  <Icon name="arrowRight" size={16} />
                </Link>
              ) : (
                <>
                  <Link
                    className="button button--secondary button--sm button--full"
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    className="button button--primary button--sm button--full"
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                  >
                    Join FLEXI
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="site-actions">
            {isAuthenticated ? (
              <>
                <Link className="site-user" to={`/students/${user.id}`}>
                  <Avatar name={user.name} src={user.avatarUrl} size={30} decorative />
                  <span>{user.name.split(/\s+/)[0]}</span>
                </Link>
                <Link className="button button--primary button--sm" to="/dashboard">
                  Dashboard
                  <Icon name="arrowRight" size={16} />
                </Link>
              </>
            ) : (
              <>
                <Link className="button button--ghost button--sm" to="/login">
                  Log in
                </Link>
                <Link className="button button--primary button--sm" to="/register">
                  Join FLEXI
                  <Icon name="arrowUpRight" size={16} />
                </Link>
              </>
            )}
          </div>

          <button
            ref={menuButtonRef}
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <Logo />
            <p>A student project collaboration studio for ideas, teams, and work worth showing.</p>
            <span className="site-footer__phase">PHASE 4 / PUBLIC STUDIO</span>
          </div>
          <nav className="site-footer__nav" aria-label="Footer">
            <Link to="/projects">Projects</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            {isAuthenticated ? (
              <Link to="/dashboard">Dashboard</Link>
            ) : (
              <Link to="/register">Create account</Link>
            )}
          </nav>
          <div className="site-footer__note">
            <p>Project and profile content comes from the FLEXI database.</p>
            <p>© 2026 FLEXI. Built for student teams.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
