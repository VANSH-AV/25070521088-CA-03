import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMilestones, listTasks } from '../../api/workspace.js';
import { Icon } from '../icons.jsx';
import {
  Alert,
  Avatar,
  EmptyState,
  ProgressBar,
  SectionLabel,
  Skeleton,
  StatusBadge,
} from '../ui.jsx';
import {
  formatDate,
  milestoneStatusLabels,
  taskPriorityLabels,
  taskStatusLabels,
} from '../../utils/format.js';

export function WorkspaceOverview({ workspace, onSelectTab }) {
  const { project, counts, progress, permissions } = workspace;
  const [state, setState] = useState({ status: 'loading', tasks: [], milestones: [], error: '' });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([listTasks(project.id, { limit: 100 }), listMilestones(project.id, { limit: 50 })])
      .then(([taskResult, milestoneResult]) => {
        if (active) {
          setState({
            status: 'ready',
            tasks: taskResult.tasks,
            milestones: milestoneResult.milestones,
            error: '',
          });
        }
      })
      .catch((error) => {
        if (active) {
          setState((current) => ({ ...current, status: 'error', error: error.message }));
        }
      });

    return () => {
      active = false;
    };
  }, [project.id, retryKey]);

  const nextMilestone = state.milestones
    .filter((milestone) => milestone.status !== 'completed')
    .sort((first, second) => first.order - second.order)[0];
  const hasMilestones = state.milestones.length > 0;
  const recentTasks = state.tasks
    .slice()
    .sort((first, second) => {
      if (first.status === 'done' && second.status !== 'done') {
        return 1;
      }

      if (first.status !== 'done' && second.status === 'done') {
        return -1;
      }

      return first.order - second.order;
    })
    .slice(0, 5);

  const openApplicationTab = () => onSelectTab('applications');

  return (
    <div className="workspace-overview">
      <div className="workspace-stat-grid">
        <article className="workspace-stat">
          <span>Tasks done</span>
          <strong>
            {counts.doneTasks}
            <small> / {counts.tasks}</small>
          </strong>
          <ProgressBar value={progress.percent} label="Overall progress" size="sm" />
        </article>
        <article className="workspace-stat">
          <span>Milestones</span>
          <strong>
            {counts.completedMilestones}
            <small> / {counts.milestones}</small>
          </strong>
          <p>
            {nextMilestone
              ? `Next: ${nextMilestone.title}`
              : hasMilestones
                ? 'All milestones complete.'
                : 'No milestones yet.'}
          </p>
        </article>
        <article className="workspace-stat">
          <span>Team</span>
          <strong>{counts.members}</strong>
          <p>
            {project.openSlots
              ? `${project.openSlots} open ${project.openSlots === 1 ? 'spot' : 'spots'}`
              : 'Team set'}
          </p>
        </article>
        <article className="workspace-stat workspace-stat--accent">
          <span>Pending applications</span>
          <strong>{counts.pendingApplications}</strong>
          {permissions.canReviewApplications ? (
            <button type="button" className="inline-link" onClick={openApplicationTab}>
              Review queue
              <Icon name="arrowRight" size={15} />
            </button>
          ) : (
            <p>Owner review queue</p>
          )}
        </article>
      </div>

      {state.status === 'error' && (
        <Alert tone="error" title="Overview details could not load.">
          {state.error}{' '}
          <button
            type="button"
            className="inline-link"
            onClick={() => {
              setState((current) => ({ ...current, status: 'loading', error: '' }));
              setRetryKey((value) => value + 1);
            }}
          >
            Try again
          </button>
        </Alert>
      )}

      <div className="workspace-overview__columns">
        <section className="workspace-panel" aria-labelledby="workspace-next">
          <div className="workspace-panel__head">
            <div>
              <SectionLabel>Next checkpoint</SectionLabel>
              <h2 id="workspace-next">Milestones</h2>
            </div>
            <button
              type="button"
              className="inline-link"
              onClick={() => onSelectTab('milestones')}
            >
              All milestones
              <Icon name="arrowRight" size={15} />
            </button>
          </div>

          {state.status === 'loading' && <Skeleton className="skeleton--block" />}

          {state.status === 'ready' && nextMilestone && (
            <article className="workspace-next-milestone">
              <div className="workspace-next-milestone__top">
                <StatusBadge
                  status={nextMilestone.status}
                  label={milestoneStatusLabels[nextMilestone.status]}
                />
                <span>{formatDate(nextMilestone.dueDate)}</span>
              </div>
              <h3>{nextMilestone.title}</h3>
              {nextMilestone.description && <p>{nextMilestone.description}</p>}
              <ProgressBar
                value={nextMilestone.progress}
                label={`${nextMilestone.doneTaskCount} of ${nextMilestone.taskCount} linked tasks done`}
                size="sm"
              />
            </article>
          )}

          {state.status === 'ready' && !nextMilestone && (
            <EmptyState
              icon={hasMilestones ? 'checkCircle' : 'target'}
              title={hasMilestones ? 'Every milestone is complete.' : 'No milestones yet.'}
              description={
                hasMilestones
                  ? 'Open the timeline to review completed work or add the next checkpoint.'
                  : permissions.canManageMilestones
                    ? 'Add a dated checkpoint so the team can see what comes next.'
                    : 'The owner has not added a milestone yet.'
              }
              action={
                permissions.canManageMilestones ? (
                  <button
                    type="button"
                    className="button button--primary button--sm"
                    onClick={() => onSelectTab('milestones')}
                  >
                    {hasMilestones ? 'Open timeline' : 'Add milestone'}
                  </button>
                ) : null
              }
            />
          )}
        </section>

        <section className="workspace-panel" aria-labelledby="workspace-recent">
          <div className="workspace-panel__head">
            <div>
              <SectionLabel>Current work</SectionLabel>
              <h2 id="workspace-recent">Recent tasks</h2>
            </div>
            <button type="button" className="inline-link" onClick={() => onSelectTab('tasks')}>
              Open board
              <Icon name="arrowRight" size={15} />
            </button>
          </div>

          {state.status === 'loading' && (
            <div className="workspace-task-list">
              {[0, 1, 2].map((item) => (
                <Skeleton className="skeleton--row" key={item} />
              ))}
            </div>
          )}

          {state.status === 'ready' && recentTasks.length === 0 && (
            <EmptyState
              icon="checkCircle"
              title="No tasks yet."
              description={
                permissions.canCreateTasks
                  ? 'Break the next milestone into a few concrete tasks.'
                  : 'The team has not added tasks yet.'
              }
              action={
                permissions.canCreateTasks ? (
                  <button
                    type="button"
                    className="button button--primary button--sm"
                    onClick={() => onSelectTab('tasks')}
                  >
                    Add a task
                  </button>
                ) : null
              }
            />
          )}

          {state.status === 'ready' && recentTasks.length > 0 && (
            <div className="workspace-task-list">
              {recentTasks.map((task) => (
                <article className="workspace-task-line" key={task.id}>
                  <StatusBadge
                    status={task.status}
                    label={taskStatusLabels[task.status]}
                  />
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      {taskPriorityLabels[task.priority]} priority
                      {task.dueDate ? ` · Due ${formatDate(task.dueDate)}` : ''}
                    </span>
                  </div>
                  {task.assignedTo ? (
                    <Avatar
                      name={task.assignedTo.name}
                      src={task.assignedTo.avatarUrl}
                      size={30}
                      decorative
                    />
                  ) : (
                    <span className="workspace-task-line__unassigned">Unassigned</span>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {permissions.canReviewApplications && counts.pendingApplications > 0 && (
        <div className="workspace-cta">
          <div>
            <SectionLabel>Applications</SectionLabel>
            <h2>
              {counts.pendingApplications}{' '}
              {counts.pendingApplications === 1 ? 'person is' : 'people are'} waiting for a
              decision.
            </h2>
          </div>
          <button type="button" className="button button--primary button--md" onClick={openApplicationTab}>
            Review applications
            <Icon name="arrowRight" size={17} />
          </button>
        </div>
      )}

      <Link className="workspace-edit-link" to={`/projects/${project.id}`}>
        View the public project page
        <Icon name="arrowUpRight" size={15} />
      </Link>
    </div>
  );
}
