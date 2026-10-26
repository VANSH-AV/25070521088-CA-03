import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyProjects } from '../api/projects.js';
import { useAuth } from '../auth/context.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ProjectManageList } from '../components/project/ProjectManageList.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Button,
  EmptyState,
  SectionLabel,
  SelectField,
  Skeleton,
} from '../components/ui.jsx';
import { statusLabels } from '../utils/format.js';
import { usePageTitle } from '../utils/usePageTitle.js';

const statusOptions = [
  { value: '', label: 'Every status' },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
];

export function DashboardProjectsPage() {
  usePageTitle('My projects');
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [state, setState] = useState({
    status: 'loading',
    projects: [],
    meta: null,
    error: '',
  });
  const [retryKey, setRetryKey] = useState(0);
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const controller = new AbortController();

    listMyProjects(
      { limit: 50, ...(status ? { status } : {}) },
      { signal: controller.signal },
    )
      .then(({ projects, meta }) => {
        setState({ status: 'ready', projects, meta, error: '' });
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

  const retry = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const updateStatus = (event) => {
    setStatus(event.target.value);
    setState((current) => ({ ...current, status: 'loading', error: '' }));
  };

  return (
    <DashboardLayout>
      <main className="dashboard-main" id="main-content">
        <div className="container dashboard-main__inner">
          <div className="app-page-head">
            <div>
              <SectionLabel>Project studio</SectionLabel>
              <h1>Every brief in one place.</h1>
              <p>
                Open a project, update its scope, or move through the allowed status lifecycle.
                Archived projects stay here as closed records.
              </p>
            </div>
            <div className="app-page-head__actions">
              {!isAdmin && (
                <Link className="button button--primary button--sm" to="/projects/new">
                  New project
                  <Icon name="plus" size={16} />
                </Link>
              )}
              <Link className="button button--ghost button--sm" to="/dashboard">
                Back to overview
              </Link>
            </div>
          </div>

          <div className="manage-toolbar">
            <div>
              <strong>{state.meta?.total ?? '—'}</strong>
              <span>{state.meta?.total === 1 ? 'project' : 'projects'}</span>
            </div>
            <SelectField
              id="manage-status"
              label="Filter by status"
              value={status}
              onChange={updateStatus}
              options={statusOptions}
            />
          </div>

          {state.status === 'loading' && (
            <div className="manage-loading" aria-busy="true" aria-live="polite">
              <span className="visually-hidden">Loading your projects</span>
              {[0, 1, 2].map((item) => (
                <Skeleton className="skeleton--row" key={item} />
              ))}
            </div>
          )}

          {state.status === 'error' && (
            <Alert tone="error" title="Your projects could not load.">
              {state.error}{' '}
              <button
                type="button"
                className="inline-link"
                onClick={retry}
              >
                Try again
              </button>
            </Alert>
          )}

          {state.status === 'ready' && state.projects.length > 0 && (
            <ProjectManageList projects={state.projects} />
          )}

          {state.status === 'ready' && state.projects.length === 0 && (
            <EmptyState
              icon="layers"
              title={status ? 'No projects with that status.' : 'No projects yet.'}
              description={
                status
                  ? 'Clear the status filter to see the rest of your project records.'
                  : isAdmin
                    ? 'Admin accounts can review public briefs but cannot own projects.'
                    : 'Create a private draft and publish it when the brief is ready.'
              }
              action={
                status ? (
                  <Button variant="secondary" size="sm" onClick={() => {
                    setStatus('');
                    setState((current) => ({ ...current, status: 'loading', error: '' }));
                  }}>
                    Clear filter
                  </Button>
                ) : isAdmin ? (
                  <Link className="button button--secondary button--sm" to="/projects">
                    Browse discovery
                  </Link>
                ) : (
                  <Link className="button button--primary button--sm" to="/projects/new">
                    Create a project
                  </Link>
                )
              }
            />
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
