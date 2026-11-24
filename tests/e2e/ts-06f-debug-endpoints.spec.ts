/**
 * TS-06f — Removed public diagnostic endpoints (B4 / T1.5).
 *
 * Acceptance criterion (as amended and approved after batch 1):
 *   - GET /api            -> 404
 *   - GET /api/auth/debug -> may be 400 from the NextAuth catch-all
 *   - Neither returns 200, and neither response contains diagnostic data,
 *     secrets, user information, or internal details.
 */
import { expect, test } from "@playwright/test";

/** Markers that only the deleted diagnostic handler (or a leak) would emit. */
const DIAGNOSTIC_MARKERS = [
  "userCount",
  "envNEXTAUTH_URL",
  "envDATABASE_URL_set",
  "envNEXTAUTH_SECRET_set",
  "requestHost",
  "requestOrigin",
  "urlMatch",
  "dbError",
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "PrismaClient",
  "Hello, world!",
];

async function assertNoDiagnostics(body: string) {
  for (const marker of DIAGNOSTIC_MARKERS) {
    expect.soft(body, `response must not contain "${marker}"`).not.toContain(marker);
  }
  const secret = process.env.E2E_NEXTAUTH_SECRET;
  expect(secret, "test secret must be configured by playwright.config.ts").toBeTruthy();
  expect(body, "response must not contain the NEXTAUTH_SECRET").not.toContain(secret!);
  // No stack traces / internal file paths.
  expect(body).not.toMatch(/\bat\s+\S+\s+\(\/[^)]+:\d+:\d+\)/);
  expect(body).not.toMatch(/node_modules\//);
}

test.describe("TS-06f: public diagnostic endpoints are gone", () => {
  test("GET /api returns 404 with no diagnostic data", async ({ request }) => {
    const res = await request.get("/api");
    expect(res.status()).toBe(404);
    await assertNoDiagnostics(await res.text());
  });

  test("GET /api/auth/debug is not served (400 from NextAuth) with no diagnostic data", async ({ request }) => {
    const res = await request.get("/api/auth/debug");
    expect(res.status(), "must never be 200").not.toBe(200);
    // Approved behaviour: the path now falls into the NextAuth catch-all.
    expect(res.status()).toBe(400);
    const body = await res.text();
    expect(body).toContain("not supported by NextAuth.js");
    await assertNoDiagnostics(body);
  });

  test("no X-Powered-By header disclosure", async ({ request }) => {
    for (const path of ["/api", "/api/auth/debug"]) {
      const res = await request.get(path);
      expect(res.headers()["x-powered-by"], `${path} must not send X-Powered-By`).toBeUndefined();
    }
  });
});
