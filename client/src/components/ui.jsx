import { useEffect, useId, useRef } from 'react';
import { Icon } from './icons.jsx';

const statusMap = {
  recruiting: { label: 'Recruiting', tone: 'mint' },
  open: { label: 'Open', tone: 'mint' },
  in_progress: { label: 'In progress', tone: 'cobalt' },
  completed: { label: 'Completed', tone: 'ink' },
  draft: { label: 'Draft', tone: 'slate' },
  pending: { label: 'Pending', tone: 'amber' },
  accepted: { label: 'Accepted', tone: 'mint' },
  rejected: { label: 'Not selected', tone: 'rose' },
  withdrawn: { label: 'Withdrawn', tone: 'slate' },
  archived: { label: 'Archived', tone: 'slate' },
  hidden: { label: 'Hidden', tone: 'rose' },
  todo: { label: 'To do', tone: 'slate' },
  done: { label: 'Done', tone: 'mint' },
  planned: { label: 'Planned', tone: 'slate' },
  active: { label: 'Active', tone: 'cobalt' },
  low: { label: 'Low', tone: 'slate' },
  medium: { label: 'Medium', tone: 'amber' },
  high: { label: 'High', tone: 'rose' },
};

const avatarTones = ['cobalt', 'tangerine', 'mint', 'amber', 'rose', 'ink'];

const alertIcons = {
  info: 'info',
  success: 'checkCircle',
  warning: 'alert',
  error: 'alert',
};

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function avatarTone(name) {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }

  return avatarTones[hash % avatarTones.length];
}

export function Logo({ compact = false, className = '' }) {
  return (
    <span className={['logo', className].filter(Boolean).join(' ')}>
      <span className="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M11 4H5v24h6M21 4h6v24h-6M18 8l-4 16" />
        </svg>
      </span>
      {!compact && <span className="logo__word">FLEXI</span>}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  iconPosition = 'end',
  loading = false,
  fullWidth = false,
  href,
  disabled = false,
  type = 'button',
  ...props
}) {
  const classes = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    fullWidth && 'button--full',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading && <span className="spinner" aria-hidden="true" />}
      <span>{children}</span>
      {icon && !loading && iconPosition === 'end' && (
        <Icon name={icon} size={size === 'sm' ? 16 : 18} />
      )}
      {icon && !loading && iconPosition === 'start' && (
        <Icon name={icon} size={size === 'sm' ? 16 : 18} />
      )}
    </>
  );

  if (href) {
    return (
      <a className={classes} href={href} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  variant = 'plain',
  size = 'md',
  pressed,
  className = '',
  ...props
}) {
  return (
    <button
      className={[
        'icon-button',
        `icon-button--${variant}`,
        `icon-button--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      type="button"
      aria-label={label}
      aria-pressed={typeof pressed === 'boolean' ? pressed : undefined}
      title={label}
      {...props}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  );
}

export function SectionLabel({ children, className = '' }) {
  return (
    <p className={['eyebrow', className].filter(Boolean).join(' ')}>
      {children}
    </p>
  );
}

export function StatusBadge({ status = 'recruiting', label, className = '' }) {
  const config = statusMap[status] || statusMap.draft;

  return (
    <span className={['badge', `badge--${config.tone}`, className].filter(Boolean).join(' ')}>
      <span className="badge__dot" aria-hidden="true" />
      {label || config.label}
    </span>
  );
}

export function SkillTag({ children, className = '' }) {
  return <span className={['skill-tag', className].filter(Boolean).join(' ')}>{children}</span>;
}

export function Avatar({ name, src, size = 36, decorative = false, className = '' }) {
  return (
    <span
      className={['avatar', `avatar--${avatarTone(name)}`, className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--avatar-size': `${size}px` }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? 'true' : undefined}
    >
      {src ? (
        <img className="avatar__image" src={src} alt="" loading="lazy" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

export function AvatarStack({ names = [], people, max = 3, size = 30, label }) {
  const entries = people || names.map((name) => ({ name }));
  const visible = entries.slice(0, max);
  const remaining = entries.length - visible.length;

  return (
    <span
      className="avatar-stack"
      role="group"
      aria-label={label || `Team: ${entries.map((person) => person.name).join(', ')}`}
    >
      {visible.map((person) => (
        <Avatar
          key={person.id || person.name}
          name={person.name}
          src={person.avatarUrl}
          size={size}
          decorative
        />
      ))}
      {remaining > 0 && (
        <span
          className="avatar-stack__more"
          style={{ '--avatar-size': `${size}px` }}
          aria-hidden="true"
        >
          +{remaining}
        </span>
      )}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  tone = 'cobalt',
  size = 'md',
  showValue = true,
  className = '',
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={['progress', `progress--${size}`, className].filter(Boolean).join(' ')}>
      <div className="progress__meta">
        <span>{label}</span>
        {showValue && <span className="progress__value">{safeValue}%</span>}
      </div>
      <div
        className={['progress__track', `progress__track--${tone}`].join(' ')}
        role="progressbar"
        aria-label={label}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={safeValue}
      >
        <span className="progress__fill" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  optional = false,
  className = '',
  inputRef,
  ...inputProps
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      <div className="field__label-row">
        <label htmlFor={id}>{label}</label>
        {optional && <span className="field__optional">Optional</span>}
      </div>
      <input
        ref={inputRef}
        id={id}
        className="field__input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  optional = false,
  className = '',
  ...textareaProps
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      <div className="field__label-row">
        <label htmlFor={id}>{label}</label>
        {optional && <span className="field__optional">Optional</span>}
      </div>
      <textarea
        id={id}
        className="field__input field__textarea"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...textareaProps}
      />
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  options = [],
  optional = false,
  className = '',
  ...selectProps
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      <div className="field__label-row">
        <label htmlFor={id}>{label}</label>
        {optional && <span className="field__optional">Optional</span>}
      </div>
      <select
        id={id}
        className="field__input field__select"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', title, children, action, className = '' }) {
  const role = tone === 'error' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div className={['alert', `alert--${tone}`, className].filter(Boolean).join(' ')} role={role}>
      <Icon name={alertIcons[tone] || 'info'} size={19} />
      <div className="alert__content">
        {title && <p className="alert__title">{title}</p>}
        {children && <div className="alert__body">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = 'search', title, description, action, className = '' }) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <span className="empty-state__icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <span className={['skeleton', className].filter(Boolean).join(' ')} aria-hidden="true" />;
}

export function StatCard({ label, value, note, tone = 'cobalt' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__note">{note}</span>
    </article>
  );
}

export function Dialog({ open, title, description, eyebrow = 'Confirm action', children, footer, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    const handleCancel = (event) => {
      event.preventDefault();
      onClose?.();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose?.();
        }
      }}
      onClose={onClose}
    >
      <div className="dialog__panel">
        <div className="dialog__head">
          <div>
            <p className="dialog__eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <IconButton label="Close dialog" icon="close" size="sm" onClick={onClose} />
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__footer">{footer}</div>}
      </div>
    </dialog>
  );
}

export function Toast({ message, tone = 'info', onClose }) {
  return (
    <div className={`toast toast--${tone}`} role="status" aria-atomic="true">
      <Icon name={alertIcons[tone] || 'info'} size={18} />
      <p>{message}</p>
      <button type="button" className="toast__close" aria-label="Dismiss notification" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
