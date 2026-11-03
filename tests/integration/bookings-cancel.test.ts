import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { BookingStatus } from "@prisma/client";
import { DELETE } from "@/app/api/bookings/[id]/route";
import { USER_ID_HEADER } from "@/lib/auth";
import { listRooms } from "@/lib/booking-service";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-10 — DELETE /api/bookings/:id against the real test Postgres.
 * toServer() passes only the request, so the dynamic segment is taken from
 * the URL here, the way Next fills ctx.params at runtime.
 */
const server = toServer((req) =>
  DELETE(req, {
    params: Promise.resolve({
      id: new URL(req.url).pathname.split("/").pop() ?? "",
    }),
  }),
);

const at = (hour: number) => new Date(Date.UTC(2030, 0, 7, hour));

async function seedBooking(
  userId = "student-1",
  status: BookingStatus = BookingStatus.ACTIVE,
): Promise<string> {
  const booking = await testPrisma.booking.create({
    data: {
      userId,
      roomId: "room-101",
      startTime: at(10),
      endTime: at(11),
      status,
    },
  });
  return booking.id;
}

function cancelAs(id: string, userId: string | null): request.Test {
  const req = request(server).delete(`/api/bookings/${id}`);
  return userId === null ? req : req.set(USER_ID_HEADER, userId);
}

async function statusOf(id: string): Promise<BookingStatus | undefined> {
  const booking = await testPrisma.booking.findUnique({ where: { id } });
  return booking?.status;
}

describe("DELETE /api/bookings/:id", () => {
  beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    server.close();
    await testPrisma.$disconnect();
  });

  it("lets the owner cancel an active booking and frees the slot", async () => {
    const id = await seedBooking();

    const res = await cancelAs(id, "student-1");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id,
      roomName: "Auditorium 101",
      status: "CANCELLED",
    });
    expect(await statusOf(id)).toBe(BookingStatus.CANCELLED);

    const rooms = await listRooms({ startTime: at(10), endTime: at(11) });
    expect(rooms.find((room) => room.id === "room-101")?.isAvailable).toBe(
      true,
    );
  });

  it.each([
    ["another student", "student-2"],
    ["an admin", "admin-1"],
  ])("returns 403 to %s and leaves the booking active", async (_case, userId) => {
    const id = await seedBooking();

    const res = await cancelAs(id, userId);

    expect(res.status).toBe(403);
    expect(await statusOf(id)).toBe(BookingStatus.ACTIVE);
  });

  it("returns 404 for an unknown booking id", async () => {
    const res = await cancelAs("no-such-booking", "student-1");

    expect(res.status).toBe(404);
  });

  it.each([
    ["missing", null],
    ["unknown", "student-999"],
  ])("returns 401 for a %s user id", async (_case, userId) => {
    const id = await seedBooking();

    const res = await cancelAs(id, userId);

    expect(res.status).toBe(401);
    expect(await statusOf(id)).toBe(BookingStatus.ACTIVE);
  });

  it("treats re-cancelling an already cancelled own booking as a no-op", async () => {
    const id = await seedBooking("student-1", BookingStatus.CANCELLED);

    const res = await cancelAs(id, "student-1");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
    expect(await statusOf(id)).toBe(BookingStatus.CANCELLED);
  });
});
