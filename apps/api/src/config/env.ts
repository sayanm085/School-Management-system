import { ConfigService } from "@nestjs/config";
import { z } from "zod";

const base64Key = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      return Buffer.from(value, "base64").length === 32;
    } catch {
      return false;
    }
  }, "must be a base64-encoded 32-byte key");

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3002),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_PEPPER: z.string().min(32),
  MFA_ENCRYPTION_KEY: base64Key,
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  WEB_ORIGIN: z.string().url().default("http://localhost:3001"),
  DEMO_PASSWORD: z.string().min(8).optional(),
  DEFAULT_SCHOOL_CODE: z.string().default("WB-NAB-001"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export function loadEnv(
  source: NodeJS.ProcessEnv = process.env,
): Env {
  return validateEnv(source);
}

export function requireEnvValue<K extends keyof Env>(
  config: ConfigService<Env, true>,
  key: K,
): Env[K] {
  const value = config.get<Env[K]>(key);
  if (value === undefined) {
    throw new Error(`Missing required environment value: ${String(key)}`);
  }
  return value;
}
