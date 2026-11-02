import { NextResponse } from "next/server";
import { apiHandler, parseIsoDateTime } from "@/lib/api";
import { listRooms } from "@/lib/booking-service";
import { ValidationError } from "@/lib/errors";

/**
 * GET /api/rooms
 * Optional query: ?startTime=<ISO>&endTime=<ISO>
 * Returns all rooms; with a time filter each room carries isAvailable.
 * 400 when only one time param is given or the interval is invalid.
 */
export const GET = apiHandler("rooms.list", async (req) => {
  const params = new URL(req.url).searchParams;
  const startTime = params.get("startTime");
  const endTime = params.get("endTime");

  if ((startTime === null) !== (endTime === null)) {
    throw new ValidationError("startTime and endTime must be given together");
  }

  const filter =
    startTime !== null && endTime !== null
      ? {
          startTime: parseIsoDateTime(startTime, "startTime"),
          endTime: parseIsoDateTime(endTime, "endTime"),
        }
      : undefined;

  const rooms = await listRooms(filter);
  return NextResponse.json({ rooms });
});
