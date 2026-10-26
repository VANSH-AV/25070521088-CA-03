import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/context.js';
import { listProjects } from '../api/projects.js';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { ProjectCard } from '../components/project/ProjectCard.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Avatar,
  Button,
  EmptyState,
  SectionLabel,
  Skeleton,
  SkillTag,
  StatusBadge,
} from '../components/ui.jsx';
import { formatDate, projectAvailabilityLabel, projectInitials } from '../utils/format.js';
import { usePageTitle } from '../utils/usePageTitle.js';

const steps = [
  {
    title: 'Publish the brief',
    text: 'Turn a rough idea into a clear project page with the skills you still need.',
  },
  {
    title: 'Find the fit',
    text: 'Browse by skill, interest, and availability. See real people and real project context.',
  },
  {
    title: 'Build together',
    text: 'Agree on the next step and keep the project description current as the work changes.',
  },
  {
    title: 'Show the proof',
    text: 'Move the project to completed so the work remains visible on your profile.',
  },
];

function FeaturedSkeletons() {
  return (
    <div className="projects-grid" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div className="state-card state-card--project" key={item}>
          <Skeleton className="skeleton--cover" />
          <Skeleton className="skeleton--line skeleton--line-lg" />
          <Skeleton className="skeleton--line" />
          <Skeleton className="skeleton--line skeleton--line-sm" />
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  usePageTitle('Find your people. Build your proof.');
  const { isAuthenticated } = useAuth();
  const [featured, setFeatured] = useState({
    status: 'loading',
    projects: [],
    total: 0,
    error: '',
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();


    listProjects({ limit: 3, sort: 'newest' }, { signal: controller.signal })
      .then(({ projects, meta }) => {
        setFeatured({
          status: 'ready',
          projects,
          total: meta?.total || 0,
          error: '',
        });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        setFeatured((current) => ({
          ...current,
          status: 'error',
          error: error.message,
        }));
      });

    return () => controller.abort();
  }, [retryKey]);

  const heroProject = featured.projects[0];
  const startPath = isAuthenticated
    ? '/projects/new'
    : `/login?${new URLSearchParams({ returnTo: '/projects/new' }).toString()}`;

  const reload = useCallback(() => {
    setFeatured((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  }, []);

  return (
    <PublicLayout>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__inner">
          <div className="hero__copy">
            <SectionLabel>
              <span className="eyebrow__index">01</span>
              Student project collaboration studio
            </SectionLabel>
            <h1 className="hero__title" id="hero-title">
              Find your people.
              <span className="hero__accent">Build your proof.</span>
            </h1>
            <p className="hero__lede">
              Publish an idea, meet teammates who fill the gaps, and keep the brief clear from
              first sketch to finished work. Built for the messy middle of student projects.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary button--md" to="/projects">
                Explore projects
                <Icon name="arrowRight" size={18} />
              </Link>
              <Link className="button button--secondary button--md" to={startPath}>
                Start a project
                <Icon name="plus" size={18} />
              </Link>
            </div>
            <div className="hero__meta">
              {heroProject?.owner && (
                <Avatar name={heroProject.owner.name} src={heroProject.owner.avatarUrl} size={38} />
              )}
              <p>
                <strong>
                  {featured.status === 'ready'
                    ? `${featured.total} public ${featured.total === 1 ? 'project' : 'projects'}`
                    : 'Live project discovery'}
                </strong>
                <span>Real briefs from students in the FLEXI database.</span>
              </p>
            </div>
          </div>

          <div className="hero-board" aria-label="Latest project from discovery">
            {featured.status === 'loading' && (
              <div className="hero-project hero-project--loading" aria-busy="true">
                <span className="visually-hidden">Loading the latest project</span>
                <Skeleton className="skeleton--line skeleton--line-lg" />
                <Skeleton className="skeleton--line" />
                <Skeleton className="skeleton--line skeleton--line-sm" />
              </div>
            )}

            {featured.status === 'error' && (
              <div className="hero-project">
                <StatusBadge status="draft" label="Discovery offline" />
                <h2>Projects could not load right now.</h2>
                <p>{featured.error}</p>
                <Button variant="secondary" size="sm" onClick={reload}>
                  Try again
                </Button>
              </div>
            )}

            {featured.status === 'ready' && heroProject && (
              <div className="hero-project">
                <div className="hero-project__top">
                  <StatusBadge status={heroProject.status} />
                  <span className="hero-project__code">
                    LATEST / {projectInitials(heroProject.title)}
                  </span>
                </div>
                <div className="hero-project__body">
                  <div className="hero-project__heading">
                    <span className="hero-project__mark" aria-hidden="true">
                      {projectInitials(heroProject.title)}
                    </span>
                    <div>
                      <p className="hero-project__category">
                        {heroProject.category.replace('_', ' ').toUpperCase()} / TEAM OF{' '}
                        {heroProject.teamSize}
                      </p>
                      <p className="hero-project__title">{heroProject.title}</p>
                    </div>
                  </div>
                  <p className="hero-project__summary">{heroProject.summary}</p>
                  <div className="hero-project__skills">
                    {heroProject.requiredSkills.slice(0, 3).map((skill) => (
                      <SkillTag key={skill}>{skill}</SkillTag>
                    ))}
                  </div>
                  <div className="hero-project__team">
                    <span>{projectAvailabilityLabel(heroProject)}</span>
                    <span className="hero-project__deadline">
                      <Icon name="calendar" size={14} />
                      {formatDate(heroProject.deadline)}
                    </span>
                  </div>
                  <Link className="hero-project__link" to={`/projects/${heroProject.id}`}>
                    Read the brief
                    <Icon name="arrowRight" size={16} />
                  </Link>
                </div>
              </div>
            )}

            {featured.status === 'ready' && !heroProject && (
              <div className="hero-project hero-project--empty">
                <StatusBadge status="draft" label="Waiting for the first brief" />
                <h2>No public projects yet.</h2>
                <p>
                  Be the first to publish a clear brief. It will appear here as soon as it is
                  recruiting.
                </p>
                <Link className="button button--primary button--sm" to={startPath}>
                  Start a project
                </Link>
              </div>
            )}

            {heroProject && (
              <div className="hero-note" aria-hidden="true">
                <span className="hero-note__label">LIVE DISCOVERY</span>
                <div className="hero-note__person">
                  <Icon name="search" size={18} />
                  <div>
                    <strong>Search by skill</strong>
                    <span>Filter by category and status</span>
                  </div>
                </div>
                <p>Every card is a database record, not sample content.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="What the studio connects">
        <div className="container proof-strip__inner">
          <div className="proof-strip__item">
            <span className="proof-strip__value">01</span>
            <span>clear project briefs</span>
          </div>
          <div className="proof-strip__item">
            <span className="proof-strip__value">02</span>
            <span>public student profiles</span>
          </div>
          <div className="proof-strip__item">
            <span className="proof-strip__value">03</span>
            <span>owner-managed projects</span>
          </div>
          <p className="proof-strip__note">Live discovery · real database records</p>
        </div>
      </section>

      <section className="section how" id="how-it-works" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <div>
              <SectionLabel>
                <span className="eyebrow__index">02</span>
                How it works
              </SectionLabel>
              <h2 id="how-title">From a loose idea to a project worth showing.</h2>
            </div>
            <p className="section-head__copy">
              FLEXI keeps discovery and project context together, so the handoff does not disappear
              into six different apps.
            </p>
          </div>
          <ol className="steps">
            {steps.map((step, index) => (
              <li className="step" key={step.title}>
                <span className="step__number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section projects-section" id="projects" aria-labelledby="projects-title">
        <div className="container">
          <div className="section-head section-head--split">
            <div>
              <SectionLabel>
                <span className="eyebrow__index">03</span>
                Latest projects
              </SectionLabel>
              <h2 id="projects-title">New briefs from the studio.</h2>
            </div>
            <div className="section-head__aside">
              <Link className="button button--secondary button--sm" to="/projects">
                Browse all projects
                <Icon name="arrowUpRight" size={16} />
              </Link>
            </div>
          </div>

          {featured.status === 'loading' && <FeaturedSkeletons />}

          {featured.status === 'error' && (
            <Alert tone="error" title="Projects could not load.">
              {featured.error}{' '}
              <button type="button" className="inline-link" onClick={reload}>
                Try again
              </button>
            </Alert>
          )}

          {featured.status === 'ready' && featured.projects.length > 0 && (
            <div className="projects-grid">
              {featured.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {featured.status === 'ready' && featured.projects.length === 0 && (
            <EmptyState
              icon="sparkles"
              title="No public projects yet."
              description="The board is ready for its first brief. Create an account and publish one."
              action={
                <Link className="button button--primary button--sm" to={startPath}>
                  Start a project
                </Link>
              }
            />
          )}
        </div>
      </section>

      <section className="section home-showcase" aria-labelledby="showcase-title">
        <div className="container home-showcase__inner">
          <div>
            <SectionLabel>
              <span className="eyebrow__index">04</span>
              Completed work
            </SectionLabel>
            <h2 id="showcase-title">Finished projects stay useful.</h2>
            <p>
              Completed work remains public with its team and context intact, so a project can
              become evidence rather than a dead group chat.
            </p>
          </div>
          <Link className="button button--secondary" to="/projects?status=completed">
            View completed projects
            <Icon name="arrowRight" size={18} />
          </Link>
        </div>
      </section>

      <section className="cta" aria-labelledby="cta-title">
        <div className="container cta__inner">
          <div>
            <SectionLabel className="eyebrow--light">Join the studio</SectionLabel>
            <h2 id="cta-title">Your next teammate is already on campus.</h2>
            <p className="cta__lede">
              Find the project, the people, and the next small step. The rest is the work worth
              showing.
            </p>
          </div>
          <div className="cta__actions">
            <Link className="button button--inverse" to="/projects">
              Explore projects
              <Icon name="arrowRight" size={18} />
            </Link>
            <Link className="button button--ghost-inverse" to={startPath}>
              Start a project
              <Icon name="plus" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
