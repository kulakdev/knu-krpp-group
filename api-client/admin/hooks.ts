import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type DecisionAction } from "@/api-client/admin/api";
import { bookingsKeys } from "@/api-client/bookings";
import { roomsKeys } from "@/api-client/rooms";

export const adminKeys = {
  all: ["admin"] as const,
  pending: (userId: string) => [...adminKeys.all, "pending", userId] as const,
};

export const usePendingBookings = (userId: string) =>
  useQuery({
    queryKey: adminKeys.pending(userId),
    queryFn: () => adminApi.listPending(userId),
  });

/** A decision changes the queue, the owner's list and room availability. */
export const useDecideBooking = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, action }: { bookingId: string; action: DecisionAction }) =>
      adminApi.decide(userId, bookingId, action),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: bookingsKeys.all }),
        queryClient.invalidateQueries({ queryKey: roomsKeys.all }),
      ]),
  });
};
