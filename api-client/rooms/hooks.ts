import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  type Equipment,
  type Interval,
  roomsApi,
} from "@/api-client/rooms/api";

export const roomsKeys = {
  all: ["rooms"] as const,
  list: (interval: Interval | null, equipment: Equipment[]) =>
    [
      ...roomsKeys.all,
      interval?.startTime ?? null,
      interval?.endTime ?? null,
      [...equipment].sort(),
    ] as const,
};

export const useRooms = (interval: Interval | null, equipment: Equipment[]) =>
  useQuery({
    queryKey: roomsKeys.list(interval, equipment),
    queryFn: () => roomsApi.list(interval, equipment),
    // Keep the table on screen while another interval or filter loads.
    placeholderData: keepPreviousData,
  });
