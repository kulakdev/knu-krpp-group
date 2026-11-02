import type { OperationLogEntry } from "@/lib/logger";

/**
 * Aggregates the JSON operation log written by lib/logger.ts into fixed time
 * windows (lab section 8.2): ok/error counts, error rate and p50/p95
 * duration per operation. Pure functions; scripts/ops-report.ts does the IO.
 *
 * Alert threshold (docs/runbook.md): a window is flagged when its error rate
 * is above 50% with at least 3 requests, or when /api/health answered 503.
 */
export const ALERT_ERROR_RATE = 0.5;
export const ALERT_MIN_REQUESTS = 3;

export interface OpStats {
  ok: number;
  error: number;
  errorRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface WindowReport {
  start: string;
  total: number;
  ok: number;
  error: number;
  errorRate: number;
  alerts: string[];
  ops: Record<string, OpStats>;
}

export interface OpsReport {
  windows: WindowReport[];
  entries: number;
  skippedLines: number;
}

/** Returns the entry, or null for anything that is not an operation log line. */
export function parseLogLine(line: string): OperationLogEntry | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const entry = value as Partial<OperationLogEntry>;
  const valid =
    typeof entry.ts === "string" &&
    !Number.isNaN(Date.parse(entry.ts)) &&
    typeof entry.op === "string" &&
    (entry.result === "ok" || entry.result === "error") &&
    typeof entry.statusCode === "number" &&
    typeof entry.durationMs === "number";
  return valid ? (entry as OperationLogEntry) : null;
}

/** Nearest-rank percentile of an ascending-sorted sample. */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function rate(error: number, total: number): number {
  return total === 0 ? 0 : error / total;
}

function summarize(entries: OperationLogEntry[]): OpStats {
  const error = entries.filter((entry) => entry.result === "error").length;
  const durations = entries
    .map((entry) => entry.durationMs)
    .sort((a, b) => a - b);
  return {
    ok: entries.length - error,
    error,
    errorRate: rate(error, entries.length),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
  };
}

function alertsFor(entries: OperationLogEntry[], errorRate: number): string[] {
  const alerts: string[] = [];
  if (entries.length >= ALERT_MIN_REQUESTS && errorRate > ALERT_ERROR_RATE) {
    alerts.push(`error rate > ${ALERT_ERROR_RATE * 100}%`);
  }
  if (
    entries.some(
      (entry) => entry.op === "health.check" && entry.statusCode === 503,
    )
  ) {
    alerts.push("health 503");
  }
  return alerts;
}

/**
 * Builds the report over consecutive windows from the first to the last
 * entry; windows without requests are kept with zero counts so the
 * before / during / after phases of a drill stay visible.
 */
export function buildReport(lines: string[], windowMs = 60_000): OpsReport {
  const entries: OperationLogEntry[] = [];
  let skippedLines = 0;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const entry = parseLogLine(line);
    if (entry) {
      entries.push(entry);
    } else {
      skippedLines++;
    }
  }

  const buckets = new Map<number, OperationLogEntry[]>();
  for (const entry of entries) {
    const start = Math.floor(Date.parse(entry.ts) / windowMs) * windowMs;
    buckets.set(start, [...(buckets.get(start) ?? []), entry]);
  }

  const starts = [...buckets.keys()];
  const windows: WindowReport[] = [];
  if (starts.length > 0) {
    const last = Math.max(...starts);
    for (let start = Math.min(...starts); start <= last; start += windowMs) {
      const inWindow = buckets.get(start) ?? [];
      const byOp = new Map<string, OperationLogEntry[]>();
      for (const entry of inWindow) {
        byOp.set(entry.op, [...(byOp.get(entry.op) ?? []), entry]);
      }

      const total = summarize(inWindow);
      windows.push({
        start: new Date(start).toISOString(),
        total: inWindow.length,
        ok: total.ok,
        error: total.error,
        errorRate: total.errorRate,
        alerts: alertsFor(inWindow, total.errorRate),
        ops: Object.fromEntries(
          [...byOp.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([op, opEntries]) => [op, summarize(opEntries)]),
        ),
      });
    }
  }

  return { windows, entries: entries.length, skippedLines };
}
