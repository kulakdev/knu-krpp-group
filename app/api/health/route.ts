import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Liveness + database connectivity probe used by scripts/smoke.sh and the
 * incident drill (lab section 8.3) to confirm service degradation/recovery.
 */
export const GET = apiHandler("health.check", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "down" },
      { status: 503 },
    );
  }
});
