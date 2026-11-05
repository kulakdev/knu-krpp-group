import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  listPendingBookings,
  serializePendingBooking,
} from "@/lib/booking-service";

/**
 * GET /api/admin/bookings
 * Header: x-user-id (an admin)
 * PENDING booking requests waiting for a decision (v2.0).
 * 200 OK, 401 unknown user, 403 not an admin.
 */
export const GET = apiHandler("admin.bookings.list", async (req) => {
  const user = await getCurrentUser(req);
  const bookings = await listPendingBookings(user);
  return NextResponse.json({ bookings: bookings.map(serializePendingBooking) });
});
