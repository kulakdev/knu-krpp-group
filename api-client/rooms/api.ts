import { request } from "@/api-client/http";
import type { listRooms } from "@/lib/booking-service";

/** Wire shape of a room, taken from the server so the two cannot drift. */
export type RoomDto = Awaited<ReturnType<typeof listRooms>>[number];

export type Equipment = RoomDto["equipment"][number];

/** UTC ISO bounds of the availability filter. */
export interface Interval {
  startTime: string;
  endTime: string;
}

export const roomsApi = {
  list: async (
    interval: Interval | null,
    equipment: Equipment[],
  ): Promise<RoomDto[]> => {
    const params = new URLSearchParams(interval ? { ...interval } : {});
    if (equipment.length > 0) {
      params.set("equipment", equipment.join(",").toLowerCase());
    }
    const query = params.size > 0 ? `?${params}` : "";
    const data = await request<{ rooms: RoomDto[] }>(`/api/rooms${query}`);
    return data.rooms;
  },
};
