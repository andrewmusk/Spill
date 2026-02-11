import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DB_USER: z.string().default('spill_app'),
  DB_PASS: z.string().default('devpass'),
  DB_NAME: z.string().default('spill_dev'),
  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key is required'),
  
  // Server
  PORT: z.string().default('8080').transform(val => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Admin
  CLERK_ADMIN_USER_IDS: z.string().optional(), // Comma-separated Clerk user IDs
  COMMIT_SHA: z.string().optional(), // Git commit SHA (set in CI/deployment)
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:', parseResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parseResult.data;
export type Env = typeof env; 