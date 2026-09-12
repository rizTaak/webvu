import { z } from 'zod';

/**
 * Environment validation. The process refuses to start on a bad config
 * rather than failing later at the first request that needs the value.
 */

const driverSchema = {
  auth: z.enum(['google', 'dev-stub']).default('google'),
  mail: z.enum(['resend', 'smtp']).default('resend'),
  billing: z.enum(['stripe', 'dev-stub']).default('stripe'),
  storage: z.enum(['s3', 'minio']).default('s3'),
};

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1).optional(),

    SITE_DOMAIN: z.string().min(1).default('webvu.localhost'),
    CDN_URL: z.string().min(1).default('http://cdn.webvu.localhost'),

    AUTH_DRIVER: driverSchema.auth,
    MAIL_DRIVER: driverSchema.mail,
    BILLING_DRIVER: driverSchema.billing,
    STORAGE_DRIVER: driverSchema.storage,

    DEV_AUTH_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    ANALYTICS_INTERNAL_SECRET: z.string().min(1).default('local-dev-internal-secret'),

    JWT_SECRET: z.string().min(16),
    REFRESH_TOKEN_PEPPER: z.string().min(8).optional(),
    // A Secure cookie is never stored over plain http, so this is false
    // locally. Every other cookie attribute matches production.
    COOKIE_SECURE: z.enum(['true', 'false']).default('true'),
  })
  .superRefine((env, ctx) => {
    /**
     * Guard 3 of 3 on the dev auth stub. SPEC.md § Dev auth guards.
     *
     * Guard 1 is NODE_ENV gating the module import, guard 2 is the explicit
     * DEV_AUTH_ENABLED flag. This is the backstop: a stub that mints sessions
     * must never point at a database that is not local.
     */
    if (!env.DEV_AUTH_ENABLED && env.AUTH_DRIVER !== 'dev-stub') return;

    if (env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['DEV_AUTH_ENABLED'],
        message: 'The dev auth stub cannot be enabled when NODE_ENV=production',
      });
      return;
    }

    if (!isLocalDatabase(env.DATABASE_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'The dev auth stub is enabled but DATABASE_URL is not local. Refusing to start.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'db']);

export function isLocalDatabase(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname.toLowerCase();
    return LOCAL_DB_HOSTS.has(host) || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }
  return result.data;
}
