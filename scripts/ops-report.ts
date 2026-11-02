/**
 * Operation metrics report (BOOK-25, lab section 8.2): reads the server log
 * and prints per-window ok/error counts, error rate and p50/p95 duration per
 * operation, flagging windows that cross the alert threshold.
 *
 * Usage:
 *   node .next/standalone/server.js 2>&1 | tee server.log   # capture the log
 *   npm run ops:report -- server.log [--window <seconds>]
 *   ... | npm run ops:report                                # or from stdin
 */
import { readFileSync } from "node:fs";
import { buildReport, type OpStats } from "../lib/ops-report";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

const windowSeconds = Number(argValue("--window") ?? 60);
if (!Number.isInteger(windowSeconds) || windowSeconds <= 0) {
  console.error("--window must be a positive whole number of seconds");
  process.exit(1);
}

const file = process.argv
  .slice(2)
  .find((arg, i, args) => !arg.startsWith("--") && args[i - 1] !== "--window");
const text = readFileSync(file ?? 0, "utf8");
const report = buildReport(text.split("\n"), windowSeconds * 1000);

const percent = (value: number) => `${Math.round(value * 100)}%`;
const ms = (value: number | null) => (value === null ? "-" : `${value} ms`);
const opLine = (op: string, stats: OpStats) =>
  `    ${op.padEnd(18)} ok ${stats.ok}  error ${stats.error}  p50 ${ms(stats.p50Ms)}  p95 ${ms(stats.p95Ms)}`;

console.log(
  `Operation log: ${report.entries} entries, ${report.skippedLines} skipped lines (not operation entries); window ${windowSeconds}s`,
);
for (const window of report.windows) {
  const alert = window.alerts.length > 0 ? `  ALERT: ${window.alerts.join(", ")}` : "";
  console.log(
    `\n${window.start}  total ${window.total}  ok ${window.ok}  error ${window.error}  error rate ${percent(window.errorRate)}${alert}`,
  );
  for (const [op, stats] of Object.entries(window.ops)) {
    console.log(opLine(op, stats));
  }
}
