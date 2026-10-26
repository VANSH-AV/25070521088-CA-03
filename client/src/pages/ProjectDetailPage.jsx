import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { archiveProject, getProject } from '../api/projects.js';
import { ApiError } from '../api/client.js';
import { useAuth } from '../auth/context.js';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Avatar,
  Button,
  Dialog,
  EmptyState,
  SectionLabel,
  Skeleton,
  SkillTag,
  StatusBadge,
} from '../components/ui.jsx';
import {
  categoryLabels,
  formatDate,
  formatMonthYear,
  formatTimestamp,
  projectAvailabilityLabel,
  statusLabels,
} from '../utils/format.js';
import { usePageTitle } from '../utils/usePageTitle.js';

function DetailLoading() {
  return (
    <div className="container detail-loading" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading project</span>
      <Skeleton className="skeleton--line skeleton--line-sm" />
      <Skeleton className="skeleton--line skeleton--line-lg" />
      <Skeleton className="skeleton--line" />
      <Skeleton className="skeleton--block" />
    </div>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', project: null, viewer: null, error: '' });
  const [retryKey, setRetryKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [archiveError, setArchiveError] = useState('');

  usePageTitle(state.project?.title || 'Project');

  useEffect(() => {
    const controller = new AbortController();


    getProject(projectId, { signal: controller.signal })
      .then((data) => {
        setState({
          status: 'ready',
          project: data.project,
          viewer: data.viewer,
          error: '',
        });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        const notFound = error instanceof ApiError && [400, 404].includes(error.status);
        setState({
          status: notFound ? 'missing' : 'error',
          project: null,
          viewer: null,
          error: notFound ? '' : error.message,
        });
      });

    return () => controller.abort();
  }, [projectId, retryKey]);

  const retry = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const handleArchive = async () => {
    setArchiving(true);
    setArchiveError('');

    try {
      const result = await archiveProject(projectId);
      setDialogOpen(false);
      setArchiving(false);

      if (result.archived) {
        setNotice('This project is archived. Its public listing is now closed.');
        setState((current) => ({
          ...current,
          project: { ...current.project, ...result.project, status: 'archived' },
        }));
      } else {
        navigate('/dashboard/projects', { replace: true });
      }
    } catch (error) {
      setArchiveError(error.message);
      setArchiving(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <PublicLayout>
        <DetailLoading />
      </PublicLayout>
    );
  }

  if (state.status === 'missing') {
    return (
      <PublicLayout>
        <section className="section">
          <div className="container">
            <EmptyState
              icon="search"
              title="That project is not public."
              description="It may be a draft, archived, or no longer available. The discovery board has the projects you can view."
              action={
                <Link className="button button--primary button--sm" to="/projects">
                  Back to discovery
                </Link>
              }
            />
          </div>
        </section>
      </PublicLayout>
    );
  }

  if (state.status === 'error') {
    return (
      <PublicLayout>
        <section className="section">
          <div className="container">
            <Alert tone="error" title="The project could not load.">
              {state.error}{' '}
              <button
                type="button"
                className="inline-link"
                onClick={retry}
              >
                Try again
              </button>
            </Alert>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const { project, viewer } = state;
  const team = [
    ...(project.owner ? [{ ...project.owner, isOwner: true }] : []),
    ...project.members,
  ];
  const startPath = isAuthenticated
    ? '/projects/new'
    : `/login?${new URLSearchParams({ returnTo: '/projects/new' }).toString()}`;
  const isArchived = project.status === 'archived';
  const isDraft = project.status === 'draft';

  return (
    <PublicLayout>
      <section className="project-hero" aria-labelledby="project-title">
        <div className="container project-hero__inner">
          <div className="project-hero__main">
            <div className="project-hero__top">
              <StatusBadge status={project.status} />
              <span className="project-hero__category">
                {categoryLabels[project.category] || 'Project'} / Team of {project.teamSize}
              </span>
            </div>
            <h1 id="project-title">{project.title}</h1>
            <p className="project-hero__summary">{project.summary}</p>
            <div className="project-hero__skills">
              {project.requiredSkills.map((skill) => (
                <SkillTag key={skill}>{skill}</SkillTag>
              ))}
              {project.requiredSkills.length === 0 && <span>No required skills listed.</span>}
            </div>
          </div>

          <aside className="project-action-card" aria-label="Project actions">
            <div className="project-action-card__row">
              <span>Owner</span>
              {project.owner ? (
                <Link className="project-owner" to={`/students/${project.owner.id}`}>
                  <Avatar
                    name={project.owner.name}
                    src={project.owner.avatarUrl}
                    size={40}
                    decorative
                  />
                  <span>
                    <strong>{project.owner.name}</strong>
                    <small>{project.owner.college || 'FLEXI student'}</small>
                  </span>
                </Link>
              ) : (
                <span>Unavailable</span>
              )}
            </div>
            <dl className="project-action-card__facts">
              <div>
                <dt>Deadline</dt>
                <dd>{formatDate(project.deadline)}</dd>
              </div>
              <div>
                <dt>Team</dt>
                <dd>
                  {project.memberCount} / {project.teamSize}
                </dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>{projectAvailabilityLabel(project)}</dd>
              </div>
              <div>
                <dt>Views</dt>
                <dd>{project.views}</dd>
              </div>
            </dl>

            {viewer.isOwner ? (
              <div className="project-action-card__owner-actions">
                <p>You own this project.</p>
                {!isArchived && (
                  <Link
                    className="button button--primary button--md button--full"
                    to={`/projects/${project.id}/edit`}
                  >
                    Edit project
                    <Icon name="edit" size={17} />
                  </Link>
                )}
                {!isArchived && (
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => {
                      setArchiveError('');
                      setDialogOpen(true);
                    }}
                  >
                    {isDraft ? 'Delete draft' : 'Archive project'}
                    <Icon name="archive" size={17} />
                  </Button>
                )}
              </div>
            ) : (
              <div className="project-action-card__guest">
                <p>
                  This page is public. Create your own brief or keep exploring the discovery
                  board.
                </p>
                <Link className="button button--primary button--md button--full" to={startPath}>
                  Start a project
                  <Icon name="plus" size={17} />
                </Link>
                <Link className="button button--secondary button--md button--full" to="/projects">
                  Browse projects
                </Link>
              </div>
            )}

            {viewer.isOwner && user && (
              <p className="project-action-card__note">
                Owner controls are checked by the server on every request.
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className="section project-content" aria-label="Project details">
        <div className="container project-content__grid">
          <div className="project-content__main">
            {isArchived && (
              <Alert tone="warning" title="Archived project">
                This project is closed and is not shown on the public discovery board.
              </Alert>
            )}
            {notice && (
              <Alert tone="success" title="Project updated">
                {notice}
              </Alert>
            )}

            <article className="project-section">
              <SectionLabel>About the project</SectionLabel>
              <div className="project-description">
                {project.description.split(/\n{2,}/).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>

            <article className="project-section">
              <SectionLabel>Tech stack</SectionLabel>
              {project.techStack.length > 0 ? (
                <div className="tag-row">
                  {project.techStack.map((tech) => (
                    <SkillTag key={tech}>{tech}</SkillTag>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">No tech stack listed yet.</p>
              )}
            </article>

            {project.tags.length > 0 && (
              <article className="project-section">
                <SectionLabel>Tags</SectionLabel>
                <div className="tag-row">
                  {project.tags.map((tag) => (
                    <SkillTag key={tag}>{tag}</SkillTag>
                  ))}
                </div>
              </article>
            )}

            {(project.repoUrl || project.demoUrl) && (
              <article className="project-section">
                <SectionLabel>Project links</SectionLabel>
                <div className="project-links">
                  {project.repoUrl && (
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      Repository
                      <Icon name="arrowUpRight" size={16} />
                    </a>
                  )}
                  {project.demoUrl && (
                    <a href={project.demoUrl} target="_blank" rel="noreferrer">
                      Live demo
                      <Icon name="arrowUpRight" size={16} />
                    </a>
                  )}
                </div>
              </article>
            )}
          </div>

          <aside className="project-aside">
            <section className="project-team" aria-labelledby="team-title">
              <SectionLabel>Team</SectionLabel>
              <h2 id="team-title">{project.memberCount} of {project.teamSize}</h2>
              <div className="project-team__list">
                {team.map((person) => (
                  <Link
                    className="project-team__person"
                    to={`/students/${person.id}`}
                    key={person.id}
                  >
                    <Avatar name={person.name} src={person.avatarUrl} size={36} decorative />
                    <span>
                      <strong>{person.name}</strong>
                      <small>{person.isOwner ? 'Project owner' : 'Team member'}</small>
                    </span>
                  </Link>
                ))}
              </div>
              {project.members.length === 0 && (
                <p className="muted-copy">
                  No teammates have joined yet. This release does not include applications.
                </p>
              )}
            </section>

            <section className="project-meta" aria-labelledby="meta-title">
              <SectionLabel>Project record</SectionLabel>
              <h2 id="meta-title">Status and dates</h2>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{statusLabels[project.status]}</dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>{formatMonthYear(project.publishedAt) || 'Not published'}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatTimestamp(project.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </section>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!archiving) {
            setDialogOpen(false);
          }
        }}
        title={isDraft ? 'Delete this draft?' : 'Archive this project?'}
        description={
          isDraft
            ? 'An untouched draft is removed permanently.'
            : 'Archiving closes the public listing but keeps the project record.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleArchive} loading={archiving}>
              {isDraft ? 'Delete draft' : 'Archive project'}
            </Button>
          </>
        }
      >
        {archiveError && (
          <Alert tone="error" title="That action did not complete.">
            {archiveError}
          </Alert>
        )}
        <p>
          <strong>{project.title}</strong> will no longer appear in public discovery. This action
          does not create an application or change any other project.
        </p>
      </Dialog>
    </PublicLayout>
  );
}
