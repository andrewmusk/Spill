import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Global setup for starting Postgres container and running migrations
    globalSetup: ['./src/tests/global-setup.js'],
    // Setup files for DB truncation between tests
    setupFiles: ['./src/tests/setup-tests.js'],
    coverage: { 
      provider: 'v8', 
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/tests/**', 'src/generated/**']
    },
    // Run DB tests serially to avoid shared-state races
    maxThreads: 1,
    minThreads: 1,
    testTimeout: 60000, // Allow container startup + migrations
    // Silent logs in tests
    silent: false,
    // Fail on unhandled rejections
    onUnhandledRejection: 'strict',
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
}); 