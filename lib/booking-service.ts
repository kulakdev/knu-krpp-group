import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { BookingDecision, BookingStatus, Role } from "@prisma/client";
import type { Booking, Equipment, Room, User } from "@prisma/client";
import {
  assertTransition,
  BLOCKING_STATUSES,
  initialStatus,
} from "@/lib/booking-state";
import { isValidInterval } from "@/lib/intervals";
import { prisma } from "@/lib/prisma";

export type BookingWithRoom = Booking & { room: Room };

/** Wire shape of a booking (docs/api-contract.md), timestamps in ISO 8601 UTC. */
export function serializeBooking(booking: BookingWithRoom) {
  return {
    id: booking.id,
    roomId: booking.roomId,
    roomName: booking.room.name,
    userId: booking.userId,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    // v2.0 admin decision (author, time, result); null when never decided.
    decision: booking.decision,
    decidedById: booking.decidedById,
    decidedAt: booking.decidedAt?.toISOString() ?? null,
  };
}

export type PendingBooking = BookingWithRoom & { user: User };

/** Wire shape of a request in the admin queue: a booking plus its requester. */
export function serializePendingBooking(booking: PendingBooking) {
  return { ...serializeBooking(booking), userName: booking.user.name };
}

/**
 * Creates a booking with race-condition protection (ADR-001): the room row
 * is locked with SELECT ... FOR UPDATE, so concurrent requests for the same
 * room run the overlap check one at a time and the loser gets 409.
 *
 *  - startTime >= endTime -> ValidationError;
 *  - unknown room -> NotFoundError;
 *  - overlap with a booking in BLOCKING_STATUSES -> ConflictError
 *    (the transaction rolls back).
 */
export async function createBooking(input: {
  userId: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
}): Promise<BookingWithRoom> {
  const { userId, roomId, startTime, endTime } = input;
  if (!isValidInterval(startTime, endTime)) {
    throw new ValidationError("startTime must be before endTime");
  }

  return prisma.$transaction(async (tx) => {
    const [room] = await tx.$queryRaw<{ id: string; capacity: number }[]>`
      SELECT id, capacity FROM "Room" WHERE id = ${roomId} FOR UPDATE
    `;
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Same [start, end) rule as overlaps() in lib/intervals, expressed as a
    // query so the check runs inside the locked transaction.
    const overlapping = await tx.booking.findFirst({
      where: {
        roomId,
        status: { in: [...BLOCKING_STATUSES] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new ConflictError();
    }

    return tx.booking.create({
      data: { userId, roomId, startTime, endTime, status: initialStatus(room) },
      include: { room: true },
    });
  });
}

/**
 * Returns all bookings (ACTIVE and CANCELLED) belonging to the user,
 * including the related room, ordered by startTime ascending.
 */
export async function listBookingsForUser(
  userId: string,
): Promise<BookingWithRoom[]> {
  return prisma.booking.findMany({
    where: { userId },
    include: { room: true },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Cancels a booking, releasing the slot. Rights are enforced here, not in
 * the UI (lab section 2.2):
 *  - unknown booking -> NotFoundError;
 *  - actor is not the owner -> ForbiddenError (403), booking unchanged;
 *  - already CANCELLED, also by a concurrent cancel -> idempotent no-op,
 *    returns the current record;
 *  - ACTIVE or PENDING (v2.0: the owner withdraws a request) -> CANCELLED;
 *  - REJECTED -> InvalidTransitionError (409): nothing left to cancel;
 *  - status changed by a concurrent decision -> ConflictError (409).
 */
export async function cancelBooking(
  bookingId: string,
  actor: User,
): Promise<BookingWithRoom> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true },
  });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }
  if (booking.userId !== actor.id) {
    throw new ForbiddenError("Only the owner can cancel this booking");
  }
  if (booking.status === BookingStatus.CANCELLED) {
    return booking;
  }

  assertTransition(booking.status, BookingStatus.CANCELLED);
  // Conditional on the status read above: if an admin decided in between,
  // nothing matches and the cancel is refused instead of overwriting the
  // decision with a forbidden transition (v2.0 impact analysis, risk V5).
  const { count } = await prisma.booking.updateMany({
    where: { id: bookingId, status: booking.status },
    data: { status: BookingStatus.CANCELLED },
  });
  const current = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { room: true },
  });
  // Nothing matched: either a concurrent cancel by the owner got there
  // first — idempotent, same as the re-cancel above (BOOK-50) — or an admin
  // decided in between, which is refused.
  if (count === 0 && current.status !== BookingStatus.CANCELLED) {
    throw new ConflictError("The booking changed meanwhile; reload and try again");
  }
  return current;
}

/**
 * Lists rooms ordered by id. With `equipment` only rooms having all listed
 * items are returned. With a time filter each room carries isAvailable:
 * false when a booking in BLOCKING_STATUSES overlaps the interval.
 * startTime >= endTime -> ValidationError.
 */
export async function listRooms(
  filter?: { startTime: Date; endTime: Date },
  equipment: Equipment[] = [],
): Promise<(Room & { isAvailable?: boolean })[]> {
  const findRooms = () =>
    prisma.room.findMany({
      where: equipment.length > 0 ? { equipment: { hasEvery: equipment } } : {},
      orderBy: { id: "asc" },
    });

  if (!filter) {
    return findRooms();
  }

  const { startTime, endTime } = filter;
  if (!isValidInterval(startTime, endTime)) {
    throw new ValidationError("startTime must be before endTime");
  }

  const [rooms, busy] = await Promise.all([
    findRooms(),
    // Same [start, end) rule as overlaps() in lib/intervals, run in the
    // database so the check stays one indexed query (QR-3).
    prisma.booking.findMany({
      where: {
        status: { in: [...BLOCKING_STATUSES] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { roomId: true },
      distinct: ["roomId"],
    }),
  ]);

  const busyRoomIds = new Set(busy.map((booking) => booking.roomId));
  return rooms.map((room) => ({
    ...room,
    isAvailable: !busyRoomIds.has(room.id),
  }));
}

function assertAdmin(actor: User): void {
  if (actor.role !== Role.ADMIN) {
    throw new ForbiddenError("Only an administrator can review booking requests");
  }
}

/** PENDING requests waiting for an admin decision, earliest slot first. */
export async function listPendingBookings(
  actor: User,
): Promise<PendingBooking[]> {
  assertAdmin(actor);
  return prisma.booking.findMany({
    where: { status: BookingStatus.PENDING },
    include: { room: true, user: true },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Records an admin decision on a PENDING booking (v2.0, lab section 10.1):
 * APPROVED -> ACTIVE, REJECTED -> REJECTED (frees the slot), with author and
 * time stored on the booking.
 *  - non-admin -> ForbiddenError (403); unknown booking -> NotFoundError;
 *  - the same decision again -> idempotent no-op, returns the record;
 *  - any other non-PENDING state (opposite decision, cancelled by the
 *    owner, never needed approval) -> ConflictError (409).
 * The update is conditional on status = PENDING, so two concurrent
 * decisions cannot both apply.
 */
export async function decideBooking(
  bookingId: string,
  actor: User,
  decision: BookingDecision,
): Promise<BookingWithRoom> {
  assertAdmin(actor);
  const target =
    decision === BookingDecision.APPROVED
      ? BookingStatus.ACTIVE
      : BookingStatus.REJECTED;
  assertTransition(BookingStatus.PENDING, target);

  const { count } = await prisma.booking.updateMany({
    where: { id: bookingId, status: BookingStatus.PENDING },
    data: {
      status: target,
      decision,
      decidedById: actor.id,
      decidedAt: new Date(),
    },
  });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true },
  });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }
  if (count === 0 && booking.decision !== decision) {
    throw new ConflictError(
      `Booking is not waiting for a decision (status ${booking.status})`,
    );
  }
  return booking;
}
