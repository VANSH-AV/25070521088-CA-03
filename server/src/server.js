import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();
let server;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[shutdown] received ${signal}`);

  const forceExit = setTimeout(() => {
    console.error('[shutdown] forced exit after timeout');
    process.exit(1);
  }, 10000);

  forceExit.unref();

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  await disconnectDatabase();
  clearTimeout(forceExit);
  process.exit(0);
}

async function start() {
  server = app.listen(env.PORT);

  server.once('listening', () => {
    console.log(`[server] listening on port ${env.PORT}`);
  });

  server.requestTimeout = 30000;
  server.headersTimeout = 35000;
  server.keepAliveTimeout = 5000;

  server.on('error', async (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(
        [
          `[server] port ${env.PORT} is already in use.`,
          `Find the process with: lsof -nP -iTCP:${env.PORT} -sTCP:LISTEN`,
          'Stop it, or set PORT in server/.env to a free port. macOS AirPlay Receiver often uses port 5000.',
        ].join('\n'),
      );
    } else {
      console.error('[server] failed to start', {
        name: error?.name,
        message: error?.message,
      });
    }

    await disconnectDatabase();
    process.exit(1);
  });

  try {
    await connectDatabase();
  } catch (error) {
    console.error('[startup] MongoDB is unavailable; /api/health and feature routes will report 503', {
      name: error?.name,
      message: error?.message,
    });
    console.error(
      '[startup] Start MongoDB, or set MONGODB_URI in server/.env, then restart the server.',
    );
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('unhandledRejection', (error) => {
  console.error('[process] unhandled rejection', {
    name: error?.name,
    message: error?.message,
  });
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('[process] uncaught exception', {
    name: error?.name,
    message: error?.message,
  });
  shutdown('uncaughtException');
});

start();
