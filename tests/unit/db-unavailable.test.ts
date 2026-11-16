import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { apiHandler } from "@/lib/api";
import { isDatabaseUnavailable } from "@/lib/db-errors";
import { ConflictError } from "@/lib/errors";

/**
 * BOOK-44 — an unreachable database answers 503, other unexpected errors
 * stay 500. Error shapes below were captured from Prisma 7 + adapter-pg
 * with the Postgres container stopped.
 */
function knownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("db error", {
    code,
    clientVersion: "test",
    meta,
  });
}

const refused = knownError("ECONNREFUSED", { modelName: "Room" });
const adminShutdown = knownError("P2039", {
  modelName: "Room",
  driverAdapterError: {
    name: "DriverAdapterError",
    cause: { originalCode: "57P01", kind: "postgres" },
  },
});
const transactionRefused = Object.assign(new AggregateError([], ""), {
  code: "ECONNREFUSED",
});

async function respond(error: unknown) {
  const handler = apiHandler("test.op", async () => {
    throw error;
  });
  const res = await handler(new Request("http://localhost/api/test"));
  return { status: res.status, body: await res.json() };
}

describe("isDatabaseUnavailable", () => {
  it.each([
    ["socket error from a query", refused],
    ["connection terminated by the server", adminShutdown],
    ["socket error from an interactive transaction", transactionRefused],
  ])("recognises %s", (_name, error) => {
    expect(isDatabaseUnavailable(error)).toBe(true);
  });

  it.each([
    ["unique constraint violation", knownError("P2002")],
    ["plain error", new Error("boom")],
    ["non-error value", "boom"],
  ])("ignores %s", (_name, error) => {
    expect(isDatabaseUnavailable(error)).toBe(false);
  });
});

describe("apiHandler error mapping", () => {
  it("answers 503 Database unavailable when the database is unreachable", async () => {
    const { status, body } = await respond(refused);

    expect(status).toBe(503);
    expect(body.error).toBe("Database unavailable");
    expect(body.requestId).toBeTruthy();
  });

  it("keeps 500 for other unexpected errors", async () => {
    const { status, body } = await respond(new Error("boom"));

    expect(status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });

  it("keeps typed application errors as they are", async () => {
    const { status } = await respond(new ConflictError());

    expect(status).toBe(409);
  });
});
