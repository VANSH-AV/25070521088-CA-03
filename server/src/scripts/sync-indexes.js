import { connectDatabase, disconnectDatabase } from '../config/db.js';
import * as models from '../models/index.js';

async function syncIndexes() {
  await connectDatabase();

  for (const [name, model] of Object.entries(models)) {
    await model.createIndexes();
    console.log(`[indexes] ensured ${name}`);
  }
}

syncIndexes()
  .catch((error) => {
    console.error('[indexes] synchronization failed', {
      name: error?.name,
      message: error?.message,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
