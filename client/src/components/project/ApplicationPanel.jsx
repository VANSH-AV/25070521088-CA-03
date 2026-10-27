import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { applyToProject, withdrawApplication } from '../../api/applications.js';
import { ApiError } from '../../api/client.js';
import { Icon } from '../icons.jsx';
import { Alert, Button, Dialog, StatusBadge, TextAreaField } from '../ui.jsx';
import { TagInput } from '../TagInput.jsx';
import {
  applicationStatusLabels,
  formatTimestamp,
  projectAvailabilityLabel,
} from '../../utils/format.js';

const emptyForm = { message: '', relevantSkills: [] };

export function ApplicationPanel({ project, viewer, user, isAuthenticated, onChanged }) {
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const returnTo = `${location.pathname}${location.search}`;
  const loginPath = `/login?${new URLSearchParams({ returnTo }).toString()}`;

  if (viewer.isOwner) {
    return null;
  }

  if (viewer.isMember) {
    return (
      <div className="project-action-card__guest">
        <p>You are on this team. Open the workspace to manage tasks and milestones.</p>
        <Link
          className="button button--primary button--md button--full"
          to={`/projects/${project.id}/workspace`}
        >
          Open workspace
          <Icon name="arrowRight" size={17} />
        </Link>
      </div>
    );
  }

  if (viewer.isAdmin) {
    return (
      <Alert tone="info" title="Moderation view">
        Admin accounts can inspect this project but cannot apply or manage the team.
      </Alert>
    );
  }

  const submitApplication = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFields({});
    setFormError('');

    applyToProject(project.id, form)
      .then(() => {
        setSubmitting(false);
        setDialogOpen(false);
        setForm(emptyForm);
        onChanged('Application sent. You can track its status here or on My applications.');
      })
      .catch((error) => {
        setSubmitting(false);

        if (error instanceof ApiError) {
          setFields(error.fields || {});
        }

        setFormError(error.message);
      });
  };

  const handleWithdraw = () => {
    setWithdrawing(true);
    setWithdrawError('');

    withdrawApplication(viewer.application.id)
      .then(() => {
        setWithdrawing(false);
        setWithdrawOpen(false);
        onChanged('Application withdrawn. The owner has been updated.');
      })
      .catch((error) => {
        setWithdrawing(false);
        setWithdrawError(error.message);
      });
  };

  let content;

  if (viewer.application) {
    const application = viewer.application;

    content = (
      <div className="application-status">
        <div className="application-status__head">
          <span>Your application</span>
          <StatusBadge
            status={application.status}
            label={applicationStatusLabels[application.status]}
          />
        </div>
        <p>
          {application.status === 'pending'
            ? `Sent ${formatTimestamp(application.createdAt)}. The owner reviews applications from the workspace.`
            : application.status === 'withdrawn'
              ? 'You withdrew this application. Reapplying is not available for this project.'
              : `Updated ${formatTimestamp(application.decidedAt || application.createdAt)}.`}
        </p>
        {application.status === 'pending' && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setWithdrawError('');
              setWithdrawOpen(true);
            }}
          >
            Withdraw application
          </Button>
        )}
      </div>
    );
  } else if (viewer.canApply) {
    content = (
      <div className="project-action-card__guest">
        <p>
          This team has {project.openSlots} {project.openSlots === 1 ? 'open spot' : 'open spots'}.
          Tell the owner how you can contribute.
        </p>
        <Button
          fullWidth
          onClick={() => {
            setForm({
              message: '',
              relevantSkills: Array.isArray(user?.skills) ? user.skills.slice(0, 10) : [],
            });
            setFields({});
            setFormError('');
            setDialogOpen(true);
          }}
        >
          Apply to join
          <Icon name="sparkles" size={17} />
        </Button>
      </div>
    );
  } else if (!isAuthenticated) {
    content = (
      <div className="project-action-card__guest">
        <p>
          {project.status === 'recruiting'
            ? projectAvailabilityLabel(project)
            : 'This project is not recruiting right now.'}
        </p>
        {project.status === 'recruiting' && project.openSlots > 0 && (
          <Link className="button button--primary button--md button--full" to={loginPath}>
            Sign in to apply
            <Icon name="arrowRight" size={17} />
          </Link>
        )}
        <Link className="button button--secondary button--md button--full" to="/projects">
          Browse projects
        </Link>
      </div>
    );
  } else {
    content = (
      <div className="project-action-card__guest">
        <p>
          {project.status === 'recruiting'
            ? 'This team is currently at capacity.'
            : 'This project is not accepting applications.'}
        </p>
        <Link className="button button--secondary button--md button--full" to="/projects">
          Find another project
        </Link>
      </div>
    );
  }

  return (
    <>
      {content}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!submitting) {
            setDialogOpen(false);
          }
        }}
        title={`Apply to ${project.title}`}
        description="Share a specific message. The owner sees your public profile and this note."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="application-form" loading={submitting}>
              Send application
            </Button>
          </>
        }
      >
        {formError && (
          <Alert tone="error" title="The application was not sent.">
            {formError}
          </Alert>
        )}
        <form id="application-form" className="form-stack" onSubmit={submitApplication}>
          <TextAreaField
            id="application-message"
            label="Why this project?"
            hint="Write at least 20 characters. Be concrete about what you can contribute."
            value={form.message}
            error={fields.message}
            rows={6}
            maxLength={1000}
            required
            onChange={(event) =>
              setForm((current) => ({ ...current, message: event.target.value }))
            }
          />
          <TagInput
            id="application-skills"
            label="Relevant skills"
            values={form.relevantSkills}
            max={10}
            error={fields.relevantSkills}
            optional
            onChange={(relevantSkills) =>
              setForm((current) => ({ ...current, relevantSkills }))
            }
          />
        </form>
      </Dialog>

      <Dialog
        open={withdrawOpen}
        onClose={() => {
          if (!withdrawing) {
            setWithdrawOpen(false);
          }
        }}
        title="Withdraw this application?"
        description="The owner will see that you are no longer interested."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setWithdrawOpen(false)}
              disabled={withdrawing}
            >
              Keep application
            </Button>
            <Button variant="danger" onClick={handleWithdraw} loading={withdrawing}>
              Withdraw
            </Button>
          </>
        }
      >
        {withdrawError && (
          <Alert tone="error" title="The application was not withdrawn.">
            {withdrawError}
          </Alert>
        )}
        <p>Withdrawal is final and this project cannot be applied to again.</p>
      </Dialog>
    </>
  );
}
