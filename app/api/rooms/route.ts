import { NextResponse } from "next/server";
import { apiHandler, parseEquipment, parseIsoDateTime } from "@/lib/api";
import { listRooms } from "@/lib/booking-service";
import { ValidationError } from "@/lib/errors";

/**
 * GET /api/rooms
 * Optional query: ?startTime=<ISO>&endTime=<ISO>&equipment=projector,computers
 * Returns all rooms (only those with all listed equipment when filtered);
 * with a time filter each room carries isAvailable.
 * 400 when only one time param is given, the interval is invalid, or an
 * equipment value is empty or unknown.
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
  const equipment = parseEquipment(params.get("equipment")) ?? [];

  const rooms = await listRooms(filter, equipment);
  return NextResponse.json({ rooms });
});
