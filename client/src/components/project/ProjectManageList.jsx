import { Link } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { StatusBadge } from '../ui.jsx';
import {
  categoryLabels,
  formatDate,
  projectInitials,
} from '../../utils/format.js';

export function ProjectManageList({ projects }) {
  return (
    <div className="manage-projects">
      {projects.map((project) => (
        <article className="manage-project" key={project.id}>
          <div className="manage-project__mark" aria-hidden="true">
            {projectInitials(project.title)}
          </div>
          <div className="manage-project__main">
            <div className="manage-project__badges">
              <StatusBadge status={project.status} />
              <span className="role-chip">{project.role === 'owner' ? 'Owner' : 'Member'}</span>
            </div>
            <h3>
              <Link to={`/projects/${project.id}`}>{project.title}</Link>
            </h3>
            <p>{project.summary}</p>
            <div className="manage-project__meta">
              <span>{categoryLabels[project.category]}</span>
              <span>
                <Icon name="users" size={15} />
                {project.memberCount} / {project.teamSize}
              </span>
              <span>
                <Icon name="calendar" size={15} />
                {formatDate(project.deadline)}
              </span>
            </div>
          </div>
          <div className="manage-project__actions">
            <Link className="button button--secondary button--sm" to={`/projects/${project.id}`}>
              Open
              <Icon name="arrowUpRight" size={16} />
            </Link>
            {project.role === 'owner' && project.status !== 'archived' && (
              <Link
                className="button button--primary button--sm"
                to={`/projects/${project.id}/edit`}
              >
                Edit
                <Icon name="edit" size={16} />
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
