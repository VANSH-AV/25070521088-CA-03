import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyApplications, withdrawApplication } from '../api/applications.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Button,
  Dialog,
  EmptyState,
  SectionLabel,
  SelectField,
  Skeleton,
  StatusBadge,
} from '../components/ui.jsx';
import {
  applicationStatusLabels,
  formatDate,
  formatTimestamp,
  statusLabels,
} from '../utils/format.js';
import { usePageTitle } from '../utils/usePageTitle.js';

const statusOptions = [
  { value: '', label: 'Every status' },
  ...Object.entries(applicationStatusLabels).map(([value, label]) => ({ value, label })),
];

export function ApplicationsPage() {
  usePageTitle('My applications');
  const [status, setStatus] = useState('');
  const [state, setState] = useState({
    status: 'loading',
    applications: [],
    meta: null,
    error: '',
  });
  const [retryKey, setRetryKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    listMyApplications(
      { limit: 50, ...(status ? { status } : {}) },
      { signal: controller.signal },
    )
      .then(({ applications, meta }) => {
        setState({ status: 'ready', applications, meta, error: '' });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setState((current) => ({
            ...current,
            status: 'error',
            error: error.message,
          }));
        }
      });

    return () => controller.abort();
  }, [status, retryKey]);

  const reload = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const handleWithdraw = () => {
    if (!selected) {
      return;
    }

    setWithdrawing(true);
    setActionError('');

    withdrawApplication(selected.id)
      .then(() => {
        setWithdrawing(false);
        setSelected(null);
        setNotice('Application withdrawn. Reapplying to this project is not available.');
        reload();
      })
      .catch((error) => {
        setWithdrawing(false);
        setActionError(error.message);
      });
  };

  return (
    <DashboardLayout>
      <main className="dashboard-main" id="main-content">
        <div className="container dashboard-main__inner">
          <div className="app-page-head">
            <div>
              <SectionLabel>Application tracker</SectionLabel>
              <h1>Keep every introduction visible.</h1>
              <p>
                Follow pending reviews, see final decisions, and withdraw an application
                before the owner decides.
              </p>
            </div>
            <div className="app-page-head__actions">
              <Link className="button button--primary button--sm" to="/projects">
                Find projects
                <Icon name="search" size={16} />
              </Link>
              <Link className="button button--ghost button--sm" to="/dashboard">
                Back to overview
              </Link>
            </div>
          </div>

          {notice && (
            <Alert tone="success" title="Application updated">
              {notice}
            </Alert>
          )}

          <div className="manage-toolbar">
            <div>
              <strong>{state.meta?.total ?? '—'}</strong>
              <span>{state.meta?.total === 1 ? 'application' : 'applications'}</span>
            </div>
            <SelectField
              id="application-status-filter"
              label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setState((current) => ({ ...current, status: 'loading', error: '' }));
              }}
              options={statusOptions}
            />
          </div>

          {state.status === 'loading' && (
            <div className="manage-loading" aria-busy="true" aria-live="polite">
              <span className="visually-hidden">Loading your applications</span>
              {[0, 1, 2].map((item) => (
                <Skeleton className="skeleton--row" key={item} />
              ))}
            </div>
          )}

          {state.status === 'error' && (
            <Alert tone="error" title="Your applications could not load.">
              {state.error}{' '}
              <button type="button" className="inline-link" onClick={reload}>
                Try again
              </button>
            </Alert>
          )}

          {state.status === 'ready' && state.applications.length === 0 && (
            <EmptyState
              icon="mail"
              title={status ? 'No applications with that status.' : 'No applications yet.'}
              description={
                status
                  ? 'Clear the filter to see the rest of your application history.'
                  : 'Open a recruiting project, read the brief, and send a specific application.'
              }
              action={
                status ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setStatus('');
                      setState((current) => ({
                        ...current,
                        status: 'loading',
                        error: '',
                      }));
                    }}
                  >
                    Clear filter
                  </Button>
                ) : (
                  <Link className="button button--primary button--sm" to="/projects">
                    Browse projects
                  </Link>
                )
              }
            />
          )}

          {state.status === 'ready' && state.applications.length > 0 && (
            <div className="application-list">
              {state.applications.map((application) => (
                <article className="application-card" key={application.id}>
                  <div className="application-card__main">
                    <div className="application-card__top">
                      <StatusBadge
                        status={application.status}
                        label={applicationStatusLabels[application.status]}
                      />
                      <span>Applied {formatTimestamp(application.createdAt)}</span>
                    </div>
                    <h2>
                      {application.project?.id ? (
                        <Link to={`/projects/${application.project.id}`}>
                          {application.project.title}
                        </Link>
                      ) : (
                        'Project unavailable'
                      )}
                    </h2>
                    {application.project?.summary && (
                      <p className="application-card__summary">
                        {application.project.summary}
                      </p>
                    )}
                    <div className="application-card__meta">
                      {application.project?.status && (
                        <span>{statusLabels[application.project.status]}</span>
                      )}
                      {application.project?.deadline && (
                        <span>
                          <Icon name="calendar" size={15} />
                          {formatDate(application.project.deadline)}
                        </span>
                      )}
                      {application.decidedAt && (
                        <span>Decision {formatTimestamp(application.decidedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="application-card__actions">
                    {application.project?.id && (
                      <Link
                        className="button button--secondary button--sm"
                        to={`/projects/${application.project.id}`}
                      >
                        View project
                        <Icon name="arrowUpRight" size={16} />
                      </Link>
                    )}
                    {application.status === 'accepted' && application.project?.id && (
                      <Link
                        className="button button--primary button--sm"
                        to={`/projects/${application.project.id}/workspace`}
                      >
                        Open workspace
                        <Icon name="arrowRight" size={16} />
                      </Link>
                    )}
                    {application.canWithdraw && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setActionError('');
                          setSelected(application);
                        }}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={Boolean(selected)}
        onClose={() => {
          if (!withdrawing) {
            setSelected(null);
          }
        }}
        title="Withdraw this application?"
        description="The project owner will see that you are no longer interested."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setSelected(null)}
              disabled={withdrawing}
            >
              Keep application
            </Button>
            <Button variant="danger" onClick={handleWithdraw} loading={withdrawing}>
              Withdraw
            </Button>
          </>
        }
      >
        {actionError && (
          <Alert tone="error" title="The application was not withdrawn.">
            {actionError}
          </Alert>
        )}
        <p>
          <strong>{selected?.project?.title}</strong> cannot be applied to again after a
          withdrawal.
        </p>
      </Dialog>
    </DashboardLayout>
  );
}
