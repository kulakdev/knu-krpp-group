import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { BookingStatus } from "@prisma/client";
import { GET } from "@/app/api/bookings/route";
import { USER_ID_HEADER } from "@/lib/auth";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-9 — GET /api/bookings against the real test Postgres. Bookings are
 * seeded directly so the test does not depend on POST /api/bookings.
 */
const server = toServer(GET);

const at = (hour: number) =>
  new Date(Date.UTC(2030, 0, 7, hour)).toISOString();

async function seedBooking(
  userId: string,
  roomId: string,
  startHour: number,
  status: BookingStatus = BookingStatus.ACTIVE,
): Promise<void> {
  await testPrisma.booking.create({
    data: {
      userId,
      roomId,
      startTime: new Date(at(startHour)),
      endTime: new Date(at(startHour + 1)),
      status,
    },
  });
}

function listAs(userId: string | null): request.Test {
  const req = request(server).get("/api/bookings");
  return userId === null ? req : req.set(USER_ID_HEADER, userId);
}

describe("GET /api/bookings", () => {
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

  it("returns own ACTIVE and CANCELLED bookings with room names, ordered by startTime", async () => {
    await seedBooking("student-1", "room-102", 14, BookingStatus.CANCELLED);
    await seedBooking("student-1", "room-101", 10);

    const res = await listAs("student-1");

    expect(res.status).toBe(200);
    expect(res.body.bookings).toMatchObject([
      {
        roomId: "room-101",
        roomName: "Auditorium 101",
        userId: "student-1",
        startTime: at(10),
        endTime: at(11),
        status: "ACTIVE",
      },
      {
        roomId: "room-102",
        roomName: "Auditorium 102",
        startTime: at(14),
        status: "CANCELLED",
      },
    ]);
  });

  it("never returns another user's bookings", async () => {
    await seedBooking("student-1", "room-101", 10);
    await seedBooking("student-2", "room-102", 10);
    await seedBooking("student-2", "hall-main", 12);

    const res = await listAs("student-1");

    expect(res.body.bookings).toHaveLength(1);
    expect(
      res.body.bookings.every(
        (booking: { userId: string }) => booking.userId === "student-1",
      ),
    ).toBe(true);
  });

  it("returns an empty list for a user without bookings", async () => {
    await seedBooking("student-2", "room-101", 10);

    const res = await listAs("student-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bookings: [] });
  });

  it.each([
    ["missing", null],
    ["unknown", "student-999"],
  ])("returns 401 for a %s user id", async (_case, userId) => {
    const res = await listAs(userId);

    expect(res.status).toBe(401);
  });
});
