import type { BookingDto } from "@/api-client/bookings";
import { request } from "@/api-client/http";
import type { serializePendingBooking } from "@/lib/booking-service";

/** A request in the admin queue: booking fields plus the requester's name. */
export type PendingBookingDto = ReturnType<typeof serializePendingBooking>;

export type DecisionAction = "approve" | "reject";

export const adminApi = {
  listPending: async (userId: string): Promise<PendingBookingDto[]> => {
    const data = await request<{ bookings: PendingBookingDto[] }>(
      "/api/admin/bookings",
      { userId },
    );
    return data.bookings;
  },

  decide: (
    userId: string,
    bookingId: string,
    action: DecisionAction,
  ): Promise<BookingDto> =>
    request<BookingDto>(`/api/admin/bookings/${bookingId}/${action}`, {
      userId,
      method: "POST",
    }),
};
