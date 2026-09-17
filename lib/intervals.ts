/**
 * Booking intervals use [start, end) semantics:
 *  - startTime must be strictly before endTime;
 *  - adjacent intervals (one ends exactly when the other starts) do NOT
 *    overlap and may coexist;
 *  - any partial or full overlap is a conflict.
 *
 * Contract: docs/api-contract.md, lab section 2.2. Tests: tests/unit/intervals.test.ts
 */
import { NotImplementedError } from "@/lib/errors";

// TODO(BOOK-6): implement interval validity check (start < end).
export function isValidInterval(start: Date, end: Date): boolean {
  void start;
  void end;
  throw new NotImplementedError("BOOK-6");
}

// TODO(BOOK-6): implement [start, end) overlap detection — strict
// inequalities so touching boundaries do not count as overlap.
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  void aStart;
  void aEnd;
  void bStart;
  void bEnd;
  throw new NotImplementedError("BOOK-6");
}
