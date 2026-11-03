import { request } from "@/api-client/http";
import type { Interval } from "@/api-client/rooms";
import type { serializeBooking } from "@/lib/booking-service";

/** Wire shape of a booking, taken from the server so the two cannot drift. */
export type BookingDto = ReturnType<typeof serializeBooking>;

export interface CreateBookingInput extends Interval {
  roomId: string;
}

export const bookingsApi = {
  listMine: async (userId: string): Promise<BookingDto[]> => {
    const data = await request<{ bookings: BookingDto[] }>("/api/bookings", {
      userId,
    });
    return data.bookings;
  },

  create: (userId: string, input: CreateBookingInput): Promise<BookingDto> =>
    request<BookingDto>("/api/bookings", {
      userId,
      method: "POST",
      body: input,
    }),

  cancel: (userId: string, bookingId: string): Promise<BookingDto> =>
    request<BookingDto>(`/api/bookings/${bookingId}`, {
      userId,
      method: "DELETE",
    }),
};
