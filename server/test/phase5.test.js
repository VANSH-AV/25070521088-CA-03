import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { Application } from '../src/models/Application.js';
import { Milestone } from '../src/models/Milestone.js';
import { Project } from '../src/models/Project.js';
import { Task } from '../src/models/Task.js';
import { User } from '../src/models/User.js';

const CLIENT_ORIGIN = 'http://localhost:5173';
const writeHeaders = {
  Origin: CLIENT_ORIGIN,
  'X-Requested-With': 'XMLHttpRequest',
};
const password = 'CampusLoop9';
const applicationMessage = 'I can help with research, frontend delivery, and user testing.';

let mongoServer;
let accountNumber = 0;

function connectedDatabase() {
  return Promise.resolve({ connected: true, state: 'connected' });
}

function makeApp(options = {}) {
  return createApp({
    databaseHealth: connectedDatabase,
    authRateLimits: {
      register: { limit: 200 },
      login: { limit: 200 },
      password: { limit: 200 },
    },
    contactRateLimits: { contact: { limit: 100 } },
    ...options,
  });
}

function cookieFrom(response) {
  return (response.headers['set-cookie'] || [])[0]?.split(';')[0];
}

async function registerUser(app, { name = 'Mira Shah', email } = {}) {
  accountNumber += 1;
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/register')
    .set(writeHeaders)
    .send({ name, email: email || `phase5-${accountNumber}@example.com`, password });

  expect(response.status).toBe(201);

  return {
    agent,
    cookie: cookieFrom(response),
    user: response.body.data.user,
    id: response.body.data.user.id || response.body.data.user._id,
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

async function applyToProject(agent, projectId, overrides = {}) {
  return agent
    .post(`/api/projects/${projectId}/applications`)
    .set(writeHeaders)
    .send({ message: applicationMessage, relevantSkills: ['React'], ...overrides });
}

async function decide(agent, applicationId, decision) {
  return agent
    .patch(`/api/applications/${applicationId}/decision`)
    .set(writeHeaders)
    .send({ decision });
}

async function createTask(agent, projectId, overrides = {}) {
  return agent
    .post(`/api/projects/${projectId}/tasks`)
    .set(writeHeaders)
    .send({ title: 'Draft the research plan', ...overrides });
}

async function createMilestone(agent, projectId, overrides = {}) {
  return agent
    .post(`/api/projects/${projectId}/milestones`)
    .set(writeHeaders)
    .send({ title: 'Research complete', ...overrides });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase({ uri: mongoServer.getUri(), dbName: 'flexi_phase5_test' });
  await Promise.all([
    User.init(),
    Project.init(),
    Application.init(),
    Task.init(),
    Milestone.init(),
  ]);
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
    Application.deleteMany({}),
    Task.deleteMany({}),
    Milestone.deleteMany({}),
  ]);
});

describe('applications', () => {
  it('creates a pending application and exposes it only to its applicant', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const applicant = await registerUser(app, { name: 'Noah Kim' });
    const outsider = await registerUser(app, { name: 'Priya Rao' });
    const project = await createProject(owner.agent);

    const created = await applyToProject(applicant.agent, project.id);
    expect(created.status).toBe(201);
    expect(created.body.data.application).toMatchObject({
      status: 'pending',
      message: applicationMessage,
      relevantSkills: ['React'],
    });

    const detail = await applicant.agent.get(`/api/projects/${project.id}`);
    expect(detail.body.data.viewer).toMatchObject({
      canApply: false,
      application: { status: 'pending' },
    });

    const duplicate = await applyToProject(applicant.agent, project.id);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('APPLICATION_ALREADY_EXISTS');

    const self = await applyToProject(owner.agent, project.id);
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe('CANNOT_APPLY_TO_OWN_PROJECT');

    const ownList = await applicant.agent.get('/api/applications/me');
    expect(ownList.status).toBe(200);
    expect(ownList.body.data).toHaveLength(1);
    expect(ownList.body.data[0].project.title).toBe('CampusLoop');
    expect(ownList.body.data[0].canWithdraw).toBe(true);

    const otherList = await outsider.agent.get('/api/applications/me');
    expect(otherList.body.data).toHaveLength(0);

    const reviewer = await outsider.agent.get(`/api/projects/${project.id}/applications`);
    expect(reviewer.status).toBe(403);
  });

  it('keeps applicant email private and lets only the owner review or decide', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const applicant = await registerUser(app, { name: 'Noah Kim' });
    const project = await createProject(owner.agent);
    const application = (await applyToProject(applicant.agent, project.id)).body.data.application;

    const list = await owner.agent.get(`/api/projects/${project.id}/applications`);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({
      id: application.id,
      status: 'pending',
      canDecide: true,
      applicant: { name: 'Noah Kim' },
    });
    expect(list.body.data[0].applicant.email).toBeUndefined();
    expect(list.body.data[0].applicant.role).toBeUndefined();

    const applicantAttempt = await decide(applicant.agent, application.id, 'accepted');
    expect(applicantAttempt.status).toBe(403);

    await User.updateOne({ _id: applicant.id }, { role: 'admin' });
    const adminList = await applicant.agent.get(`/api/projects/${project.id}/applications`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data[0].canDecide).toBe(false);

    const adminDecision = await decide(applicant.agent, application.id, 'rejected');
    expect(adminDecision.status).toBe(403);
    expect(adminDecision.body.error.code).toBe('ADMIN_READ_ONLY');
  });

  it('withdraws once, rejects terminal reapplication, and blocks closed projects', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const applicant = await registerUser(app, { name: 'Noah Kim' });
    const project = await createProject(owner.agent);
    const application = (await applyToProject(applicant.agent, project.id)).body.data.application;

    const withdrawn = await applicant.agent
      .patch(`/api/applications/${application.id}/withdraw`)
      .set(writeHeaders);
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.application.status).toBe('withdrawn');

    const repeated = await applicant.agent
      .patch(`/api/applications/${application.id}/withdraw`)
      .set(writeHeaders);
    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe('APPLICATION_ALREADY_DECIDED');

    const reapplication = await applyToProject(applicant.agent, project.id);
    expect(reapplication.status).toBe(409);
    expect(reapplication.body.error.code).toBe('APPLICATION_ALREADY_EXISTS');

    const closed = await createProject(owner.agent, {
      title: 'Closed brief',
      status: 'draft',
      deadline: null,
    });
    const closedApply = await applyToProject(applicant.agent, closed.id);
    expect(closedApply.status).toBe(404);

    await owner.agent
      .patch(`/api/projects/${project.id}`)
      .set(writeHeaders)
      .send({ status: 'in_progress' });
    const lateApply = await applyToProject(
      await registerUser(app, { name: 'Rae Bell' }).then((account) => account.agent),
      project.id,
    );
    expect(lateApply.status).toBe(409);
    expect(lateApply.body.error.code).toBe('PROJECT_NOT_RECRUITING');
  });
});

describe('application decisions', () => {
  it('accepts one applicant into the team and rejects another without adding them', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const acceptedUser = await registerUser(app, { name: 'Noah Kim' });
    const rejectedUser = await registerUser(app, { name: 'Priya Rao' });
    const project = await createProject(owner.agent, { teamSize: 3 });
    const acceptedApplication = (
      await applyToProject(acceptedUser.agent, project.id)
    ).body.data.application;
    const rejectedApplication = (
      await applyToProject(rejectedUser.agent, project.id)
    ).body.data.application;

    const accepted = await decide(owner.agent, acceptedApplication.id, 'accepted');
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.application.status).toBe('accepted');
    expect(accepted.body.data.project.memberCount).toBe(2);
    expect(accepted.body.data.project.members.map((member) => member.id)).toContain(
      acceptedUser.id,
    );

    const repeated = await decide(owner.agent, acceptedApplication.id, 'accepted');
    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe('APPLICATION_ALREADY_DECIDED');

    const rejected = await decide(owner.agent, rejectedApplication.id, 'rejected');
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.application.status).toBe('rejected');

    const stored = await Project.findById(project.id);
    expect(stored.members.map(String)).toEqual([acceptedUser.id]);
    expect(stored.status).toBe('recruiting');

    const workspace = await acceptedUser.agent.get(`/api/projects/${project.id}/workspace`);
    expect(workspace.status).toBe(200);
    expect(workspace.body.data.permissions).toMatchObject({
      isOwner: false,
      isMember: true,
      canCreateTasks: true,
      canManageMilestones: false,
    });
  });

  it('awards the last slot to exactly one concurrent acceptance', async () => {
    const app = makeApp();
    const owner = await registerUser(app);
    const first = await registerUser(app, { name: 'Noah Kim' });
    const second = await registerUser(app, { name: 'Priya Rao' });
    const project = await createProject(owner.agent, { teamSize: 2 });
    const firstApplication = (await applyToProject(first.agent, project.id)).body.data
      .application;
    const secondApplication = (await applyToProject(second.agent, project.id)).body.data
      .application;

    const [firstResult, secondResult] = await Promise.all([
      request(app)
        .patch(`/api/applications/${firstApplication.id}/decision`)
        .set(writeHeaders)
        .set('Cookie', owner.cookie)
        .send({ decision: 'accepted' }),
      request(app)
        .patch(`/api/applications/${secondApplication.id}/decision`)
        .set(writeHeaders)
        .set('Cookie', owner.cookie)
        .send({ decision: 'accepted' }),
    ]);

    expect([firstResult.status, secondResult.status].sort()).toEqual([200, 409]);
    const failed = [firstResult, secondResult].find((result) => result.status === 409);
    expect(['TEAM_FULL', 'PROJECT_NOT_RECRUITING']).toContain(failed.body.error.code);

    const storedProject = await Project.findById(project.id);
    expect(storedProject.members).toHaveLength(1);
    expect(storedProject.status).toBe('in_progress');
    const applications = await Application.find({ project: project.id }).sort({ createdAt: 1 });
    expect(applications.filter((application) => application.status === 'accepted')).toHaveLength(1);
    expect(applications.filter((application) => application.status === 'pending')).toHaveLength(1);
  });
});

describe('workspace tasks and milestones', () => {
  async function workspaceFixture(app) {
    const owner = await registerUser(app, { name: 'Mira Shah' });
    const member = await registerUser(app, { name: 'Noah Kim' });
    const outsider = await registerUser(app, { name: 'Priya Rao' });
    const project = await createProject(owner.agent, { teamSize: 3 });
    const application = (await applyToProject(member.agent, project.id)).body.data.application;
    await decide(owner.agent, application.id, 'accepted');

    return { owner, member, outsider, project };
  }

  it('enforces task assignment and member edit rules while tracking completion', async () => {
    const app = makeApp();
    const { owner, member, outsider, project } = await workspaceFixture(app);
    const milestone = await createMilestone(owner.agent, project.id);
    expect(milestone.status).toBe(201);

    const ownedTask = await createTask(owner.agent, project.id, {
      title: 'Owner task',
      milestoneId: milestone.body.data.milestone.id,
    });
    expect(ownedTask.status).toBe(201);

    const memberTask = await createTask(owner.agent, project.id, {
      title: 'Member task',
      assignedTo: member.id,
      milestoneId: milestone.body.data.milestone.id,
    });
    expect(memberTask.status).toBe(201);
    expect(memberTask.body.data.task.assignedTo).toMatchObject({ id: member.id });

    const selfTask = await createTask(member.agent, project.id, {
      title: 'Self assigned task',
      assignedTo: member.id,
    });
    expect(selfTask.status).toBe(201);

    const invalidAssignment = await createTask(member.agent, project.id, {
      title: 'Not allowed',
      assignedTo: owner.id,
    });
    expect(invalidAssignment.status).toBe(403);

    const invalidMember = await createTask(owner.agent, project.id, {
      title: 'Bad assignee',
      assignedTo: outsider.id,
    });
    expect(invalidMember.status).toBe(422);
    expect(invalidMember.body.error.code).toBe('INVALID_ASSIGNEE');

    const otherProject = await createProject(owner.agent, {
      title: 'Other project',
      teamSize: 3,
    });
    const otherMilestone = await createMilestone(owner.agent, otherProject.id);
    const wrongMilestone = await createTask(owner.agent, project.id, {
      title: 'Wrong milestone',
      milestoneId: otherMilestone.body.data.milestone.id,
    });
    expect(wrongMilestone.status).toBe(422);
    expect(wrongMilestone.body.error.code).toBe('INVALID_MILESTONE');

    const memberEdit = await member.agent
      .patch(`/api/tasks/${memberTask.body.data.task.id}`)
      .set(writeHeaders)
      .send({ status: 'done' });
    expect(memberEdit.status).toBe(200);
    expect(memberEdit.body.data.task.status).toBe('done');
    expect(memberEdit.body.data.task.completedAt).toEqual(expect.any(String));

    const reopen = await member.agent
      .patch(`/api/tasks/${memberTask.body.data.task.id}`)
      .set(writeHeaders)
      .send({ status: 'in_progress' });
    expect(reopen.status).toBe(200);
    expect(reopen.body.data.task.completedAt).toBeNull();

    const foreignEdit = await member.agent
      .patch(`/api/tasks/${ownedTask.body.data.task.id}`)
      .set(writeHeaders)
      .send({ status: 'done' });
    expect(foreignEdit.status).toBe(403);

    const outsiderRead = await outsider.agent.get(`/api/projects/${project.id}/tasks`);
    expect(outsiderRead.status).toBe(403);

    const list = await member.agent.get(
      `/api/projects/${project.id}/tasks?assignee=me&sort=dueDate`,
    );
    expect(list.status).toBe(200);
    expect(list.body.data.map((task) => task.title)).toEqual(
      expect.arrayContaining(['Member task', 'Self assigned task']),
    );

    const workspace = await owner.agent.get(`/api/projects/${project.id}/workspace`);
    expect(workspace.body.data.progress).toMatchObject({
      doneTasks: 0,
      totalTasks: 3,
      percent: 0,
    });
    expect(workspace.body.data.counts.milestones).toBe(1);

    const memberDelete = await member.agent
      .delete(`/api/tasks/${selfTask.body.data.task.id}`)
      .set(writeHeaders);
    expect(memberDelete.status).toBe(403);

    const ownerDelete = await owner.agent
      .delete(`/api/tasks/${selfTask.body.data.task.id}`)
      .set(writeHeaders);
    expect(ownerDelete.status).toBe(204);
  });

  it('restricts milestones to owners and protects milestones with tasks', async () => {
    const app = makeApp();
    const { owner, member, project } = await workspaceFixture(app);
    const milestone = await createMilestone(owner.agent, project.id);
    const milestoneId = milestone.body.data.milestone.id;
    const task = await createTask(owner.agent, project.id, {
      title: 'Linked task',
      milestoneId,
    });

    const memberCreate = await createMilestone(member.agent, project.id, {
      title: 'Member milestone',
    });
    expect(memberCreate.status).toBe(403);

    const completed = await owner.agent
      .patch(`/api/milestones/${milestoneId}`)
      .set(writeHeaders)
      .send({ status: 'completed' });
    expect(completed.status).toBe(200);
    expect(completed.body.data.milestone.completedAt).toEqual(expect.any(String));
    expect(completed.body.data.milestone.taskCount).toBe(1);
    expect(completed.body.data.milestone.progress).toBe(0);

    const blockedDelete = await owner.agent
      .delete(`/api/milestones/${milestoneId}`)
      .set(writeHeaders);
    expect(blockedDelete.status).toBe(409);
    expect(blockedDelete.body.error.code).toBe('MILESTONE_HAS_TASKS');

    await owner.agent
      .patch(`/api/tasks/${task.body.data.task.id}`)
      .set(writeHeaders)
      .send({ milestoneId: null, status: 'done' })
      .expect(200);

    const deleted = await owner.agent
      .delete(`/api/milestones/${milestoneId}`)
      .set(writeHeaders);
    expect(deleted.status).toBe(204);

    const badSort = await owner.agent.get(
      `/api/projects/${project.id}/milestones?sort=priority`,
    );
    expect(badSort.status).toBe(400);
    expect(badSort.body.error.code).toBe('INVALID_SORT');
  });

  it('keeps archived workspaces readable and admin access read-only', async () => {
    const app = makeApp();
    const { owner, member, project } = await workspaceFixture(app);
    await Project.updateOne({ _id: project.id }, { status: 'archived' });

    const read = await member.agent.get(`/api/projects/${project.id}/workspace`);
    expect(read.status).toBe(200);
    expect(read.body.data.permissions.readOnly).toBe(true);

    const blockedTask = await createTask(owner.agent, project.id, { title: 'Blocked task' });
    expect(blockedTask.status).toBe(409);
    expect(blockedTask.body.error.code).toBe('CONFLICT');

    const blockedMilestone = await createMilestone(owner.agent, project.id, {
      title: 'Blocked milestone',
    });
    expect(blockedMilestone.status).toBe(409);

    await User.updateOne({ _id: member.id }, { role: 'admin' });
    const adminWorkspace = await member.agent.get(`/api/projects/${project.id}/workspace`);
    expect(adminWorkspace.status).toBe(200);
    expect(adminWorkspace.body.data.permissions).toMatchObject({
      isAdmin: true,
      readOnly: true,
      canManageMilestones: false,
      canCreateTasks: false,
    });
  });
});
