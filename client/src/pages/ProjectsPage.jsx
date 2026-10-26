import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listProjects } from '../api/projects.js';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { ProjectCard } from '../components/project/ProjectCard.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Button,
  EmptyState,
  SectionLabel,
  SelectField,
  Skeleton,
  TextField,
} from '../components/ui.jsx';
import { projectCategories } from '../utils/format.js';
import { usePageTitle } from '../utils/usePageTitle.js';

const statusOptions = [
  { value: '', label: 'All public statuses' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'deadline', label: 'Closest deadline' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'slots', label: 'Most open spots' },
];

function DiscoverySkeleton() {
  return (
    <div className="projects-grid" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((item) => (
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

function pageNumbers(current, total) {
  if (total <= 1) {
    return [];
  }

  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function ProjectsPage() {
  usePageTitle('Project discovery');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const currentPage = Number(searchParams.get('page')) || 1;
  const [draft, setDraft] = useState({
    base: queryString,
    q: searchParams.get('q') || '',
    skill: searchParams.get('skill') || '',
    tech: searchParams.get('tech') || '',
  });
  const [result, setResult] = useState({
    status: 'loading',
    projects: [],
    meta: null,
    error: '',
  });
  const [retryKey, setRetryKey] = useState(0);

  const q = draft.base === queryString ? draft.q : searchParams.get('q') || '';
  const skill = draft.base === queryString ? draft.skill : searchParams.get('skill') || '';
  const tech = draft.base === queryString ? draft.tech : searchParams.get('tech') || '';

  const updateDraft = (key, value) => {
    setDraft({
      base: queryString,
      q,
      skill,
      tech,
      [key]: value,
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    const params = Object.fromEntries(new URLSearchParams(queryString).entries());

    listProjects({ ...params, limit: 12 }, { signal: controller.signal })
      .then(({ projects, meta }) => {
        setResult({ status: 'ready', projects, meta, error: '' });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        setResult((current) => ({
          ...current,
          status: 'error',
          error: error.message,
        }));
      });

    return () => controller.abort();
  }, [queryString, retryKey]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    if (key !== 'page') {
      next.delete('page');
    }

    setResult((current) => ({ ...current, status: 'loading', error: '' }));
    setSearchParams(next, { replace: true });
  };

  const applyTextFilters = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries({ q, skill, tech })) {
      const normalized = value.trim();

      if (normalized) {
        next.set(key, normalized);
      } else {
        next.delete(key);
      }
    }

    next.delete('page');
    setResult((current) => ({ ...current, status: 'loading', error: '' }));
    setSearchParams(next);
  };

  const resetFilters = () => {
    setDraft({ base: '', q: '', skill: '', tech: '' });
    setResult((current) => ({ ...current, status: 'loading', error: '' }));
    setSearchParams({});
  };

  const retry = () => {
    setResult((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const filtersActive =
    Boolean(searchParams.get('q')) ||
    Boolean(searchParams.get('skill')) ||
    Boolean(searchParams.get('tech')) ||
    Boolean(searchParams.get('category')) ||
    Boolean(searchParams.get('status'));

  return (
    <PublicLayout>
      <section className="page-hero page-hero--projects" aria-labelledby="projects-title">
        <div className="container page-hero__inner">
          <div>
            <SectionLabel>
              <span className="eyebrow__index">04</span>
              Public discovery
            </SectionLabel>
            <h1 id="projects-title">Find a project worth joining.</h1>
          </div>
          <p className="page-hero__lede">
            Search real student briefs by skill, category, and status. Draft and archived projects
            stay private to their owner.
          </p>
        </div>
      </section>

      <section className="section section--discovery" aria-label="Project filters and results">
        <div className="container">
          <form className="discovery-search" onSubmit={applyTextFilters} role="search">
            <TextField
              id="project-search"
              label="Search projects"
              value={q}
              onChange={(event) => updateDraft('q', event.target.value)}
              placeholder="Title, description, skill, or tag"
              maxLength={100}
              className="discovery-search__query"
            />
            <TextField
              id="project-skill"
              label="Skill"
              value={skill}
              onChange={(event) => updateDraft('skill', event.target.value)}
              placeholder="e.g. React"
              maxLength={30}
            />
            <TextField
              id="project-tech"
              label="Tech"
              value={tech}
              onChange={(event) => updateDraft('tech', event.target.value)}
              placeholder="e.g. MongoDB"
              maxLength={30}
            />
            <Button type="submit" icon="search" className="discovery-search__submit">
              Search
            </Button>
          </form>

          <div className="discovery-filters">
            <SelectField
              id="project-category"
              label="Category"
              value={searchParams.get('category') || ''}
              onChange={(event) => setParam('category', event.target.value)}
              options={[{ value: '', label: 'All categories' }, ...projectCategories]}
            />
            <SelectField
              id="project-status"
              label="Status"
              value={searchParams.get('status') || ''}
              onChange={(event) => setParam('status', event.target.value)}
              options={statusOptions}
            />
            <SelectField
              id="project-sort"
              label="Sort"
              value={searchParams.get('sort') || 'newest'}
              onChange={(event) => setParam('sort', event.target.value)}
              options={sortOptions}
            />
            {filtersActive && (
              <Button variant="ghost" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>

          <div className="discovery-summary" aria-live="polite">
            <p>
              {result.status === 'loading' && 'Loading projects…'}
              {result.status === 'error' && 'Projects could not be loaded.'}
              {result.status === 'ready' &&
                `${result.meta?.total || 0} ${
                  result.meta?.total === 1 ? 'project' : 'projects'
                } found`}
            </p>
            <span>
              {filtersActive
                ? 'Filtered live database results'
                : 'Public projects from the FLEXI database'}
            </span>
          </div>

          {result.status === 'loading' && <DiscoverySkeleton />}

          {result.status === 'error' && (
            <Alert tone="error" title="Discovery is temporarily unavailable.">
              {result.error}{' '}
              <button
                type="button"
                className="inline-link"
                onClick={retry}
              >
                Try again
              </button>
            </Alert>
          )}

          {result.status === 'ready' && result.projects.length > 0 && (
            <>
              <div className="projects-grid">
                {result.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>

              {result.meta && result.meta.pages > 1 && (
                <nav className="pagination" aria-label="Project results pages">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setParam('page', String(currentPage - 1))}
                  >
                    <Icon name="arrowLeft" size={16} />
                    Previous
                  </Button>
                  <div className="pagination__pages">
                    {pageNumbers(currentPage, result.meta.pages).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={[
                          'pagination__page',
                          page === currentPage && 'is-current',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-current={page === currentPage ? 'page' : undefined}
                        onClick={() => setParam('page', String(page))}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= result.meta.pages}
                    onClick={() => setParam('page', String(currentPage + 1))}
                  >
                    Next
                    <Icon name="arrowRight" size={16} />
                  </Button>
                </nav>
              )}
            </>
          )}

          {result.status === 'ready' && result.projects.length === 0 && (
            <EmptyState
              icon="search"
              title="No projects match those filters."
              description="Try a broader skill, another category, or reset the filters to see the whole public board."
              action={
                filtersActive ? (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Reset filters
                  </Button>
                ) : (
                  <Link className="button button--primary button--sm" to="/register">
                    Publish the first project
                  </Link>
                )
              }
            />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
