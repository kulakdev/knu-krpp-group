import { NextResponse } from "next/server";
import { BookingDecision } from "@prisma/client";
import { apiHandler } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { decideBooking, serializeBooking } from "@/lib/booking-service";

/**
 * POST /api/admin/bookings/[id]/reject
 * Header: x-user-id (an admin)
 * PENDING -> REJECTED, freeing the slot and recording who decided and when.
 * 200 OK (also for a repeated rejection), 401, 403 not an admin,
 * 404 unknown booking, 409 not waiting for a decision.
 */
export const POST = apiHandler<{ params: Promise<{ id: string }> }>(
  "admin.bookings.reject",
  async (req, ctx) => {
    const user = await getCurrentUser(req);
    const { id } = await ctx.params;
    const booking = await decideBooking(id, user, BookingDecision.REJECTED);
    return NextResponse.json(serializeBooking(booking));
  },
);
