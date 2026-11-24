/**
 * Playwright configuration (T1.2).
 *
 * Starts the already-built app with `next start` on 127.0.0.1:3100 using
 * test-only values. Run `npm run build` first, then `npm run test:e2e`.
 *
 * Safety:
 * - NEXTAUTH_SECRET is a fresh random value per run (never a real secret).
 * - DATABASE_URL must be the local scratch test DB (see tests/support/test-db-guard.ts);
 *   when unset, an unreachable loopback URL is used instead.
 * - Playwright MERGES `webServer.env` with the parent environment, so every
 *   variable the app reads (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL,
 *   BLOB_READ_WRITE_TOKEN, CRON_SECRET) is explicitly overridden below with a
 *   test value. Never run this with production variables exported anyway.
 */
import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolveTestDatabaseUrl } from "./tests/support/test-db-guard";

const PORT = 3100;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

// Generated once per run and exposed to the workers so tests can assert that
// it never appears in any response.
process.env.E2E_NEXTAUTH_SECRET ??= randomBytes(32).toString("hex");
const databaseUrl = resolveTestDatabaseUrl(process.env);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "off",
  },
  webServer: {
    command: `npx next start -p ${PORT} -H ${HOST}`,
    url: `${BASE_URL}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXTAUTH_SECRET: process.env.E2E_NEXTAUTH_SECRET,
      NEXTAUTH_URL: BASE_URL,
      DATABASE_URL: databaseUrl,
      // Explicitly blank so a value inherited from the shell can never be used.
      BLOB_READ_WRITE_TOKEN: "",
      CRON_SECRET: randomBytes(16).toString("hex"),
    },
  },
});
