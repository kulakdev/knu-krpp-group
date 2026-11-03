import { request } from "@/api-client/http";
import type { listRooms } from "@/lib/booking-service";

/** Wire shape of a room, taken from the server so the two cannot drift. */
export type RoomDto = Awaited<ReturnType<typeof listRooms>>[number];

/** UTC ISO bounds of the availability filter. */
export interface Interval {
  startTime: string;
  endTime: string;
}

export const roomsApi = {
  list: async (interval: Interval | null): Promise<RoomDto[]> => {
    const query = interval ? `?${new URLSearchParams({ ...interval })}` : "";
    const data = await request<{ rooms: RoomDto[] }>(`/api/rooms${query}`);
    return data.rooms;
  },
};
