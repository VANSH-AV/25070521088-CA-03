export const PUBLIC_USER_SELECT = [
  'name',
  'avatarUrl',
  'headline',
  'bio',
  'college',
  'course',
  'graduationYear',
  'skills',
  'links',
  'availability',
  'createdAt',
].join(' ');

export const PUBLIC_PERSON_SELECT = [
  'name',
  'avatarUrl',
  'college',
  'course',
  'graduationYear',
].join(' ');

function userId(value) {
  return String(value?._id || value);
}

function userValue(user) {
  return user && typeof user === 'object' && user.name ? user : null;
}

export function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: userId(user),
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    headline: user.headline || '',
    bio: user.bio || '',
    college: user.college || '',
    course: user.course || '',
    graduationYear: user.graduationYear ?? null,
    skills: user.skills || [],
    links: {
      github: user.links?.github || null,
      linkedin: user.links?.linkedin || null,
      portfolio: user.links?.portfolio || null,
    },
    availability: user.availability || 'open',
    memberSince: user.createdAt || null,
  };
}

export function publicPerson(user) {
  if (!user) {
    return null;
  }

  return {
    id: userId(user),
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    college: user.college || '',
    course: user.course || '',
    graduationYear: user.graduationYear ?? null,
  };
}

export function privateUser(user) {
  return {
    ...user.toJSON(),
    id: userId(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function resolvePerson(value, people) {
  if (!value) {
    return null;
  }

  const resolved = userValue(value) || people?.get(String(value?._id || value)) || null;
  return resolved?.name ? publicPerson(resolved) : null;
}

export function projectCard(project, people = new Map()) {
  const owner = resolvePerson(project.owner, people);
  const members = (project.members || [])
    .map((member) => resolvePerson(member, people))
    .filter(Boolean);
  const memberCount = 1 + members.length;
  const availableSlots = Math.max(0, project.teamSize - memberCount);

  return {
    id: userId(project),
    title: project.title,
    summary: project.summary,
    category: project.category,
    status: project.status,
    requiredSkills: project.requiredSkills || [],
    techStack: project.techStack || [],
    teamSize: project.teamSize,
    memberCount,
    openSlots: project.status === 'recruiting' ? availableSlots : 0,
    deadline: project.deadline || null,
    owner,
    members,
    createdAt: project.createdAt || null,
  };
}

export function projectDetail(project, people = new Map()) {
  return {
    ...projectCard(project, people),
    description: project.description,
    tags: project.tags || [],
    repoUrl: project.repoUrl || null,
    demoUrl: project.demoUrl || null,
    coverImageUrl: project.coverImageUrl || null,
    views: project.views || 0,
    publishedAt: project.publishedAt || null,
    completedAt: project.completedAt || null,
    updatedAt: project.updatedAt || null,
  };
}
