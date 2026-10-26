import { Link } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import {
  Avatar,
  AvatarStack,
  ProgressBar,
  SkillTag,
  StatusBadge,
} from '../ui.jsx';
import {
  categoryLabels,
  categoryTones,
  formatShortDate,
  projectAvailabilityLabel,
  projectInitials,
} from '../../utils/format.js';

export function ProjectCard({ project, className = '' }) {
  const team = [
    ...(project.owner ? [project.owner] : []),
    ...(project.members || []),
  ];
  const filled = project.teamSize
    ? Math.round(((project.memberCount || team.length) / project.teamSize) * 100)
    : 0;
  const tone = categoryTones[project.category] || 'slate';
  const skills = project.requiredSkills || [];

  return (
    <article
      className={['project-card', className].filter(Boolean).join(' ')}
      aria-labelledby={`project-${project.id}-title`}
    >
      <div className={`project-card__cover project-card__cover--${tone}`}>
        <span className="project-card__code">
          {categoryLabels[project.category] || 'Project'} / TEAM OF {project.teamSize}
        </span>
        <span className="project-card__mark" aria-hidden="true">
          {projectInitials(project.title)}
        </span>
        <span className="project-card__cover-note">{projectAvailabilityLabel(project)}</span>
      </div>

      <div className="project-card__body">
        <div className="project-card__top">
          <StatusBadge status={project.status} />
          <Link
            className="project-card__arrow"
            to={`/projects/${project.id}`}
            aria-label={`View ${project.title}`}
          >
            <Icon name="arrowUpRight" size={17} />
          </Link>
        </div>

        <div>
          {project.owner && (
            <p className="project-card__meta">
              <Link to={`/students/${project.owner.id}`}>{project.owner.name}</Link>
              {project.owner.college && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{project.owner.college}</span>
                </>
              )}
            </p>
          )}
          <h3 className="project-card__title" id={`project-${project.id}-title`}>
            <Link to={`/projects/${project.id}`}>{project.title}</Link>
          </h3>
          <p className="project-card__summary">{project.summary}</p>
        </div>

        {skills.length > 0 && (
          <div className="project-card__skills">
            {skills.slice(0, 3).map((skill) => (
              <SkillTag key={skill}>{skill}</SkillTag>
            ))}
            {skills.length > 3 && <SkillTag>+{skills.length - 3}</SkillTag>}
          </div>
        )}

        <div className="project-card__team">
          {team.length > 0 ? (
            <AvatarStack people={team} max={3} size={28} label={`${project.title} team`} />
          ) : (
            <Avatar name={project.owner?.name || project.title} size={28} decorative />
          )}
          <span>{projectAvailabilityLabel(project)}</span>
        </div>

        <ProgressBar
          value={filled}
          label="Team filled"
          tone={project.status === 'completed' ? 'mint' : 'cobalt'}
        />

        <div className="project-card__footer">
          <span>
            <Icon name="calendar" size={15} />
            {formatShortDate(project.deadline)}
          </span>
          <span>
            <Icon name="users" size={15} />
            {project.teamSize} person team
          </span>
        </div>
      </div>
    </article>
  );
}
