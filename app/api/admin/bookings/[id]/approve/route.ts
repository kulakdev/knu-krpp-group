import { NextResponse } from "next/server";
import { BookingDecision } from "@prisma/client";
import { apiHandler } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { decideBooking, serializeBooking } from "@/lib/booking-service";

/**
 * POST /api/admin/bookings/[id]/approve
 * Header: x-user-id (an admin)
 * PENDING -> ACTIVE, recording who decided and when (v2.0).
 * 200 OK (also for a repeated approval), 401, 403 not an admin,
 * 404 unknown booking, 409 not waiting for a decision.
 */
export const POST = apiHandler<{ params: Promise<{ id: string }> }>(
  "admin.bookings.approve",
  async (req, ctx) => {
    const user = await getCurrentUser(req);
    const { id } = await ctx.params;
    const booking = await decideBooking(id, user, BookingDecision.APPROVED);
    return NextResponse.json(serializeBooking(booking));
  },
);
