import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { useAuth } from '../auth/context.js';
import { safeReturnTo } from '../auth/returnTo.js';
import { Icon } from '../components/icons.jsx';
import { Alert, Button, Logo, TextField } from '../components/ui.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordBytes(value) {
  return new TextEncoder().encode(value).length;
}

function validate(mode, values) {
  const fields = {};

  if (mode === 'register') {
    const name = values.name.trim();

    if (name.length < 2 || name.length > 60) {
      fields.name = 'Enter a name between 2 and 60 characters.';
    }
  }

  if (!emailPattern.test(values.email.trim())) {
    fields.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    fields.password = 'Enter your password.';
  } else if (mode === 'register') {
    const bytes = passwordBytes(values.password);

    if (bytes < 8) {
      fields.password = 'Use at least 8 characters.';
    } else if (bytes > 72) {
      fields.password = 'Use 72 bytes or fewer.';
    } else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
      fields.password = 'Include at least one letter and one number.';
    }

    if (values.confirmPassword !== values.password) {
      fields.confirmPassword = 'The passwords do not match.';
    }
  }

  return fields;
}

function initialValues() {
  return {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };
}

export function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const [values, setValues] = useState(initialValues);
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchQuery = new URLSearchParams({ returnTo }).toString();
  const switchPath = isRegister ? `/login?${switchQuery}` : `/register?${switchQuery}`;

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFields((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
    setFormError('');
  };

  const focusFirstInvalid = (nextFields) => {
    const firstField = ['name', 'email', 'password', 'confirmPassword'].find(
      (field) => nextFields[field],
    );

    if (firstField) {
      window.requestAnimationFrame(() => document.getElementById(firstField)?.focus());
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextFields = validate(mode, values);

    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      setFormError('Please correct the highlighted fields and try again.');
      focusFirstInvalid(nextFields);
      return;
    }

    setFields({});
    setFormError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        });
      } else {
        await login({
          email: values.email.trim(),
          password: values.password,
        });
      }

      navigate(returnTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const nextServerFields = error.fields || {};
        setFields(nextServerFields);
        setFormError(error.message);
        focusFirstInvalid(nextServerFields);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <Link className="brand-link" to="/" aria-label="FLEXI home">
          <Logo />
        </Link>
        <Link className="auth-page__back" to="/">
          <Icon name="arrowLeft" size={16} />
          Back to preview
        </Link>
      </header>

      <main className="auth-page__main" id="main-content">
        <section className="auth-page__intro" aria-labelledby="auth-title">
          <p className="eyebrow">
            <span className="eyebrow__index">03</span>
            {isRegister ? 'Create your account' : 'Welcome back'}
          </p>
          <h1 id="auth-title">
            {isRegister
              ? 'Find the people who make the work better.'
              : 'Pick up where your team left off.'}
          </h1>
          <p className="auth-page__lede">
            {isRegister
              ? 'One student account, one clear place to find projects, share context, and build work worth showing.'
              : 'Sign in to see your projects, applications, and the next small step. No passwords or tokens are stored in browser storage.'}
          </p>
          <ul className="auth-page__points">
            <li>
              <Icon name="checkCircle" size={18} />
              A verified session that survives refreshes.
            </li>
            <li>
              <Icon name="checkCircle" size={18} />
              Server-enforced permissions on every private request.
            </li>
            <li>
              <Icon name="checkCircle" size={18} />
              Sign out everywhere with one action.
            </li>
          </ul>
        </section>

        <section className="auth-card" aria-labelledby="auth-form-title">
          <div className="auth-card__head">
            <p className="auth-card__eyebrow">{isRegister ? 'Join FLEXI' : 'Member sign in'}</p>
            <h2 id="auth-form-title">{isRegister ? 'Create your account' : 'Log in'}</h2>
            <p>
              {isRegister
                ? 'Use your campus email and a password you do not reuse elsewhere.'
                : 'Use the email and password you registered with.'}
            </p>
          </div>

          {formError && (
            <Alert tone="error" title="We could not continue." className="auth-card__alert">
              {formError}
            </Alert>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <TextField
                id="name"
                name="name"
                label="Full name"
                value={values.name}
                onChange={updateValue}
                error={fields.name}
                autoComplete="name"
                placeholder="Mira Shah"
                required
              />
            )}

            <TextField
              id="email"
              name="email"
              type="email"
              label="Email"
              value={values.email}
              onChange={updateValue}
              error={fields.email}
              autoComplete="email"
              inputMode="email"
              placeholder="you@college.edu"
              required
            />

            <TextField
              id="password"
              name="password"
              type="password"
              label="Password"
              value={values.password}
              onChange={updateValue}
              error={fields.password}
              hint={
                isRegister
                  ? '8–72 bytes, with at least one letter and one number.'
                  : undefined
              }
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />

            {isRegister && (
              <TextField
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm password"
                value={values.confirmPassword}
                onChange={updateValue}
                error={fields.confirmPassword}
                autoComplete="new-password"
                required
              />
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              icon="arrowRight"
            >
              {isRegister ? 'Create account' : 'Log in'}
            </Button>
          </form>

          <p className="auth-card__switch">
            {isRegister ? 'Already have an account?' : 'New to FLEXI?'}{' '}
            <Link to={switchPath}>{isRegister ? 'Log in' : 'Create an account'}</Link>
          </p>

          <p className="auth-card__note">
            Passwords are hashed and sessions use an HttpOnly cookie. FLEXI never stores your
            password in the browser.
          </p>
        </section>
      </main>
    </div>
  );
}
