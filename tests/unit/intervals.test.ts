import { describe, expect, it } from "vitest";
import { isValidInterval, overlaps } from "@/lib/intervals";

/**
 * BOOK-14 — unit tests for [start, end) interval logic (lab section 7.2).
 * Fixed UTC timestamps, no wall clock.
 */
const at = (hour: number, minute = 0) =>
  new Date(Date.UTC(2030, 0, 7, hour, minute));

describe("isValidInterval", () => {
  it("accepts start strictly before end", () => {
    expect(isValidInterval(at(10), at(11))).toBe(true);
  });

  it("rejects a zero-length interval", () => {
    expect(isValidInterval(at(10), at(10))).toBe(false);
  });

  it("rejects an inverted interval", () => {
    expect(isValidInterval(at(11), at(10))).toBe(false);
  });

  it("rejects an invalid date", () => {
    expect(isValidInterval(new Date("not a date"), at(10))).toBe(false);
  });
});

describe("overlaps", () => {
  it("detects a partial overlap", () => {
    expect(overlaps(at(10), at(11), at(10, 30), at(11, 30))).toBe(true);
  });

  it("detects full containment in both directions", () => {
    expect(overlaps(at(9), at(12), at(10), at(11))).toBe(true);
    expect(overlaps(at(10), at(11), at(9), at(12))).toBe(true);
  });

  it("detects identical intervals", () => {
    expect(overlaps(at(10), at(11), at(10), at(11))).toBe(true);
  });

  // Fails if `<` in overlaps() is weakened to `<=` (mutation check).
  it("treats adjacent intervals as non-overlapping in both orders", () => {
    expect(overlaps(at(10), at(11), at(11), at(12))).toBe(false);
    expect(overlaps(at(11), at(12), at(10), at(11))).toBe(false);
  });

  it("treats disjoint intervals as non-overlapping", () => {
    expect(overlaps(at(8), at(9), at(10), at(11))).toBe(false);
  });
});
