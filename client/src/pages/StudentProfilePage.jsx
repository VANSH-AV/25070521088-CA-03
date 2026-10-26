import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicProfile } from '../api/users.js';
import { ApiError } from '../api/client.js';
import { useAuth } from '../auth/context.js';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { ProjectCard } from '../components/project/ProjectCard.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Avatar,
  EmptyState,
  SectionLabel,
  Skeleton,
  SkillTag,
} from '../components/ui.jsx';
import { availabilityLabels, formatMonthYear } from '../utils/format.js';
import { usePageTitle } from '../utils/usePageTitle.js';

export function StudentProfilePage() {
  const { userId } = useParams();
  const { user: sessionUser } = useAuth();
  const [state, setState] = useState({ status: 'loading', profile: null, projects: [], error: '' });
  const [retryKey, setRetryKey] = useState(0);

  usePageTitle(state.profile?.name || 'Student profile');

  useEffect(() => {
    const controller = new AbortController();


    getPublicProfile(userId, { signal: controller.signal })
      .then(({ user, projects }) => {
        setState({ status: 'ready', profile: user, projects, error: '' });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        const notFound = error instanceof ApiError && [400, 404].includes(error.status);
        setState({
          status: notFound ? 'missing' : 'error',
          profile: null,
          projects: [],
          error: notFound ? '' : error.message,
        });
      });

    return () => controller.abort();
  }, [userId, retryKey]);

  const retry = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  if (state.status === 'loading') {
    return (
      <PublicLayout>
        <div className="container profile-loading" aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Loading student profile</span>
          <Skeleton className="skeleton--avatar" />
          <Skeleton className="skeleton--line skeleton--line-lg" />
          <Skeleton className="skeleton--line" />
          <Skeleton className="skeleton--line skeleton--line-sm" />
        </div>
      </PublicLayout>
    );
  }

  if (state.status === 'missing') {
    return (
      <PublicLayout>
        <section className="section">
          <div className="container">
            <EmptyState
              icon="user"
              title="That profile is not available."
              description="The student may have deactivated their account, or the link is incorrect."
              action={
                <Link className="button button--primary button--sm" to="/projects">
                  Browse projects
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
            <Alert tone="error" title="The profile could not load.">
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

  const { profile, projects } = state;
  const isSelf = sessionUser?.id === profile.id;
  const links = [
    { key: 'github', label: 'GitHub' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'portfolio', label: 'Portfolio' },
  ].filter((link) => profile.links?.[link.key]);

  return (
    <PublicLayout>
      <section className="profile-hero" aria-labelledby="profile-name">
        <div className="container profile-hero__inner">
          <Avatar
            name={profile.name}
            src={profile.avatarUrl}
            size={112}
            className="profile-hero__avatar"
          />
          <div className="profile-hero__copy">
            <SectionLabel>
              <span className="eyebrow__index">05</span>
              Student profile
            </SectionLabel>
            <h1 id="profile-name">{profile.name}</h1>
            <p className="profile-hero__headline">
              {profile.headline || 'Student builder on FLEXI.'}
            </p>
            <div className="profile-hero__meta">
              <span>{profile.college || 'College not listed'}</span>
              {profile.course && <span>{profile.course}</span>}
              {profile.graduationYear && <span>Class of {profile.graduationYear}</span>}
              <span className={`availability availability--${profile.availability}`}>
                {availabilityLabels[profile.availability]}
              </span>
            </div>
            <div className="profile-hero__actions">
              {isSelf && (
                <Link className="button button--primary button--sm" to="/dashboard/profile">
                  Edit profile
                  <Icon name="edit" size={16} />
                </Link>
              )}
              <Link className="button button--secondary button--sm" to="/projects">
                Explore projects
                <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          </div>
          <dl className="profile-facts">
            <div>
              <dt>Public projects</dt>
              <dd>{projects.length}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatMonthYear(profile.memberSince) || 'New member'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section" aria-label="Profile details and projects">
        <div className="container profile-layout">
          <aside className="profile-aside">
            <section className="profile-block">
              <SectionLabel>About</SectionLabel>
              <h2>The short version</h2>
              {profile.bio ? (
                <div className="profile-bio">
                  {profile.bio.split(/\n{2,}/).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">No bio added yet.</p>
              )}
            </section>

            <section className="profile-block">
              <SectionLabel>Skills</SectionLabel>
              <h2>What they bring</h2>
              {profile.skills.length > 0 ? (
                <div className="tag-row">
                  {profile.skills.map((skill) => (
                    <SkillTag key={skill}>{skill}</SkillTag>
                  ))}
                </div>
              ) : (
                <p className="muted-copy">No skills listed yet.</p>
              )}
            </section>

            {links.length > 0 && (
              <section className="profile-block">
                <SectionLabel>Links</SectionLabel>
                <h2>Elsewhere</h2>
                <div className="profile-links">
                  {links.map((link) => (
                    <a
                      key={link.key}
                      href={profile.links[link.key]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                      <Icon name="arrowUpRight" size={15} />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </aside>

          <div className="profile-projects">
            <div className="section-head section-head--split">
              <div>
                <SectionLabel>Public work</SectionLabel>
                <h2>Projects by {profile.name.split(/\s+/)[0]}</h2>
              </div>
              <span className="sample-note sample-note--live">
                <span aria-hidden="true" />
                Live records
              </span>
            </div>

            {projects.length > 0 ? (
              <div className="projects-grid projects-grid--two">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="sparkles"
                title="No public projects yet."
                description={
                  isSelf
                    ? 'Publish a recruiting project and it will appear on your public profile.'
                    : 'This student has not published a public project yet.'
                }
                action={
                  isSelf ? (
                    <Link className="button button--primary button--sm" to="/projects/new">
                      Start a project
                    </Link>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
