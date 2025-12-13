import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // No global setup or database for validation tests
    globalSetup: ['./src/tests/global-setup.js'],
    // No setup files needed for validation tests
    coverage: { 
      provider: 'v8', 
      reporter: ['text', 'lcov'],
      include: ['src/lib/validations/**/*.{ts,js}'],
      exclude: ['src/tests/**']
    },
    testTimeout: 10000, // Shorter timeout for validation tests
    silent: false,
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
}); 