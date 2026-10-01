import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MOCK_DATA_MODE: z.string().default('false').transform((v) => v === 'true'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal('')),
  DATABASE_URL: z.string().optional().or(z.literal('')),
  GOOGLE_PLACES_API_KEY: z.string().optional().or(z.literal('')),
  GROQ_API_KEY: z.string().optional().or(z.literal('')),
  HUNTER_API_KEY: z.string().optional().or(z.literal('')),
  OVERPASS_API_URL: z.string().url().default('https://overpass-api.de/api/interpreter'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isMockMode = env.MOCK_DATA_MODE;
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
