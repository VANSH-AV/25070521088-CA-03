import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProfile } from '../api/users.js';
import { listMyProjects } from '../api/projects.js';
import { useAuth } from '../auth/context.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ProjectManageList } from '../components/project/ProjectManageList.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  EmptyState,
  SectionLabel,
  Skeleton,
} from '../components/ui.jsx';
import { usePageTitle } from '../utils/usePageTitle.js';

function DashboardSkeleton() {
  return (
    <div className="dashboard-loading" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading the dashboard</span>
      <div className="dashboard-stats">
        {[0, 1, 2].map((item) => (
          <Skeleton className="skeleton--stat" key={item} />
        ))}
      </div>
      <Skeleton className="skeleton--block" />
    </div>
  );
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const [state, setState] = useState({
    status: 'loading',
    projects: [],
    counts: { ownedProjects: 0, memberProjects: 0 },
    error: '',
  });
  const [retryKey, setRetryKey] = useState(0);
  const firstName = user.name.split(/\s+/)[0];
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    let active = true;

    Promise.all([getMyProfile(), listMyProjects({ limit: 50 })])
      .then(([profile, projectResult]) => {
        if (!active) {
          return;
        }

        setState({
          status: 'ready',
          projects: projectResult.projects,
          counts: profile.counts,
          error: '',
        });
      })
      .catch((error) => {
        if (active) {
          setState((current) => ({ ...current, status: 'error', error: error.message }));
        }
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  const retry = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const publicCount = state.projects.filter((project) =>
    ['recruiting', 'in_progress', 'completed'].includes(project.status),
  ).length;
  const draftCount = state.projects.filter((project) => project.status === 'draft').length;
  const recentProjects = state.projects.slice(0, 4);

  return (
    <DashboardLayout>
      <main className="dashboard-main" id="main-content">
        <div className="container dashboard-main__inner">
          <section className="dashboard-hero" aria-labelledby="dashboard-title">
            <SectionLabel>
              <span className="eyebrow__index">03</span>
              {isAdmin ? 'Admin account' : 'Your studio'}
            </SectionLabel>
            <h1 id="dashboard-title">Good to see you, {firstName}.</h1>
            <p>
              {isAdmin
                ? 'This account can inspect project records and public profiles. Project creation and owner controls remain student-only.'
                : 'Shape your public profile, turn ideas into project briefs, and keep the work visible only when it is ready.'}
            </p>
            <div className="dashboard-hero__actions">
              {!isAdmin && (
                <Link className="button button--primary button--md" to="/projects/new">
                  Start a project
                  <Icon name="plus" size={18} />
                </Link>
              )}
              <Link className="button button--secondary button--md" to={`/students/${user.id}`}>
                View public profile
                <Icon name="arrowUpRight" size={17} />
              </Link>
              <Link className="button button--ghost button--md" to="/projects">
                Discover projects
              </Link>
            </div>
          </section>

          {isAdmin && (
            <Alert tone="info" title="Moderation view is read-only">
              Admin accounts can view draft and archived projects through direct project links,
              but cannot create, edit, archive, or manage ownership in this release.
            </Alert>
          )}

          {state.status === 'loading' && <DashboardSkeleton />}

          {state.status === 'error' && (
            <Alert tone="error" title="The dashboard could not load.">
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

          {state.status === 'ready' && (
            <>
              <section className="dashboard-stats" aria-label="Project summary">
                <article className="dashboard-stat">
                  <span>Owned projects</span>
                  <strong>{state.counts.ownedProjects}</strong>
                  <small>Created by this account</small>
                </article>
                <article className="dashboard-stat">
                  <span>Public briefs</span>
                  <strong>{publicCount}</strong>
                  <small>Visible in discovery</small>
                </article>
                <article className="dashboard-stat">
                  <span>Private drafts</span>
                  <strong>{draftCount}</strong>
                  <small>Only visible to you</small>
                </article>
                <article className="dashboard-stat dashboard-stat--accent">
                  <span>Team memberships</span>
                  <strong>{state.counts.memberProjects}</strong>
                  <small>Projects where you are a member</small>
                </article>
              </section>

              <div className="dashboard-columns">
                <section className="dashboard-panel" aria-labelledby="your-projects">
                  <div className="section-head section-head--split">
                    <div>
                      <SectionLabel>Work in progress</SectionLabel>
                      <h2 id="your-projects">Your projects</h2>
                    </div>
                    {state.projects.length > 0 && (
                      <Link className="dashboard-link" to="/dashboard/projects">
                        Manage all {state.counts.ownedProjects + state.counts.memberProjects}
                        <Icon name="arrowRight" size={16} />
                      </Link>
                    )}
                  </div>

                  {recentProjects.length > 0 ? (
                    <ProjectManageList projects={recentProjects} />
                  ) : (
                    <EmptyState
                      icon="layers"
                      title={isAdmin ? 'No project memberships.' : 'No projects yet.'}
                      description={
                        isAdmin
                          ? 'Admin accounts do not own projects. Use discovery to review public briefs.'
                          : 'Start with a private draft, then publish it when the brief has a clear scope and deadline.'
                      }
                      action={
                        isAdmin ? (
                          <Link className="button button--secondary button--sm" to="/projects">
                            Browse discovery
                          </Link>
                        ) : (
                          <Link className="button button--primary button--sm" to="/projects/new">
                            Create your first project
                          </Link>
                        )
                      }
                    />
                  )}
                </section>

                <aside className="dashboard-side">
                  <section className="dashboard-side-card">
                    <SectionLabel>Public profile</SectionLabel>
                    <h2>Your profile is part of the work.</h2>
                    <p>
                      Skills, links, and a short bio help project owners understand what you bring
                      before they ever open a project brief.
                    </p>
                    <div className="dashboard-side-card__actions">
                      <Link className="button button--primary button--sm" to="/dashboard/profile">
                        Edit profile
                        <Icon name="edit" size={16} />
                      </Link>
                      <Link
                        className="button button--ghost button--sm"
                        to={`/students/${user.id}`}
                      >
                        Preview
                      </Link>
                    </div>
                  </section>

                  <section className="dashboard-side-card dashboard-side-card--ink">
                    <SectionLabel>Account</SectionLabel>
                    <h2>{user.name}</h2>
                    <dl className="dashboard-account-list">
                      <div>
                        <dt>Email</dt>
                        <dd>{user.email}</dd>
                      </div>
                      <div>
                        <dt>Role</dt>
                        <dd>{isAdmin ? 'Admin' : 'Student'}</dd>
                      </div>
                      <div>
                        <dt>Session</dt>
                        <dd>
                          <span className="dashboard-status">
                            <span aria-hidden="true" />
                            Active
                          </span>
                        </dd>
                      </div>
                    </dl>
                    <p className="dashboard-side-card__note">
                      Email and role are private account fields and cannot be edited in profile
                      settings.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
