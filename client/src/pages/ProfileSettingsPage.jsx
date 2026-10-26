import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { getMyProfile, updateMyProfile } from '../api/users.js';
import { useAuth } from '../auth/context.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { TagInput } from '../components/TagInput.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Avatar,
  Button,
  SectionLabel,
  SelectField,
  TextAreaField,
  TextField,
} from '../components/ui.jsx';
import { availabilityLabels } from '../utils/format.js';
import { usePageTitle } from '../utils/usePageTitle.js';

const availabilityOptions = Object.entries(availabilityLabels).map(([value, label]) => ({
  value,
  label,
}));

const urlPattern = /^https?:\/\/[^\s]+$/i;

function formFromUser(user) {
  return {
    name: user.name || '',
    headline: user.headline || '',
    bio: user.bio || '',
    college: user.college || '',
    course: user.course || '',
    graduationYear: user.graduationYear ? String(user.graduationYear) : '',
    avatarUrl: user.avatarUrl || '',
    availability: user.availability || 'open',
    skills: user.skills || [],
    links: {
      github: user.links?.github || '',
      linkedin: user.links?.linkedin || '',
      portfolio: user.links?.portfolio || '',
    },
  };
}

function validate(values) {
  const fields = {};
  const name = values.name.trim();

  if (name.length < 2 || name.length > 60) {
    fields.name = 'Enter a name between 2 and 60 characters.';
  }

  if (values.headline.trim().length > 120) {
    fields.headline = 'Headline must be 120 characters or fewer.';
  }

  if (values.bio.trim().length > 1000) {
    fields.bio = 'Bio must be 1,000 characters or fewer.';
  }

  if (values.graduationYear) {
    const year = Number(values.graduationYear);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      fields.graduationYear = 'Use a graduation year between 2000 and 2100.';
    }
  }

  for (const key of ['github', 'linkedin', 'portfolio']) {
    const value = values.links[key].trim();

    if (value && !urlPattern.test(value)) {
      fields[`links.${key}`] = 'Use a full http or https URL.';
    }
  }

  if (values.avatarUrl.trim() && !urlPattern.test(values.avatarUrl.trim())) {
    fields.avatarUrl = 'Use a full http or https URL.';
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

export function ProfileSettingsPage() {
  usePageTitle('Profile settings');
  const { user, refreshMe } = useAuth();
  const [state, setState] = useState({ status: 'loading', counts: null, error: '' });
  const [values, setValues] = useState(() => formFromUser(user));
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    getMyProfile()
      .then(({ user: profile, counts }) => {
        if (!active) {
          return;
        }

        setValues(formFromUser(profile));
        setState({ status: 'ready', counts, error: '' });
      })
      .catch((error) => {
        if (active) {
          setState({ status: 'error', counts: null, error: error.message });
        }
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  const retry = () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    setRetryKey((value) => value + 1);
  };

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFields((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFormError('');
    setSuccess('');
  };

  const updateLink = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({
      ...current,
      links: { ...current.links, [name]: value },
    }));
    setFields((current) => {
      const next = { ...current };
      delete next[`links.${name}`];
      return next;
    });
    setFormError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextFields = validate(values);

    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      setFormError('Please correct the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    setFields({});
    setFormError('');
    setSuccess('');

    try {
      const updated = await updateMyProfile({
        name: values.name.trim(),
        headline: values.headline.trim(),
        bio: values.bio.trim(),
        college: values.college.trim(),
        course: values.course.trim(),
        graduationYear: values.graduationYear ? Number(values.graduationYear) : null,
        avatarUrl: values.avatarUrl.trim() || null,
        availability: values.availability,
        skills: values.skills,
        links: {
          github: values.links.github.trim() || null,
          linkedin: values.links.linkedin.trim() || null,
          portfolio: values.links.portfolio.trim() || null,
        },
      });

      setValues(formFromUser(updated));
      setSuccess('Your public profile is up to date.');
      await refreshMe();
    } catch (error) {
      if (error instanceof ApiError) {
        setFields(error.fields || {});
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="dashboard-main" id="main-content">
        <div className="container dashboard-main__inner">
          <div className="app-page-head">
            <div>
              <SectionLabel>Profile settings</SectionLabel>
              <h1>Make your profile useful.</h1>
              <p>
                These fields appear on your public profile. Email, role, and account status are
                never public and cannot be edited here.
              </p>
            </div>
            <div className="app-page-head__actions">
              <Link className="button button--secondary button--sm" to={`/students/${user.id}`}>
                View public profile
                <Icon name="arrowUpRight" size={16} />
              </Link>
              <Link className="button button--ghost button--sm" to="/dashboard">
                Back to dashboard
              </Link>
            </div>
          </div>

          {state.status === 'loading' && (
            <Alert tone="info" title="Loading your profile">
              Fetching the latest saved details.
            </Alert>
          )}

          {state.status === 'error' && (
            <Alert tone="error" title="Your profile could not load.">
              {state.error}{' '}
              <button
                type="button"
                className="inline-link"
                onClick={retry}
              >
                Try again
              </button>
            </Alert>
          )}

          {state.status === 'ready' && (
            <div className="profile-settings-grid">
              <form className="settings-card" onSubmit={handleSubmit} noValidate>
                <div className="settings-card__head">
                  <div>
                    <p className="eyebrow">Public details</p>
                    <h2>How students see you</h2>
                  </div>
                  <Avatar
                    name={values.name || user.name}
                    src={values.avatarUrl}
                    size={56}
                    decorative
                  />
                </div>

                {formError && (
                  <Alert tone="error" title="Your profile was not saved.">
                    {formError}
                  </Alert>
                )}
                {success && (
                  <Alert tone="success" title="Profile saved">
                    {success}
                  </Alert>
                )}

                <div className="form-grid">
                  <TextField
                    id="profile-name"
                    name="name"
                    label="Name"
                    value={values.name}
                    onChange={updateValue}
                    error={fields.name}
                    autoComplete="name"
                    maxLength={60}
                    required
                  />
                  <TextField
                    id="profile-headline"
                    name="headline"
                    label="Headline"
                    value={values.headline}
                    onChange={updateValue}
                    error={fields.headline}
                    maxLength={120}
                    placeholder="Frontend builder focused on campus tools"
                    optional
                  />
                </div>

                <TextAreaField
                  id="profile-bio"
                  name="bio"
                  label="Bio"
                  value={values.bio}
                  onChange={updateValue}
                  error={fields.bio}
                  rows={5}
                  maxLength={1000}
                  hint={`${values.bio.length} / 1,000 characters`}
                  optional
                />

                <div className="form-grid">
                  <TextField
                    id="profile-college"
                    name="college"
                    label="College"
                    value={values.college}
                    onChange={updateValue}
                    error={fields.college}
                    maxLength={120}
                    optional
                  />
                  <TextField
                    id="profile-course"
                    name="course"
                    label="Course"
                    value={values.course}
                    onChange={updateValue}
                    error={fields.course}
                    maxLength={120}
                    optional
                  />
                </div>

                <div className="form-grid">
                  <TextField
                    id="profile-graduation"
                    name="graduationYear"
                    type="number"
                    label="Graduation year"
                    value={values.graduationYear}
                    onChange={updateValue}
                    error={fields.graduationYear}
                    min={2000}
                    max={2100}
                    inputMode="numeric"
                    optional
                  />
                  <SelectField
                    id="profile-availability"
                    name="availability"
                    label="Availability"
                    value={values.availability}
                    onChange={updateValue}
                    error={fields.availability}
                    options={availabilityOptions}
                  />
                </div>

                <TagInput
                  id="profile-skills"
                  label="Skills"
                  values={values.skills}
                  onChange={(skills) => {
                    setValues((current) => ({ ...current, skills }));
                    setFields((current) => {
                      const next = { ...current };
                      delete next.skills;
                      return next;
                    });
                    setSuccess('');
                  }}
                  error={fieldError(fields, 'skills')}
                  max={20}
                  placeholder="React, UX research, MongoDB"
                />

                <TextField
                  id="profile-avatar"
                  name="avatarUrl"
                  type="url"
                  label="Avatar image URL"
                  value={values.avatarUrl}
                  onChange={updateValue}
                  error={fields.avatarUrl}
                  hint="Optional http or https image URL. Initials are used when empty."
                  optional
                />

                <fieldset className="field-group">
                  <legend>Profile links</legend>
                  <p>Only add links you are comfortable showing publicly.</p>
                  <TextField
                    id="profile-github"
                    name="github"
                    type="url"
                    label="GitHub"
                    value={values.links.github}
                    onChange={updateLink}
                    error={fields['links.github']}
                    placeholder="https://github.com/your-name"
                    optional
                  />
                  <TextField
                    id="profile-linkedin"
                    name="linkedin"
                    type="url"
                    label="LinkedIn"
                    value={values.links.linkedin}
                    onChange={updateLink}
                    error={fields['links.linkedin']}
                    placeholder="https://linkedin.com/in/your-name"
                    optional
                  />
                  <TextField
                    id="profile-portfolio"
                    name="portfolio"
                    type="url"
                    label="Portfolio"
                    value={values.links.portfolio}
                    onChange={updateLink}
                    error={fields['links.portfolio']}
                    placeholder="https://your-portfolio.example"
                    optional
                  />
                </fieldset>

                <div className="settings-card__actions">
                  <Button type="submit" loading={submitting} icon="check">
                    Save profile
                  </Button>
                  <span>Public changes appear immediately.</span>
                </div>
              </form>

              <aside className="settings-aside">
                <section className="settings-summary">
                  <p className="eyebrow">Account</p>
                  <h2>{user.name}</h2>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{user.email}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{user.role === 'admin' ? 'Admin' : 'Student'}</dd>
                    </div>
                    <div>
                      <dt>Owned projects</dt>
                      <dd>{state.counts?.ownedProjects ?? 0}</dd>
                    </div>
                  </dl>
                  <p className="settings-summary__note">
                    Email and role are private account fields. They are not writable from this
                    form.
                  </p>
                </section>

                <section className="settings-tip">
                  <span>
                    <Icon name="sparkles" size={20} />
                  </span>
                  <h2>Specific beats broad.</h2>
                  <p>
                    "Python for data cleaning" is easier to match than "coding". Keep skills short
                    and use your headline for the sentence.
                  </p>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
