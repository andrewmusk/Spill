import { beforeEach, afterAll } from 'vitest';

// Only set up database cleanup if DATABASE_URL is available
const hasDatabaseUrl = !!process.env.DATABASE_URL;

let prisma;

if (hasDatabaseUrl) {
  const { PrismaClient } = await import('../../generated/prisma/index.js');
  prisma = new PrismaClient({
    log: [], // Silent logs in tests
  });

  // Clean database between tests
  beforeEach(async () => {
    // Get all table names except migrations
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    `;

    // Truncate all tables and restart identity sequences
    for (const { tablename } of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`);
    }
  });

  // Disconnect after all tests
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Make prisma available globally for tests
  globalThis.testPrisma = prisma;
}

// Configure error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  throw reason;
});

// Silence console.error unless explicitly expected
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only show errors that are explicitly expected in tests
  if (args[0]?.includes?.('[TEST_EXPECTED]')) {
    originalConsoleError(...args);
  }
};
