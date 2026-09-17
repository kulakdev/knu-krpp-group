import type { BookingStatus } from "@prisma/client";
import { InvalidTransitionError, NotImplementedError } from "@/lib/errors";

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

// TODO(BOOK-7): fill in the v1.0 transition table (ACTIVE -> CANCELLED only;
// CANCELLED is terminal).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- consumed by canTransition once BOOK-7 is implemented
const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  ACTIVE: [],
  CANCELLED: [],
};

/**
 * Statuses that reserve a slot and block overlapping bookings.
 * The overlap query in lib/booking-service.ts must read this set — never
 * hardcode "ACTIVE" there (v2.0 adds PENDING here in exactly one place).
 */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["ACTIVE"];

// TODO(BOOK-7): derive from TRANSITIONS.
export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  void from;
  void to;
  throw new NotImplementedError("BOOK-7");
}

// TODO(BOOK-7): throw InvalidTransitionError when canTransition is false.
export function assertTransition(
  from: BookingStatus,
  to: BookingStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
