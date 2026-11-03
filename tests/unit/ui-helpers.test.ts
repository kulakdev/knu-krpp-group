import { describe, expect, it } from "vitest";
import { errorKind, toErrorView } from "@/lib/api-error";
import {
  formatKyiv,
  formatKyivTime,
  kyivToday,
  kyivToUtcIso,
} from "@/lib/kyiv-time";

/**
 * BOOK-13 — presentation helpers of the dashboard: Kyiv time on screen,
 * UTC on the wire, and distinct error kinds per status code.
 */
describe("kyiv-time", () => {
  it("converts Kyiv wall time to UTC in summer (UTC+3) and winter (UTC+2)", () => {
    expect(kyivToUtcIso("2030-07-01", "10:00")).toBe("2030-07-01T07:00:00.000Z");
    expect(kyivToUtcIso("2030-01-07", "10:00")).toBe("2030-01-07T08:00:00.000Z");
  });

  it("formats UTC back to Kyiv wall time", () => {
    expect(formatKyiv("2030-07-01T07:00:00.000Z")).toBe("01.07.2030 10:00");
    expect(formatKyivTime("2030-01-07T09:30:00.000Z")).toBe("11:30");
  });

  it("round-trips an entered time", () => {
    const iso = kyivToUtcIso("2030-03-15", "14:45");

    expect(iso).not.toBeNull();
    expect(formatKyiv(iso as string)).toBe("15.03.2030 14:45");
  });

  it("returns null for incomplete input instead of an invalid date", () => {
    expect(kyivToUtcIso("", "10:00")).toBeNull();
    expect(kyivToUtcIso("2030-07-01", "")).toBeNull();
  });

  it("uses the Kyiv calendar date for today", () => {
    // 22:30 UTC on 31 Dec is already 1 Jan in Kyiv (UTC+2).
    expect(kyivToday(new Date("2029-12-31T22:30:00Z"))).toBe("2030-01-01");
  });
});

describe("api-error", () => {
  it.each([
    [400, "validation"],
    [401, "access"],
    [403, "access"],
    [404, "not-found"],
    [409, "conflict"],
    [500, "technical"],
    [503, "technical"],
  ])("maps HTTP %i to %s", (status, kind) => {
    expect(errorKind(status)).toBe(kind);
  });

  it("shows the server message for business failures", () => {
    const view = toErrorView(409, {
      error: "The requested slot is already booked",
      requestId: "req-1",
    });

    expect(view).toEqual({
      kind: "conflict",
      title: "Slot already taken",
      message: "The requested slot is already booked",
      requestId: "req-1",
    });
  });

  it("hides server internals for technical failures but keeps the request id", () => {
    const view = toErrorView(500, {
      error: "Internal server error",
      requestId: "req-2",
    });

    expect(view.kind).toBe("technical");
    expect(view.message).not.toContain("Internal server error");
    expect(view.requestId).toBe("req-2");
  });

  it("copes with a body that is not JSON", () => {
    expect(toErrorView(400, null).message).toBe("Request failed (HTTP 400).");
  });
});
