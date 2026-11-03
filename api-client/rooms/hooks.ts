import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type Interval, roomsApi } from "@/api-client/rooms/api";

export const roomsKeys = {
  all: ["rooms"] as const,
  list: (interval: Interval | null) =>
    [...roomsKeys.all, interval?.startTime ?? null, interval?.endTime ?? null] as const,
};

export const useRooms = (interval: Interval | null) =>
  useQuery({
    queryKey: roomsKeys.list(interval),
    queryFn: () => roomsApi.list(interval),
    // Keep the table on screen while another interval loads.
    placeholderData: keepPreviousData,
  });
