import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { getWorkspace } from '../api/workspace.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { Icon } from '../components/icons.jsx';
import { Alert, AvatarStack, EmptyState, ProgressBar, SectionLabel, Skeleton } from '../components/ui.jsx';
import { ApplicationReviewPanel } from '../components/workspace/ApplicationReviewPanel.jsx';
import { MilestonesPanel } from '../components/workspace/MilestonesPanel.jsx';
import { TasksPanel } from '../components/workspace/TasksPanel.jsx';
import { TeamPanel } from '../components/workspace/TeamPanel.jsx';
import { WorkspaceOverview } from '../components/workspace/WorkspaceOverview.jsx';
import { usePageTitle } from '../utils/usePageTitle.js';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'team', label: 'Team' },
  { id: 'applications', label: 'Applications', ownerOnly: true },
];

function WorkspaceLoading() {
  return (
    <div className="workspace-loading" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading workspace</span>
      <Skeleton className="skeleton--line skeleton--line-sm" />
      <Skeleton className="skeleton--line skeleton--line-lg" />
      <Skeleton className="skeleton--block" />
    </div>
  );
}

export function WorkspacePage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ status: 'loading', data: null, error: '', forbidden: false });
  const [retryKey, setRetryKey] = useState(0);
  const requestedTab = searchParams.get('tab') || 'overview';

  const loadWorkspace = () => {
    const controller = new AbortController();

    getWorkspace(projectId, { signal: controller.signal })
      .then((data) => {
        setState({ status: 'ready', data, error: '', forbidden: false });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        const forbidden = error instanceof ApiError && error.status === 403;

        setState({
          status: 'error',
          data: null,
          error: forbidden ? '' : error.message,
          forbidden,
        });
      });

    return controller;
  };

  useEffect(() => {
    const controller = loadWorkspace();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, retryKey]);

  usePageTitle(state.data?.project?.title ? `${state.data.project.title} workspace` : 'Workspace');

  const reload = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const refresh = () => {
    getWorkspace(projectId)
      .then((data) => setState({ status: 'ready', data, error: '', forbidden: false }))
      .catch(() => {});
  };

  if (state.status === 'loading') {
    return (
      <DashboardLayout>
        <main className="dashboard-main" id="main-content">
          <div className="container dashboard-main__inner">
            <WorkspaceLoading />
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (state.forbidden) {
    return (
      <DashboardLayout>
        <main className="dashboard-main" id="main-content">
          <div className="container dashboard-main__inner">
            <EmptyState
              icon="users"
              title="This workspace is for the team."
              description="Only the owner and accepted members can open this project workspace."
              action={
                <Link className="button button--primary button--sm" to="/dashboard">
                  Back to dashboard
                </Link>
              }
            />
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (state.status === 'error') {
    return (
      <DashboardLayout>
        <main className="dashboard-main" id="main-content">
          <div className="container dashboard-main__inner">
            <Alert tone="error" title="The workspace could not load.">
              {state.error}{' '}
              <button type="button" className="inline-link" onClick={reload}>
                Try again
              </button>
            </Alert>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const { project, team, counts, progress, permissions } = state.data;
  const visibleTabs = tabs.filter(
    (tab) => !tab.ownerOnly || permissions.isOwner || permissions.isAdmin,
  );
  const activeTab = visibleTabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : 'overview';
  const selectTab = (tabId) => {
    setSearchParams(tabId === 'overview' ? {} : { tab: tabId });
  };

  return (
    <DashboardLayout>
      <main className="dashboard-main workspace-page" id="main-content">
        <div className="container workspace-page__inner">
          <div className="workspace-head">
            <div className="workspace-head__main">
              <div className="workspace-head__top">
                <SectionLabel>Project workspace</SectionLabel>
                <Link className="workspace-back" to={`/projects/${project.id}`}>
                  <Icon name="arrowLeft" size={16} />
                  Public page
                </Link>
              </div>
              <h1>{project.title}</h1>
              <p>{project.summary}</p>
              <div className="workspace-head__meta">
                <span>{project.status.replaceAll('_', ' ')}</span>
                <span>
                  {counts.members} team {counts.members === 1 ? 'member' : 'members'}
                </span>
                <AvatarStack people={team} max={4} size={30} />
              </div>
            </div>
            <div className="workspace-head__side">
              <ProgressBar
                value={progress.percent}
                label={`${progress.doneTasks} of ${progress.totalTasks} tasks done`}
              />
              {permissions.isOwner && (
                <Link
                  className="button button--secondary button--sm"
                  to={`/projects/${project.id}/edit`}
                >
                  Edit project
                  <Icon name="edit" size={16} />
                </Link>
              )}
            </div>
          </div>

          {permissions.isAdmin && (
            <Alert tone="warning" title="Admin view — moderation only">
              All write controls are hidden. Admin accounts can inspect the workspace but cannot
              manage tasks, milestones, or applications.
            </Alert>
          )}

          {project.status === 'archived' && !permissions.isAdmin && (
            <Alert tone="warning" title="Archived project">
              This workspace is read-only. Tasks, milestones, and applications are preserved as
              a closed record.
            </Alert>
          )}

          <nav className="workspace-tabs" aria-label="Workspace sections">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'active' : undefined}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'applications' && counts.pendingApplications > 0 && (
                  <span className="workspace-tab-count">{counts.pendingApplications}</span>
                )}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <WorkspaceOverview
              workspace={state.data}
              onSelectTab={selectTab}
              onChanged={refresh}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksPanel projectId={project.id} workspace={state.data} onChanged={refresh} />
          )}
          {activeTab === 'milestones' && (
            <MilestonesPanel projectId={project.id} workspace={state.data} onChanged={refresh} />
          )}
          {activeTab === 'team' && <TeamPanel team={team} />}
          {activeTab === 'applications' && (
            <ApplicationReviewPanel
              projectId={project.id}
              workspace={state.data}
              onChanged={refresh}
            />
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
