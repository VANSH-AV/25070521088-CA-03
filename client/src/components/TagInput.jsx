import { useState } from 'react';
import { Icon } from './icons.jsx';

function normalizeTag(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function TagInput({
  id,
  label,
  hint,
  error,
  values,
  onChange,
  max,
  placeholder,
  optional = false,
}) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState('');
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error || localError ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const addTags = (rawValue) => {
    const candidates = rawValue
      .split(',')
      .map(normalizeTag)
      .filter(Boolean);

    if (candidates.length === 0) {
      setDraft('');
      return;
    }

    if (values.length + candidates.length > max) {
      setLocalError(`Use ${max} tags or fewer.`);
      return;
    }

    const next = [...values];

    for (const candidate of candidates) {
      if (candidate.length > 30) {
        setLocalError('Each tag must be 30 characters or fewer.');
        return;
      }

      if (next.some((value) => value.toLowerCase() === candidate.toLowerCase())) {
        setLocalError(`"${candidate}" is already added.`);
        return;
      }

      next.push(candidate);
    }

    setLocalError('');
    setDraft('');
    onChange(next);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTags(draft);
    } else if (event.key === 'Backspace' && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const removeTag = (tag) => {
    setLocalError('');
    onChange(values.filter((value) => value !== tag));
  };

  return (
    <div
      className={['field', (error || localError) && 'field--error', 'tag-input'].filter(Boolean).join(' ')}
    >
      <div className="field__label-row">
        <label htmlFor={id}>{label}</label>
        {optional && <span className="field__optional">Optional</span>}
      </div>
      {values.length > 0 && (
        <div className="tag-input__values" aria-label={`${label} added`}>
          {values.map((tag) => (
            <span className="skill-tag skill-tag--removable" key={tag}>
              {tag}
              <button
                type="button"
                className="skill-tag__remove"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="tag-input__control">
        <input
          id={id}
          className="field__input"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setLocalError('');
          }}
          onKeyDown={handleKeyDown}
          aria-invalid={error || localError ? 'true' : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          className="tag-input__add"
          onClick={() => addTags(draft)}
          disabled={!draft.trim()}
        >
          Add
        </button>
      </div>
      <p className="field__hint" id={hintId}>
        {hint || `Press Enter or comma to add. Up to ${max} tags.`}
      </p>
      {(error || localError) && (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={14} />
          {error || localError}
        </p>
      )}
    </div>
  );
}
