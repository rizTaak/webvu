import { isLocalDatabase, validateEnv } from './env';

/**
 * Guard 3 of 3 on the dev auth stub. SPEC.md § Dev auth guards.
 *
 * The stub mints sessions for any seeded account without a password, so the
 * one thing that must never happen is it running against a real database.
 */

const base = {
  DATABASE_URL: 'postgresql://webvu:webvu@localhost:5432/webvu',
  JWT_SECRET: 'a-secret-long-enough-to-pass',
};

describe('isLocalDatabase', () => {
  it.each([
    'postgresql://u:p@localhost:5432/db',
    'postgresql://u:p@127.0.0.1:5432/db',
    'postgresql://u:p@postgres:5432/db',
    'postgresql://u:p@db.webvu.localhost:5432/db',
  ])('accepts %s', (url) => {
    expect(isLocalDatabase(url)).toBe(true);
  });

  it.each([
    'postgresql://u:p@webvu-prod.abc123.eu-west-2.rds.amazonaws.com:5432/db',
    'postgresql://u:p@10.0.4.12:5432/db',
    'not-a-url',
  ])('rejects %s', (url) => {
    expect(isLocalDatabase(url)).toBe(false);
  });
});

describe('validateEnv', () => {
  it('accepts a normal local development config', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'development',
      AUTH_DRIVER: 'dev-stub',
      DEV_AUTH_ENABLED: 'true',
    });
    expect(env.DEV_AUTH_ENABLED).toBe(true);
  });

  it('refuses to boot with the stub enabled in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        AUTH_DRIVER: 'dev-stub',
        DEV_AUTH_ENABLED: 'true',
      }),
    ).toThrow(/dev auth stub cannot be enabled/i);
  });

  it('refuses to boot with the stub pointed at a non-local database', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'development',
        AUTH_DRIVER: 'dev-stub',
        DEV_AUTH_ENABLED: 'true',
        DATABASE_URL:
          'postgresql://u:p@webvu-prod.abc123.eu-west-2.rds.amazonaws.com:5432/db',
      }),
    ).toThrow(/not local/i);
  });

  it('allows a production config when the stub is off', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      AUTH_DRIVER: 'google',
      DEV_AUTH_ENABLED: 'false',
      DATABASE_URL:
        'postgresql://u:p@webvu-prod.abc123.eu-west-2.rds.amazonaws.com:5432/db',
    });
    expect(env.AUTH_DRIVER).toBe('google');
  });

  it('requires a JWT secret of a usable length', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow();
  });
});
