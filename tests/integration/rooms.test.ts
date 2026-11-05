import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { BookingStatus } from "@prisma/client";
import { GET } from "@/app/api/rooms/route";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-11 — GET /api/rooms with the optional availability filter, against
 * the real test Postgres. Bookings are seeded directly so the test does not
 * depend on POST /api/bookings.
 */
const server = toServer(GET);

const at = (hour: number, minute = 0) =>
  new Date(Date.UTC(2030, 0, 7, hour, minute)).toISOString();

async function seedBooking(
  roomId: string,
  startTime: string,
  endTime: string,
  status: BookingStatus = BookingStatus.ACTIVE,
): Promise<void> {
  await testPrisma.booking.create({
    data: {
      roomId,
      userId: "student-1",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status,
    },
  });
}

function availability(rooms: { id: string; isAvailable: boolean }[]) {
  return Object.fromEntries(rooms.map((room) => [room.id, room.isAvailable]));
}

describe("GET /api/rooms", () => {
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

  it("returns all rooms ordered by id without availability when no filter is given", async () => {
    const res = await request(server).get("/api/rooms");

    expect(res.status).toBe(200);
    expect(res.body.rooms).toEqual([
      {
        id: "hall-main",
        name: "Grand Conference Hall",
        capacity: 150,
        equipment: ["PROJECTOR", "WHITEBOARD"],
      },
      {
        id: "room-101",
        name: "Auditorium 101",
        capacity: 30,
        equipment: ["PROJECTOR", "WHITEBOARD"],
      },
      {
        id: "room-102",
        name: "Auditorium 102",
        capacity: 50,
        equipment: ["COMPUTERS", "PROJECTOR"],
      },
    ]);
  });

  it("marks a room with an overlapping active booking as unavailable", async () => {
    await seedBooking("room-101", at(10), at(11));

    const res = await request(server)
      .get("/api/rooms")
      .query({ startTime: at(10, 30), endTime: at(11, 30) });

    expect(res.status).toBe(200);
    expect(availability(res.body.rooms)).toEqual({
      "hall-main": true,
      "room-101": false,
      "room-102": true,
    });
  });

  it("treats an interval adjacent to a booking as available", async () => {
    await seedBooking("room-101", at(10), at(11));

    const res = await request(server)
      .get("/api/rooms")
      .query({ startTime: at(11), endTime: at(12) });

    expect(availability(res.body.rooms)["room-101"]).toBe(true);
  });

  it("ignores cancelled bookings", async () => {
    await seedBooking("room-101", at(10), at(11), BookingStatus.CANCELLED);

    const res = await request(server)
      .get("/api/rooms")
      .query({ startTime: at(10), endTime: at(11) });

    expect(availability(res.body.rooms)["room-101"]).toBe(true);
  });

  it.each([
    ["only startTime", { startTime: at(10) }],
    ["only endTime", { endTime: at(11) }],
    ["unparsable datetime", { startTime: "soon", endTime: at(11) }],
    ["equal start and end", { startTime: at(10), endTime: at(10) }],
    ["end before start", { startTime: at(11), endTime: at(10) }],
  ])("rejects %s with 400", async (_case, query) => {
    const res = await request(server).get("/api/rooms").query(query);

    expect(res.status).toBe(400);
  });
});
