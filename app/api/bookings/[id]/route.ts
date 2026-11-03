import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { cancelBooking, serializeBooking } from "@/lib/booking-service";

/**
 * DELETE /api/bookings/[id]
 * Header: x-user-id
 * Cancels the booking (status = CANCELLED) and releases the slot.
 * 200 OK on success, 401 unknown user, 403 non-owner, 404 unknown booking.
 */
export const DELETE = apiHandler<{ params: Promise<{ id: string }> }>(
  "bookings.cancel",
  async (req, ctx) => {
    const user = await getCurrentUser(req);
    const { id } = await ctx.params;
    const booking = await cancelBooking(id, user);
    return NextResponse.json(serializeBooking(booking));
  },
);
