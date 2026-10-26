import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client.js';
import { TagInput } from '../TagInput.jsx';
import { Icon } from '../icons.jsx';
import {
  Alert,
  Button,
  SectionLabel,
  SelectField,
  StatusBadge,
  TextAreaField,
  TextField,
} from '../ui.jsx';
import {
  categoryLabels,
  projectCategories,
  statusLabels,
} from '../../utils/format.js';

const transitions = {
  draft: ['recruiting'],
  recruiting: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: [],
  archived: [],
};

const urlPattern = /^https?:\/\/[^\s]+$/i;

function todayInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function statusOptionsFor(mode, project) {
  if (mode === 'create') {
    return ['draft', 'recruiting'].map((value) => ({
      value,
      label: value === 'draft' ? 'Draft — only you can see it' : 'Recruiting — publish now',
    }));
  }

  const current = project?.status || 'draft';
  return [current, ...(transitions[current] || [])].map((value) => ({
    value,
    label: value === current ? `${statusLabels[value]} (current)` : statusLabels[value],
  }));
}

function blankValues(project) {
  return {
    title: project?.title || '',
    summary: project?.summary || '',
    description: project?.description || '',
    category: project?.category || 'web',
    status: project?.status || 'draft',
    teamSize: String(project?.teamSize || 4),
    deadline: project?.deadline ? String(project.deadline).slice(0, 10) : '',
    requiredSkills: project?.requiredSkills || [],
    techStack: project?.techStack || [],
    tags: project?.tags || [],
    repoUrl: project?.repoUrl || '',
    demoUrl: project?.demoUrl || '',
    coverImageUrl: project?.coverImageUrl || '',
  };
}

function formPayload(values) {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    category: values.category,
    status: values.status,
    teamSize: Number(values.teamSize),
    deadline: values.deadline || null,
    requiredSkills: values.requiredSkills,
    techStack: values.techStack,
    tags: values.tags,
    repoUrl: values.repoUrl.trim() || null,
    demoUrl: values.demoUrl.trim() || null,
    coverImageUrl: values.coverImageUrl.trim() || null,
  };
}

function validate(values, mode, project) {
  const fields = {};
  const title = values.title.trim();
  const summary = values.summary.trim();
  const description = values.description.trim();
  const teamSize = Number(values.teamSize);
  const currentTeam = project?.memberCount || 1;

  if (title.length < 3 || title.length > 120) {
    fields.title = 'Use a title between 3 and 120 characters.';
  }

  if (summary.length < 10 || summary.length > 240) {
    fields.summary = 'Use a summary between 10 and 240 characters.';
  }

  if (description.length < 20 || description.length > 5000) {
    fields.description = 'Use a description between 20 and 5,000 characters.';
  }

  if (!Object.hasOwn(categoryLabels, values.category)) {
    fields.category = 'Choose a valid category.';
  }

  if (!statusOptionsFor(mode, project).some((option) => option.value === values.status)) {
    fields.status = 'Choose a valid next status.';
  }

  if (!Number.isInteger(teamSize) || teamSize < 2 || teamSize > 12) {
    fields.teamSize = 'Team size must be a whole number from 2 to 12.';
  } else if (mode === 'edit' && teamSize < currentTeam) {
    fields.teamSize = `Team size cannot be lower than the current team of ${currentTeam}.`;
  }

  if (values.deadline) {
    const deadline = new Date(`${values.deadline}T23:59:59.999Z`);
    const normalizedDate = Number.isNaN(deadline.getTime())
      ? null
      : deadline.toISOString().slice(0, 10);

    if (Number.isNaN(deadline.getTime()) || normalizedDate !== values.deadline) {
      fields.deadline = 'Enter a valid date.';
    } else if (deadline.getTime() <= Date.now()) {
      fields.deadline = 'Choose a deadline in the future.';
    }
  } else if (['recruiting', 'in_progress', 'completed'].includes(values.status)) {
    fields.deadline = 'Choose a deadline before publishing.';
  }

  for (const key of ['repoUrl', 'demoUrl', 'coverImageUrl']) {
    const value = values[key].trim();

    if (value && !urlPattern.test(value)) {
      fields[key] = 'Use a full http or https URL.';
    }
  }

  return fields;
}

function fieldError(fields, key) {
  if (fields[key]) {
    return fields[key];
  }

  const nested = Object.keys(fields).find((field) => field.startsWith(`${key}.`));
  return nested ? fields[nested] : undefined;
}

export function ProjectForm({ mode, project, onSave, cancelTo }) {
  const [values, setValues] = useState(() => blankValues(project));
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFields((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFormError('');
  };

  const updateList = (key, nextValues) => {
    setValues((current) => ({ ...current, [key]: nextValues }));
    setFields((current) => {
      const next = { ...current };
      Object.keys(next)
        .filter((field) => field === key || field.startsWith(`${key}.`))
        .forEach((field) => delete next[field]);
      return next;
    });
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextFields = validate(values, mode, project);

    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      setFormError('Please correct the highlighted fields before saving.');
      return;
    }

    setSubmitting(true);
    setFields({});
    setFormError('');

    try {
      await onSave(formPayload(values));
    } catch (error) {
      if (error instanceof ApiError) {
        setFields(error.fields || {});
        setFormError(error.message);
      } else {
        setFormError('Something went wrong while saving. Please try again.');
      }
      setSubmitting(false);
    }
  };

  const publicStatus = ['recruiting', 'in_progress', 'completed'].includes(values.status);
  const statusOptions = statusOptionsFor(mode, project);

  return (
    <form className="project-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <Alert tone="error" title="This project was not saved.">
          {formError}
        </Alert>
      )}

      <div className="project-form__layout">
        <div className="project-form__fields">
          <section className="form-section">
            <div className="form-section__head">
              <span className="form-section__number">01</span>
              <div>
                <SectionLabel>The brief</SectionLabel>
                <h2>What are you building?</h2>
              </div>
            </div>

            <TextField
              id="project-title"
              name="title"
              label="Title"
              value={values.title}
              onChange={updateValue}
              error={fields.title}
              maxLength={120}
              placeholder="Campus ride-share for evening classes"
              required
            />
            <TextAreaField
              id="project-summary"
              name="summary"
              label="One-line summary"
              value={values.summary}
              onChange={updateValue}
              error={fields.summary}
              rows={2}
              maxLength={240}
              hint={`${values.summary.length} / 240 characters`}
              placeholder="A short, specific explanation of the problem and the build."
              required
            />
            <TextAreaField
              id="project-description"
              name="description"
              label="Description"
              value={values.description}
              onChange={updateValue}
              error={fields.description}
              rows={9}
              maxLength={5000}
              hint={`${values.description.length} / 5,000 characters. Separate paragraphs with a blank line.`}
              placeholder="Explain the problem, the scope you can realistically finish, the roles you need, and how you want to work."
              required
            />
            <SelectField
              id="project-category"
              name="category"
              label="Category"
              value={values.category}
              onChange={updateValue}
              error={fields.category}
              options={projectCategories}
            />
          </section>

          <section className="form-section">
            <div className="form-section__head">
              <span className="form-section__number">02</span>
              <div>
                <SectionLabel>Team and timing</SectionLabel>
                <h2>Who joins, and by when?</h2>
              </div>
            </div>

            <div className="form-grid">
              <SelectField
                id="project-status"
                name="status"
                label="Status"
                value={values.status}
                onChange={updateValue}
                error={fields.status}
                options={statusOptions}
                hint={
                  publicStatus
                    ? 'Public statuses appear in discovery immediately.'
                    : 'Drafts stay private until you publish.'
                }
              />
              <TextField
                id="project-team-size"
                name="teamSize"
                type="number"
                label="Team size"
                value={values.teamSize}
                onChange={updateValue}
                error={fields.teamSize}
                min={2}
                max={12}
                inputMode="numeric"
                hint="Includes you as owner."
                required
              />
            </div>

            <TextField
              id="project-deadline"
              name="deadline"
              type="date"
              label="Deadline"
              value={values.deadline}
              onChange={updateValue}
              error={fields.deadline}
              min={todayInput()}
              hint={
                publicStatus
                  ? 'Required and must be in the future for public projects.'
                  : 'Optional for drafts, but must be in the future if set.'
              }
              required={publicStatus}
            />

            <TagInput
              id="project-required-skills"
              label="Required skills"
              values={values.requiredSkills}
              onChange={(nextValues) => updateList('requiredSkills', nextValues)}
              error={fieldError(fields, 'requiredSkills')}
              max={15}
              placeholder="React, user research, CAD"
              optional
            />
          </section>

          <section className="form-section">
            <div className="form-section__head">
              <span className="form-section__number">03</span>
              <div>
                <SectionLabel>The stack</SectionLabel>
                <h2>Tools, technology, and context.</h2>
              </div>
            </div>

            <TagInput
              id="project-tech-stack"
              label="Tech stack"
              values={values.techStack}
              onChange={(nextValues) => updateList('techStack', nextValues)}
              error={fieldError(fields, 'techStack')}
              max={20}
              placeholder="React, Node.js, MongoDB"
              optional
            />
            <TagInput
              id="project-tags"
              label="Tags"
              values={values.tags}
              onChange={(nextValues) => updateList('tags', nextValues)}
              error={fieldError(fields, 'tags')}
              max={10}
              placeholder="Accessibility, campus, MVP"
              optional
            />
          </section>

          <section className="form-section">
            <div className="form-section__head">
              <span className="form-section__number">04</span>
              <div>
                <SectionLabel>Links</SectionLabel>
                <h2>Show the work, if it exists.</h2>
              </div>
            </div>

            <TextField
              id="project-repo"
              name="repoUrl"
              type="url"
              label="Repository URL"
              value={values.repoUrl}
              onChange={updateValue}
              error={fields.repoUrl}
              placeholder="https://github.com/you/project"
              optional
            />
            <TextField
              id="project-demo"
              name="demoUrl"
              type="url"
              label="Demo URL"
              value={values.demoUrl}
              onChange={updateValue}
              error={fields.demoUrl}
              placeholder="https://project-demo.example"
              optional
            />
            <TextField
              id="project-cover"
              name="coverImageUrl"
              type="url"
              label="Cover image URL"
              value={values.coverImageUrl}
              onChange={updateValue}
              error={fields.coverImageUrl}
              placeholder="https://images.example/cover.jpg"
              optional
            />
          </section>

          <div className="project-form__actions">
            <Button type="submit" loading={submitting} icon="arrowRight">
              {mode === 'create' ? 'Create project' : 'Save changes'}
            </Button>
            <Link className="button button--ghost button--md" to={cancelTo}>
              Cancel
            </Link>
            <span>
              {values.status === 'draft'
                ? 'Drafts are visible only to you.'
                : 'This will be visible in public discovery.'}
            </span>
          </div>
        </div>

        <aside className="project-form__aside">
          <section className="form-preview">
            <SectionLabel>Live brief</SectionLabel>
            <StatusBadge status={values.status} />
            <h2>{values.title.trim() || 'Untitled project'}</h2>
            <p>
              {values.summary.trim() ||
                'Your one-line summary will appear here as you write it.'}
            </p>
            <dl>
              <div>
                <dt>Category</dt>
                <dd>{categoryLabels[values.category]}</dd>
              </div>
              <div>
                <dt>Team</dt>
                <dd>{values.teamSize || '—'} people</dd>
              </div>
              <div>
                <dt>Skills</dt>
                <dd>{values.requiredSkills.length || 'None yet'}</dd>
              </div>
            </dl>
          </section>

          <section className="form-checklist">
            <SectionLabel>Ready to publish?</SectionLabel>
            <ul>
              <li className={values.title.trim().length >= 3 ? 'is-done' : ''}>
                <Icon name={values.title.trim().length >= 3 ? 'checkCircle' : 'circle'} size={17} />
                A specific title
              </li>
              <li className={values.summary.trim().length >= 10 ? 'is-done' : ''}>
                <Icon
                  name={values.summary.trim().length >= 10 ? 'checkCircle' : 'circle'}
                  size={17}
                />
                A clear summary
              </li>
              <li className={values.description.trim().length >= 20 ? 'is-done' : ''}>
                <Icon
                  name={values.description.trim().length >= 20 ? 'checkCircle' : 'circle'}
                  size={17}
                />
                Scope and expectations
              </li>
              <li className={!publicStatus || Boolean(values.deadline) ? 'is-done' : ''}>
                <Icon
                  name={!publicStatus || Boolean(values.deadline) ? 'checkCircle' : 'circle'}
                  size={17}
                />
                {publicStatus ? 'A future deadline' : 'Draft can wait for a deadline'}
              </li>
              <li className={values.requiredSkills.length > 0 ? 'is-done' : ''}>
                <Icon
                  name={values.requiredSkills.length > 0 ? 'checkCircle' : 'circle'}
                  size={17}
                />
                At least one skill to match
              </li>
            </ul>
          </section>

          <p className="form-aside-note">
            The owner is set from your signed-in account. Members and applications are managed
            only through later team features.
          </p>
        </aside>
      </div>
    </form>
  );
}
