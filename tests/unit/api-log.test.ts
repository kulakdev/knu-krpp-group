import { afterEach, describe, expect, it, vi } from "vitest";
import { apiHandler } from "@/lib/api";
import { ConflictError } from "@/lib/errors";

/**
 * BOOK-45 — a technical failure's operation log line names the original
 * error; business errors are logged as before.
 */
function captureLog() {
  const lines: Record<string, unknown>[] = [];
  const keep = (value: unknown) => {
    if (typeof value === "string" && value.startsWith("{")) {
      lines.push(JSON.parse(value));
    }
  };
  vi.spyOn(console, "log").mockImplementation(keep);
  vi.spyOn(console, "error").mockImplementation(keep);
  return lines;
}

async function fail(error: unknown) {
  const handler = apiHandler("test.op", async () => {
    throw error;
  });
  return handler(new Request("http://localhost/api/test"));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("operation log for failed requests", () => {
  it("records name and code of the error behind a technical failure", async () => {
    const lines = captureLog();

    const res = await fail(
      Object.assign(new TypeError("bad argument"), {
        code: "ERR_INVALID_ARG_TYPE",
      }),
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      requestId: res.headers.get("x-request-id"),
      result: "error",
      statusCode: 500,
      error: "Internal server error",
      errorName: "TypeError",
      errorCode: "ERR_INVALID_ARG_TYPE",
    });
  });

  it("records the connection error behind a 503 (BOOK-44)", async () => {
    const lines = captureLog();

    await fail(
      Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" }),
    );

    expect(lines[0]).toMatchObject({
      statusCode: 503,
      error: "Database unavailable",
      errorName: "AggregateError",
      errorCode: "ECONNREFUSED",
    });
  });

  it("omits the code when the error has none", async () => {
    const lines = captureLog();

    await fail(new Error("boom"));

    expect(lines[0]).toMatchObject({ errorName: "Error" });
    expect(lines[0]).not.toHaveProperty("errorCode");
  });

  it("logs business errors without error details", async () => {
    const lines = captureLog();

    await fail(new ConflictError());

    expect(lines[0]).toMatchObject({ statusCode: 409, result: "error" });
    expect(lines[0]).not.toHaveProperty("errorName");
  });
});
