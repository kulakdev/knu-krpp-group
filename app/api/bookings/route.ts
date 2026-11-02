import { NextResponse } from "next/server";
import { apiHandler, parseIsoDateTime } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createBooking, serializeBooking } from "@/lib/booking-service";
import { NotImplementedError, ValidationError } from "@/lib/errors";

/**
 * GET /api/bookings
 * Header: x-user-id
 * Returns the requesting user's bookings (active and cancelled).
 *
 * TODO(BOOK-9): authenticate via getCurrentUser, delegate to
 * listBookingsForUser, return { bookings } with roomName included.
 */
export const GET = apiHandler("bookings.list", async () => {
  throw new NotImplementedError("BOOK-9");
});

/**
 * POST /api/bookings
 * Header: x-user-id
 * Body: { roomId, startTime, endTime }
 * 201 Created on success, 400 invalid input, 401 unknown user,
 * 404 unknown room, 409 slot conflict.
 */
export const POST = apiHandler("bookings.create", async (req) => {
  const user = await getCurrentUser(req);
  const body = await readJsonObject(req);

  if (typeof body.roomId !== "string" || body.roomId.length === 0) {
    throw new ValidationError("roomId is required (string)");
  }

  const booking = await createBooking({
    userId: user.id,
    roomId: body.roomId,
    startTime: parseIsoDateTime(body.startTime, "startTime"),
    endTime: parseIsoDateTime(body.endTime, "endTime"),
  });

  return NextResponse.json(serializeBooking(booking), { status: 201 });
});

/** Malformed JSON or a non-object body is a client error (400), not a 500. */
async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}
