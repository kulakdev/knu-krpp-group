import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { GET } from "@/app/api/health/route";
import { toServer } from "../helpers/server";

/**
 * Harness smoke test — proves the Supertest <-> route-handler adapter works
 * end to end. This is the ONLY pre-written test; all domain tests
 * (intervals, state machine, concurrency, lifecycle, access) are QA tasks
 * in docs/backlog.md (BOOK-14 .. BOOK-16).
 *
 * Works with or without a running database: 200 when Postgres is up,
 * 503 when it is down — both are valid health-probe outcomes.
 */
describe("GET /api/health — harness smoke test", () => {
  const server = toServer((req) => GET(req));

  afterAll(() => {
    server.close();
  });

  it("responds with a health payload and a correlation id", async () => {
    const res = await request(server).get("/api/health");

    expect([200, 503]).toContain(res.status);
    expect(res.headers["x-request-id"]).toBeTruthy();
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("database");
  });
});
