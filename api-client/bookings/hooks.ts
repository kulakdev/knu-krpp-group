import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingsApi, type CreateBookingInput } from "@/api-client/bookings/api";
import { roomsKeys } from "@/api-client/rooms";

export const bookingsKeys = {
  all: ["bookings"] as const,
  mine: (userId: string) => [...bookingsKeys.all, userId] as const,
};

export const useMyBookings = (userId: string) =>
  useQuery({
    queryKey: bookingsKeys.mine(userId),
    queryFn: () => bookingsApi.listMine(userId),
  });

/**
 * Any booking change can flip room availability and every user's list, so
 * both are refetched after the mutation settles — success or failure (a 409
 * means the list on screen was stale).
 */
function useInvalidateBookingViews() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: roomsKeys.all }),
      queryClient.invalidateQueries({ queryKey: bookingsKeys.all }),
    ]);
}

export const useCreateBooking = (userId: string) => {
  const invalidate = useInvalidateBookingViews();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingsApi.create(userId, input),
    onSettled: invalidate,
  });
};

export const useCancelBooking = (userId: string) => {
  const invalidate = useInvalidateBookingViews();
  return useMutation({
    mutationFn: (bookingId: string) => bookingsApi.cancel(userId, bookingId),
    onSettled: invalidate,
  });
};
