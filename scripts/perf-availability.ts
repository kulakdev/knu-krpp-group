/**
 * QR-3 availability-search performance check (BOOK-17,
 * docs/quality-requirements.md).
 *
 * Seeds a fixed dataset of 1,000 bookings, warms up with 10 requests, then
 * measures 100 sequential `GET /api/rooms?startTime&endTime` requests against
 * a running server and appends a dated entry to docs/quality-results.md.
 * Exits non-zero when p95 exceeds 1 s; the failed result is still recorded.
 *
 * Usage (production build, see docs/runbook.md):
 *   npm run build && node .next/standalone/server.js
 *   BASE_URL=http://localhost:3000 npm run perf:availability -- --reset
 *
 * --reset is required when the database already has bookings: the script
 * replaces ALL bookings with the perf dataset. Never run it against data you
 * need to keep.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import os from "node:os";
import { PrismaPg } from "@prisma/adapter-pg";
import { BookingStatus, PrismaClient } from "@prisma/client";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const BOOKING_COUNT = 1000;
const WARMUP_REQUESTS = 10;
const MEASURED_REQUESTS = 100;
const P95_LIMIT_MS = 1000;
const RESULTS_FILE = "docs/quality-results.md";

const HOUR_MS = 60 * 60 * 1000;
const DATASET_START = Date.UTC(2030, 1, 1);
// The query window lies inside the dataset, so the availability check has
// real overlapping bookings to evaluate.
const QUERY = new URLSearchParams({
  startTime: new Date(DATASET_START + 100 * HOUR_MS).toISOString(),
  endTime: new Date(DATASET_START + 102 * HOUR_MS).toISOString(),
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedDataset(reset: boolean): Promise<number> {
  const existing = await prisma.booking.count();
  if (existing > 0 && !reset) {
    throw new Error(
      `Database already has ${existing} bookings. Re-run with --reset to replace them with the perf dataset.`,
    );
  }

  const rooms = await prisma.room.findMany({ orderBy: { id: "asc" } });
  const userIds = ["student-1", "student-2"];

  // Deterministic, non-overlapping one-hour slots spread over all rooms;
  // every fifth booking is CANCELLED so the status filter is exercised too.
  const data = Array.from({ length: BOOKING_COUNT }, (_, i) => {
    const slot = Math.floor(i / rooms.length);
    const startTime = new Date(DATASET_START + slot * HOUR_MS);
    return {
      roomId: rooms[i % rooms.length].id,
      userId: userIds[i % userIds.length],
      startTime,
      endTime: new Date(startTime.getTime() + HOUR_MS),
      status: i % 5 === 4 ? BookingStatus.CANCELLED : BookingStatus.ACTIVE,
    };
  });

  await prisma.$transaction([
    prisma.booking.deleteMany(),
    prisma.booking.createMany({ data }),
  ]);
  return rooms.length;
}

async function timeRequest(): Promise<number> {
  const startedAt = performance.now();
  const res = await fetch(`${BASE_URL}/api/rooms?${QUERY}`);
  await res.text();
  const elapsed = performance.now() - startedAt;
  if (res.status !== 200) {
    throw new Error(`GET /api/rooms returned ${res.status}`);
  }
  return elapsed;
}

/** Nearest-rank percentile of an ascending-sorted sample. */
function percentile(sorted: number[], p: number): number {
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function commitSha(): string {
  try {
    const sha = execSync("git rev-parse --short HEAD").toString().trim();
    const dirty = execSync("git status --porcelain --untracked-files=no")
      .toString()
      .trim();
    return dirty ? `${sha} (with uncommitted changes)` : sha;
  } catch {
    return "unknown";
  }
}

function machine(): string {
  const cpus = os.cpus();
  const ramGb = Math.round(os.totalmem() / 1024 ** 3);
  return `${cpus[0]?.model ?? "unknown CPU"}, ${cpus.length} cores, ${ramGb} GB RAM, ${os.platform()} ${os.release()}, Node ${process.version}`;
}

function record(entry: string): void {
  if (!existsSync(RESULTS_FILE)) {
    writeFileSync(
      RESULTS_FILE,
      "# Quality verification results\n\n" +
        "Entries are appended by the verification scripts; requirements and\n" +
        "conditions are in docs/quality-requirements.md.\n",
    );
  }
  appendFileSync(RESULTS_FILE, entry);
}

async function main(): Promise<void> {
  const roomCount = await seedDataset(process.argv.includes("--reset"));

  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await timeRequest();
  }
  const samples: number[] = [];
  for (let i = 0; i < MEASURED_REQUESTS; i++) {
    samples.push(await timeRequest());
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const max = sorted[sorted.length - 1];
  const passed = p95 <= P95_LIMIT_MS;
  const ms = (value: number) => `${value.toFixed(1)} ms`;

  const entry = [
    "",
    `## QR-3 — ${new Date().toISOString()}`,
    "",
    `- Commit: ${commitSha()}`,
    `- Target: ${BASE_URL}`,
    `- Machine: ${machine()}`,
    `- Dataset: ${BOOKING_COUNT} bookings over ${roomCount} rooms; warm-up ${WARMUP_REQUESTS}, measured ${MEASURED_REQUESTS} sequential requests`,
    `- Query: GET /api/rooms?${QUERY}`,
    `- Result: p50 ${ms(p50)}, p95 ${ms(p95)}, max ${ms(max)}`,
    `- QR-3 (p95 <= ${P95_LIMIT_MS} ms): **${passed ? "PASS" : "FAIL"}**`,
    "",
  ].join("\n");
  record(entry);

  console.log(`p50 ${ms(p50)}  p95 ${ms(p95)}  max ${ms(max)}`);
  console.log(`QR-3 ${passed ? "PASS" : "FAIL"} — recorded in ${RESULTS_FILE}`);
  if (!passed) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
