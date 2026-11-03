"use client";

import { useIsMutating } from "@tanstack/react-query";
import {
  type BookingDto,
  useCancelBooking,
  useMyBookings,
} from "@/api-client/bookings";
import { errorView } from "@/api-client/http";
import { ErrorBox } from "@/app/components/error-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKyiv, formatKyivTime } from "@/lib/kyiv-time";
import { useDashboardStore } from "@/store/dashboard-store";
import { useCurrentUser } from "@/store/user-store";

/** The current mock user's bookings with status and Cancel. */
export function MyBookingsCard() {
  const user = useCurrentUser();
  const setNotice = useDashboardStore((state) => state.setNotice);
  const bookings = useMyBookings(user.id);
  const cancelBooking = useCancelBooking(user.id);
  const actionInFlight = useIsMutating() > 0;

  function cancel(booking: BookingDto) {
    cancelBooking.mutate(booking.id, {
      onSuccess: () =>
        setNotice({ kind: "success", text: `Cancelled ${booking.roomName}.` }),
      onError: (error) => setNotice({ kind: "error", error: errorView(error) }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My bookings</CardTitle>
        <CardDescription>
          {user.name} ({user.role})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.isError ? (
          <ErrorBox error={errorView(bookings.error)} />
        ) : bookings.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : bookings.data.length === 0 ? (
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
              {bookings.data.map((booking) => (
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
                        disabled={actionInFlight}
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
  );
}
