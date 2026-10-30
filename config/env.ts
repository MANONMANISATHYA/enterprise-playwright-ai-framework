import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  TEST_ENV: z.enum(['local', 'ci']).default('local'),
  UI_BASE_URL: z.string().url().default('https://www.saucedemo.com'),
  API_BASE_URL: z.string().url().default('https://restful-booker.herokuapp.com'),
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
