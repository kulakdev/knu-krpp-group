import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { BookingStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { DELETE } from "@/app/api/bookings/[id]/route";
import { GET as listBookings, POST } from "@/app/api/bookings/route";
import { GET as listRooms } from "@/app/api/rooms/route";
import { USER_ID_HEADER } from "@/lib/auth";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-16 — the booking lifecycle and access rules through the real API
 * routes and test Postgres (FR-02, FR-03, FR-04, QR-1).
 */
function route(req: NextRequest): Promise<Response> {
  const { pathname } = new URL(req.url);
  if (pathname === "/api/rooms" && req.method === "GET") return listRooms(req);
  if (pathname === "/api/bookings" && req.method === "GET") {
    return listBookings(req);
  }
  if (pathname === "/api/bookings" && req.method === "POST") return POST(req);

  const match = pathname.match(/^\/api\/bookings\/([^/]+)$/);
  if (match && req.method === "DELETE") {
    return DELETE(req, { params: Promise.resolve({ id: match[1] }) });
  }
  return Promise.resolve(new Response(null, { status: 404 }));
}

const server = toServer(route);

const slot = {
  roomId: "room-101",
  startTime: new Date(Date.UTC(2030, 0, 7, 10)).toISOString(),
  endTime: new Date(Date.UTC(2030, 0, 7, 11)).toISOString(),
};

const as = (userId: string) => ({ [USER_ID_HEADER]: userId });

async function createAs(userId: string): Promise<string> {
  const res = await request(server)
    .post("/api/bookings")
    .set(as(userId))
    .send(slot);
  expect(res.status).toBe(201);
  return res.body.id;
}

async function room101Available(): Promise<boolean> {
  const res = await request(server)
    .get("/api/rooms")
    .query({ startTime: slot.startTime, endTime: slot.endTime });
  return res.body.rooms.find((room: { id: string }) => room.id === "room-101")
    .isAvailable;
}

describe("booking lifecycle through the API", () => {
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

  it("create -> list -> cancel frees the slot again", async () => {
    expect(await room101Available()).toBe(true);

    const id = await createAs("student-1");
    expect(await room101Available()).toBe(false);

    const listed = await request(server)
      .get("/api/bookings")
      .set(as("student-1"));
    expect(listed.body.bookings).toMatchObject([{ id, status: "ACTIVE" }]);

    const cancelled = await request(server)
      .delete(`/api/bookings/${id}`)
      .set(as("student-1"));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("CANCELLED");

    expect(await room101Available()).toBe(true);
    const relisted = await request(server)
      .get("/api/bookings")
      .set(as("student-1"));
    expect(relisted.body.bookings).toMatchObject([{ id, status: "CANCELLED" }]);

    // The freed slot can be booked again.
    await createAs("student-2");
  });

  it("persists the booking with the same id, owner and interval", async () => {
    const id = await createAs("student-1");

    const stored = await testPrisma.booking.findUnique({ where: { id } });

    expect(stored).toMatchObject({
      id,
      userId: "student-1",
      roomId: slot.roomId,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      status: BookingStatus.ACTIVE,
    });
  });

  it("QR-1: another student cannot cancel the booking and it stays active", async () => {
    const id = await createAs("student-1");

    const res = await request(server)
      .delete(`/api/bookings/${id}`)
      .set(as("student-2"));

    expect(res.status).toBe(403);
    const stored = await testPrisma.booking.findUnique({ where: { id } });
    expect(stored?.status).toBe(BookingStatus.ACTIVE);
    expect(await room101Available()).toBe(false);
  });

  it("returns 404 for an unknown booking id", async () => {
    const res = await request(server)
      .delete("/api/bookings/no-such-booking")
      .set(as("student-1"));

    expect(res.status).toBe(404);
  });

  it("returns 401 without x-user-id on every authenticated route", async () => {
    const id = await createAs("student-1");

    const responses = await Promise.all([
      request(server).post("/api/bookings").send(slot),
      request(server).get("/api/bookings"),
      request(server).delete(`/api/bookings/${id}`),
    ]);

    expect(responses.map((res) => res.status)).toEqual([401, 401, 401]);
  });
});
