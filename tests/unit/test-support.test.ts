/**
 * Unit tests for the T1.2 test-support code itself:
 *   - tests/support/test-db-guard.ts  (refuses any non-local database)
 *   - tests/support/synthetic-ids.ts  (synthetic, non-real national IDs)
 * Runner: node:test. No database connection is ever attempted here.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  UNREACHABLE_LOCAL_DB_URL,
  UnsafeDatabaseUrlError,
  assertLocalTestDbUrl,
  resolveTestDatabaseUrl,
} from "../support/test-db-guard.ts";
import { SYNTHETIC_GOVERNORATE_CODE, syntheticNationalId } from "../support/synthetic-ids.ts";

const LOCAL = "postgresql://ejs_test:test-only-pw@127.0.0.1:54329/ejs_test?sslmode=disable";

describe("test-db-guard: assertLocalTestDbUrl", () => {
  it("accepts exactly the local test database", () => {
    assert.doesNotThrow(() => assertLocalTestDbUrl(LOCAL));
    assert.doesNotThrow(() => assertLocalTestDbUrl("postgres://ejs_test:x@127.0.0.1:54329/ejs_test"));
  });

  const rejected: Array<[string, string | undefined]> = [
    ["undefined", undefined],
    ["empty", ""],
    ["Neon pooler host", "postgresql://u:p@ep-x-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"],
    ["pgbouncer param", "postgresql://ejs_test:x@127.0.0.1:54329/ejs_test?pgbouncer=true"],
    ["other IPv4 host", "postgresql://ejs_test:x@10.0.0.5:54329/ejs_test"],
    ["localhost alias", "postgresql://ejs_test:x@localhost:54329/ejs_test"],
    ["default port", "postgresql://ejs_test:x@127.0.0.1:5432/ejs_test"],
    ["other database", "postgresql://ejs_test:x@127.0.0.1:54329/postgres"],
    ["other user", "postgresql://pgadmin:x@127.0.0.1:54329/ejs_test"],
    ["SQLite file URL", "file:./db/dev.db"],
    ["no credentials", "postgresql://127.0.0.1:54329/ejs_test"],
  ];
  for (const [label, url] of rejected) {
    it(`rejects ${label}`, () => {
      assert.throws(() => assertLocalTestDbUrl(url), UnsafeDatabaseUrlError);
    });
  }

  it("never echoes the URL (or its password) in the error message", () => {
    const secretish = "postgresql://ejs_test:SUPER-SECRET-PW@db.example.com:54329/ejs_test";
    assert.throws(
      () => assertLocalTestDbUrl(secretish),
      (e: unknown) => e instanceof Error && !e.message.includes("SUPER-SECRET-PW") && !e.message.includes("example.com"),
    );
  });
});

describe("test-db-guard: resolveTestDatabaseUrl", () => {
  it("falls back to an unreachable loopback URL when DATABASE_URL is unset", () => {
    assert.equal(resolveTestDatabaseUrl({}), UNREACHABLE_LOCAL_DB_URL);
  });
  it("returns the local test URL unchanged", () => {
    assert.equal(resolveTestDatabaseUrl({ DATABASE_URL: LOCAL }), LOCAL);
  });
  it("throws for a non-local DATABASE_URL", () => {
    assert.throws(
      () => resolveTestDatabaseUrl({ DATABASE_URL: "postgresql://u:p@x.neon.tech:5432/db" }),
      UnsafeDatabaseUrlError,
    );
  });
});

describe("synthetic-ids", () => {
  it("produces 14 digits with the unassigned governorate code 00", () => {
    const id = syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "MALE", serial: 7 });
    assert.match(id, /^\d{14}$/);
    assert.equal(id.slice(7, 9), SYNTHETIC_GOVERNORATE_CODE);
    assert.equal(SYNTHETIC_GOVERNORATE_CODE, "00");
    assert.equal(id.slice(9, 12), "007");
  });
  it("encodes century, date and gender digit", () => {
    const m = syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "MALE" });
    const f = syntheticNationalId({ year: 1999, month: 12, day: 1, gender: "FEMALE" });
    assert.equal(m.slice(0, 7), "3210315");
    assert.equal(f.slice(0, 7), "2991201");
    assert.equal(Number(m[12]) % 2, 1);
    assert.equal(Number(f[12]) % 2, 0);
  });
  it("rejects out-of-range year and serial", () => {
    assert.throws(() => syntheticNationalId({ year: 1899, month: 1, day: 1, gender: "MALE" }), RangeError);
    assert.throws(() => syntheticNationalId({ year: 2021, month: 1, day: 1, gender: "MALE", serial: 1000 }), RangeError);
  });
});
