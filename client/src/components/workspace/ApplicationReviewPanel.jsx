import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  decideApplication,
  listProjectApplications,
} from '../../api/applications.js';
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
  SkillTag,
  StatusBadge,
} from '../ui.jsx';
import {
  applicationStatusLabels,
  formatTimestamp,
} from '../../utils/format.js';

const statusOptions = [
  { value: 'pending', label: 'Pending review' },
  { value: '', label: 'Every status' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Not selected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function ApplicationReviewPanel({ projectId, workspace, onChanged }) {
  const { project, permissions } = workspace;
  const [status, setStatus] = useState('pending');
  const [state, setState] = useState({
    status: 'loading',
    applications: [],
    meta: null,
    error: '',
  });
  const [retryKey, setRetryKey] = useState(0);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    listProjectApplications(
      projectId,
      { limit: 50, ...(status ? { status } : {}) },
      { signal: controller.signal },
    )
      .then(({ applications, meta }) => {
        setState({ status: 'ready', applications, meta, error: '' });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setState((current) => ({
            ...current,
            status: 'error',
            error: error.message,
          }));
        }
      });

    return () => controller.abort();
  }, [projectId, status, retryKey]);

  const reload = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const openDecision = (application, decision) => {
    setActionError('');
    setDecisionTarget({ application, decision });
  };

  const confirmDecision = () => {
    if (!decisionTarget) {
      return;
    }

    setWorking(true);
    setActionError('');

    decideApplication(decisionTarget.application.id, decisionTarget.decision)
      .then(() => {
        setWorking(false);
        setNotice(
          decisionTarget.decision === 'accepted'
            ? `${decisionTarget.application.applicant.name} joined the team.`
            : `${decisionTarget.application.applicant.name} was not selected.`,
        );
        setDecisionTarget(null);
        reload();
        onChanged();
      })
      .catch((error) => {
        setWorking(false);
        setActionError(error.message);
      });
  };

  const accepting = decisionTarget?.decision === 'accepted';
  const nextMemberCount = project.memberCount + 1;

  return (
    <section className="workspace-panel" aria-labelledby="applications-title">
      <div className="workspace-panel__head">
        <div>
          <SectionLabel>Owner review queue</SectionLabel>
          <h2 id="applications-title">Who wants to join.</h2>
          <p>
            Applicant notes and profiles are visible only to the owner and admin moderators.
          </p>
        </div>
        <SelectField
          id="review-status-filter"
          label="Show"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setState((current) => ({ ...current, status: 'loading', error: '' }));
          }}
          options={statusOptions}
        />
      </div>

      {notice && (
        <Alert tone="success" title="Decision recorded">
          {notice}
        </Alert>
      )}

      {!permissions.canReviewApplications && !permissions.isAdmin && (
        <Alert tone="info" title="Owner review only">
          Only the project owner can accept or reject applications.
        </Alert>
      )}

      {project.status !== 'recruiting' && (
        <Alert tone="warning" title="Applications are closed">
          The project is {project.status.replaceAll('_', ' ')}. Pending applications cannot
          be decided until the project is recruiting.
        </Alert>
      )}

      {state.status === 'loading' && (
        <div className="workspace-application-list" aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Loading applications</span>
          {[0, 1, 2].map((item) => (
            <Skeleton className="skeleton--row" key={item} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <Alert tone="error" title="Applications could not load.">
          {state.error}{' '}
          <button type="button" className="inline-link" onClick={reload}>
            Try again
          </button>
        </Alert>
      )}

      {state.status === 'ready' && state.applications.length === 0 && (
        <EmptyState
          icon="mail"
          title={status === 'pending' ? 'No applications waiting.' : 'No applications with that status.'}
          description={
            status === 'pending'
              ? 'Share the public project link so students can find and apply to the brief.'
              : 'Choose a different status to review the decision history.'
          }
          action={
            status !== 'pending' ? (
              <Button variant="secondary" size="sm" onClick={() => setStatus('pending')}>
                Show pending
              </Button>
            ) : null
          }
        />
      )}

      {state.status === 'ready' && state.applications.length > 0 && (
        <div className="workspace-application-list">
          {state.applications.map((application) => (
            <article className="workspace-application" key={application.id}>
              <div className="workspace-application__person">
                <Avatar
                  name={application.applicant.name}
                  src={application.applicant.avatarUrl}
                  size={44}
                  decorative
                />
                <div>
                  <h3>
                    <Link to={`/students/${application.applicant.id}`}>
                      {application.applicant.name}
                    </Link>
                  </h3>
                  <p>
                    {[application.applicant.course, application.applicant.college]
                      .filter(Boolean)
                      .join(' · ') || 'FLEXI student'}
                  </p>
                </div>
                <StatusBadge
                  status={application.status}
                  label={applicationStatusLabels[application.status]}
                />
              </div>

              <p className="workspace-application__message">{application.message}</p>

              {application.relevantSkills.length > 0 && (
                <div className="workspace-application__skills">
                  {application.relevantSkills.map((skill) => (
                    <SkillTag key={skill}>{skill}</SkillTag>
                  ))}
                </div>
              )}

              <div className="workspace-application__footer">
                <span>Applied {formatTimestamp(application.createdAt)}</span>
                {application.decidedAt && (
                  <span>Decided {formatTimestamp(application.decidedAt)}</span>
                )}
                <Link
                  className="inline-link"
                  to={`/students/${application.applicant.id}`}
                >
                  Profile
                  <Icon name="arrowUpRight" size={14} />
                </Link>
                {application.canDecide && (
                  <div className="workspace-application__actions">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openDecision(application, 'rejected')}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openDecision(application, 'accepted')}
                    >
                      Accept
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(decisionTarget)}
        onClose={() => {
          if (!working) {
            setDecisionTarget(null);
          }
        }}
        title={accepting ? 'Accept this applicant?' : 'Reject this application?'}
        description={
          accepting
            ? 'Acceptance adds the applicant to the project roster.'
            : 'Rejection closes this application permanently.'
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDecisionTarget(null)}
              disabled={working}
            >
              Cancel
            </Button>
            <Button
              variant={accepting ? 'primary' : 'danger'}
              onClick={confirmDecision}
              loading={working}
            >
              {accepting ? 'Accept applicant' : 'Reject application'}
            </Button>
          </>
        }
      >
        {actionError && (
          <Alert tone="error" title="The decision was not recorded.">
            {actionError}
          </Alert>
        )}
        {accepting ? (
          <div className="workspace-decision">
            <p>
              <strong>{decisionTarget?.application.applicant.name}</strong> will join the team
              as member {Math.min(nextMemberCount, project.teamSize)} of {project.teamSize}.
            </p>
            {nextMemberCount >= project.teamSize && (
              <Alert tone="warning" title="This fills the team">
                The project will automatically move to In progress and close applications.
              </Alert>
            )}
            <p>This decision is final and cannot be reversed in this release.</p>
          </div>
        ) : (
          <p>
            <strong>{decisionTarget?.application.applicant.name}</strong> will not join this
            team. They cannot reapply to this project.
          </p>
        )}
      </Dialog>
    </section>
  );
}
