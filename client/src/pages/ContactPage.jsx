import { useState } from 'react';
import { sendContactMessage } from '../api/contact.js';
import { ApiError } from '../api/client.js';
import { PublicLayout } from '../components/PublicLayout.jsx';
import { Icon } from '../components/icons.jsx';
import {
  Alert,
  Button,
  SectionLabel,
  TextAreaField,
  TextField,
} from '../components/ui.jsx';
import { usePageTitle } from '../utils/usePageTitle.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const initialValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

function validate(values) {
  const fields = {};
  const name = values.name.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (name.length < 2 || name.length > 80) {
    fields.name = 'Enter a name between 2 and 80 characters.';
  }

  if (!emailPattern.test(values.email.trim())) {
    fields.email = 'Enter a valid email address.';
  }

  if (subject.length < 3 || subject.length > 120) {
    fields.subject = 'Enter a subject between 3 and 120 characters.';
  }

  if (message.length < 10 || message.length > 2000) {
    fields.message = 'Enter a message between 10 and 2,000 characters.';
  }

  return fields;
}

const faqs = [
  {
    title: 'What happens after I send this?',
    text: 'Your message is stored for the FLEXI team. This form does not create an account or subscribe you to anything.',
  },
  {
    title: 'Can I report a project here?',
    text: 'Project reporting is not part of the current studio release. Use the subject line to describe the issue so the team has context.',
  },
  {
    title: 'Is my email public?',
    text: 'No. The email you enter in this form is for the reply only. Public student profiles never expose account email addresses.',
  },
];

export function ContactPage() {
  usePageTitle('Contact');
  const [values, setValues] = useState(initialValues);
  const [fields, setFields] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFields((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
    setFormError('');
  };

  const focusFirstInvalid = (nextFields) => {
    const first = ['name', 'email', 'subject', 'message'].find((field) => nextFields[field]);

    if (first) {
      window.requestAnimationFrame(() => document.getElementById(first)?.focus());
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextFields = validate(values);

    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      setFormError('Please correct the highlighted fields and try again.');
      focusFirstInvalid(nextFields);
      return;
    }

    setSubmitting(true);
    setFields({});
    setFormError('');

    try {
      await sendContactMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
        website: values.website,
      });
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        const nextServerFields = error.fields || {};
        setFields(nextServerFields);
        setFormError(error.message);
        focusFirstInvalid(nextServerFields);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setFields({});
    setFormError('');
    setSent(false);
    window.requestAnimationFrame(() => document.getElementById('contact-name')?.focus());
  };

  return (
    <PublicLayout>
      <section className="page-hero" aria-labelledby="contact-title">
        <div className="container page-hero__inner">
          <div>
            <SectionLabel>
              <span className="eyebrow__index">03</span>
              Contact
            </SectionLabel>
            <h1 id="contact-title">Tell us what would make the studio more useful.</h1>
          </div>
          <p className="page-hero__lede">
            Questions, feedback, or a problem that needs a human? Send a message. The form stores
            it for the FLEXI team; it is not a public post.
          </p>
        </div>
      </section>

      <section className="section section--contact" aria-label="Contact form and information">
        <div className="container contact-layout">
          <div className="contact-panel">
            {sent ? (
              <div className="contact-success">
                <span className="contact-success__icon">
                  <Icon name="checkCircle" size={28} />
                </span>
                <p className="eyebrow">Message received</p>
                <h2>Thanks for the context.</h2>
                <p>
                  Your message is in the FLEXI inbox. Keep this page open or send another note if
                  something else comes up.
                </p>
                <Button variant="secondary" onClick={reset}>
                  Send another message
                </Button>
              </div>
            ) : (
              <>
                <div className="contact-panel__head">
                  <p className="eyebrow">Message the team</p>
                  <h2>What should we know?</h2>
                  <p>Fields marked required are needed so we can reply with context.</p>
                </div>

                {formError && (
                  <Alert tone="error" title="Your message was not sent.">
                    {formError}
                  </Alert>
                )}

                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                  <div className="form-grid">
                    <TextField
                      id="contact-name"
                      name="name"
                      label="Name"
                      value={values.name}
                      onChange={updateValue}
                      error={fields.name}
                      autoComplete="name"
                      maxLength={80}
                      required
                    />
                    <TextField
                      id="contact-email"
                      name="email"
                      type="email"
                      label="Email"
                      value={values.email}
                      onChange={updateValue}
                      error={fields.email}
                      autoComplete="email"
                      inputMode="email"
                      hint="Used for a reply only. Never shown publicly."
                      required
                    />
                  </div>

                  <TextField
                    id="contact-subject"
                    name="subject"
                    label="Subject"
                    value={values.subject}
                    onChange={updateValue}
                    error={fields.subject}
                    maxLength={120}
                    required
                  />

                  <TextAreaField
                    id="contact-message"
                    name="message"
                    label="Message"
                    value={values.message}
                    onChange={updateValue}
                    error={fields.message}
                    rows={7}
                    maxLength={2000}
                    hint={`${values.message.length} / 2,000 characters`}
                    required
                  />

                  <div className="honeypot" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      name="website"
                      value={values.website}
                      onChange={updateValue}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className="contact-form__actions">
                    <Button type="submit" size="lg" loading={submitting} icon="arrowRight">
                      Send message
                    </Button>
                    <p>Usually a reply is a human decision, not an automated ticket.</p>
                  </div>
                </form>
              </>
            )}
          </div>

          <aside className="contact-aside" aria-labelledby="contact-faq-title">
            <div className="contact-aside__intro">
              <span className="contact-aside__mark">
                <Icon name="mail" size={22} />
              </span>
              <h2 id="contact-faq-title">Before you send</h2>
              <p>A few useful details about this form and the studio.</p>
            </div>
            <div className="faq-list">
              {faqs.map((faq) => (
                <details key={faq.title}>
                  <summary>{faq.title}</summary>
                  <p>{faq.text}</p>
                </details>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
