import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { getProject, updateProject } from '../api/projects.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ProjectForm } from '../components/project/ProjectForm.jsx';
import { Icon } from '../components/icons.jsx';
import { Alert, SectionLabel, Skeleton } from '../components/ui.jsx';
import { usePageTitle } from '../utils/usePageTitle.js';

export function ProjectEditPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({
    status: 'loading',
    project: null,
    viewer: null,
    error: '',
  });
  const [retryKey, setRetryKey] = useState(0);

  usePageTitle(state.project ? `Edit ${state.project.title}` : 'Edit project');

  useEffect(() => {
    const controller = new AbortController();

    getProject(projectId, { signal: controller.signal })
      .then(({ project, viewer }) => {
        setState({ status: 'ready', project, viewer, error: '' });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        const missing = error instanceof ApiError && [400, 404].includes(error.status);
        setState({
          status: missing ? 'missing' : 'error',
          project: null,
          viewer: null,
          error: missing ? '' : error.message,
        });
      });

    return () => controller.abort();
  }, [projectId, retryKey]);

  const retry = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const handleSave = async (values) => {
    const updated = await updateProject(projectId, values);
    navigate(`/projects/${updated.id}`, {
      replace: true,
      state: { notice: 'Project changes saved.' },
    });
  };

  return (
    <DashboardLayout>
      <main className="dashboard-main" id="main-content">
        <div className="container dashboard-main__inner">
          {state.status === 'loading' && (
            <div className="form-loading" aria-busy="true" aria-live="polite">
              <span className="visually-hidden">Loading project editor</span>
              <Skeleton className="skeleton--line skeleton--line-sm" />
              <Skeleton className="skeleton--line skeleton--line-lg" />
              <Skeleton className="skeleton--block" />
            </div>
          )}

          {state.status === 'missing' && (
            <Alert tone="warning" title="Project not found.">
              This project is not available to your account.{' '}
              <Link to="/dashboard/projects">Return to your projects</Link>.
            </Alert>
          )}

          {state.status === 'error' && (
            <Alert tone="error" title="The editor could not load.">
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

          {state.status === 'ready' && !state.viewer.canManage && (
            <Alert tone="error" title="Only the owner can edit this project.">
              Your account can view this project but cannot change it.{' '}
              <Link to={`/projects/${projectId}`}>Return to the project</Link>.
            </Alert>
          )}

          {state.status === 'ready' && state.viewer.canManage && state.project.status === 'archived' && (
            <Alert tone="warning" title="This project is archived.">
              Archived projects are read-only.{' '}
              <Link to={`/projects/${projectId}`}>View the archived project</Link>.
            </Alert>
          )}

          {state.status === 'ready' && state.viewer.canManage && state.project.status !== 'archived' && (
            <>
              <div className="app-page-head app-page-head--form">
                <div>
                  <SectionLabel>Edit project</SectionLabel>
                  <h1>Keep the brief honest.</h1>
                  <p>
                    Update the scope when it changes. Status changes must follow the allowed
                    project lifecycle.
                  </p>
                </div>
                <Link
                  className="button button--secondary button--sm"
                  to={`/projects/${state.project.id}`}
                >
                  View public page
                  <Icon name="arrowUpRight" size={16} />
                </Link>
              </div>

              <ProjectForm
                mode="edit"
                project={state.project}
                onSave={handleSave}
                cancelTo={`/projects/${state.project.id}`}
              />
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
