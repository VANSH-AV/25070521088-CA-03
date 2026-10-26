import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { Icon } from '../components/icons.jsx';
import { SectionLabel } from '../components/ui.jsx';
import { usePageTitle } from '../utils/usePageTitle.js';

const principles = [
  {
    icon: 'target',
    title: 'The brief comes first',
    text: 'A project should explain the problem, the skills it needs, and the team size before asking anyone to join.',
  },
  {
    icon: 'users',
    title: 'People are not résumés',
    text: 'Profiles show skills and context without exposing private account details or turning campus into a leaderboard.',
  },
  {
    icon: 'layers',
    title: 'One source of truth',
    text: 'Discovery, ownership, and project status live in one record so the public page stays honest.',
  },
  {
    icon: 'checkCircle',
    title: 'State is visible',
    text: 'Recruiting, in progress, completed, and archived mean something. Visitors can tell what is current.',
  },
];

export function AboutPage() {
  usePageTitle('About');

  return (
    <PublicLayout>
      <section className="page-hero page-hero--about" aria-labelledby="about-title">
        <div className="container page-hero__inner">
          <div>
            <SectionLabel>
              <span className="eyebrow__index">02</span>
              About FLEXI
            </SectionLabel>
            <h1 id="about-title">Built for the messy middle of student projects.</h1>
          </div>
          <p className="page-hero__lede">
            FLEXI is a student project collaboration studio. It gives an idea a clear public
            brief, gives people a useful profile, and gives unfinished work somewhere better to
            live than a disappearing group chat.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="problem-title">
        <div className="container about-split">
          <div>
            <SectionLabel>Why it exists</SectionLabel>
            <h2 id="problem-title">Good ideas should not depend on who is already in the room.</h2>
          </div>
          <div className="about-copy">
            <p>
              Students often have a project idea but no reliable way to find a designer, a
              backend partner, or someone who has done the research before. The idea stalls, or
              the team forms by convenience rather than fit.
            </p>
            <p>
              FLEXI makes the brief legible. Visitors can browse real projects, understand the
              skills a team needs, and see who is behind the work. Signed-in students can keep
              their profile current and manage the projects they own.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--bone" aria-labelledby="principles-title">
        <div className="container">
          <div className="section-head">
            <div>
              <SectionLabel>Working principles</SectionLabel>
              <h2 id="principles-title">Useful before impressive.</h2>
            </div>
            <p className="section-head__copy">
              The product should feel calm, direct, and honest about what it knows.
            </p>
          </div>
          <div className="principle-grid">
            {principles.map((principle) => (
              <article className="principle-card" key={principle.title}>
                <span className="principle-card__icon">
                  <Icon name={principle.icon} size={20} />
                </span>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="what-title">
        <div className="container about-lists">
          <article>
            <SectionLabel>What FLEXI is</SectionLabel>
            <h2 id="what-title">A clear starting point.</h2>
            <ul className="check-list">
              <li>A public discovery board for student project briefs.</li>
              <li>A profile that shows skills, interests, and public work.</li>
              <li>A project record owned and maintained by its creator.</li>
              <li>A warm, accessible place to see what is happening on campus.</li>
            </ul>
          </article>
          <article>
            <SectionLabel>What it is not</SectionLabel>
            <h2>A replacement for the work.</h2>
            <ul className="cross-list">
              <li>Not a popularity contest or follower graph.</li>
              <li>Not a place that exposes private account details.</li>
              <li>Not a promise of automatic matching or guaranteed teammates.</li>
              <li>Not a finished-project archive that rewrites history.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="cta" aria-labelledby="about-cta-title">
        <div className="container cta__inner">
          <div>
            <SectionLabel className="eyebrow--light">Start here</SectionLabel>
            <h2 id="about-cta-title">See what students are building.</h2>
            <p className="cta__lede">
              Browse the public board, or create a profile and put your own brief into the studio.
            </p>
          </div>
          <div className="cta__actions">
            <Link className="button button--inverse" to="/projects">
              Explore projects
              <Icon name="arrowRight" size={18} />
            </Link>
            <Link className="button button--ghost-inverse" to="/register">
              Create an account
              <Icon name="arrowUpRight" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
