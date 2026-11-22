import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  TEST_ENV: z.enum(['local', 'ci']).default('local'),
  UI_BASE_URL: z.string().url().default('https://www.saucedemo.com'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  STANDARD_USER: z.string().default('standard_user'),
  SECOND_USER: z.string().default('second_user'),
  LOCKED_USER: z.string().default('locked_out_user'),
  DEMO_PASSWORD: z.string().default('secret_sauce'),
  // Optional AI layer. The core suite never reads these.
  AI_PROVIDER: z.enum(['offline', 'anthropic']).default('offline'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export const env: Env = loadEnv();
