/**
 * Data integrity report (BOOK-31, lab sections 10.2 and 11): record counts,
 * bookings per status, a fingerprint of the key fields, and invariant
 * checks. Run it before and after a migration or a restore and compare
 * the output; a failed invariant exits non-zero.
 *
 *   npm run data:check
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const [users, rooms, bookings] = await Promise.all([
    prisma.user.count(),
    prisma.room.count(),
    // Only fields that exist in every schema version, so the same report
    // runs against the database before and after a migration.
    prisma.booking.findMany({
      select: {
        id: true,
        userId: true,
        roomId: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const booking of bookings) {
    byStatus[booking.status] = (byStatus[booking.status] ?? 0) + 1;
  }

  // Ids, owners, rooms, intervals and statuses — the fields a migration
  // must not change (lab section 10.1).
  const fingerprint = createHash("sha256")
    .update(
      bookings
        .map((b) =>
          [b.id, b.userId, b.roomId, b.startTime.toISOString(), b.endTime.toISOString(), b.status].join("|"),
        )
        .join("\n"),
    )
    .digest("hex")
    .slice(0, 16);

  // Two slot-blocking bookings of one room must never overlap. Checked for
  // every status that blocks in v1.0 or v2.0.
  const overlaps = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "Booking" a JOIN "Booking" b
      ON a."roomId" = b."roomId" AND a.id < b.id
     AND a."startTime" < b."endTime" AND b."startTime" < a."endTime"
    WHERE a.status::text IN ('ACTIVE', 'PENDING')
      AND b.status::text IN ('ACTIVE', 'PENDING')
  `;
  const overlapCount = Number(overlaps[0].count);
  const invalidIntervals = bookings.filter((b) => b.startTime >= b.endTime);

  const failures = [
    overlapCount > 0 && `${overlapCount} overlapping blocking pairs`,
    invalidIntervals.length > 0 && `${invalidIntervals.length} bookings with startTime >= endTime`,
  ].filter(Boolean);

  console.log(`users=${users} rooms=${rooms} bookings=${bookings.length}`);
  console.log(
    `by status: ${Object.entries(byStatus).sort().map(([s, n]) => `${s}=${n}`).join(" ") || "none"}`,
  );
  console.log(`key fields fingerprint: ${fingerprint}`);
  console.log(failures.length === 0 ? "invariants: OK" : `invariants: FAILED — ${failures.join("; ")}`);
  if (failures.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
