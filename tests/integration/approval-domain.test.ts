import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { BookingStatus } from "@prisma/client";
import { DELETE } from "@/app/api/bookings/[id]/route";
import { POST } from "@/app/api/bookings/route";
import { USER_ID_HEADER } from "@/lib/auth";
import { listRooms } from "@/lib/booking-service";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-32 — v2.0 approval rule on the domain side (lab section 10.1):
 * hall-main (capacity 150) bookings start PENDING, a PENDING booking holds
 * its slot, and the owner can withdraw it. Admin decisions are BOOK-33.
 */
const server = toServer((req) => {
  const match = new URL(req.url).pathname.match(/^\/api\/bookings\/([^/]+)$/);
  return match
    ? DELETE(req, { params: Promise.resolve({ id: match[1] }) })
    : POST(req);
});

const slot = (roomId: string) => ({
  roomId,
  startTime: new Date(Date.UTC(2030, 0, 7, 10)).toISOString(),
  endTime: new Date(Date.UTC(2030, 0, 7, 11)).toISOString(),
});

const book = (roomId: string, userId = "student-1") =>
  request(server).post("/api/bookings").set(USER_ID_HEADER, userId).send(slot(roomId));

const cancel = (id: string, userId = "student-1") =>
  request(server).delete(`/api/bookings/${id}`).set(USER_ID_HEADER, userId);

async function hallMainAvailable(): Promise<boolean | undefined> {
  const { startTime, endTime } = slot("hall-main");
  const rooms = await listRooms({
    startTime: new Date(startTime),
    endTime: new Date(endTime),
  });
  return rooms.find((room) => room.id === "hall-main")?.isAvailable;
}

describe("v2.0 approval rule (domain)", () => {
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

  it("a booking of a room with capacity > 100 starts PENDING", async () => {
    const res = await book("hall-main");

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING");
  });

  it("a booking of a room with capacity <= 100 stays ACTIVE", async () => {
    const res = await book("room-101");

    expect(res.body.status).toBe("ACTIVE");
  });

  it("a PENDING booking reserves its slot", async () => {
    await book("hall-main");

    const second = await book("hall-main", "student-2");

    expect(second.status).toBe(409);
    expect(await hallMainAvailable()).toBe(false);
  });

  it("the owner can withdraw a PENDING request, which frees the slot", async () => {
    const pending = await book("hall-main");

    const res = await cancel(pending.body.id);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
    expect(await hallMainAvailable()).toBe(true);
    expect((await book("hall-main", "student-2")).status).toBe(201);
  });

  it("another user cannot withdraw someone's PENDING request", async () => {
    const pending = await book("hall-main");

    const res = await cancel(pending.body.id, "student-2");

    expect(res.status).toBe(403);
    const stored = await testPrisma.booking.findUnique({
      where: { id: pending.body.id },
    });
    expect(stored?.status).toBe(BookingStatus.PENDING);
  });

  it("a REJECTED booking frees the slot and cannot be cancelled", async () => {
    const pending = await book("hall-main");
    await testPrisma.booking.update({
      where: { id: pending.body.id },
      data: { status: BookingStatus.REJECTED },
    });

    expect(await hallMainAvailable()).toBe(true);
    expect((await cancel(pending.body.id)).status).toBe(409);
  });
});
