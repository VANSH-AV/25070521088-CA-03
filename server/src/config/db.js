import mongoose from 'mongoose';
import { env } from './env.js';

const connectionStates = Object.freeze({
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
});

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) {
    return;
  }

  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    console.log('[db] connected');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  mongoose.connection.on('error', (error) => {
    console.error('[db] connection error', {
      name: error?.name,
      message: error?.message,
    });
  });
}

function withTimeout(promise, timeoutMs) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Database ping timed out.'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

export function getDatabaseState() {
  return connectionStates[mongoose.connection.readyState] || 'unknown';
}

export async function connectDatabase({
  uri = env.MONGODB_URI,
  dbName = env.MONGODB_DB_NAME,
} = {}) {
  attachConnectionListeners();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  mongoose.set('bufferCommands', false);

  await mongoose.connect(uri, {
    dbName,
    autoIndex: !env.isProduction,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export async function getDatabaseHealth() {
  if (mongoose.connection.readyState !== 1) {
    return {
      connected: false,
      state: getDatabaseState(),
    };
  }

  try {
    await withTimeout(mongoose.connection.db.admin().ping(), 2000);
    return {
      connected: true,
      state: 'connected',
    };
  } catch {
    return {
      connected: false,
      state: 'unavailable',
    };
  }
}
