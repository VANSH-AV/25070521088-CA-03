import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { ContactMessage } from '../src/models/ContactMessage.js';
import { Project } from '../src/models/Project.js';
import { User } from '../src/models/User.js';

const CLIENT_ORIGIN = 'http://localhost:5173';
const writeHeaders = {
  Origin: CLIENT_ORIGIN,
  'X-Requested-With': 'XMLHttpRequest',
};
const password = 'CampusLoop9';

let mongoServer;

function connectedDatabase() {
  return Promise.resolve({ connected: true, state: 'connected' });
}

function makeApp(options = {}) {
  return createApp({
    databaseHealth: connectedDatabase,
    authRateLimits: {
      register: { limit: 100 },
      login: { limit: 100 },
      password: { limit: 100 },
    },
    contactRateLimits: { contact: { limit: 100 } },
    ...options,
  });
}

async function registerUser(app, {
  name = 'Mira Shah',
  email = 'mira@example.com',
} = {}) {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/register')
    .set(writeHeaders)
    .send({ name, email, password });

  expect(response.status).toBe(201);

  return {
    agent,
    user: response.body.data.user,
    id: response.body.data.user._id,
  };
}

function projectPayload(overrides = {}) {
  return {
    title: 'CampusLoop',
    summary: 'A calmer way to share campus resources.',
    description: 'A focused student project that helps campus communities share resources.',
    category: 'web',
    techStack: ['React', 'Node.js'],
    requiredSkills: ['UX research'],
    teamSize: 4,
    deadline: '2099-12-31',
    repoUrl: null,
    demoUrl: null,
    coverImageUrl: null,
    tags: ['campus'],
    status: 'recruiting',
    ...overrides,
  };
}

async function createProject(agent, overrides = {}) {
  const response = await agent
    .post('/api/projects')
    .set(writeHeaders)
    .send(projectPayload(overrides));

  expect(response.status).toBe(201);
  return response.body.data.project;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase({ uri: mongoServer.getUri(), dbName: 'flexi_phase4_test' });
  await Promise.all([User.init(), Project.init(), ContactMessage.init()]);
}, 120000);

afterAll(async () => {
  await disconnectDatabase();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    ContactMessage.deleteMany({}),
  ]);
});

describe('profiles', () => {
  it('returns only public profile fields and public projects', async () => {
    const app = makeApp();
    const owner = await registerUser(app);

    await owner.agent
      .patch('/api/users/me')
      .set(writeHeaders)
      .send({
        headline: 'Product designer and frontend builder',
        bio: 'I like calm tools for busy campuses.',
        college: 'Cedar College',
        course: 'Interaction Design',
        graduationYear: 2027,
        skills: ['  React  ', 'UI  research'],
        links: { portfolio: 'https://example.com/mira' },
        availability: 'limited',
      })
      .expect(200);

    await createProject(owner.agent);
    await createProject(owner.agent, {
      title: 'Private sketchbook',
      summary: 'A private working title that is not ready.',
      status: 'draft',
      deadline: null,
    });

    const response = await request(app).get(`/api/users/${owner.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      id: owner.id,
      name: 'Mira Shah',
      headline: 'Product designer and frontend builder',
      college: 'Cedar College',
      skills: ['React', 'UI research'],
      availability: 'limited',
    });
    expect(response.body.data.user.email).toBeUndefined();
    expect(response.body.data.user.role).toBeUndefined();
    expect(response.body.data.user.isActive).toBeUndefined();
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.tokenVersion).toBeUndefined();
    expect(response.body.data.projects).toHaveLength(1);
    expect(response.body.data.projects[0].status).toBe('recruiting');
  });

  it('updates only whitelisted profile fields and normalizes tags', async () => {
    const app = makeApp();
    const account = await registerUser(app);

    const response = await account.agent
      .patch('/api/users/me')
      .set(writeHeaders)
      .send({
        name: '  Mira   Shah  ',
        skills: ['  React ', 'Node  JS'],
        links: { github: 'https://github.com/mira' },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user.name).toBe('Mira Shah');
    expect(response.body.data.user.skills).toEqual(['React', 'Node JS']);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(response.body.data.user).not.toHaveProperty('tokenVersion');

    const rejected = await account.agent
      .patch('/api/users/me')
      .set(writeHeaders)
      .send({ role: 'admin', email: 'other@example.com' });

    expect(rejected.status).toBe(422);
    expect(rejected.body.error.fields).toHaveProperty('role');
    expect(rejected.body.error.fields).toHaveProperty('email');

    const stored = await User.findById(account.id);
    expect(stored.role).toBe('student');
    expect(stored.email).toBe('mira@example.com');
  });

  it('rejects duplicate skills, bad links, empty patches, and unauthenticated writes', async () => {
    const app = makeApp();
    const account = await registerUser(app);

    const duplicate = await account.agent
      .patch('/api/users/me')
      .set(writeHeaders)
      .send({ skills: ['React', 'react'] });
    expect(duplicate.status).toBe(422);

    const badLink = await account.agent
      .patch('/api/users/me')
      .set(writeHeaders)
      .send({ links: { portfolio: 'javascript:alert(1)' } });
    expect(badLink.status).toBe(422);

    const empty = await account.agent
      .patch('/api/users/me')
      .set(writeHeaders)
      .send({});
    expect(empty.status).toBe(422);

    const anonymous = await request(app)
      .patch('/api/users/me')
      .set(writeHeaders)
      .send({ headline: 'Nope' });
    expect(anonymous.status).toBe(401);

    const otherAccount = await request(app)
      .patch(`/api/users/${account.id}`)
      .set(writeHeaders)
      .send({ headline: 'Cross-account edit' });
    expect(otherAccount.status).toBe(404);
  });

  it('returns 400 for malformed ids and 404 for missing or inactive profiles', async () => {
    const app = makeApp();
    const account = await registerUser(app);

    const invalid = await request(app).get('/api/users/not-an-id');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_ID');

    const missing = await request(app).get('/api/users/507f1f77bcf86cd799439011');
    expect(missing.status).toBe(404);

    await User.updateOne({ _id: account.id }, { isActive: false });
    const inactive = await request(app).get(`/api/users/${account.id}`);
    expect(inactive.status).toBe(404);
  });

  it('returns private account data only to its owner and lists owned projects', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const project = await createProject(owner.agent);

    const anonymous = await request(app).get('/api/users/me');
    expect(anonymous.status).toBe(401);

    const mine = await owner.agent.get('/api/users/me');
    expect(mine.status).toBe(200);
    expect(mine.body.data.user.email).toBe('mira@example.com');
    expect(mine.body.data.counts).toEqual({ ownedProjects: 1, memberProjects: 0 });

    const projects = await owner.agent.get('/api/users/me/projects?role=owned');
    expect(projects.status).toBe(200);
    expect(projects.body.meta.total).toBe(1);
    expect(projects.body.data[0]).toMatchObject({
      id: project.id,
      role: 'owner',
      status: 'recruiting',
    });
  });
});

describe('project creation and ownership', () => {
  it('derives the owner, hides drafts publicly, and rejects protected fields', async () => {
    const app = makeApp();
    const owner = await registerUser(app);

    const draftResponse = await owner.agent
      .post('/api/projects')
      .set(writeHeaders)
      .send(projectPayload({ status: 'draft', deadline: null }));

    expect(draftResponse.status).toBe(201);
    expect(draftResponse.body.data.project).toMatchObject({
      title: 'CampusLoop',
      status: 'draft',
      owner: { id: owner.id, name: 'Mira Shah' },
    });
    expect(draftResponse.body.data.project.id).toEqual(expect.any(String));

    const publicList = await request(app).get('/api/projects');
    expect(publicList.body.meta.total).toBe(0);

    const rejected = await owner.agent
      .post('/api/projects')
      .set(writeHeaders)
      .send(projectPayload({ owner: '507f1f77bcf86cd799439011' }));
    expect(rejected.status).toBe(422);
    expect(rejected.body.error.fields).toHaveProperty('owner');

    const selfMember = await owner.agent
      .post('/api/projects')
      .set(writeHeaders)
      .send(projectPayload({ members: [owner.id] }));
    expect(selfMember.status).toBe(422);
    expect(selfMember.body.error.fields).toHaveProperty('members');

    const missingDeadline = await owner.agent
      .post('/api/projects')
      .set(writeHeaders)
      .send(projectPayload({ deadline: null }));
    expect(missingDeadline.status).toBe(422);
    expect(missingDeadline.body.error.fields).toHaveProperty('deadline');
  });

  it('publishes recruiting projects with a server timestamp and blocks admins', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const project = await createProject(owner.agent);

    expect(project.status).toBe('recruiting');
    expect(project.publishedAt).toEqual(expect.any(String));

    const admin = await registerUser(app, {
      name: 'Admin User',
      email: 'admin@example.com',
    });
    await User.updateOne({ _id: admin.id }, { role: 'admin' });

    const denied = await admin.agent
      .post('/api/projects')
      .set(writeHeaders)
      .send(projectPayload({ title: 'Admin idea' }));

    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents non-owners from editing or archiving a project', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const other = await registerUser(app, {
      name: 'Dev Patel',
      email: 'dev@example.com',
    });
    const project = await createProject(owner.agent);

    const edit = await other.agent
      .patch(`/api/projects/${project.id}`)
      .set(writeHeaders)
      .send({ title: 'Stolen project' });
    expect(edit.status).toBe(403);

    const archive = await other.agent
      .delete(`/api/projects/${project.id}`)
      .set(writeHeaders);
    expect(archive.status).toBe(403);

    const ownerEdit = await owner.agent
      .patch(`/api/projects/${project.id}`)
      .set(writeHeaders)
      .send({ title: 'CampusLoop v2' });
    expect(ownerEdit.status).toBe(200);
    expect(ownerEdit.body.data.project.title).toBe('CampusLoop v2');
  });

  it('rejects protected updates, invalid transitions, and undersized teams', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const memberOne = await registerUser(app, {
      name: 'Dev Patel',
      email: 'dev@example.com',
    });
    const memberTwo = await registerUser(app, {
      name: 'Nia Thomas',
      email: 'nia@example.com',
    });

    const project = await Project.create({
      ...projectPayload(),
      deadline: new Date('2099-12-31T23:59:59.999Z'),
      owner: owner.id,
      members: [memberOne.id, memberTwo.id],
      teamSize: 3,
    });

    const protectedField = await owner.agent
      .patch(`/api/projects/${project.id}`)
      .set(writeHeaders)
      .send({ owner: memberOne.id });
    expect(protectedField.status).toBe(422);

    const invalidTransition = await owner.agent
      .patch(`/api/projects/${project.id}`)
      .set(writeHeaders)
      .send({ status: 'draft' });
    expect(invalidTransition.status).toBe(409);
    expect(invalidTransition.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const undersized = await owner.agent
      .patch(`/api/projects/${project.id}`)
      .set(writeHeaders)
      .send({ teamSize: 2 });
    expect(undersized.status).toBe(409);
    expect(undersized.body.error.code).toBe('TEAM_SIZE_BELOW_CURRENT');
  });

  it('archives published projects and hard-deletes untouched drafts', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const published = await createProject(owner.agent);
    const draft = await createProject(owner.agent, {
      title: 'Untouched draft',
      summary: 'A draft that has not been shared yet.',
      status: 'draft',
      deadline: null,
    });

    const archived = await owner.agent
      .delete(`/api/projects/${published.id}`)
      .set(writeHeaders);
    expect(archived.status).toBe(200);
    expect(archived.body.data.archived).toBe(true);
    expect(archived.body.data.project.status).toBe('archived');
    expect(await Project.findById(published.id)).not.toBeNull();

    const archivedEdit = await owner.agent
      .patch(`/api/projects/${published.id}`)
      .set(writeHeaders)
      .send({ title: 'Archived but edited' });
    expect(archivedEdit.status).toBe(409);
    expect(archivedEdit.body.error.code).toBe('CONFLICT');
    expect((await Project.findById(published.id)).title).toBe('CampusLoop');

    const deleted = await owner.agent
      .delete(`/api/projects/${draft.id}`)
      .set(writeHeaders);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.archived).toBe(false);
    expect(await Project.findById(draft.id)).toBeNull();
  });
});

describe('project discovery', () => {
  it('excludes drafts, archived, and hidden projects from public discovery', async () => {
    const app = makeApp();
    const owner = await registerUser(app);

    await createProject(owner.agent, { title: 'Public recruiting' });
    const inProgress = await createProject(owner.agent, {
      title: 'Public in progress',
    });
    await owner.agent
      .patch(`/api/projects/${inProgress.id}`)
      .set(writeHeaders)
      .send({ status: 'in_progress' })
      .expect(200);
    const completed = await createProject(owner.agent, {
      title: 'Public completed',
    });
    await owner.agent
      .patch(`/api/projects/${completed.id}`)
      .set(writeHeaders)
      .send({ status: 'completed' })
      .expect(200);
    await createProject(owner.agent, {
      title: 'Draft project',
      status: 'draft',
      deadline: null,
    });
    const archived = await createProject(owner.agent, {
      title: 'Archived project',
    });
    await owner.agent
      .patch(`/api/projects/${archived.id}`)
      .set(writeHeaders)
      .send({ status: 'archived' })
      .expect(200);
    await Project.updateOne({ title: 'Public recruiting' }, { isHidden: true });

    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(2);
    expect(response.body.data.map((project) => project.title).sort()).toEqual([
      'Public completed',
      'Public in progress',
    ]);
  });

  it('combines search, skill, category, status, sorting, and pagination', async () => {
    const app = makeApp();
    const owner = await registerUser(app);

    await createProject(owner.agent, {
      title: 'CampusLoop',
      requiredSkills: ['React', 'UX research'],
      techStack: ['React'],
      category: 'web',
      deadline: '2099-10-10',
    });
    const radio = await createProject(owner.agent, {
      title: 'Campus Radio',
      summary: 'A student audio archive for the whole campus.',
      requiredSkills: ['React'],
      techStack: ['React'],
      category: 'web',
      deadline: '2099-11-11',
    });
    await owner.agent
      .patch(`/api/projects/${radio.id}`)
      .set(writeHeaders)
      .send({ status: 'in_progress' })
      .expect(200);
    await createProject(owner.agent, {
      title: 'Campus Materials',
      summary: 'A research catalogue for campus lab materials.',
      requiredSkills: ['React'],
      category: 'research',
      deadline: '2099-12-12',
    });
    await createProject(owner.agent, {
      title: 'Unrelated project',
      summary: 'This should not match the campus text search.',
      requiredSkills: ['Rust'],
      category: 'data',
      deadline: '2099-09-09',
    });

    const search = await request(app).get('/api/projects?q=campus&skill=react&category=web');
    expect(search.status).toBe(200);
    expect(search.body.data.map((project) => project.title).sort()).toEqual([
      'Campus Radio',
      'CampusLoop',
    ]);

    const sorted = await request(app)
      .get('/api/projects?skill=react&sort=deadline&page=1&limit=2');
    expect(sorted.status).toBe(200);
    expect(sorted.body.meta).toEqual({ page: 1, limit: 2, total: 3, pages: 2 });
    expect(sorted.body.data.map((project) => project.title)).toEqual([
      'CampusLoop',
      'Campus Radio',
    ]);

    const status = await request(app).get('/api/projects?status=in_progress');
    expect(status.body.data).toHaveLength(1);
    expect(status.body.data[0].title).toBe('Campus Radio');

    const firstPage = await request(app).get('/api/projects?sort=newest&limit=2&page=1');
    const secondPage = await request(app).get('/api/projects?sort=newest&limit=2&page=2');
    const firstIds = firstPage.body.data.map((project) => project.id);
    const secondIds = secondPage.body.data.map((project) => project.id);
    expect(firstIds).toHaveLength(2);
    expect(secondIds).toHaveLength(2);
    expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);

    const slotSort = await request(app).get('/api/projects?sort=slots');
    expect(slotSort.status).toBe(200);
    expect(slotSort.body.data[0].status).toBe('recruiting');
    expect(slotSort.body.data[0].openSlots).toBeGreaterThanOrEqual(
      slotSort.body.data.at(-1).openSlots,
    );
  });

  it('rejects invalid filters, sort values, and pagination values', async () => {
    const app = makeApp();

    const sort = await request(app).get('/api/projects?sort=rawMongo');
    expect(sort.status).toBe(400);
    expect(sort.body.error.code).toBe('INVALID_SORT');

    const page = await request(app).get('/api/projects?page=0');
    expect(page.status).toBe(400);
    expect(page.body.error.code).toBe('INVALID_PAGINATION');

    const limit = await request(app).get('/api/projects?limit=500');
    expect(limit.status).toBe(400);
    expect(limit.body.error.code).toBe('INVALID_PAGINATION');

    const category = await request(app).get('/api/projects?category=space');
    expect(category.status).toBe(422);
    expect(category.body.error.fields).toHaveProperty('category');

    const status = await request(app).get('/api/projects?status=draft');
    expect(status.status).toBe(422);
    expect(status.body.error.fields).toHaveProperty('status');
  });

  it('returns public detail, increments views, and hides private projects', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const project = await createProject(owner.agent);
    const draft = await createProject(owner.agent, {
      title: 'Owner-only draft',
      summary: 'A working draft that is not yet public.',
      status: 'draft',
      deadline: null,
    });

    const detail = await request(app).get(`/api/projects/${project.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.project).toMatchObject({
      id: project.id,
      title: 'CampusLoop',
      views: 1,
      owner: { id: owner.id, name: 'Mira Shah' },
    });
    expect(detail.body.data.project.owner.email).toBeUndefined();
    expect(detail.body.data.viewer).toEqual({ isOwner: false, canManage: false });

    const secondView = await request(app).get(`/api/projects/${project.id}`);
    expect(secondView.body.data.project.views).toBe(2);

    const guestDraft = await request(app).get(`/api/projects/${draft.id}`);
    expect(guestDraft.status).toBe(404);

    const ownerDraft = await owner.agent.get(`/api/projects/${draft.id}`);
    expect(ownerDraft.status).toBe(200);
    expect(ownerDraft.body.data.viewer).toEqual({ isOwner: true, canManage: true });

    const invalid = await request(app).get('/api/projects/not-an-id');
    expect(invalid.status).toBe(400);
  });
});

describe('contact', () => {
  it('stores a valid contact message and returns a generic confirmation', async () => {
    const app = makeApp();

    const response = await request(app)
      .post('/api/contact')
      .set(writeHeaders)
      .send({
        name: 'Mira Shah',
        email: 'MIRA@EXAMPLE.COM',
        subject: 'Joining a project',
        message: 'I would like to know how project applications will work.',
        website: '',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: { message: 'Thanks — your message has been received.' },
    });

    const stored = await ContactMessage.findOne({ email: 'mira@example.com' });
    expect(stored).toMatchObject({
      name: 'Mira Shah',
      subject: 'Joining a project',
      status: 'new',
    });
    expect(stored.handledAt).toBeNull();
  });

  it('validates contact fields and rejects unknown properties', async () => {
    const app = makeApp();

    const invalid = await request(app)
      .post('/api/contact')
      .set(writeHeaders)
      .send({ name: 'M', email: 'bad', subject: '', message: 'short' });

    expect(invalid.status).toBe(422);
    expect(invalid.body.error.fields).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        email: expect.any(String),
        subject: expect.any(String),
        message: expect.any(String),
      }),
    );

    const unknown = await request(app)
      .post('/api/contact')
      .set(writeHeaders)
      .send({
        name: 'Mira Shah',
        email: 'mira@example.com',
        subject: 'Hello',
        message: 'This is a valid contact message body.',
        internalStatus: 'resolved',
      });

    expect(unknown.status).toBe(422);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('silently discards honeypot submissions without persisting them', async () => {
    const app = makeApp();

    const response = await request(app)
      .post('/api/contact')
      .set(writeHeaders)
      .send({
        name: 'Spam Bot',
        email: 'bot@example.com',
        subject: 'Automated offer',
        message: 'This message was generated by an automated bot.',
        website: 'https://spam.example',
      });

    expect(response.status).toBe(201);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it('rate limits contact submissions and does not expose an inbox route', async () => {
    const app = makeApp({ contactRateLimits: { contact: { limit: 1 } } });
    const payload = {
      name: 'Mira Shah',
      email: 'mira@example.com',
      subject: 'One message',
      message: 'This is the first contact message body.',
    };

    const first = await request(app).post('/api/contact').set(writeHeaders).send(payload);
    const second = await request(app).post('/api/contact').set(writeHeaders).send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('RATE_LIMITED');
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(0);

    const inbox = await request(app).get('/api/contact');
    expect(inbox.status).toBe(404);
  });
});
