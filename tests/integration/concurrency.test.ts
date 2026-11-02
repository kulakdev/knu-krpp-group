import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { BookingStatus } from "@prisma/client";
import { POST } from "@/app/api/bookings/route";
import { USER_ID_HEADER } from "@/lib/auth";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-15 — concurrent double-booking (ADR-001, lab section 7.2).
 * Two simultaneous POSTs for the same room and free slot must yield exactly
 * one 201 and one 409. A single pair can pass by luck even without the row
 * lock, so the pair is repeated over many distinct slots to make the race
 * reproducible.
 */
const ROUNDS = 20;

const server = toServer(POST);

const slot = (round: number) => ({
  startTime: new Date(Date.UTC(2030, 0, 7, round)).toISOString(),
  endTime: new Date(Date.UTC(2030, 0, 7, round + 1)).toISOString(),
});

function book(userId: string, round: number): request.Test {
  return request(server)
    .post("/api/bookings")
    .set(USER_ID_HEADER, userId)
    .send({ roomId: "room-101", ...slot(round) });
}

describe("concurrent POST /api/bookings for the same slot", () => {
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

  it(`accepts exactly one of two simultaneous requests (${ROUNDS} rounds)`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const responses = await Promise.all([
        book("student-1", round),
        book("student-2", round),
      ]);

      const statuses = responses.map((res) => res.status).sort();
      expect(statuses, `round ${round}`).toEqual([201, 409]);

      const { startTime } = slot(round);
      const active = await testPrisma.booking.count({
        where: {
          roomId: "room-101",
          startTime: new Date(startTime),
          status: BookingStatus.ACTIVE,
        },
      });
      expect(active, `round ${round}`).toBe(1);
    }
  });
});
