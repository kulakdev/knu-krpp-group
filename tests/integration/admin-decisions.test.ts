import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { NextRequest } from "next/server";
import { BookingDecision, BookingStatus } from "@prisma/client";
import { POST as approve } from "@/app/api/admin/bookings/[id]/approve/route";
import { POST as reject } from "@/app/api/admin/bookings/[id]/reject/route";
import { GET as listPending } from "@/app/api/admin/bookings/route";
import { DELETE as cancel } from "@/app/api/bookings/[id]/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { USER_ID_HEADER } from "@/lib/auth";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-33 — admin decisions on PENDING bookings through the real routes
 * (lab section 10.1).
 */
function route(req: NextRequest): Promise<Response> {
  const { pathname } = new URL(req.url);
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  const decision = pathname.match(/^\/api\/admin\/bookings\/([^/]+)\/(approve|reject)$/);
  if (decision && req.method === "POST") {
    return (decision[2] === "approve" ? approve : reject)(req, params(decision[1]));
  }
  if (pathname === "/api/admin/bookings") return listPending(req);
  const booking = pathname.match(/^\/api\/bookings\/([^/]+)$/);
  if (booking && req.method === "DELETE") return cancel(req, params(booking[1]));
  return createBooking(req);
}

const server = toServer(route);

const slot = (roomId: string, hour = 10) => ({
  roomId,
  startTime: new Date(Date.UTC(2030, 0, 7, hour)).toISOString(),
  endTime: new Date(Date.UTC(2030, 0, 7, hour + 1)).toISOString(),
});

const as = (userId: string) => ({ [USER_ID_HEADER]: userId });

async function requestHall(userId = "student-1", hour = 10): Promise<string> {
  const res = await request(server).post("/api/bookings").set(as(userId)).send(slot("hall-main", hour));
  expect(res.body.status).toBe("PENDING");
  return res.body.id;
}

const decide = (id: string, action: "approve" | "reject", userId = "admin-1") =>
  request(server).post(`/api/admin/bookings/${id}/${action}`).set(as(userId));

const stored = (id: string) => testPrisma.booking.findUnique({ where: { id } });

describe("admin decisions on PENDING bookings", () => {
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

  it("approve: PENDING -> ACTIVE with author and time recorded", async () => {
    const id = await requestHall();

    const res = await decide(id, "approve");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id,
      status: "ACTIVE",
      decision: "APPROVED",
      decidedById: "admin-1",
    });
    expect(typeof res.body.decidedAt).toBe("string");
    // An approved booking still holds the slot.
    const other = await request(server).post("/api/bookings").set(as("student-2")).send(slot("hall-main"));
    expect(other.status).toBe(409);
  });

  it("reject: PENDING -> REJECTED and the slot is free again", async () => {
    const id = await requestHall();

    const res = await decide(id, "reject");

    expect(res.body).toMatchObject({ status: "REJECTED", decision: "REJECTED", decidedById: "admin-1" });
    const other = await request(server).post("/api/bookings").set(as("student-2")).send(slot("hall-main"));
    expect(other.status).toBe(201);
  });

  it("a student cannot approve, reject or see the queue (403, nothing changes)", async () => {
    const id = await requestHall();

    const responses = await Promise.all([
      decide(id, "approve", "student-2"),
      decide(id, "reject", "student-1"),
      request(server).get("/api/admin/bookings").set(as("student-1")),
    ]);

    expect(responses.map((res) => res.status)).toEqual([403, 403, 403]);
    expect(await stored(id)).toMatchObject({ status: BookingStatus.PENDING, decision: null });
  });

  it("repeating the same decision is a no-op", async () => {
    const id = await requestHall();
    const first = await decide(id, "approve");

    const again = await decide(id, "approve");

    expect(again.status).toBe(200);
    expect(again.body.decidedAt).toBe(first.body.decidedAt);
    expect((await stored(id))?.status).toBe(BookingStatus.ACTIVE);
  });

  it("the opposite decision on a processed request is a 409 and changes nothing", async () => {
    const id = await requestHall();
    await decide(id, "approve");

    const res = await decide(id, "reject");

    expect(res.status).toBe(409);
    expect(await stored(id)).toMatchObject({
      status: BookingStatus.ACTIVE,
      decision: BookingDecision.APPROVED,
    });
  });

  it("two concurrent opposite decisions: exactly one applies", async () => {
    const id = await requestHall();

    const responses = await Promise.all([decide(id, "approve"), decide(id, "reject")]);

    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    const booking = await stored(id);
    const winner = responses.find((res) => res.status === 200)?.body;
    expect(booking).toMatchObject({ status: winner.status, decision: winner.decision });
  });

  it("deciding on a booking that never needed approval is a 409", async () => {
    const res = await request(server).post("/api/bookings").set(as("student-1")).send(slot("room-101"));

    expect((await decide(res.body.id, "approve")).status).toBe(409);
  });

  it("deciding on a request withdrawn by its owner is a 409", async () => {
    const id = await requestHall();
    await request(server).delete(`/api/bookings/${id}`).set(as("student-1"));

    expect((await decide(id, "approve")).status).toBe(409);
    expect((await stored(id))?.status).toBe(BookingStatus.CANCELLED);
  });

  it("unknown booking -> 404, missing user -> 401", async () => {
    expect((await decide("no-such-booking", "approve")).status).toBe(404);
    expect((await request(server).post("/api/admin/bookings/x/approve")).status).toBe(401);
  });

  it("the admin queue lists only PENDING requests with the requester, earliest first", async () => {
    const later = await requestHall("student-2", 14);
    const earlier = await requestHall("student-1", 9);
    const decided = await requestHall("student-1", 16);
    await decide(decided, "reject");
    await request(server).post("/api/bookings").set(as("student-1")).send(slot("room-101"));

    const res = await request(server).get("/api/admin/bookings").set(as("admin-1"));

    expect(res.status).toBe(200);
    expect(res.body.bookings.map((b: { id: string; userName: string }) => [b.id, b.userName])).toEqual([
      [earlier, "Alex Student"],
      [later, "Maria Student"],
    ]);
  });
});
