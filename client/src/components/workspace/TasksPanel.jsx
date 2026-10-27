import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import {
  createTask,
  deleteTask,
  listMilestones,
  listTasks,
  updateTask,
} from '../../api/workspace.js';
import { useAuth } from '../../auth/context.js';
import { Icon } from '../icons.jsx';
import {
  Alert,
  Avatar,
  Button,
  Dialog,
  EmptyState,
  SectionLabel,
  SelectField,
  Skeleton,
  StatusBadge,
  TextAreaField,
  TextField,
} from '../ui.jsx';
import {
  formatDate,
  taskPriorityLabels,
  taskStatusLabels,
} from '../../utils/format.js';

const taskColumns = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

const priorityOptions = Object.entries(taskPriorityLabels).map(([value, label]) => ({
  value,
  label,
}));
const statusOptions = Object.entries(taskStatusLabels).map(([value, label]) => ({
  value,
  label,
}));

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : '';
}

function blankTask() {
  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: '',
    milestoneId: '',
    dueDate: '',
    order: 0,
  };
}

function taskForm(task) {
  return {
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo?.id || '',
    milestoneId: task.milestoneId || '',
    dueDate: toDateInput(task.dueDate),
    order: task.order || 0,
  };
}

export function TasksPanel({ projectId, workspace, onChanged }) {
  const { user } = useAuth();
  const { permissions, team } = workspace;
  const [filters, setFilters] = useState({ status: '', assignee: '', milestone: '' });
  const [state, setState] = useState({ status: 'loading', tasks: [], error: '' });
  const [milestones, setMilestones] = useState([]);
  const [retryKey, setRetryKey] = useState(0);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(blankTask);
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    listTasks(
      projectId,
      {
        limit: 100,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.assignee ? { assignee: filters.assignee } : {}),
        ...(filters.milestone ? { milestone: filters.milestone } : {}),
      },
      { signal: controller.signal },
    )
      .then(({ tasks }) => {
        setState({ status: 'ready', tasks, error: '' });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setState((current) => ({ ...current, status: 'error', error: error.message }));
        }
      });

    return () => controller.abort();
  }, [projectId, filters, retryKey]);

  useEffect(() => {
    const controller = new AbortController();

    listMilestones(projectId, { limit: 50 }, { signal: controller.signal })
      .then(({ milestones: records }) => setMilestones(records))
      .catch(() => {});

    return () => controller.abort();
  }, [projectId]);

  const reload = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const openCreate = () => {
    setEditor({ mode: 'create' });
    setForm(blankTask());
    setFields({});
    setFormError('');
  };

  const openEdit = (task) => {
    setEditor({ mode: 'edit', task });
    setForm(taskForm(task));
    setFields({});
    setFormError('');
  };

  const closeEditor = () => {
    if (!submitting) {
      setEditor(null);
      setActionError('');
    }
  };

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...(permissions.isOwner
      ? team.map((person) => ({ value: person.id, label: person.name }))
      : [{ value: user.id, label: `${user.name} (you)` }]),
  ];

  const milestoneOptions = [
    { value: '', label: 'No milestone' },
    ...milestones.map((milestone) => ({
      value: milestone.id,
      label: milestone.title,
    })),
  ];

  const submitTask = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFields({});
    setFormError('');

    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      assignedTo: form.assignedTo || null,
      milestoneId: form.milestoneId || null,
      dueDate: form.dueDate || null,
      order: Number(form.order) || 0,
    };

    if (editor.mode === 'edit') {
      payload.status = form.status;
    }

    const request =
      editor.mode === 'create'
        ? createTask(projectId, payload)
        : updateTask(editor.task.id, payload);

    request
      .then((task) => {
        setSubmitting(false);
        setEditor(null);
        setNotice(
          editor.mode === 'create'
            ? `Task “${task.title}” created.`
            : `Task “${task.title}” updated.`,
        );
        reload();
        onChanged();
      })
      .catch((error) => {
        setSubmitting(false);

        if (error instanceof ApiError) {
          setFields(error.fields || {});
        }

        setFormError(error.message);
      });
  };

  const changeStatus = (task, status) => {
    setActionError('');

    updateTask(task.id, { status })
      .then(() => {
        setNotice(status === 'done' ? 'Task marked done.' : 'Task reopened.');
        reload();
        onChanged();
      })
      .catch((error) => setActionError(error.message));
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setActionError('');

    deleteTask(deleteTarget.id)
      .then(() => {
        setDeleting(false);
        setDeleteTarget(null);
        setNotice('Task deleted.');
        reload();
        onChanged();
      })
      .catch((error) => {
        setDeleting(false);
        setActionError(error.message);
      });
  };

  return (
    <section className="workspace-panel workspace-tasks" aria-labelledby="tasks-title">
      <div className="workspace-panel__head">
        <div>
          <SectionLabel>Task board</SectionLabel>
          <h2 id="tasks-title">What the team is moving.</h2>
          <p>Members can update tasks they own or created. The owner can manage every task.</p>
        </div>
        {permissions.canCreateTasks && (
          <Button size="sm" onClick={openCreate}>
            New task
            <Icon name="plus" size={16} />
          </Button>
        )}
      </div>

      {notice && (
        <Alert tone="success" title="Task updated">
          {notice}
        </Alert>
      )}

      {actionError && (
        <Alert tone="error" title="That action did not complete.">
          {actionError}
        </Alert>
      )}

      <div className="workspace-filters">
        <SelectField
          id="task-status-filter"
          label="Status"
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({ ...current, status: event.target.value }))
          }
          options={[{ value: '', label: 'Every status' }, ...statusOptions]}
        />
        <SelectField
          id="task-assignee-filter"
          label="Assignee"
          value={filters.assignee}
          onChange={(event) =>
            setFilters((current) => ({ ...current, assignee: event.target.value }))
          }
          options={[
            { value: '', label: 'Everyone' },
            { value: 'me', label: 'Assigned to me' },
            ...team.map((person) => ({ value: person.id, label: person.name })),
          ]}
        />
        <SelectField
          id="task-milestone-filter"
          label="Milestone"
          value={filters.milestone}
          onChange={(event) =>
            setFilters((current) => ({ ...current, milestone: event.target.value }))
          }
          options={[
            { value: '', label: 'Every milestone' },
            ...milestones.map((milestone) => ({
              value: milestone.id,
              label: milestone.title,
            })),
          ]}
        />
      </div>

      {state.status === 'loading' && (
        <div className="workspace-task-board" aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Loading tasks</span>
          {taskColumns.map((column) => (
            <div className="workspace-task-column" key={column.id}>
              <Skeleton className="skeleton--row" />
              <Skeleton className="skeleton--row" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <Alert tone="error" title="Tasks could not load.">
          {state.error}{' '}
          <button type="button" className="inline-link" onClick={reload}>
            Try again
          </button>
        </Alert>
      )}

      {state.status === 'ready' && state.tasks.length > 0 && (
        <div className="workspace-task-board">
          {taskColumns.map((column) => {
            const columnTasks = state.tasks.filter((task) => task.status === column.id);

            return (
              <div className="workspace-task-column" key={column.id}>
                <div className="workspace-task-column__head">
                  <h3>{column.label}</h3>
                  <span>{columnTasks.length}</span>
                </div>
                {columnTasks.length === 0 && (
                  <p className="workspace-task-column__empty">No tasks in this column.</p>
                )}
                {columnTasks.map((task) => (
                  <article className="workspace-task-card" key={task.id}>
                    <div className="workspace-task-card__top">
                      <StatusBadge
                        status={task.priority}
                        label={taskPriorityLabels[task.priority]}
                      />
                      {task.isOverdue && <span className="workspace-overdue">Overdue</span>}
                    </div>
                    <h4>{task.title}</h4>
                    {task.description && <p>{task.description}</p>}
                    <div className="workspace-task-card__meta">
                      {task.assignedTo ? (
                        <span>
                          <Avatar
                            name={task.assignedTo.name}
                            src={task.assignedTo.avatarUrl}
                            size={24}
                            decorative
                          />
                          {task.assignedTo.name}
                        </span>
                      ) : (
                        <span>Unassigned</span>
                      )}
                      {task.dueDate && (
                        <span>
                          <Icon name="calendar" size={14} />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {(task.permissions.canEdit || task.permissions.canDelete) && (
                      <div className="workspace-task-card__actions">
                        {task.permissions.canEdit && (
                          <>
                            <button
                              type="button"
                              className="inline-link"
                              onClick={() => openEdit(task)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="inline-link"
                              onClick={() =>
                                changeStatus(task, task.status === 'done' ? 'todo' : 'done')
                              }
                            >
                              {task.status === 'done' ? 'Reopen' : 'Mark done'}
                            </button>
                          </>
                        )}
                        {task.permissions.canDelete && (
                          <button
                            type="button"
                            className="inline-link inline-link--danger"
                            onClick={() => {
                              setActionError('');
                              setDeleteTarget(task);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {state.status === 'ready' && state.tasks.length === 0 && (
        <EmptyState
          icon="checkCircle"
          title="No tasks match this view."
          description="Change the filters or add the first task for this milestone."
          action={
            permissions.canCreateTasks ? (
              <Button size="sm" onClick={openCreate}>
                Add a task
              </Button>
            ) : null
          }
        />
      )}

      <Dialog
        open={Boolean(editor)}
        onClose={closeEditor}
        title={editor?.mode === 'create' ? 'Add a task' : 'Edit task'}
        description="Tasks are visible only to this project’s owner and members."
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="task-form" loading={submitting}>
              {editor?.mode === 'create' ? 'Create task' : 'Save task'}
            </Button>
          </>
        }
      >
        {formError && (
          <Alert tone="error" title="The task was not saved.">
            {formError}
          </Alert>
        )}
        <form id="task-form" className="form-stack" onSubmit={submitTask}>
          <TextField
            id="task-title"
            label="Task title"
            value={form.title}
            error={fields.title}
            maxLength={140}
            required
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />
          <TextAreaField
            id="task-description"
            label="Description"
            value={form.description}
            error={fields.description}
            rows={4}
            maxLength={2000}
            optional
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <div className="form-grid form-grid--two">
            <SelectField
              id="task-priority"
              label="Priority"
              value={form.priority}
              error={fields.priority}
              options={priorityOptions}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value }))
              }
            />
            {editor?.mode === 'edit' && (
              <SelectField
                id="task-status"
                label="Status"
                value={form.status}
                error={fields.status}
                options={statusOptions}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              />
            )}
            <SelectField
              id="task-assignee"
              label="Assignee"
              value={form.assignedTo}
              error={fields.assignedTo}
              options={assigneeOptions}
              onChange={(event) =>
                setForm((current) => ({ ...current, assignedTo: event.target.value }))
              }
            />
            <SelectField
              id="task-milestone"
              label="Milestone"
              value={form.milestoneId}
              error={fields.milestoneId}
              options={milestoneOptions}
              onChange={(event) =>
                setForm((current) => ({ ...current, milestoneId: event.target.value }))
              }
            />
            <TextField
              id="task-due-date"
              label="Due date"
              type="date"
              value={form.dueDate}
              error={fields.dueDate}
              optional
              onChange={(event) =>
                setForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
            <TextField
              id="task-order"
              label="Order"
              type="number"
              min="0"
              max="10000"
              value={form.order}
              error={fields.order}
              optional
              onChange={(event) =>
                setForm((current) => ({ ...current, order: event.target.value }))
              }
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        title="Delete this task?"
        description="This removes the task from the workspace and milestone progress."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Keep task
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete task
            </Button>
          </>
        }
      >
        {actionError && (
          <Alert tone="error" title="The task was not deleted.">
            {actionError}
          </Alert>
        )}
        <p>
          <strong>{deleteTarget?.title}</strong> will be permanently removed.
        </p>
      </Dialog>
    </section>
  );
}
