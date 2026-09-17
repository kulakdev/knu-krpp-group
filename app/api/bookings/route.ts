import { apiHandler } from "@/lib/api";
import { NotImplementedError } from "@/lib/errors";

/**
 * GET /api/bookings
 * Header: x-user-id
 * Returns the requesting user's bookings (active and cancelled).
 *
 * TODO(BOOK-9): authenticate via getCurrentUser, delegate to
 * listBookingsForUser, return { bookings } with roomName included.
 */
export const GET = apiHandler("bookings.list", async () => {
  throw new NotImplementedError("BOOK-9");
});

/**
 * POST /api/bookings
 * Header: x-user-id
 * Body: { roomId, startTime, endTime }
 * 201 Created on success, 400 invalid input, 401 unknown user,
 * 409 slot conflict.
 *
 * TODO(BOOK-8): authenticate via getCurrentUser, parse + validate the JSON
 * body (parseIsoDateTime for the interval), delegate to createBooking,
 * return 201 with the serialized booking.
 */
export const POST = apiHandler("bookings.create", async () => {
  throw new NotImplementedError("BOOK-8");
});
