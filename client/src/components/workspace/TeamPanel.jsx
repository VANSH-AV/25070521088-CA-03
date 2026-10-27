import { Link } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { Avatar, SectionLabel, SkillTag } from '../ui.jsx';

export function TeamPanel({ team }) {
  return (
    <section className="workspace-panel" aria-labelledby="team-roster-title">
      <div className="workspace-panel__head">
        <div>
          <SectionLabel>Team roster</SectionLabel>
          <h2 id="team-roster-title">Who is building this.</h2>
          <p>Member removal is not part of this release.</p>
        </div>
      </div>

      <div className="workspace-team-grid">
        {team.map((person) => (
          <article className="workspace-team-card" key={person.id}>
            <Avatar name={person.name} src={person.avatarUrl} size={48} decorative />
            <div className="workspace-team-card__body">
              <div className="workspace-team-card__top">
                <h3>
                  <Link to={`/students/${person.id}`}>{person.name}</Link>
                </h3>
                <span>{person.role === 'owner' ? 'Owner' : 'Member'}</span>
              </div>
              <p>
                {[person.course, person.college].filter(Boolean).join(' · ') ||
                  'FLEXI student'}
              </p>
              {person.skills?.length > 0 && (
                <div className="workspace-team-card__skills">
                  {person.skills.slice(0, 5).map((skill) => (
                    <SkillTag key={skill}>{skill}</SkillTag>
                  ))}
                </div>
              )}
              <Link className="workspace-team-card__link" to={`/students/${person.id}`}>
                View profile
                <Icon name="arrowUpRight" size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
