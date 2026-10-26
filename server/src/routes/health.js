import { Router } from 'express';
import { getDatabaseHealth } from '../config/db.js';
import { AppError } from '../errors/AppError.js';

export function createHealthRouter({ databaseHealth = getDatabaseHealth } = {}) {
  const router = Router();

  router.get('/health', async (req, res) => {
    let database;

    try {
      database = await databaseHealth();
    } catch {
      database = {
        connected: false,
        state: 'unavailable',
      };
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Database-Ready', database.connected ? 'true' : 'false');

    if (!database.connected) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'The database is unavailable.');
    }

    return res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
        uptimeSeconds: Math.floor(process.uptime()),
      },
    });
  });

  return router;
}
