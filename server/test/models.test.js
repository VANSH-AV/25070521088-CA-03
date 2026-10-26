import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import {
  Application,
  ContactMessage,
  Milestone,
  Notification,
  Project,
  Report,
  SavedProject,
  Task,
  User,
} from '../src/models/index.js';

const modelList = [
  Application,
  ContactMessage,
  Milestone,
  Notification,
  Project,
  Report,
  SavedProject,
  Task,
  User,
];

let mongoServer;

const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

async function validationErrorFor(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('Expected a validation error, but the document was saved.');
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase({
    uri: mongoServer.getUri(),
    dbName: 'flexi_model_test',
  });
  await Promise.all(modelList.map((model) => model.init()));
}, 120000);

afterAll(async () => {
  await disconnectDatabase();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Promise.all(modelList.map((model) => model.deleteMany({})));
});

describe('database health integration', () => {
  it('reports healthy when the in-memory database is connected', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-database-ready']).toBe('true');
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    });
  });
});

describe('User model', () => {
  it('creates a valid student and hides the password hash by default', async () => {
    const user = await User.create({
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      passwordHash: 'hashed-password',
      skills: ['React', 'Node.js'],
    });

    expect(user.email).toBe('ada@example.com');
    expect(user.role).toBe('student');
    expect(user.availability).toBe('open');

    const found = await User.findById(user._id);
    expect(found.passwordHash).toBeUndefined();
  });

  it('enforces unique case-insensitive emails', async () => {
    await User.create({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      passwordHash: 'hash-one',
    });

    await expect(
      User.create({
        name: 'Grace Hopper',
        email: 'ADA@example.com',
        passwordHash: 'hash-two',
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('rejects duplicate skills and unsafe profile URLs', async () => {
    const duplicateSkills = await validationErrorFor(
      User.create({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        passwordHash: 'hash',
        skills: ['React', 'react'],
      }),
    );

    expect(duplicateSkills.name).toBe('ValidationError');
    expect(duplicateSkills.errors).toHaveProperty('skills');

    const unsafeUrl = await validationErrorFor(
      User.create({
        name: 'Ada Lovelace',
        email: 'url@example.com',
        passwordHash: 'hash',
        links: { github: 'javascript:alert(1)' },
      }),
    );

    expect(unsafeUrl.name).toBe('ValidationError');
    expect(unsafeUrl.errors).toHaveProperty('links.github');
  });

  it('creates the expected unique email index', async () => {
    const indexes = await User.collection.indexes();
    const emailIndex = indexes.find((index) => index.key.email === 1);

    expect(emailIndex).toMatchObject({ unique: true });
  });
});

describe('Project model', () => {
  it('creates a recruiting project with publication state', async () => {
    const owner = new mongoose.Types.ObjectId();
    const member = new mongoose.Types.ObjectId();
    const project = await Project.create({
      owner,
      title: 'Campus Compass',
      summary: 'A campus navigation platform for new students.',
      description:
        'A collaborative project that maps buildings, services, and student spaces on campus.',
      teamSize: 4,
      members: [member],
      status: 'recruiting',
      deadline: futureDate(),
      requiredSkills: ['React'],
      techStack: ['React', 'Node.js'],
    });

    expect(project.status).toBe('recruiting');
    expect(project.publishedAt).toBeInstanceOf(Date);
    expect(project.completedAt).toBeNull();
  });

  it('rejects the owner as a member and members beyond capacity', async () => {
    const owner = new mongoose.Types.ObjectId();

    const ownerAsMember = await validationErrorFor(
      Project.create({
        owner,
        title: 'Campus Compass',
        summary: 'A campus navigation platform for new students.',
        description:
          'A collaborative project that maps buildings, services, and student spaces on campus.',
        teamSize: 4,
        members: [owner],
      }),
    );

    expect(ownerAsMember.errors).toHaveProperty('members');

    const overCapacity = await validationErrorFor(
      Project.create({
        owner,
        title: 'Campus Compass',
        summary: 'A campus navigation platform for new students.',
        description:
          'A collaborative project that maps buildings, services, and student spaces on campus.',
        teamSize: 2,
        members: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      }),
    );

    expect(overCapacity.errors).toHaveProperty('members');
  });

  it('requires a deadline once published and timestamps completion', async () => {
    const owner = new mongoose.Types.ObjectId();

    const missingDeadline = await validationErrorFor(
      Project.create({
        owner,
        title: 'Campus Compass',
        summary: 'A campus navigation platform for new students.',
        description:
          'A collaborative project that maps buildings, services, and student spaces on campus.',
        teamSize: 4,
        status: 'recruiting',
      }),
    );

    expect(missingDeadline.errors).toHaveProperty('deadline');

    const completed = await Project.create({
      owner,
      title: 'Campus Compass',
      summary: 'A campus navigation platform for new students.',
      description:
        'A collaborative project that maps buildings, services, and student spaces on campus.',
      teamSize: 4,
      status: 'completed',
      deadline: futureDate(),
    });

    expect(completed.completedAt).toBeInstanceOf(Date);
  });
});

describe('collaboration models', () => {
  it('enforces one application per user and project', async () => {
    const applicationData = {
      project: new mongoose.Types.ObjectId(),
      applicant: new mongoose.Types.ObjectId(),
      message: 'I would like to contribute my frontend and accessibility experience.',
    };

    const application = await Application.create(applicationData);
    expect(application.status).toBe('pending');
    expect(application.decidedAt).toBeNull();

    await expect(Application.create(applicationData)).rejects.toMatchObject({ code: 11000 });
  });

  it('requires a decision author when an application is decided', async () => {
    const error = await validationErrorFor(
      Application.create({
        project: new mongoose.Types.ObjectId(),
        applicant: new mongoose.Types.ObjectId(),
        message: 'I would like to contribute my frontend and accessibility experience.',
        status: 'accepted',
      }),
    );

    expect(error.name).toBe('ValidationError');
    expect(error.errors).toHaveProperty('decidedBy');
  });

  it('timestamps completed tasks and milestones', async () => {
    const project = new mongoose.Types.ObjectId();
    const createdBy = new mongoose.Types.ObjectId();

    const task = await Task.create({
      project,
      title: 'Build the project page',
      createdBy,
      status: 'done',
    });
    const milestone = await Milestone.create({
      project,
      title: 'Public beta',
      createdBy,
      status: 'completed',
    });

    expect(task.completedAt).toBeInstanceOf(Date);
    expect(milestone.completedAt).toBeInstanceOf(Date);
  });

  it('prevents duplicate saved projects', async () => {
    const savedProject = {
      user: new mongoose.Types.ObjectId(),
      project: new mongoose.Types.ObjectId(),
    };

    await SavedProject.create(savedProject);
    await expect(SavedProject.create(savedProject)).rejects.toMatchObject({ code: 11000 });
  });
});

describe('moderation and notification models', () => {
  it('allows empty dedupe keys but enforces unique populated keys', async () => {
    await Notification.create({
      recipient: new mongoose.Types.ObjectId(),
      type: 'system',
      title: 'Welcome to FLEXI',
      message: 'Your account is ready.',
    });
    await Notification.create({
      recipient: new mongoose.Types.ObjectId(),
      type: 'system',
      title: 'Welcome to FLEXI',
      message: 'Your account is ready.',
    });

    const dedupeKey = 'application-received:507f1f77bcf86cd799439011';
    const notification = {
      recipient: new mongoose.Types.ObjectId(),
      type: 'application_received',
      title: 'New application',
      message: 'Someone applied to your project.',
      dedupeKey,
    };

    await Notification.create(notification);
    await expect(Notification.create(notification)).rejects.toMatchObject({ code: 11000 });
  });

  it('timestamps handled contact messages and validates email addresses', async () => {
    const message = await ContactMessage.create({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Partnership question',
      message: 'I would like to discuss a campus partnership opportunity.',
      status: 'resolved',
    });

    expect(message.handledAt).toBeInstanceOf(Date);

    const invalidEmail = await validationErrorFor(
      ContactMessage.create({
        name: 'Ada Lovelace',
        email: 'not-an-email',
        subject: 'Partnership question',
        message: 'I would like to discuss a campus partnership opportunity.',
      }),
    );

    expect(invalidEmail.errors).toHaveProperty('email');
  });

  it('rejects self-reports and duplicate reports for the same target', async () => {
    const reporter = new mongoose.Types.ObjectId();

    const selfReport = await validationErrorFor(
      Report.create({
        reporter,
        targetType: 'user',
        targetId: reporter,
        reason: 'other',
        details: 'This is a self-report that should be rejected.',
      }),
    );

    expect(selfReport.errors).toHaveProperty('targetId');

    const report = {
      reporter,
      targetType: 'project',
      targetId: new mongoose.Types.ObjectId(),
      reason: 'misleading',
      details: 'The project description does not match the submitted work.',
    };

    await Report.create(report);
    await expect(Report.create(report)).rejects.toMatchObject({ code: 11000 });
  });
});
