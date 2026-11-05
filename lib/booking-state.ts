import type { BookingStatus } from "@prisma/client";
import { InvalidTransitionError } from "@/lib/errors";

/**
 * Booking state machine — v1.0.
 *
 *   ACTIVE --cancel--> CANCELLED (terminal)
 *
 * v2.0 (admin approval for rooms with capacity > 100) extends this table
 * only — no call-site changes:
 *   PENDING --approve--> ACTIVE
 *   PENDING --reject--> REJECTED (terminal)
 *   PENDING --cancel--> CANCELLED
 * and BLOCKING_STATUSES gains "PENDING" so a pending request still reserves
 * its slot (lab section 10.1).
 */

// Allowed transitions per source status; a status with no targets is terminal.
const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  ACTIVE: ["CANCELLED"],
  CANCELLED: [],
};

/**
 * Statuses that reserve a slot and block overlapping bookings.
 * The overlap query in lib/booking-service.ts must read this set — never
 * hardcode "ACTIVE" there (v2.0 adds PENDING here in exactly one place).
 */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["ACTIVE"];

/**
 * The status a new booking starts in. v1.0: always ACTIVE. Kept next to the
 * transition table so the v2.0 approval rule (capacity > 100 -> PENDING)
 * changes only this module, not createBooking.
 */
export function initialStatus(room: { capacity: number }): BookingStatus {
  void room;
  return "ACTIVE";
}

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Throws InvalidTransitionError (409) when the transition is not allowed. */
export function assertTransition(
  from: BookingStatus,
  to: BookingStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
