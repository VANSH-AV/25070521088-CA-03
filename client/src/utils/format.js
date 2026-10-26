const deadlineFormatter = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const timestampFormatter = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value) {
  if (!value) {
    return 'No deadline';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No deadline' : deadlineFormatter.format(date);
}

export function formatShortDate(value) {
  return formatDate(value);
}

export function formatTimestamp(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : timestampFormatter.format(date);
}

export function formatMonthYear(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

export const categoryLabels = {
  web: 'Web',
  mobile: 'Mobile',
  ai_ml: 'AI / ML',
  data: 'Data',
  design: 'Design',
  hardware: 'Hardware',
  research: 'Research',
  other: 'Other',
};

export const statusLabels = {
  draft: 'Draft',
  recruiting: 'Recruiting',
  in_progress: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

export const availabilityLabels = {
  open: 'Open to collaborate',
  limited: 'Limited availability',
  unavailable: 'Not available',
};

export function projectAvailabilityLabel(project) {
  if (project.status !== 'recruiting') {
    return 'Not recruiting';
  }

  if (!project.openSlots) {
    return 'Team full';
  }

  return `${project.openSlots} ${project.openSlots === 1 ? 'spot' : 'spots'} open`;
}

export const projectCategories = Object.entries(categoryLabels).map(([value, label]) => ({
  value,
  label,
}));

export function projectInitials(title = '') {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export const categoryTones = {
  web: 'cobalt',
  mobile: 'tangerine',
  ai_ml: 'ink',
  data: 'mint',
  design: 'tangerine',
  hardware: 'amber',
  research: 'mint',
  other: 'slate',
};
