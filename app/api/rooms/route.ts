import { apiHandler } from "@/lib/api";
import { NotImplementedError } from "@/lib/errors";

/**
 * GET /api/rooms
 * Optional query: ?startTime=<ISO>&endTime=<ISO>
 * Returns all rooms; with a time filter each room carries isAvailable.
 *
 * TODO(BOOK-11): parse optional startTime/endTime via parseIsoDateTime
 * (one present without the other -> 400), delegate to listRooms, return
 * { rooms }.
 */
export const GET = apiHandler("rooms.list", async () => {
  throw new NotImplementedError("BOOK-11");
});
