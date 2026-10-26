import { useEffect, useRef, useState } from 'react';
import { Icon } from './components/icons.jsx';
import {
  Alert,
  Avatar,
  AvatarStack,
  Button,
  Dialog,
  EmptyState,
  IconButton,
  Logo,
  ProjectCard,
  ProgressBar,
  SectionLabel,
  Skeleton,
  SkillTag,
  StatCard,
  StatusBadge,
  TextField,
  Toast,
} from './components/ui.jsx';

const navLinks = [
  { label: 'Discover', href: '#projects' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Workspace', href: '#workspace' },
  { label: 'Foundation', href: '#foundation' },
];

const sampleProjects = [
  {
    id: 'campusloop',
    title: 'CampusLoop',
    category: 'Campus tool',
    status: 'recruiting',
    summary:
      'A quieter way to swap resources, find study spots, and keep group projects from dying in a group chat.',
    owner: 'Mira Shah',
    college: 'Design & CS · 3rd year',
    skills: ['React', 'UX research', 'Node.js'],
    team: ['Mira Shah', 'Nia Thomas', 'Kabir Jain'],
    teamSize: 5,
    slots: '2 of 5 spots open',
    deadline: 'Closes 14 Nov',
    progress: 64,
    progressLabel: 'Discovery sprint',
    coverTone: 'cobalt',
    mark: 'CL',
  },
  {
    id: 'lantern',
    title: 'Lantern',
    category: 'Learning tool',
    status: 'in_progress',
    summary:
      'Turning dense course notes into short, visual study trails that a student can actually finish before the exam.',
    owner: 'Dev Patel',
    college: 'Computer science · final year',
    skills: ['Node.js', 'MongoDB', 'Product design'],
    team: ['Dev Patel', 'Ananya Rao', 'Samir Khan', 'Ishita Bose'],
    teamSize: 4,
    slots: 'Team is full',
    deadline: 'Demo 02 Dec',
    progress: 82,
    progressLabel: 'Build sprint',
    coverTone: 'tangerine',
    mark: 'LN',
  },
  {
    id: 'greenroom',
    title: 'The Green Room',
    category: 'Campus media',
    status: 'completed',
    summary:
      'A student-run interview series and editorial archive for the people quietly making campus culture better.',
    owner: 'Ananya Rao',
    college: 'Media studies · 3rd year',
    skills: ['Figma', 'Editorial', 'Community'],
    team: ['Ananya Rao', 'Joel Mathew', 'Sana Iqbal', 'Rhea Das'],
    teamSize: 4,
    slots: 'Showcase complete',
    deadline: 'Shipped May 2026',
    progress: 100,
    progressLabel: 'Showcase ready',
    coverTone: 'mint',
    mark: 'GR',
  },
];

const steps = [
  {
    title: 'Publish the brief',
    text: 'Turn a rough idea into a clear project page with the skills you still need.',
  },
  {
    title: 'Find the fit',
    text: 'Browse by skill, interest, and availability. Apply with context, not a cold message.',
  },
  {
    title: 'Build together',
    text: 'Move from accepted to aligned with tasks, milestones, and one shared next step.',
  },
  {
    title: 'Show the proof',
    text: 'Close the loop with a completed project page your team can point to.',
  },
];

const dashboardTasks = [
  {
    title: 'Run 5 usability interviews',
    meta: 'Today · Nia',
    status: 'in_progress',
    state: 'Now',
    assignee: 'Nia Thomas',
  },
  {
    title: 'Lock the resource-card component',
    meta: 'Thu · Kabir',
    status: 'pending',
    state: 'Next',
    assignee: 'Kabir Jain',
  },
  {
    title: 'Publish the beta invite page',
    meta: 'Fri · Mira',
    status: 'pending',
    state: 'Next',
    assignee: 'Mira Shah',
  },
  {
    title: 'Synthesize interview notes',
    meta: 'Done · Aarav',
    status: 'completed',
    state: 'Done',
    assignee: 'Aarav Mehta',
  },
];

const palette = [
  { name: 'Bone', hex: '#F8F5EE' },
  { name: 'Ink', hex: '#0B0F14' },
  { name: 'Cobalt', hex: '#2447E8' },
  { name: 'Tangerine', hex: '#FF6B3D' },
  { name: 'Mint', hex: '#DFF5EC' },
  { name: 'Amber', hex: '#FEF3C7' },
  { name: 'Rose', hex: '#FDE8EA' },
  { name: 'White', hex: '#FFFFFF' },
];

const features = [
  'Milestones that make progress visible.',
  'A task list the whole team can read.',
  'Applications with context, not noisy group chat.',
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState(() => new Set(['campusloop']));
  const [toast, setToast] = useState(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [titleSuccess, setTitleSuccess] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => {
      if (event.matches) {
        setMenuOpen(false);
      }
    };

    desktop.addEventListener('change', handleChange);
    return () => desktop.removeEventListener('change', handleChange);
  }, []);

  const notify = (message, tone = 'info') => {
    setToast({ id: Date.now(), message, tone });
  };

  const closeMenu = (restoreFocus = false) => {
    if (!menuOpen) {
      return;
    }

    setMenuOpen(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  };

  const handlePreviewAction = (feature) => {
    closeMenu(true);
    notify(`${feature} arrives in a later phase. This page is a design preview.`, 'info');
  };

  const handleDialogAccept = () => {
    setDialogOpen(false);
    notify('Application accepted in this preview only. No data was changed.', 'success');
  };

  const handleNavClick = (event, href) => {
    if (!menuOpen) {
      return;
    }

    setMenuOpen(false);

    if (window.matchMedia('(max-width: 1023px)').matches) {
      const heading = document.querySelector(href)?.querySelector('h1, h2, h3');

      if (heading) {
        window.requestAnimationFrame(() => {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        });
      }
    }

    event.currentTarget.blur();
  };

  const handleToggleSave = (project) => {
    const wasSaved = savedProjects.has(project.id);
    setSavedProjects((current) => {
      const next = new Set(current);

      if (wasSaved) {
        next.delete(project.id);
      } else {
        next.add(project.id);
      }

      return next;
    });

    notify(
      wasSaved
        ? `${project.title} removed from the saved preview.`
        : `${project.title} saved locally. No account data is stored.`,
      wasSaved ? 'info' : 'success',
    );
  };

  const handleTitleSubmit = (event) => {
    event.preventDefault();
    const value = projectTitle.trim();

    if (value.length < 3 || value.length > 120) {
      setTitleError('Give your project a title between 3 and 120 characters.');
      setTitleSuccess(false);
      titleInputRef.current?.focus();
      return;
    }

    setTitleError('');
    setTitleSuccess(true);
    notify('Title validated locally. Nothing was sent or saved.', 'success');
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="preview-bar" role="note">
        <span className="preview-bar__tag">Design preview</span>
        <p>Sample content only. No backend, database, or authentication is connected.</p>
        <a href="#foundation">
          Inspect the system
          <Icon name="arrowRight" size={14} />
        </a>
      </div>

      <header className="site-header" id="top">
        <div className="container site-header__inner">
          <a className="brand-link" href="#top" aria-label="FLEXI, back to top">
            <Logo />
          </a>

          <nav
            className={['site-nav', menuOpen && 'is-open'].filter(Boolean).join(' ')}
            id="primary-navigation"
            aria-label="Primary"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleNavClick(event, link.href)}
              >
                {link.label}
              </a>
            ))}
            <div className="site-nav__mobile-actions">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => handlePreviewAction('Sign in')}
              >
                Log in
              </Button>
              <Button size="sm" fullWidth onClick={() => handlePreviewAction('Sign up')}>
                Join FLEXI
              </Button>
            </div>
          </nav>

          <div className="site-actions">
            <Button variant="ghost" size="sm" onClick={() => handlePreviewAction('Sign in')}>
              Log in
            </Button>
            <Button size="sm" icon="arrowUpRight" onClick={() => handlePreviewAction('Sign up')}>
              Join FLEXI
            </Button>
          </div>

          <button
            ref={menuButtonRef}
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </header>

      <main id="main-content">
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
                Publish an idea, meet teammates who fill the gaps, and run the work in one calm
                place. Built for the messy middle of student projects.
              </p>
              <div className="hero__actions">
                <Button href="#projects" icon="arrowRight">
                  Explore projects
                </Button>
                <Button
                  variant="secondary"
                  icon="plus"
                  onClick={() => handlePreviewAction('Project creation')}
                >
                  Start a project
                </Button>
              </div>
              <div className="hero__meta">
                <AvatarStack
                  names={['Mira Shah', 'Dev Patel', 'Ananya Rao', 'Kabir Jain']}
                  max={4}
                  size={34}
                  label="Sample students in the FLEXI studio"
                />
                <p>
                  <strong>48 students</strong> building in the preview studio.
                  <span>Sample data.</span>
                </p>
              </div>
            </div>

            <div className="hero-board" aria-label="Sample project collaboration board">
              <div className="hero-project">
                <div className="hero-project__top">
                  <StatusBadge status="recruiting" />
                  <span className="hero-project__code">SAMPLE / CAMPUSLOOP</span>
                </div>
                <div className="hero-project__body">
                  <div className="hero-project__heading">
                    <span className="hero-project__mark" aria-hidden="true">
                      CL
                    </span>
                    <div>
                      <p className="hero-project__category">CAMPUS TOOL / TEAM OF 5</p>
                      <p className="hero-project__title">CampusLoop</p>
                    </div>
                  </div>
                  <p className="hero-project__summary">
                    A quieter way for students to swap resources and keep group work out of the
                    group chat.
                  </p>
                  <div className="hero-project__skills">
                    <SkillTag>React</SkillTag>
                    <SkillTag>UX research</SkillTag>
                    <SkillTag>Node.js</SkillTag>
                  </div>
                  <ProgressBar value={64} label="Beta milestone" />
                  <div className="hero-project__team">
                    <AvatarStack names={['Mira Shah', 'Nia Thomas', 'Kabir Jain']} max={3} size={28} />
                    <span>2 of 5 spots open</span>
                    <span className="hero-project__deadline">
                      <Icon name="calendar" size={14} />
                      Closes 14 Nov
                    </span>
                  </div>
                </div>
              </div>

              <div className="hero-note" aria-hidden="true">
                <span className="hero-note__label">TEAM FIT / SAMPLE</span>
                <div className="hero-note__person">
                  <Avatar name="Nia Thomas" size={32} decorative />
                  <div>
                    <strong>Nia Thomas</strong>
                    <span>UX research</span>
                  </div>
                </div>
                <p>3 complementary skills for this brief.</p>
              </div>

              <div className="hero-milestone" aria-hidden="true">
                <span className="hero-milestone__icon">
                  <Icon name="check" size={16} />
                </span>
                <div>
                  <strong>Milestone shipped</strong>
                  <span>Prototype walkthrough</span>
                </div>
                <span className="hero-milestone__date">WEEK 4</span>
              </div>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Sample studio metrics">
          <div className="container proof-strip__inner">
            <div className="proof-strip__item">
              <span className="proof-strip__value">12</span>
              <span>live projects</span>
            </div>
            <div className="proof-strip__item">
              <span className="proof-strip__value">48</span>
              <span>students</span>
            </div>
            <div className="proof-strip__item">
              <span className="proof-strip__value">3</span>
              <span>colleges</span>
            </div>
            <div className="proof-strip__item">
              <span className="proof-strip__value">09</span>
              <span>showcase projects</span>
            </div>
            <p className="proof-strip__note">Design-preview metrics · not live data</p>
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
                <h2 id="how-title" tabIndex="-1">
                  From a loose idea to a team that ships.
                </h2>
              </div>
              <p className="section-head__copy">
                FLEXI keeps discovery, applications, and the work itself in one place, so the handoff
                does not disappear into six different apps.
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
                  Open calls
                </SectionLabel>
                <h2 id="projects-title" tabIndex="-1">
                  Projects looking for their next teammate.
                </h2>
              </div>
              <div className="section-head__aside">
                <span className="sample-note">
                  <span aria-hidden="true" />
                  Design-preview data
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="arrowUpRight"
                  onClick={() => handlePreviewAction('Project discovery')}
                >
                  Browse all projects
                </Button>
              </div>
            </div>
            <div className="projects-grid">
              {sampleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  saved={savedProjects.has(project.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="workspace-band" id="workspace" aria-labelledby="workspace-title">
          <div className="container workspace-band__inner">
            <div className="workspace-band__copy">
              <SectionLabel>
                <span className="eyebrow__index">04</span>
                The workspace
              </SectionLabel>
              <h2 id="workspace-title" tabIndex="-1">
                One calm place for the messy middle.
              </h2>
              <p className="workspace-band__lede">
                Once the team is set, the project becomes a workspace: tasks, milestones, and a
                shared read on what happens next. No mystery, no duplicate trackers.
              </p>
              <ul className="feature-list">
                {features.map((feature) => (
                  <li key={feature}>
                    <span className="feature-list__icon">
                      <Icon name="check" size={14} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="workspace-band__actions">
                <Button
                  variant="inverse"
                  icon="arrowUpRight"
                  onClick={() => handlePreviewAction('The project workspace')}
                >
                  Preview the workspace
                </Button>
                <span className="workspace-band__note">
                  Dashboard preview · sample project · no live data
                </span>
              </div>
            </div>

            <div className="dashboard" aria-label="Sample FLEXI dashboard for CampusLoop">
              <div className="dashboard__bar">
                <span className="dashboard__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="dashboard__url">studio / campusloop</span>
                <StatusBadge status="in_progress" />
              </div>
              <div className="dashboard__layout">
                <aside className="dashboard__sidebar" aria-label="Sample dashboard navigation">
                  <div className="dashboard__sidebar-brand">
                    <Logo compact />
                    <span>FLEXI</span>
                  </div>
                  <nav>
                    <span className="dashboard__nav-item is-active">
                      <Icon name="layers" size={16} />
                      Overview
                    </span>
                    <span className="dashboard__nav-item">
                      <Icon name="checkCircle" size={16} />
                      Tasks
                    </span>
                    <span className="dashboard__nav-item">
                      <Icon name="target" size={16} />
                      Milestones
                    </span>
                    <span className="dashboard__nav-item">
                      <Icon name="users" size={16} />
                      Team
                    </span>
                  </nav>
                  <div className="dashboard__person">
                    <Avatar name="Aarav Mehta" size={28} decorative />
                    <span>
                      Aarav Mehta
                      <small>Project owner</small>
                    </span>
                  </div>
                </aside>

                <div className="dashboard__main">
                  <div className="dashboard__top">
                    <div>
                      <p className="dashboard__date">MONDAY / WEEK 6</p>
                      <h3>Good morning, Aarav.</h3>
                    </div>
                    <AvatarStack
                      names={['Aarav Mehta', 'Mira Shah', 'Nia Thomas', 'Kabir Jain']}
                      max={4}
                      size={28}
                      label="Sample CampusLoop team"
                    />
                  </div>

                  <div className="dashboard__stats">
                    <StatCard label="Open tasks" value="4" note="2 due this week" />
                    <StatCard label="Pending applications" value="2" note="1 needs a decision" tone="amber" />
                    <StatCard label="Team" value="3/5" note="2 spots open" tone="mint" />
                  </div>

                  <div className="dashboard__grid">
                    <div className="dashboard__panel">
                      <div className="dashboard__panel-head">
                        <h4>Next milestone</h4>
                        <span className="dashboard__percent">64%</span>
                      </div>
                      <p className="dashboard__milestone">Beta ready for testers</p>
                      <ProgressBar value={64} label="Milestone progress" showValue={false} />
                      <p className="dashboard__panel-note">Due 08 Nov · 3 linked tasks</p>
                    </div>

                    <div className="dashboard__panel dashboard__panel--tasks">
                      <div className="dashboard__panel-head">
                        <h4>Next up</h4>
                        <span className="sample-note sample-note--small">
                          <span aria-hidden="true" />
                          4 tasks
                        </span>
                      </div>
                      <ul className="task-list">
                        {dashboardTasks.map((task) => (
                          <li
                            className={['task', task.status === 'completed' && 'task--done']
                              .filter(Boolean)
                              .join(' ')}
                            key={task.title}
                          >
                            <span
                              className={[
                                'task__marker',
                                `task__marker--${task.status}`,
                              ].join(' ')}
                              aria-hidden="true"
                            >
                              {task.status === 'completed' && <Icon name="check" size={12} />}
                            </span>
                            <div className="task__copy">
                              <p>{task.title}</p>
                              <span>{task.meta}</span>
                            </div>
                            <span className={`task__state task__state--${task.status}`}>
                              {task.state}
                            </span>
                            <Avatar name={task.assignee} size={24} decorative />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section foundation" id="foundation" aria-labelledby="foundation-title">
          <div className="container">
            <div className="section-head">
              <div>
                <SectionLabel>
                  <span className="eyebrow__index">05</span>
                  The foundation
                </SectionLabel>
                <h2 id="foundation-title" tabIndex="-1">
                  The foundation, not a mockup.
                </h2>
              </div>
              <p className="section-head__copy">
                Every element below is a reusable component with tokens, states, and accessible
                behavior. This is the system later pages will assemble.
              </p>
            </div>

            <div className="token-grid">
              <article className="panel panel--palette">
                <div className="panel__head">
                  <h3>Color</h3>
                  <span className="panel__code">TOKENS / 01</span>
                </div>
                <div className="swatches">
                  {palette.map((color) => (
                    <div className="swatch" key={color.name}>
                      <span
                        className="swatch__chip"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden="true"
                      />
                      <span className="swatch__name">{color.name}</span>
                      <code>{color.hex}</code>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel panel--type">
                <div className="panel__head">
                  <h3>Typography</h3>
                  <span className="panel__code">TOKENS / 02</span>
                </div>
                <div className="type-specimen">
                  <p className="type-specimen__display">Build your proof.</p>
                  <p className="type-specimen__body">
                    Manrope carries the reading experience, with a measured 16px base and generous
                    line height.
                  </p>
                  <p className="type-specimen__mono">JETBRAINS MONO / METADATA / 11PX</p>
                </div>
              </article>
            </div>

            <div className="panel-grid">
              <article className="panel">
                <div className="panel__head">
                  <h3>Actions</h3>
                  <span className="panel__code">CORE / 01</span>
                </div>
                <div className="button-row">
                  <Button>Primary action</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
                <div className="button-row button-row--compact">
                  <Button size="sm">Small</Button>
                  <Button size="sm" loading>
                    Working…
                  </Button>
                  <Button size="sm" disabled>
                    Disabled
                  </Button>
                  <IconButton label="Save example project" icon="bookmark" />
                  <IconButton label="Remove saved example project" icon="bookmark" pressed />
                </div>
              </article>

              <article className="panel">
                <div className="panel__head">
                  <h3>Status, skills & people</h3>
                  <span className="panel__code">CORE / 02</span>
                </div>
                <div className="badge-row">
                  <StatusBadge status="recruiting" />
                  <StatusBadge status="in_progress" />
                  <StatusBadge status="completed" />
                  <StatusBadge status="pending" />
                  <StatusBadge status="rejected" />
                </div>
                <div className="tag-row">
                  <SkillTag>React</SkillTag>
                  <SkillTag>UX research</SkillTag>
                  <SkillTag>MongoDB</SkillTag>
                  <SkillTag>Editorial</SkillTag>
                </div>
                <div className="avatar-row">
                  <Avatar name="Mira Shah" size={38} />
                  <Avatar name="Dev Patel" size={38} />
                  <Avatar name="Ananya Rao" size={38} />
                  <AvatarStack
                    names={['Nia Thomas', 'Kabir Jain', 'Samir Khan', 'Ishita Bose']}
                    max={3}
                    size={38}
                  />
                </div>
                <div className="progress-stack">
                  <ProgressBar value={64} label="Sprint progress" />
                  <ProgressBar value={100} label="Showcase ready" tone="mint" />
                </div>
              </article>

              <article className="panel">
                <div className="panel__head">
                  <h3>Fields & validation</h3>
                  <span className="panel__code">CORE / 03</span>
                </div>
                <form className="preview-form" onSubmit={handleTitleSubmit} noValidate>
                  <TextField
                    id="preview-project-title"
                    label="Project title"
                    hint="3–120 characters. This preview validates locally and sends nothing."
                    error={titleError}
                    inputRef={titleInputRef}
                    value={projectTitle}
                    onChange={(event) => {
                      setProjectTitle(event.target.value);
                      setTitleError('');
                      setTitleSuccess(false);
                    }}
                    placeholder="e.g. CampusLoop"
                    autoComplete="off"
                    required
                  />
                  <div className="preview-form__actions">
                    <Button type="submit" size="sm">
                      Check title
                    </Button>
                    <span className="preview-form__note">NO BACKEND</span>
                  </div>
                  {titleSuccess && (
                    <Alert tone="success" title="Field looks good.">
                      Validated in the browser only — no project was saved.
                    </Alert>
                  )}
                </form>
                <TextField
                  id="preview-email-example"
                  label="Email — error example"
                  hint="A static example of the field error state."
                  error="Enter a valid email address."
                  type="email"
                  defaultValue="mira@"
                  readOnly
                />
              </article>

              <article className="panel">
                <div className="panel__head">
                  <h3>Feedback</h3>
                  <span className="panel__code">CORE / 04</span>
                </div>
                <div className="alert-stack">
                  <Alert tone="success" title="Application sent.">
                    The owner’s decision will appear in My applications.
                  </Alert>
                  <Alert tone="error" title="We couldn’t load projects.">
                    Check your connection and try again. Your filters are still here.
                  </Alert>
                  <Alert tone="warning" title="Admin view">
                    Moderation controls are read-only in this context.
                  </Alert>
                </div>
                <div className="button-row dialog-demo">
                  <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)}>
                    Open confirmation dialog
                  </Button>
                </div>
              </article>
            </div>

            <div className="state-grid">
              <article className="state-card">
                <p className="state-card__label">Loading</p>
                <div className="state-card__body state-card__body--loading" aria-busy="true">
                  <span className="visually-hidden">Loading a sample project card</span>
                  <Skeleton className="skeleton--cover" />
                  <Skeleton className="skeleton--line skeleton--line-lg" />
                  <Skeleton className="skeleton--line" />
                  <Skeleton className="skeleton--line skeleton--line-sm" />
                </div>
              </article>

              <article className="state-card">
                <p className="state-card__label">Empty</p>
                <div className="state-card__body">
                  <EmptyState
                    title="No projects match those filters."
                    description="Try a broader skill or reset the filters."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreviewAction('Filter reset')}
                      >
                        Reset filters
                      </Button>
                    }
                  />
                </div>
              </article>

              <article className="state-card">
                <p className="state-card__label">Success</p>
                <div className="state-card__body state-card__body--alert">
                  <Alert tone="success" title="Application sent.">
                    The owner’s decision will appear in My applications.
                  </Alert>
                </div>
              </article>

              <article className="state-card">
                <p className="state-card__label">Error</p>
                <div className="state-card__body state-card__body--alert">
                  <Alert tone="error" title="Something broke on our side.">
                    Try again. If it keeps happening, contact the FLEXI team.
                  </Alert>
                </div>
              </article>
            </div>
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
              <Button href="#projects" variant="inverse" icon="arrowRight">
                Explore projects
              </Button>
              <Button
                variant="ghost-inverse"
                icon="plus"
                onClick={() => handlePreviewAction('Project creation')}
              >
                Start a project
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <Logo />
            <p>A student project collaboration studio for ideas, teams, and work worth showing.</p>
            <span className="site-footer__phase">PHASE 1 / DESIGN FOUNDATION</span>
          </div>
          <nav className="site-footer__nav" aria-label="Footer">
            <a href="#projects">Projects</a>
            <a href="#workspace">Workspace</a>
            <a href="#foundation">Foundation</a>
            <a href="#top">Back to top</a>
          </nav>
          <div className="site-footer__note">
            <p>Design-preview content only. No live records or accounts.</p>
            <p>© 2026 FLEXI. Built for student teams.</p>
          </div>
        </div>
      </footer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Accept this application?"
        description="A static example of a consequential confirmation."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button icon="check" onClick={handleDialogAccept}>
              Accept preview
            </Button>
          </>
        }
      >
        <p>
          <strong>Dev Patel</strong> wants to join <strong>CampusLoop</strong> as a frontend
          developer.
        </p>
        <p>Accepting would fill 3 of 5 spots. This preview does not change any project.</p>
      </Dialog>

      {toast && (
        <div className="toast-viewport">
          <Toast
            key={toast.id}
            message={toast.message}
            tone={toast.tone}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </>
  );
}

export default App;
