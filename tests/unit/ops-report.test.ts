import { describe, expect, it } from "vitest";
import { buildReport, parseLogLine } from "@/lib/ops-report";

/**
 * BOOK-25 — operation metrics report over a fixed sample log.
 */
function line(
  ts: string,
  op: string,
  statusCode: number,
  durationMs: number,
): string {
  return JSON.stringify({
    ts: `2030-01-07T${ts}Z`,
    level: statusCode >= 500 ? "error" : "info",
    requestId: `${op}-${ts}`,
    op,
    // The health route returns its 503 itself, so apiHandler logs it as ok.
    result: statusCode >= 400 && op !== "health.check" ? "error" : "ok",
    statusCode,
    durationMs,
  });
}

// Drill shape: healthy minute, database down for a minute, recovered.
const drillLog = [
  "▲ Next.js 16.3.5",
  line("10:00:05", "rooms.list", 200, 10),
  line("10:00:10", "rooms.list", 200, 20),
  line("10:00:15", "rooms.list", 200, 30),
  line("10:00:20", "bookings.create", 409, 40),
  line("10:00:25", "bookings.create", 201, 50),
  line("10:01:05", "rooms.list", 500, 5),
  line("10:01:10", "bookings.create", 500, 6),
  line("10:01:15", "health.check", 503, 2),
  line("10:01:20", "rooms.list", 500, 4),
  line("10:02:05", "health.check", 200, 3),
  line("10:02:10", "rooms.list", 200, 12),
];

describe("buildReport", () => {
  it("counts ok/error and p50/p95 per operation", () => {
    const [before] = buildReport(drillLog).windows;

    expect(before).toMatchObject({ total: 5, ok: 4, error: 1, alerts: [] });
    expect(before.ops["rooms.list"]).toEqual({
      ok: 3,
      error: 0,
      errorRate: 0,
      p50Ms: 20,
      p95Ms: 30,
    });
    expect(before.ops["bookings.create"]).toMatchObject({
      ok: 1,
      error: 1,
      errorRate: 0.5,
    });
  });

  it("flags only the window during the failure", () => {
    const report = buildReport(drillLog);

    expect(report.windows.map((window) => window.start)).toEqual([
      "2030-01-07T10:00:00.000Z",
      "2030-01-07T10:01:00.000Z",
      "2030-01-07T10:02:00.000Z",
    ]);
    expect(report.windows.map((window) => window.alerts)).toEqual([
      [],
      ["error rate > 50%", "health 503"],
      [],
    ]);
  });

  it("keeps a window without requests with zero counts", () => {
    const report = buildReport([
      line("10:00:05", "rooms.list", 200, 10),
      line("10:02:05", "rooms.list", 200, 10),
    ]);

    expect(report.windows[1]).toEqual({
      start: "2030-01-07T10:01:00.000Z",
      total: 0,
      ok: 0,
      error: 0,
      errorRate: 0,
      alerts: [],
      ops: {},
    });
  });

  it("returns an empty report for an empty log", () => {
    expect(buildReport([""])).toEqual({
      windows: [],
      entries: 0,
      skippedLines: 0,
    });
  });

  it("skips malformed lines and counts them separately", () => {
    const report = buildReport([
      line("10:00:05", "rooms.list", 200, 10),
      "{not json",
      JSON.stringify({ op: "rooms.list", result: "ok" }),
      "plain server output",
    ]);

    expect(report.entries).toBe(1);
    expect(report.skippedLines).toBe(3);
    expect(report.windows[0].total).toBe(1);
  });

  it("does not alert on a single failed request", () => {
    const report = buildReport([line("10:00:05", "rooms.list", 500, 5)]);

    expect(report.windows[0].alerts).toEqual([]);
  });
});

describe("parseLogLine", () => {
  it("rejects an entry with an unparsable timestamp", () => {
    expect(
      parseLogLine(
        JSON.stringify({
          ts: "yesterday",
          op: "rooms.list",
          result: "ok",
          statusCode: 200,
          durationMs: 1,
        }),
      ),
    ).toBeNull();
  });
});
