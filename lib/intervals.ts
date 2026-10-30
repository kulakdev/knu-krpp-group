/**
 * Booking intervals use [start, end) semantics:
 *  - startTime must be strictly before endTime;
 *  - adjacent intervals (one ends exactly when the other starts) do NOT
 *    overlap and may coexist;
 *  - any partial or full overlap is a conflict.
 *
 * Contract: docs/api-contract.md, lab section 2.2. Tests: tests/unit/intervals.test.ts
 */

/** True when start is strictly before end. Invalid dates (NaN) are rejected. */
export function isValidInterval(start: Date, end: Date): boolean {
  return start.getTime() < end.getTime();
}

/**
 * [start, end) overlap: strict inequalities, so touching boundaries
 * (aEnd === bStart) do not count as overlap.
 */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return (
    aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime()
  );
}
