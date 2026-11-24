/**
 * Unit tests for src/lib/egyptian-id.ts (T1.2).
 * Runner: Node's built-in `node:test` (no extra dependencies).
 * Data: synthetic IDs only (tests/support/synthetic-ids.ts, governorate "00").
 *
 * These tests assert the CORRECT expected behaviour. A failing test here is a
 * real defect report, not something to silence.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AGE_GRADE_MAP,
  ageOnOctoberFirst,
  computeStudentPlacement,
  gradeForAge,
  parseEgyptianId,
} from "../../src/lib/egyptian-id.ts";
import { syntheticNationalId } from "../support/synthetic-ids.ts";

const ymd = (d: Date | null) =>
  d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null;

describe("parseEgyptianId — valid IDs", () => {
  it("parses a 2000s male ID (birth date, year/month/day, gender)", () => {
    const r = parseEgyptianId(syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "MALE" }));
    assert.equal(r.valid, true);
    assert.deepEqual([r.year, r.month, r.day], [2021, 3, 15]);
    assert.deepEqual(ymd(r.birthDate), [2021, 3, 15]);
    assert.equal(r.gender, "MALE");
    assert.equal(r.error, undefined);
  });

  it("derives FEMALE from an even 13th digit", () => {
    const r = parseEgyptianId(syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "FEMALE" }));
    assert.equal(r.valid, true);
    assert.equal(r.gender, "FEMALE");
  });

  it("maps century digit 2 to the 1900s", () => {
    const r = parseEgyptianId(syntheticNationalId({ year: 1995, month: 7, day: 20, gender: "MALE" }));
    assert.equal(r.valid, true);
    assert.deepEqual(ymd(r.birthDate), [1995, 7, 20]);
  });

  it("accepts 29 February in a leap year", () => {
    const r = parseEgyptianId(syntheticNationalId({ year: 2020, month: 2, day: 29, gender: "FEMALE" }));
    assert.equal(r.valid, true);
    assert.deepEqual(ymd(r.birthDate), [2020, 2, 29]);
  });

  // Positive calendar cases (owner request after batch 3): leap years and the
  // last valid day of every month must be accepted with the exact same date.
  for (const [y, m, d, label] of [
    [2024, 2, 29, "leap year 2024"],
    [2000, 2, 29, "century leap year 2000 (divisible by 400)"],
    [2016, 2, 29, "leap year 2016"],
    [2021, 2, 28, "28 Feb in a non-leap year"],
    [2021, 1, 31, "31 Jan"],
    [2021, 3, 31, "31 Mar"],
    [2021, 4, 30, "30 Apr"],
    [2021, 5, 31, "31 May"],
    [2021, 6, 30, "30 Jun"],
    [2021, 7, 31, "31 Jul"],
    [2021, 8, 31, "31 Aug"],
    [2021, 9, 30, "30 Sep (day before the 1 Oct cutoff)"],
    [2021, 10, 1, "1 Oct (cutoff day)"],
    [2021, 10, 31, "31 Oct"],
    [2021, 11, 30, "30 Nov"],
    [2021, 12, 31, "31 Dec"],
    [2021, 1, 1, "1 Jan"],
  ] as const) {
    it(`accepts valid date ${y}-${m}-${d} (${label}) without changing it`, () => {
      const r = parseEgyptianId(syntheticNationalId({ year: y, month: m, day: d, gender: "FEMALE" }));
      assert.equal(r.valid, true);
      assert.deepEqual(ymd(r.birthDate), [y, m, d]);
      assert.deepEqual([r.year, r.month, r.day], [y, m, d]);
    });
  }

  it("ignores non-digit separators (current documented behaviour)", () => {
    const id = syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "MALE" });
    const spaced = `${id.slice(0, 1)} ${id.slice(1, 7)}-${id.slice(7)}`;
    assert.equal(parseEgyptianId(spaced).valid, true);
  });
});

describe("parseEgyptianId — rejected IDs", () => {
  const base = syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "MALE" });

  for (const [label, value] of [
    ["empty string", ""],
    ["13 digits", base.slice(0, 13)],
    ["15 digits", base + "1"],
    ["letters only", "abcdefghijklmn"],
  ] as const) {
    it(`rejects ${label}`, () => {
      const r = parseEgyptianId(value);
      assert.equal(r.valid, false);
      assert.equal(r.birthDate, null);
      assert.equal(r.gender, null);
      assert.ok(r.error && r.error.length > 0);
    });
  }

  for (const c of ["0", "1", "4", "9"]) {
    it(`rejects century digit ${c}`, () => {
      const r = parseEgyptianId(c + base.slice(1));
      assert.equal(r.valid, false);
      assert.equal(r.birthDate, null);
    });
  }

  for (const month of [0, 13]) {
    it(`rejects month ${month}`, () => {
      const r = parseEgyptianId(syntheticNationalId({ year: 2021, month, day: 10, gender: "MALE" }));
      assert.equal(r.valid, false);
      assert.equal(r.birthDate, null);
    });
  }

  for (const day of [0, 32]) {
    it(`rejects day ${day}`, () => {
      const r = parseEgyptianId(syntheticNationalId({ year: 2021, month: 5, day, gender: "MALE" }));
      assert.equal(r.valid, false);
      assert.equal(r.birthDate, null);
    });
  }

  // Impossible calendar dates. A valid result here would carry a silently
  // rolled-over birth date (e.g. 30 Feb -> 2 Mar), i.e. a wrong age/grade.
  for (const [y, m, d] of [
    [2021, 2, 30],
    [2021, 2, 31],
    [2021, 2, 29], // 2021 is not a leap year
    [2021, 4, 31],
    [2021, 6, 31],
    [2021, 9, 31],
    [2021, 11, 31],
  ] as const) {
    it(`rejects impossible calendar date ${y}-${m}-${d}`, () => {
      const r = parseEgyptianId(syntheticNationalId({ year: y, month: m, day: d, gender: "MALE" }));
      assert.equal(r.valid, false, `expected invalid, got birthDate ${JSON.stringify(ymd(r.birthDate))}`);
      assert.equal(r.birthDate, null);
    });
  }
});

describe("ageOnOctoberFirst (cutoff = 1 October of the admission year)", () => {
  const cases: Array<[string, Date, number, number]> = [
    ["birthday exactly on 1 Oct counts", new Date(2021, 9, 1), 2026, 5],
    ["born 2 Oct is still one year younger", new Date(2021, 9, 2), 2026, 4],
    ["born 30 Sep", new Date(2021, 8, 30), 2026, 5],
    ["born 1 Jan", new Date(2021, 0, 1), 2026, 5],
    ["born 31 Dec", new Date(2021, 11, 31), 2026, 4],
    ["born 29 Feb (leap) evaluated in a non-leap year", new Date(2020, 1, 29), 2026, 6],
  ];
  for (const [label, birth, year, expected] of cases) {
    it(label, () => assert.equal(ageOnOctoberFirst(birth, year), expected));
  }
});

describe("gradeForAge and AGE_GRADE_MAP", () => {
  it("map covers ages 4..11 contiguously with one grade per age and unique ids", () => {
    const ages = AGE_GRADE_MAP.map((g) => g.minAge);
    assert.deepEqual(ages, [4, 5, 6, 7, 8, 9, 10, 11]);
    for (const g of AGE_GRADE_MAP) assert.equal(g.minAge, g.maxAge);
    assert.equal(new Set(AGE_GRADE_MAP.map((g) => g.gradeId)).size, AGE_GRADE_MAP.length);
  });

  const expected: Array<[number, string]> = [
    [4, "kg1"], [5, "kg2"], [6, "g1"], [7, "g2"], [8, "g3"], [9, "g4"], [10, "g5"], [11, "g6"],
  ];
  for (const [age, id] of expected) {
    it(`age ${age} -> ${id}`, () => assert.equal(gradeForAge(age)?.gradeId, id));
  }

  for (const age of [-1, 0, 3]) {
    it(`age ${age} -> too-young`, () => assert.equal(gradeForAge(age)?.gradeId, "too-young"));
  }
  for (const age of [12, 15]) {
    it(`age ${age} -> too-old`, () => assert.equal(gradeForAge(age)?.gradeId, "too-old"));
  }
});

describe("computeStudentPlacement", () => {
  it("returns parsed data, age on 1 Oct and recommended grade", () => {
    const id = syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "FEMALE" });
    const p = computeStudentPlacement(id, 2026);
    assert.equal(p.parsed.valid, true);
    assert.equal(p.age, 5);
    assert.equal(p.grade?.gradeId, "kg2");
  });

  it("exposes gender ONLY as parsed.gender (no top-level gender field)", () => {
    // Pins the API shape behind defect B15: the student form reads
    // `placement.gender`, which does not exist on this object.
    const p = computeStudentPlacement(syntheticNationalId({ year: 2021, month: 3, day: 15, gender: "FEMALE" }), 2026);
    assert.equal(p.parsed.gender, "FEMALE");
    assert.equal(Object.prototype.hasOwnProperty.call(p, "gender"), false);
  });

  it("returns null age/grade for an invalid ID", () => {
    const p = computeStudentPlacement("123", 2026);
    assert.equal(p.parsed.valid, false);
    assert.equal(p.age, null);
    assert.equal(p.grade, null);
  });

  it("a child not yet born by the cutoff is too-young", () => {
    const p = computeStudentPlacement(syntheticNationalId({ year: 2027, month: 1, day: 10, gender: "MALE" }), 2026);
    assert.equal(p.grade?.gradeId, "too-young");
  });
});
