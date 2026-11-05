import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus, Role } from "@prisma/client";
import {
  cancelBooking,
  createBooking,
  listBookingsForUser,
  listRooms,
} from "@/lib/booking-service";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { resetDatabase, testPrisma } from "../helpers/db";

/**
 * BOOK-30 — characterisation tests: the v1.0 behaviour that the v2.0
 * change request (BOOK-23, lab section 10.1) must keep. They describe what
 * the code does today, so a v2.0 change that breaks one of them is a
 * regression, not an intended change. Bookings of hall-main (capacity 150)
 * are deliberately not pinned: v2.0 changes them to PENDING.
 */
const at = (hour: number) => new Date(Date.UTC(2030, 0, 7, hour));

const student1 = { id: "student-1", name: "Alex Student", role: Role.STUDENT };
const student2 = { id: "student-2", name: "Maria Student", role: Role.STUDENT };
const admin = { id: "admin-1", name: "Admin User", role: Role.ADMIN };

function book(roomId: string, startHour: number, userId = student1.id) {
  return createBooking({
    userId,
    roomId,
    startTime: at(startHour),
    endTime: at(startHour + 1),
  });
}

describe("v1.0 behaviour kept by v2.0", () => {
  beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await testPrisma.$disconnect();
  });

  it.each([
    ["room-101", 30],
    ["room-102", 50],
  ])("a booking of %s (capacity %i <= 100) is ACTIVE at once", async (roomId) => {
    const booking = await book(roomId, 10);

    expect(booking.status).toBe(BookingStatus.ACTIVE);
  });

  it("an ACTIVE booking blocks an overlapping one and frees the slot when cancelled", async () => {
    const first = await book("room-101", 10);

    await expect(book("room-101", 10, student2.id)).rejects.toBeInstanceOf(
      ConflictError,
    );

    await cancelBooking(first.id, student1);
    const second = await book("room-101", 10, student2.id);
    expect(second.status).toBe(BookingStatus.ACTIVE);
  });

  it("only the owner cancels; an admin is not an exception", async () => {
    const booking = await book("room-101", 10);

    for (const actor of [student2, admin]) {
      await expect(cancelBooking(booking.id, actor)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    }
    const cancelled = await cancelBooking(booking.id, student1);
    expect(cancelled.status).toBe(BookingStatus.CANCELLED);
  });

  it("re-cancelling is a no-op that returns the cancelled record", async () => {
    const booking = await book("room-102", 10);
    await cancelBooking(booking.id, student1);

    const again = await cancelBooking(booking.id, student1);

    expect(again).toMatchObject({ id: booking.id, status: BookingStatus.CANCELLED });
  });

  it("the user's list keeps cancelled records with their room", async () => {
    const active = await book("room-101", 10);
    const cancelled = await book("room-102", 12);
    await cancelBooking(cancelled.id, student1);

    const list = await listBookingsForUser(student1.id);

    expect(list.map((b) => [b.id, b.status, b.room.id])).toEqual([
      [active.id, BookingStatus.ACTIVE, "room-101"],
      [cancelled.id, BookingStatus.CANCELLED, "room-102"],
    ]);
  });

  it("availability counts only blocking bookings of small rooms", async () => {
    const booking = await book("room-101", 10);
    await book("room-102", 10);
    await cancelBooking(booking.id, student1);

    const rooms = await listRooms({ startTime: at(10), endTime: at(11) });

    expect(
      Object.fromEntries(rooms.map((room) => [room.id, room.isAvailable])),
    ).toMatchObject({ "room-101": true, "room-102": false });
  });
});
