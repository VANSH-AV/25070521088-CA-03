import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
    env: {
      NODE_ENV: 'test',
      PORT: '5001',
      CLIENT_ORIGIN: 'http://localhost:5173',
      MONGODB_URI: 'mongodb://127.0.0.1:27017',
      MONGODB_DB_NAME: 'flexi_test_env',
      JWT_SECRET: 'test-only-secret-that-is-not-used-by-this-phase-1234567890',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/server.js'],
    },
  },
});
