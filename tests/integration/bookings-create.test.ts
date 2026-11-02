import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { BookingStatus } from "@prisma/client";
import { POST } from "@/app/api/bookings/route";
import { USER_ID_HEADER } from "@/lib/auth";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-8 — POST /api/bookings against the real test Postgres.
 * The concurrent double-booking scenario is covered separately by BOOK-15.
 */
const server = toServer(POST);

const at = (hour: number, minute = 0) =>
  new Date(Date.UTC(2030, 0, 7, hour, minute)).toISOString();

function book(
  body: unknown,
  userId: string | null = "student-1",
): request.Test {
  const req = request(server).post("/api/bookings");
  if (userId !== null) req.set(USER_ID_HEADER, userId);
  return typeof body === "string"
    ? req.set("content-type", "application/json").send(body)
    : req.send(body as object);
}

describe("POST /api/bookings", () => {
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

  it("creates a booking and returns 201 with the contract shape", async () => {
    const res = await book({
      roomId: "room-101",
      startTime: at(10),
      endTime: at(11),
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      roomId: "room-101",
      roomName: "Auditorium 101",
      userId: "student-1",
      startTime: at(10),
      endTime: at(11),
      status: "ACTIVE",
    });
    expect(typeof res.body.id).toBe("string");

    // Read back through a separate client: the row is committed, not only
    // visible inside the request's transaction.
    const stored = await testPrisma.booking.findUnique({
      where: { id: res.body.id },
    });
    expect(stored?.status).toBe(BookingStatus.ACTIVE);
  });

  it("allows a booking that starts exactly when another ends", async () => {
    await book({ roomId: "room-101", startTime: at(10), endTime: at(11) });

    const res = await book(
      { roomId: "room-101", startTime: at(11), endTime: at(12) },
      "student-2",
    );

    expect(res.status).toBe(201);
  });

  it.each([
    ["partial overlap", at(10, 30), at(11, 30)],
    ["containment", at(9), at(12)],
    ["identical slot", at(10), at(11)],
  ])("rejects %s with 409", async (_case, startTime, endTime) => {
    await book({ roomId: "room-101", startTime: at(10), endTime: at(11) });

    const res = await book(
      { roomId: "room-101", startTime, endTime },
      "student-2",
    );

    expect(res.status).toBe(409);
    expect(await testPrisma.booking.count()).toBe(1);
  });

  it("does not block the same slot in a different room", async () => {
    await book({ roomId: "room-101", startTime: at(10), endTime: at(11) });

    const res = await book({
      roomId: "room-102",
      startTime: at(10),
      endTime: at(11),
    });

    expect(res.status).toBe(201);
  });

  it("does not count a cancelled booking as a conflict", async () => {
    const first = await book({
      roomId: "room-101",
      startTime: at(10),
      endTime: at(11),
    });
    await testPrisma.booking.update({
      where: { id: first.body.id },
      data: { status: BookingStatus.CANCELLED },
    });

    const res = await book(
      { roomId: "room-101", startTime: at(10), endTime: at(11) },
      "student-2",
    );

    expect(res.status).toBe(201);
  });

  it.each([
    ["equal start and end", at(10), at(10)],
    ["end before start", at(11), at(10)],
  ])("rejects %s with 400", async (_case, startTime, endTime) => {
    const res = await book({ roomId: "room-101", startTime, endTime });

    expect(res.status).toBe(400);
    expect(await testPrisma.booking.count()).toBe(0);
  });

  it.each([
    ["missing roomId", { startTime: at(10), endTime: at(11) }],
    ["unparsable startTime", { roomId: "room-101", startTime: "soon", endTime: at(11) }],
    ["missing endTime", { roomId: "room-101", startTime: at(10) }],
    ["malformed JSON", "{not json"],
    ["array body", "[]"],
  ])("rejects %s with 400", async (_case, body) => {
    const res = await book(body);

    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown room", async () => {
    const res = await book({
      roomId: "room-999",
      startTime: at(10),
      endTime: at(11),
    });

    expect(res.status).toBe(404);
  });

  it.each([
    ["missing", null],
    ["unknown", "student-999"],
  ])("returns 401 for a %s user id", async (_case, userId) => {
    const res = await book(
      { roomId: "room-101", startTime: at(10), endTime: at(11) },
      userId,
    );

    expect(res.status).toBe(401);
    expect(await testPrisma.booking.count()).toBe(0);
  });
});
