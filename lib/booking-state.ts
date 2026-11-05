import type { BookingStatus } from "@prisma/client";
import { InvalidTransitionError } from "@/lib/errors";

/**
 * Booking state machine — v2.0 (BOOK-23, lab section 10.1).
 *
 *   create (capacity <= 100) -> ACTIVE
 *   create (capacity  > 100) -> PENDING
 *   ACTIVE  --cancel (owner)-->  CANCELLED (terminal)
 *   PENDING --approve (admin)--> ACTIVE
 *   PENDING --reject (admin)-->  REJECTED (terminal)
 *   PENDING --cancel (owner)-->  CANCELLED
 *
 * Who may trigger a transition is checked in lib/booking-service.ts; this
 * module only knows which transitions exist.
 */

/** Rooms above this capacity need admin approval (lab section 10.1). */
export const APPROVAL_CAPACITY_THRESHOLD = 100;

// Allowed transitions per source status; a status with no targets is terminal.
const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  ACTIVE: ["CANCELLED"],
  PENDING: ["ACTIVE", "REJECTED", "CANCELLED"],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Statuses that reserve a slot and block overlapping bookings: a pending
 * request holds its slot until it is rejected or cancelled. The overlap
 * query in lib/booking-service.ts must read this set — never hardcode
 * statuses there.
 */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["ACTIVE", "PENDING"];

/** The status a new booking starts in: large rooms wait for approval. */
export function initialStatus(room: { capacity: number }): BookingStatus {
  return room.capacity > APPROVAL_CAPACITY_THRESHOLD ? "PENDING" : "ACTIVE";
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
