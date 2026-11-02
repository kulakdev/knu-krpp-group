import {
  ConflictError,
  NotFoundError,
  NotImplementedError,
  ValidationError,
} from "@/lib/errors";
import type { Booking, Room, User } from "@prisma/client";
import { BLOCKING_STATUSES } from "@/lib/booking-state";
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
  };
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
    const lockedRooms = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Room" WHERE id = ${roomId} FOR UPDATE
    `;
    if (lockedRooms.length === 0) {
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
      data: { userId, roomId, startTime, endTime },
      include: { room: true },
    });
  });
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
 * Lists all rooms ordered by id. With a time filter each room carries
 * isAvailable: false when a booking in BLOCKING_STATUSES overlaps the
 * interval. startTime >= endTime -> ValidationError.
 */
export async function listRooms(filter?: {
  startTime: Date;
  endTime: Date;
}): Promise<(Room & { isAvailable?: boolean })[]> {
  if (!filter) {
    return prisma.room.findMany({ orderBy: { id: "asc" } });
  }

  const { startTime, endTime } = filter;
  if (!isValidInterval(startTime, endTime)) {
    throw new ValidationError("startTime must be before endTime");
  }

  const [rooms, busy] = await Promise.all([
    prisma.room.findMany({ orderBy: { id: "asc" } }),
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
