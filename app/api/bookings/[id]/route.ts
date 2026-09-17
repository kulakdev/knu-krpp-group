import { apiHandler } from "@/lib/api";
import { NotImplementedError } from "@/lib/errors";

/**
 * DELETE /api/bookings/[id]
 * Header: x-user-id
 * Cancels the booking (status = CANCELLED) and releases the slot.
 * 200 OK on success, 401 unknown user, 403 non-owner, 404 unknown booking.
 *
 * TODO(BOOK-10): authenticate via getCurrentUser, await ctx.params for the
 * booking id, delegate to cancelBooking, return the updated booking.
 */
export const DELETE = apiHandler<{ params: Promise<{ id: string }> }>(
  "bookings.cancel",
  async () => {
    throw new NotImplementedError("BOOK-10");
  },
);
