import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { Icon } from '../components/icons.jsx';
import { SectionLabel } from '../components/ui.jsx';
import { usePageTitle } from '../utils/usePageTitle.js';

export function NotFoundPage() {
  usePageTitle('Page not found');

  return (
    <PublicLayout>
      <section className="not-found" aria-labelledby="not-found-title">
        <div className="container not-found__inner">
          <div className="not-found__code" aria-hidden="true">
            404
          </div>
          <div className="not-found__copy">
            <SectionLabel>Wrong turn</SectionLabel>
            <h1 id="not-found-title">This page is not in the brief.</h1>
            <p>
              The address may be mistyped, or the page may have moved. The public studio and
              discovery board are still here.
            </p>
            <div className="not-found__actions">
              <Link className="button button--primary button--md" to="/">
                Back home
                <Icon name="arrowLeft" size={17} />
              </Link>
              <Link className="button button--secondary button--md" to="/projects">
                Browse projects
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
