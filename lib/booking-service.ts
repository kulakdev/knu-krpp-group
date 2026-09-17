import { NotImplementedError } from "@/lib/errors";
import type { Booking, Room, User } from "@prisma/client";

export type BookingWithRoom = Booking & { room: Room };

/**
 * TODO(BOOK-8): create a booking with race-condition protection (ADR-001).
 *
 * Contract:
 *  - validate startTime < endTime via lib/intervals (else ValidationError);
 *  - run inside ONE prisma.$transaction: lock the room row with
 *    SELECT ... FOR UPDATE (tx.$queryRaw), then check for overlapping
 *    bookings in BLOCKING_STATUSES with [start, end) semantics (strict
    inequalities: startTime < end && endTime > start);
 *  - overlap -> throw ConflictError (transaction rolls back);
 *  - unknown room -> NotFoundError;
 *  - success -> create booking (status defaults to ACTIVE), include room.
 */
export async function createBooking(input: {
  userId: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
}): Promise<BookingWithRoom> {
  void input;
  throw new NotImplementedError("BOOK-8");
}

/**
 * TODO(BOOK-9): return all bookings (ACTIVE and CANCELLED) belonging to the
 * user, including the related room, ordered by startTime ascending.
 */
export async function listBookingsForUser(
  userId: string,
): Promise<BookingWithRoom[]> {
  void userId;
  throw new NotImplementedError("BOOK-9");
}

/**
 * TODO(BOOK-10): cancel a booking, releasing the slot.
 *
 * Contract (lab section 2.2 — rights enforced in server logic):
 *  - unknown booking -> NotFoundError;
 *  - actor is not the owner -> ForbiddenError (403);
 *  - already CANCELLED -> idempotent no-op, return current record;
 *  - otherwise assertTransition(ACTIVE -> CANCELLED) and update status.
 */
export async function cancelBooking(
  bookingId: string,
  actor: User,
): Promise<BookingWithRoom> {
  void bookingId;
  void actor;
  throw new NotImplementedError("BOOK-10");
}

/**
 * TODO(BOOK-11): list all rooms ordered by id. When a time filter is given,
 * validate it and annotate each room with isAvailable based on overlapping
 * bookings in BLOCKING_STATUSES ([start, end) semantics). Invalid interval
 * -> ValidationError.
 */
export async function listRooms(filter?: {
  startTime: Date;
  endTime: Date;
}): Promise<(Room & { isAvailable?: boolean })[]> {
  void filter;
  throw new NotImplementedError("BOOK-11");
}
