"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toErrorView, type ApiErrorView } from "@/lib/api-error";
import {
  formatKyiv,
  formatKyivTime,
  kyivToday,
  kyivToUtcIso,
} from "@/lib/kyiv-time";

/**
 * BOOK-13 dashboard: mock user switcher, room availability for a Kyiv-time
 * interval, booking, and "My bookings" with cancel. All rules (overlap,
 * ownership, interval validity) are enforced by the API — the UI only
 * reflects them and shows each failure kind distinctly.
 */
type Room = { id: string; name: string; capacity: number; isAvailable?: boolean };

type Booking = {
  id: string;
  roomName: string;
  startTime: string;
  endTime: string;
  status: string;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorView };

type Notice =
  | { kind: "success"; text: string }
  | { kind: "error"; error: ApiErrorView };

// Mirrors prisma/seed.ts; mock auth only (ADR-002).
const USERS = [
  { id: "student-1", name: "Alex Student", role: "Student" },
  { id: "student-2", name: "Maria Student", role: "Student" },
  { id: "admin-1", name: "Admin User", role: "Admin" },
];

const ERROR_STYLES: Record<ApiErrorView["kind"], string> = {
  validation: "border-amber-300 bg-amber-50 text-amber-900",
  access: "border-red-300 bg-red-50 text-red-900",
  "not-found": "border-slate-300 bg-slate-50 text-slate-900",
  conflict: "border-orange-300 bg-orange-50 text-orange-900",
  technical: "border-red-500 bg-red-100 text-red-950",
};

async function callApi<T>(
  path: string,
  userId: string | null,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (userId) headers.set("x-user-id", userId);

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    return {
      ok: false,
      error: {
        kind: "technical",
        title: "Technical failure",
        message: "Cannot reach the service. Check that the server is running.",
      },
    };
  }

  const body: unknown = await res.json().catch(() => null);
  return res.ok
    ? { ok: true, data: body as T }
    : { ok: false, error: toErrorView(res.status, body) };
}

function ErrorBox({ error }: { error: ApiErrorView }) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-3 py-2 text-sm ${ERROR_STYLES[error.kind]}`}
    >
      <p className="font-medium">{error.title}</p>
      <p>{error.message}</p>
      {error.requestId && (
        <p className="mt-1 font-mono text-xs opacity-75">
          request id: {error.requestId}
        </p>
      )}
    </div>
  );
}

export function BookingDashboard() {
  const [userId, setUserId] = useState(USERS[0].id);
  const [date, setDate] = useState(() => kyivToday(new Date()));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsError, setRoomsError] = useState<ApiErrorView | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsError, setBookingsError] = useState<ApiErrorView | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const startIso = kyivToUtcIso(date, startTime);
  const endIso = kyivToUtcIso(date, endTime);
  const user = USERS.find((candidate) => candidate.id === userId) ?? USERS[0];

  useEffect(() => {
    let ignore = false;
    const query =
      startIso && endIso
        ? `?${new URLSearchParams({ startTime: startIso, endTime: endIso })}`
        : "";
    callApi<{ rooms: Room[] }>(`/api/rooms${query}`, null).then((result) => {
      if (ignore) return;
      if (result.ok) {
        setRooms(result.data.rooms);
        setRoomsError(null);
      } else {
        setRooms([]);
        setRoomsError(result.error);
      }
    });
    return () => {
      ignore = true;
    };
  }, [startIso, endIso, refreshKey]);

  useEffect(() => {
    let ignore = false;
    callApi<{ bookings: Booking[] }>("/api/bookings", userId).then((result) => {
      if (ignore) return;
      if (result.ok) {
        setBookings(result.data.bookings);
        setBookingsError(null);
      } else {
        setBookings([]);
        setBookingsError(result.error);
      }
    });
    return () => {
      ignore = true;
    };
  }, [userId, refreshKey]);

  async function book(room: Room) {
    if (!startIso || !endIso) return;
    setBusyId(room.id);
    const result = await callApi<Booking>("/api/bookings", userId, {
      method: "POST",
      body: JSON.stringify({
        roomId: room.id,
        startTime: startIso,
        endTime: endIso,
      }),
    });
    setBusyId(null);
    setNotice(
      result.ok
        ? {
            kind: "success",
            text: `Booked ${room.name}, ${formatKyiv(result.data.startTime)}–${formatKyivTime(result.data.endTime)}.`,
          }
        : { kind: "error", error: result.error },
    );
    setRefreshKey((key) => key + 1);
  }

  async function cancel(booking: Booking) {
    setBusyId(booking.id);
    const result = await callApi<Booking>(
      `/api/bookings/${booking.id}`,
      userId,
      { method: "DELETE" },
    );
    setBusyId(null);
    setNotice(
      result.ok
        ? { kind: "success", text: `Cancelled ${booking.roomName}.` }
        : { kind: "error", error: result.error },
    );
    setRefreshKey((key) => key + 1);
  }

  function switchUser(id: string) {
    setUserId(id);
    setNotice(null);
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">University Room Booking</h1>
          <p className="text-sm text-muted-foreground">
            Times are shown in Europe/Kyiv.
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Acting as (x-user-id)</p>
          <div className="flex gap-1" role="group" aria-label="Mock user">
            {USERS.map((candidate) => (
              <Button
                key={candidate.id}
                size="sm"
                variant={candidate.id === userId ? "default" : "outline"}
                aria-pressed={candidate.id === userId}
                onClick={() => switchUser(candidate.id)}
              >
                {candidate.name}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {notice?.kind === "success" && (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {notice.text}
        </p>
      )}
      {notice?.kind === "error" && <ErrorBox error={notice.error} />}

      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
          <CardDescription>
            Pick an interval to see which rooms are free.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="start">From</Label>
              <Input
                id="start"
                type="time"
                step={900}
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end">To</Label>
              <Input
                id="end"
                type="time"
                step={900}
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          {roomsError ? (
            <ErrorBox error={roomsError} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      {room.isAvailable === undefined ? (
                        <span className="text-muted-foreground">—</span>
                      ) : room.isAvailable ? (
                        <Badge variant="outline">Free</Badge>
                      ) : (
                        <Badge variant="destructive">Busy</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!room.isAvailable || busyId !== null}
                        onClick={() => book(room)}
                      >
                        Book
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My bookings</CardTitle>
          <CardDescription>
            {user.name} ({user.role})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsError ? (
            <ErrorBox error={bookingsError} />
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.roomName}
                    </TableCell>
                    <TableCell>
                      {formatKyiv(booking.startTime)}–
                      {formatKyivTime(booking.endTime)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {booking.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId !== null}
                          onClick={() => cancel(booking)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
