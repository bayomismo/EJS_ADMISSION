/**
 * Local test database guard (T1.2).
 *
 * Every automated test that may start the app or touch a database MUST pass
 * its DATABASE_URL / DIRECT_URL through `assertLocalTestDbUrl` first.
 * Only the scratch PostgreSQL cluster used for EJS testing is allowed:
 *   host 127.0.0.1, port 54329, database ejs_test, user ejs_test.
 * Anything else (Neon, Vercel, poolers, other hosts/ports/databases, SQLite
 * `file:` URLs) is refused BEFORE any connection is attempted.
 *
 * Mirrors the shell guard used to provision the cluster (ejs-test-env.sh).
 */

export const LOCAL_TEST_DB = {
  host: "127.0.0.1",
  port: "54329",
  database: "ejs_test",
  user: "ejs_test",
} as const;

/** An address that can never reach a real database (port 1 on loopback). */
export const UNREACHABLE_LOCAL_DB_URL = "postgresql://none:none@127.0.0.1:1/none";

const FORBIDDEN_HOST_MARKERS = /(neon\.tech|vercel|pooler|pgbouncer|amazonaws|supabase|render\.com)/i;

export class UnsafeDatabaseUrlError extends Error {
  constructor(reason: string) {
    // Never include the URL itself: it may contain a password.
    super(`Refusing non-local test database URL: ${reason}`);
    this.name = "UnsafeDatabaseUrlError";
  }
}

/** Throws UnsafeDatabaseUrlError unless `url` is exactly the local test DB. */
export function assertLocalTestDbUrl(url: string | undefined | null): void {
  if (!url) throw new UnsafeDatabaseUrlError("empty");
  if (FORBIDDEN_HOST_MARKERS.test(url)) throw new UnsafeDatabaseUrlError("managed/external host");
  const m = /^postgres(?:ql)?:\/\/([^:@/]+)(?::[^@]*)?@([^:/?]+):(\d+)\/([^?]+)(?:\?.*)?$/.exec(url);
  if (!m) throw new UnsafeDatabaseUrlError("not postgresql://user:pass@host:port/db");
  const [, user, host, port, database] = m;
  if (host !== LOCAL_TEST_DB.host) throw new UnsafeDatabaseUrlError(`host is not ${LOCAL_TEST_DB.host}`);
  if (port !== LOCAL_TEST_DB.port) throw new UnsafeDatabaseUrlError(`port is not ${LOCAL_TEST_DB.port}`);
  if (database !== LOCAL_TEST_DB.database) throw new UnsafeDatabaseUrlError(`database is not ${LOCAL_TEST_DB.database}`);
  if (user !== LOCAL_TEST_DB.user) throw new UnsafeDatabaseUrlError(`user is not ${LOCAL_TEST_DB.user}`);
}

/**
 * Database URL for an app instance started by the test runner:
 * - if DATABASE_URL is set, it must be the local test DB (else throw);
 * - if unset, use an unreachable loopback address so nothing real is touched.
 */
export function resolveTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL;
  if (!url) return UNREACHABLE_LOCAL_DB_URL;
  assertLocalTestDbUrl(url);
  return url;
}
