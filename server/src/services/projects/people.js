import { User } from '../../models/User.js';
import { PUBLIC_PERSON_SELECT } from '../../utils/publicData.js';

export async function projectPeople(projects) {
  const ids = new Set();

  for (const project of projects) {
    if (project.owner?._id || project.owner) {
      ids.add(String(project.owner._id || project.owner));
    }

    for (const member of project.members || []) {
      ids.add(String(member._id || member));
    }
  }

  if (ids.size === 0) {
    return new Map();
  }

  const users = await User.find({ _id: { $in: [...ids] } })
    .select(PUBLIC_PERSON_SELECT)
    .lean();

  return new Map(users.map((user) => [String(user._id), user]));
}
