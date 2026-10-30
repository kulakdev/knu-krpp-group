import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser, USER_ID_HEADER } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { UnauthorizedError } from "@/lib/errors";
import { resetDatabase, testPrisma } from "../helpers/db";
import { toServer } from "../helpers/server";

/**
 * BOOK-12 — mock authentication via the x-user-id header (ADR-002).
 * Runs against the real test Postgres with the seeded users.
 */
function requestAs(userId?: string): Request {
  const headers = new Headers();
  if (userId !== undefined) headers.set(USER_ID_HEADER, userId);
  return new Request("http://localhost/api/anything", { headers });
}

describe("getCurrentUser", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it.each([
    ["student-1", Role.STUDENT],
    ["student-2", Role.STUDENT],
    ["admin-1", Role.ADMIN],
  ])("resolves seeded user %s with role %s", async (userId, role) => {
    const user = await getCurrentUser(requestAs(userId));

    expect(user.id).toBe(userId);
    expect(user.role).toBe(role);
  });

  it("rejects a request without the header", async () => {
    await expect(getCurrentUser(requestAs())).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects a blank header value", async () => {
    await expect(getCurrentUser(requestAs("   "))).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects an id that is not in the users table", async () => {
    await expect(
      getCurrentUser(requestAs("student-999")),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("auth failure through apiHandler", () => {
  const server = toServer(
    apiHandler("auth.probe", async (req) => {
      const user = await getCurrentUser(req);
      return NextResponse.json({ id: user.id });
    }),
  );

  afterAll(() => {
    server.close();
  });

  it("returns 401 and logs a business failure, not a technical fault", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(server)
      .get("/api/anything")
      .set(USER_ID_HEADER, "student-999");

    expect(res.status).toBe(401);
    expect(res.body.requestId).toBe(res.headers["x-request-id"]);

    const entry = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(entry).toMatchObject({
      op: "auth.probe",
      level: "info",
      result: "error",
      statusCode: 401,
    });
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("passes a seeded user through to the handler", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await request(server)
      .get("/api/anything")
      .set(USER_ID_HEADER, "admin-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "admin-1" });

    logSpy.mockRestore();
  });
});
