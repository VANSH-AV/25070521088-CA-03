import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import {
  createMilestone,
  deleteMilestone,
  listMilestones,
  updateMilestone,
} from '../../api/workspace.js';
import { Icon } from '../icons.jsx';
import {
  Alert,
  Button,
  Dialog,
  EmptyState,
  ProgressBar,
  SectionLabel,
  SelectField,
  Skeleton,
  StatusBadge,
  TextAreaField,
  TextField,
} from '../ui.jsx';
import { formatDate, milestoneStatusLabels } from '../../utils/format.js';

const statusOptions = Object.entries(milestoneStatusLabels).map(([value, label]) => ({
  value,
  label,
}));

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : '';
}

function blankMilestone() {
  return {
    title: '',
    description: '',
    dueDate: '',
    status: 'planned',
    order: 0,
  };
}

function milestoneForm(milestone) {
  return {
    title: milestone.title,
    description: milestone.description || '',
    dueDate: toDateInput(milestone.dueDate),
    status: milestone.status,
    order: milestone.order || 0,
  };
}

export function MilestonesPanel({ projectId, workspace, onChanged }) {
  const { permissions } = workspace;
  const [state, setState] = useState({ status: 'loading', milestones: [], error: '' });
  const [retryKey, setRetryKey] = useState(0);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(blankMilestone);
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    listMilestones(projectId, { limit: 50 }, { signal: controller.signal })
      .then(({ milestones }) => {
        setState({ status: 'ready', milestones, error: '' });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setState((current) => ({ ...current, status: 'error', error: error.message }));
        }
      });

    return () => controller.abort();
  }, [projectId, retryKey]);

  const reload = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const openCreate = () => {
    setEditor({ mode: 'create' });
    setForm(blankMilestone());
    setFields({});
    setFormError('');
  };

  const openEdit = (milestone) => {
    setEditor({ mode: 'edit', milestone });
    setForm(milestoneForm(milestone));
    setFields({});
    setFormError('');
  };

  const closeEditor = () => {
    if (!submitting) {
      setEditor(null);
    }
  };

  const submitMilestone = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFields({});
    setFormError('');

    const payload = {
      title: form.title,
      description: form.description,
      dueDate: form.dueDate || null,
      status: form.status,
      order: Number(form.order) || 0,
    };
    const request =
      editor.mode === 'create'
        ? createMilestone(projectId, payload)
        : updateMilestone(editor.milestone.id, payload);

    request
      .then((milestone) => {
        setSubmitting(false);
        setEditor(null);
        setNotice(
          editor.mode === 'create'
            ? `Milestone “${milestone.title}” created.`
            : `Milestone “${milestone.title}” updated.`,
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

  const finishMilestone = () => {
    if (!completing) {
      return;
    }

    setWorking(true);
    setActionError('');

    updateMilestone(completing.id, { status: 'completed' })
      .then(() => {
        setWorking(false);
        setCompleting(null);
        setNotice('Milestone marked complete.');
        reload();
        onChanged();
      })
      .catch((error) => {
        setWorking(false);
        setActionError(error.message);
      });
  };

  const reopenMilestone = (milestone) => {
    setActionError('');

    updateMilestone(milestone.id, { status: 'active' })
      .then(() => {
        setNotice('Milestone reopened.');
        reload();
        onChanged();
      })
      .catch((error) => setActionError(error.message));
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setWorking(true);
    setActionError('');

    deleteMilestone(deleteTarget.id)
      .then(() => {
        setWorking(false);
        setDeleteTarget(null);
        setNotice('Milestone deleted.');
        reload();
        onChanged();
      })
      .catch((error) => {
        setWorking(false);
        setActionError(error.message);
      });
  };

  return (
    <section className="workspace-panel workspace-milestones" aria-labelledby="milestones-title">
      <div className="workspace-panel__head">
        <div>
          <SectionLabel>Timeline</SectionLabel>
          <h2 id="milestones-title">Dated checkpoints.</h2>
          <p>Only the project owner can add, edit, complete, or delete milestones.</p>
        </div>
        {permissions.canManageMilestones && (
          <Button size="sm" onClick={openCreate}>
            New milestone
            <Icon name="plus" size={16} />
          </Button>
        )}
      </div>

      {notice && (
        <Alert tone="success" title="Milestone updated">
          {notice}
        </Alert>
      )}

      {actionError && !completing && !deleteTarget && (
        <Alert tone="error" title="That action did not complete.">
          {actionError}
        </Alert>
      )}

      {state.status === 'loading' && (
        <div className="workspace-timeline" aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Loading milestones</span>
          {[0, 1, 2].map((item) => (
            <Skeleton className="skeleton--row" key={item} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <Alert tone="error" title="Milestones could not load.">
          {state.error}{' '}
          <button type="button" className="inline-link" onClick={reload}>
            Try again
          </button>
        </Alert>
      )}

      {state.status === 'ready' && state.milestones.length === 0 && (
        <EmptyState
          icon="target"
          title="No milestones yet."
          description={
            permissions.canManageMilestones
              ? 'Create a checkpoint with a date, then link tasks to it.'
              : 'The owner has not created a milestone yet.'
          }
          action={
            permissions.canManageMilestones ? (
              <Button size="sm" onClick={openCreate}>
                Create milestone
              </Button>
            ) : null
          }
        />
      )}

      {state.status === 'ready' && state.milestones.length > 0 && (
        <div className="workspace-timeline">
          {state.milestones.map((milestone) => (
            <article className="workspace-milestone" key={milestone.id}>
              <div className="workspace-milestone__marker" aria-hidden="true">
                <Icon
                  name={milestone.status === 'completed' ? 'check' : 'target'}
                  size={17}
                />
              </div>
              <div className="workspace-milestone__body">
                <div className="workspace-milestone__top">
                  <StatusBadge
                    status={milestone.status}
                    label={milestoneStatusLabels[milestone.status]}
                  />
                  <span>{milestone.dueDate ? formatDate(milestone.dueDate) : 'No due date'}</span>
                </div>
                <h3>{milestone.title}</h3>
                {milestone.description && <p>{milestone.description}</p>}
                <ProgressBar
                  value={milestone.progress}
                  label={`${milestone.doneTaskCount} of ${milestone.taskCount} tasks done`}
                  size="sm"
                />
                {milestone.completedAt && (
                  <p className="workspace-milestone__completed">
                    Completed {formatDate(milestone.completedAt)}
                  </p>
                )}
                {permissions.canManageMilestones && (
                  <div className="workspace-milestone__actions">
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => openEdit(milestone)}
                    >
                      Edit
                    </button>
                    {milestone.status === 'completed' ? (
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => reopenMilestone(milestone)}
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => {
                          setActionError('');
                          setCompleting(milestone);
                        }}
                      >
                        Mark complete
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-link inline-link--danger"
                      onClick={() => {
                        setActionError('');
                        setDeleteTarget(milestone);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(editor)}
        onClose={closeEditor}
        title={editor?.mode === 'create' ? 'Add a milestone' : 'Edit milestone'}
        description="Milestones are the shared checkpoints for this project."
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="milestone-form" loading={submitting}>
              {editor?.mode === 'create' ? 'Create milestone' : 'Save milestone'}
            </Button>
          </>
        }
      >
        {formError && (
          <Alert tone="error" title="The milestone was not saved.">
            {formError}
          </Alert>
        )}
        <form id="milestone-form" className="form-stack" onSubmit={submitMilestone}>
          <TextField
            id="milestone-title"
            label="Milestone title"
            value={form.title}
            error={fields.title}
            maxLength={120}
            required
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />
          <TextAreaField
            id="milestone-description"
            label="Description"
            value={form.description}
            error={fields.description}
            rows={4}
            maxLength={1000}
            optional
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <div className="form-grid form-grid--two">
            <SelectField
              id="milestone-status"
              label="Status"
              value={form.status}
              error={fields.status}
              options={
                editor?.mode === 'create'
                  ? statusOptions.filter((option) => option.value !== 'completed')
                  : statusOptions
              }
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
            />
            <TextField
              id="milestone-due-date"
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
              id="milestone-order"
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
          {form.status === 'completed' &&
            editor?.mode === 'edit' &&
            editor.milestone.taskCount > editor.milestone.doneTaskCount && (
              <Alert tone="warning" title="Open tasks remain">
                Completing this milestone will leave {editor.milestone.taskCount -
                  editor.milestone.doneTaskCount}{' '}
                linked tasks open. That is allowed, but confirm the checkpoint is complete.
              </Alert>
            )}
        </form>
      </Dialog>

      <Dialog
        open={Boolean(completing)}
        onClose={() => {
          if (!working) {
            setCompleting(null);
          }
        }}
        title="Mark this milestone complete?"
        description="Completion is visible to the whole team and stays in project history."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCompleting(null)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={finishMilestone} loading={working}>
              Mark complete
            </Button>
          </>
        }
      >
        {actionError && (
          <Alert tone="error" title="The milestone was not completed.">
            {actionError}
          </Alert>
        )}
        <p>
          <strong>{completing?.title}</strong> has {completing?.taskCount || 0} linked tasks and{' '}
          {completing?.doneTaskCount || 0} are done.
        </p>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!working) {
            setDeleteTarget(null);
          }
        }}
        title="Delete this milestone?"
        description="Milestones with linked tasks must be cleared first."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={working}>
              Keep milestone
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={working}>
              Delete milestone
            </Button>
          </>
        }
      >
        {actionError && (
          <Alert tone="error" title="The milestone was not deleted.">
            {actionError}
          </Alert>
        )}
        <p>
          <strong>{deleteTarget?.title}</strong> will be removed from the timeline.
        </p>
      </Dialog>
    </section>
  );
}
