"use client";

import { useIsMutating } from "@tanstack/react-query";
import { useCreateBooking } from "@/api-client/bookings";
import { errorView } from "@/api-client/http";
import { type RoomDto, useRooms } from "@/api-client/rooms";
import { EQUIPMENT_LABELS } from "@/app/components/equipment-filter";
import { ErrorBox } from "@/app/components/error-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKyiv, formatKyivTime } from "@/lib/kyiv-time";
import { useDashboardStore, useInterval } from "@/store/dashboard-store";
import { useUserStore } from "@/store/user-store";

/**
 * Rooms with availability for the picked interval, narrowed by the
 * equipment filter. Busy rooms cannot be booked from here, but the server
 * re-validates every request (409).
 */
export function RoomsTable() {
  const interval = useInterval();
  const equipment = useDashboardStore((state) => state.equipment);
  const userId = useUserStore((state) => state.userId);
  const setNotice = useDashboardStore((state) => state.setNotice);
  const rooms = useRooms(interval, equipment);
  const createBooking = useCreateBooking(userId);
  const actionInFlight = useIsMutating() > 0;

  if (rooms.isError) {
    return <ErrorBox error={errorView(rooms.error)} />;
  }

  function book(room: RoomDto) {
    if (!interval) return;
    createBooking.mutate(
      { roomId: room.id, ...interval },
      {
        onSuccess: (booking) =>
          setNotice({
            kind: "success",
            text: `Booked ${room.name}, ${formatKyiv(booking.startTime)}–${formatKyivTime(booking.endTime)}.`,
          }),
        onError: (error) =>
          setNotice({ kind: "error", error: errorView(error) }),
      },
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Room</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead>Equipment</TableHead>
          <TableHead>Availability</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {(rooms.data ?? []).map((room) => (
          <TableRow key={room.id}>
            <TableCell className="font-medium">{room.name}</TableCell>
            <TableCell>{room.capacity}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {room.equipment.map((item) => (
                  <Badge key={item} variant="secondary">
                    {EQUIPMENT_LABELS[item]}
                  </Badge>
                ))}
              </div>
            </TableCell>
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
                disabled={!room.isAvailable || actionInFlight}
                onClick={() => book(room)}
              >
                Book
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
